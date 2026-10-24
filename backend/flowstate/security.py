import re
import secrets
from fastapi import HTTPException, Header
from .config import settings
def authorize(authorization: str | None = Header(default=None)):
    expected=settings.api_token.get_secret_value()
    if expected and not secrets.compare_digest(authorization or "", "Bearer "+expected):
        raise HTTPException(401,"Authentication required")
def redact(text: str) -> str:
    text=re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._-]+",r"\1[REDACTED]",text)
    text=re.sub(r"(?i)((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+",r"\1[REDACTED]",text)
    return text
