import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .web_auth import router as auth_router
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .db import initialize, Session, events
from . import engine
from .models import InvestigateInput, Decision
from .connectors import LocalTickets, ConnectorError, health
from .security import authorize
from .config import settings
logging.basicConfig(level=logging.INFO,format='{"level":"%(levelname)s","message":"%(message)s"}')
@asynccontextmanager
async def lifespan(app):
    if settings.environment=="hosted":
        if len(settings.api_token.get_secret_value()) < 32 or len(settings.demo_password.get_secret_value()) < 12:
            raise RuntimeError("Hosted mode requires a strong API token and demo password")
        if not (Path(settings.frontend_dir) / "index.html").is_file():
            raise RuntimeError("Build the frontend before starting hosted mode")
    if settings.demo_password.get_secret_value() and len(settings.api_token.get_secret_value()) < 32:
        raise RuntimeError("Demo sessions require an API token of at least 32 characters")
    initialize()
    yield
app=FastAPI(title="FlowState AI",version="0.1.0",lifespan=lifespan,docs_url="/docs" if settings.environment=="local" else None,redoc_url=None,openapi_url="/openapi.json" if settings.environment=="local" else None)
api_router=APIRouter(dependencies=[Depends(authorize)])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
@app.middleware("http")
async def log_request(request: Request, call_next):
    start=time.perf_counter()
    response=await call_next(request)
    logging.info("request method=%s status=%s duration_ms=%.1f",request.method,response.status_code,(time.perf_counter()-start)*1000)
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Cache-Control"]="no-store"
    response.headers["Referrer-Policy"]="no-referrer"
    response.headers["X-Frame-Options"]="DENY"
    response.headers["Content-Security-Policy"]="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    if settings.environment=="hosted":
        response.headers["Strict-Transport-Security"]="max-age=31536000"
    return response
@app.exception_handler(ConnectorError)
async def connector_error(request,exc): return JSONResponse(status_code=503,content={"detail":"Connector unavailable"})
@api_router.get("/api/health")
def api_health(): return {"status":"ok"}
@api_router.get("/api/incidents")
def incidents(): return [r for r in LocalTickets().records() if r.kind=="incident"]
@api_router.get("/api/knowledge")
def knowledge(q: str=""):
    if len(q)>2000: raise HTTPException(422,"Query too long")
    return engine.search(q,"knowledge") if q else [r for r in LocalTickets().records() if r.kind=="knowledge"]
@api_router.post("/api/investigations",status_code=201)
async def create(body: InvestigateInput): return await engine.investigate(body.incident_id,body.question)
@api_router.get("/api/investigations")
def investigations(): return engine.history()
@api_router.get("/api/investigations/{iid}")
def get(iid: str): return {"id":iid,**engine.load(iid).model_dump()}
@api_router.get("/api/investigations/{iid}/graph")
def graph(iid: str): return engine.graph(iid)
@api_router.get("/api/investigations/{iid}/replay")
def replay(iid: str):
    engine.load(iid)
    with Session() as s: return events(s,iid)
@api_router.post("/api/investigations/{iid}/actions/{aid}/decision")
def decision(iid: str,aid: str,body: Decision): return engine.decide(iid,aid,body.decision,body.reason)
@api_router.get("/api/audit")
def audit():
    with Session() as s: return events(s)
@api_router.get("/api/connectors")
def connectors(): return health()
@api_router.get("/api/settings")
def config(): return {"provider":settings.provider,"model":settings.model or "deterministic","key_configured":bool(settings.provider_key.get_secret_value()),"authentication_enabled":bool(settings.api_token.get_secret_value()),"execution_enabled":False}
@api_router.get("/api/overview")
def overview():
    records=incidents()
    runs=engine.history()
    return {"active_incidents":sum(r.status!="resolved" for r in records),"investigations":len(runs),"pending_approvals":sum(a["status"]=="pending" for r in runs for a in r["actions"]),"sources":sum(c["status"]=="healthy" for c in health())}


app.include_router(auth_router)
app.include_router(api_router)

@app.get("/healthz", include_in_schema=False)
def readiness():
    return {"status":"ok"}

frontend = Path(settings.frontend_dir).resolve()
if (frontend / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=frontend / "assets"), name="assets")

@app.get("/{path:path}", include_in_schema=False)
def frontend_page(path: str):
    if path == "api" or path.startswith("api/"):
        raise HTTPException(404, "API route not found")
    candidate = (frontend / path).resolve()
    if not candidate.is_relative_to(frontend):
        raise HTTPException(404, "Not found")
    if candidate.is_file():
        return FileResponse(candidate)
    if Path(path).suffix:
        raise HTTPException(404, "Not found")
    index = frontend / "index.html"
    if not index.is_file():
        raise HTTPException(404, "Frontend is not built")
    return FileResponse(index)
