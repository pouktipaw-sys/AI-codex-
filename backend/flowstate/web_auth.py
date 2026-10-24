"""Local demo access: bounded shared-password sessions, never external identity."""
import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlsplit
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from .config import settings

router = APIRouter()
COOKIE = "flowstate_session"
SESSION_SECONDS = 8 * 60 * 60
_failures: dict[str, list[float]] = {}

def check_attempts(request: Request):
    now = time.monotonic()
    for key in list(_failures):
        _failures[key] = [t for t in _failures[key] if now-t < 60]
        if not _failures[key]:
            del _failures[key]
    identity = request.client.host if request.client else "unknown"
    if len(_failures.get(identity, [])) >= 8 or (identity not in _failures and len(_failures) >= 1024):
        raise HTTPException(429, "Too many attempts; retry in one minute")
    return identity

def valid_session(value: str | None) -> bool:
    if not value or not settings.api_token.get_secret_value():
        return False
    try:
        payload, signature = value.split(".")
        expected = hmac.new(settings.api_token.get_secret_value().encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(signature, expected):
            return False
        data = json.loads(base64.urlsafe_b64decode(payload.encode()))
        return 0 < int(data["expires"]) - time.time() <= SESSION_SECONDS
    except (ValueError, KeyError, TypeError):
        return False

def require_browser_request(request: Request):
    # Custom header prevents cross-origin forms and simple requests. No CORS is enabled.
    if request.headers.get("x-flowstate-request") != "1":
        raise HTTPException(403, "Use the FlowState application")
    origin = request.headers.get("origin")
    if origin and urlsplit(origin).netloc != request.headers.get("host"):
        raise HTTPException(403, "Cross-origin request denied")

class Login(BaseModel):
    password: str = Field(min_length=1, max_length=256)

@router.get("/api/session")
def session_status(request: Request):
    enabled = bool(settings.demo_password.get_secret_value())
    return {"required": enabled, "authenticated": not enabled or valid_session(request.cookies.get(COOKIE))}

@router.post("/api/session")
def login(body: Login, request: Request, response: Response):
    require_browser_request(request)
    expected = settings.demo_password.get_secret_value()
    if not expected:
        raise HTTPException(404, "Demo login is not enabled")
    identity = check_attempts(request)
    if not secrets.compare_digest(body.password.encode(), expected.encode()):
        _failures.setdefault(identity, []).append(time.monotonic())
        raise HTTPException(401, "Incorrect access password")
    _failures.pop(identity, None)
    payload = base64.urlsafe_b64encode(json.dumps({"expires":int(time.time())+SESSION_SECONDS,"nonce":secrets.token_hex(16)}).encode()).decode()
    signature = hmac.new(settings.api_token.get_secret_value().encode(), payload.encode(), hashlib.sha256).hexdigest()
    response.set_cookie(COOKIE, payload+"."+signature, httponly=True, secure=settings.environment=="hosted", samesite="strict", max_age=SESSION_SECONDS, path="/")
    return {"authenticated":True}

@router.delete("/api/session")
def logout(request: Request, response: Response):
    require_browser_request(request)
    response.delete_cookie(COOKIE, path="/", secure=settings.environment=="hosted", httponly=True, samesite="strict")
    return {"authenticated":False}
