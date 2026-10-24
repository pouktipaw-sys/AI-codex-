from pathlib import Path
import pytest
from pydantic import SecretStr
from fastapi.testclient import TestClient
from flowstate.api import app
from flowstate.config import settings
from flowstate import web_auth
@pytest.fixture
def protected(monkeypatch):
    monkeypatch.setattr(settings,"api_token",SecretStr("a"*40))
    monkeypatch.setattr(settings,"demo_password",SecretStr("interview-only-password"))
    web_auth._failures.clear()
    with TestClient(app) as client:
        yield client
    web_auth._failures.clear()
def login(client):
    return client.post("/api/session",json={"password":"interview-only-password"},headers={"X-Flowstate-Request":"1","Origin":"http://testserver"})
def test_login_session_and_logout(protected):
    assert protected.get("/api/session").json()=={"required":True,"authenticated":False}
    assert protected.get("/api/incidents").status_code==401
    response=login(protected)
    assert response.status_code==200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert protected.get("/api/session").json()["authenticated"]
    assert protected.get("/api/incidents").status_code==200
    assert protected.post("/api/investigations",json={"incident_id":"INC-1042"}).status_code==403
    assert protected.post("/api/investigations",json={"incident_id":"INC-1042"},headers={"X-Flowstate-Request":"1"}).status_code==201
    assert protected.delete("/api/session",headers={"X-Flowstate-Request":"1"}).status_code==200
    assert protected.get("/api/incidents").status_code==401
def test_csrf_tampering_and_password_failures(protected):
    assert protected.post("/api/session",json={"password":"wrong"}).status_code==403
    assert protected.post("/api/session",json={"password":"wrong"},headers={"X-Flowstate-Request":"1","Origin":"https://other.example"}).status_code==403
    assert protected.post("/api/session",json={"password":"wrong"},headers={"X-Flowstate-Request":"1"}).status_code==401
    protected.cookies.set("flowstate_session","forged.cookie")
    assert protected.get("/api/incidents").status_code==401
    assert not web_auth.valid_session(None)
    assert not web_auth.valid_session("invalid")
def test_login_throttle(protected):
    for _ in range(8):
        assert protected.post("/api/session",json={"password":"wrong"},headers={"X-Flowstate-Request":"1"}).status_code==401
    assert login(protected).status_code==429
def test_hosted_requires_secrets_and_frontend(monkeypatch):
    monkeypatch.setattr(settings,"environment","hosted")
    monkeypatch.setattr(settings,"api_token",SecretStr(""))
    with pytest.raises(RuntimeError,match="strong API token"):
        with TestClient(app): pass
def test_public_health_does_not_expose_data(protected):
    assert protected.get("/healthz").json()=={"status":"ok"}
    assert protected.get("/api/settings").status_code==401
    assert protected.get("/api/unknown").status_code==404
    response=protected.get("/healthz")
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
def test_frontend_path_boundary(protected):
    assert protected.get("/%2e%2e/pyproject.toml").status_code==404
    assert protected.get("/missing.js").status_code==404
def test_production_cookie_and_headers(monkeypatch):
    monkeypatch.setattr(settings,"environment","hosted")
    monkeypatch.setattr(settings,"api_token",SecretStr("b"*40))
    monkeypatch.setattr(settings,"demo_password",SecretStr("interview-only-password"))
    # npm build is independently checked; this test supplies only the startup index.
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as directory:
        Path(directory,"index.html").write_text("<html></html>")
        monkeypatch.setattr(settings,"frontend_dir",directory)
        web_auth._failures.clear()
        with TestClient(app,base_url="https://testserver") as client:
            response=client.post("/api/session",json={"password":"interview-only-password"},headers={"X-Flowstate-Request":"1","Origin":"https://testserver"})
            assert response.status_code==200
            assert "Secure" in response.headers["set-cookie"]
            assert response.headers["strict-transport-security"]=="max-age=31536000"
            assert client.get("/api/incidents").status_code==200
def test_sessions_expire_after_eight_hours(protected, monkeypatch):
    assert login(protected).status_code==200
    token=protected.cookies.get("flowstate_session").strip('"')
    assert web_auth.valid_session(token)
    now=web_auth.time.time()
    monkeypatch.setattr(web_auth.time,"time",lambda:now+web_auth.SESSION_SECONDS+1)
    assert not web_auth.valid_session(token)
