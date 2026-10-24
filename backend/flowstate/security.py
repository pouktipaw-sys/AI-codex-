import re
import secrets
from fastapi import HTTPException, Header, Request
from .config import settings
def authorize(request: Request, authorization: str | None = Header(default=None)):
    if request.url.path == "/api/session":
        return
    from .web_auth import valid_session, require_browser_request, COOKIE
    expected=settings.api_token.get_secret_value()
    if expected and secrets.compare_digest(authorization or "", "Bearer "+expected):
        return
    if settings.demo_password.get_secret_value() and valid_session(request.cookies.get(COOKIE)):
        if request.method not in ("GET","HEAD","OPTIONS"):
            require_browser_request(request)
        return
    if expected or settings.demo_password.get_secret_value():
        raise HTTPException(401,"Authentication required")
def redact(text: str) -> str:
    text=re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._-]+",r"\1[REDACTED]",text)
    text=re.sub(r"(?i)((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+",r"\1[REDACTED]",text)
    return text
