import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
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
    initialize()
    yield
app=FastAPI(title="FlowState AI",version="0.1.0",lifespan=lifespan,dependencies=[Depends(authorize)])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost","127.0.0.1","testserver"])
@app.middleware("http")
async def log_request(request: Request, call_next):
    start=time.perf_counter()
    response=await call_next(request)
    logging.info("request method=%s status=%s duration_ms=%.1f",request.method,response.status_code,(time.perf_counter()-start)*1000)
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Cache-Control"]="no-store"
    return response
@app.exception_handler(ConnectorError)
async def connector_error(request,exc): return JSONResponse(status_code=503,content={"detail":"Connector unavailable"})
@app.get("/api/health")
def api_health(): return {"status":"ok"}
@app.get("/api/incidents")
def incidents(): return [r for r in LocalTickets().records() if r.kind=="incident"]
@app.get("/api/knowledge")
def knowledge(q: str=""):
    if len(q)>2000: raise HTTPException(422,"Query too long")
    return engine.search(q,"knowledge") if q else [r for r in LocalTickets().records() if r.kind=="knowledge"]
@app.post("/api/investigations",status_code=201)
async def create(body: InvestigateInput): return await engine.investigate(body.incident_id,body.question)
@app.get("/api/investigations")
def investigations(): return engine.history()
@app.get("/api/investigations/{iid}")
def get(iid: str): return {"id":iid,**engine.load(iid).model_dump()}
@app.get("/api/investigations/{iid}/graph")
def graph(iid: str): return engine.graph(iid)
@app.get("/api/investigations/{iid}/replay")
def replay(iid: str):
    engine.load(iid)
    with Session() as s: return events(s,iid)
@app.post("/api/investigations/{iid}/actions/{aid}/decision")
def decision(iid: str,aid: str,body: Decision): return engine.decide(iid,aid,body.decision,body.reason)
@app.get("/api/audit")
def audit():
    with Session() as s: return events(s)
@app.get("/api/connectors")
def connectors(): return health()
@app.get("/api/settings")
def config(): return {"provider":settings.provider,"model":settings.model or "deterministic","key_configured":bool(settings.provider_key.get_secret_value()),"authentication_enabled":bool(settings.api_token.get_secret_value()),"execution_enabled":False}
@app.get("/api/overview")
def overview():
    records=incidents()
    runs=engine.history()
    return {"active_incidents":sum(r.status!="resolved" for r in records),"investigations":len(runs),"pending_approvals":sum(a["status"]=="pending" for r in runs for a in r["actions"]),"sources":sum(c["status"]=="healthy" for c in health())}
