"""Exercise the built image without publishing ports beyond loopback or retaining test data."""
import json
import os
import secrets
import subprocess
import time
import urllib.request
import urllib.error
import uuid

prefix = ["env","-u","DOCKER_HOST","-u","DOCKER_CONTEXT","-u","DOCKER_TLS","-u","DOCKER_TLS_VERIFY","-u","DOCKER_CERT_PATH","docker","--host=unix:///var/run/docker.sock"]
name = "flowstate-check-"+uuid.uuid4().hex[:10]
volume = name+"-data"
runtime_env = {
    **os.environ,
    "FLOW_ENVIRONMENT":"hosted",
    "FLOW_API_TOKEN":secrets.token_urlsafe(40),
    "FLOW_DEMO_PASSWORD":secrets.token_urlsafe(24),
    "FLOW_DATABASE_URL":"sqlite:////var/data/flowstate/flowstate.db",
}
def docker(*args):
    return subprocess.check_output(prefix+list(args),env=runtime_env,text=True).strip()
def request(path, method="GET", body=None, headers=None):
    req = urllib.request.Request(base+path, method=method, data=json.dumps(body).encode() if body else None, headers={"Content-Type":"application/json",**(headers or {})})
    return urllib.request.urlopen(req, timeout=5)
def wait_ready():
    for _ in range(100):
        try:
            with request("/healthz") as response:
                assert json.load(response)["status"]=="ok"
            return
        except (OSError, AssertionError):
            time.sleep(.1)
    raise RuntimeError("Container did not become ready")
try:
    docker("volume","create",volume)
    docker("run","-d","--name",name,"-p","127.0.0.1::8000","--mount",f"source={volume},target=/var/data",
           "--env","FLOW_ENVIRONMENT","--env","FLOW_API_TOKEN","--env","FLOW_DEMO_PASSWORD","--env","FLOW_DATABASE_URL","flowstate-demo:verified")
    port=docker("port",name,"8000/tcp").rsplit(":",1)[1]
    base="http://127.0.0.1:"+port
    wait_ready()
    with request("/") as response:
        html=response.read().decode()
        assert "FlowState AI" in html and "/assets/" in html
    import re
    asset=re.search(r'src="([^"]+\.js)"',html).group(1)
    with request(asset) as response:
        assert response.status==200
    try:
        request("/api/incidents")
        raise AssertionError("Anonymous data access accepted")
    except urllib.error.HTTPError as error:
        assert error.code==401
    with request("/api/session","POST",{"password":runtime_env["FLOW_DEMO_PASSWORD"]},{"X-Flowstate-Request":"1","Origin":base}) as response:
        cookie=response.headers["Set-Cookie"].split(";",1)[0]
        assert "Secure" in response.headers["Set-Cookie"]
    headers={"Cookie":cookie,"X-Flowstate-Request":"1","Origin":base}
    with request("/api/investigations","POST",{"incident_id":"INC-1042"},headers) as response:
        investigation=json.load(response)
    iid=investigation["id"]
    with request(f"/api/investigations/{iid}/actions/A1/decision","POST",{"decision":"approved","reason":"Container persistence check"},headers) as response:
        assert json.load(response)["execution_status"]=="not_executed"
    docker("restart",name)
    port=docker("port",name,"8000/tcp").rsplit(":",1)[1]
    base="http://127.0.0.1:"+port
    headers["Origin"]=base
    wait_ready()
    with request("/api/investigations/"+iid,headers=headers) as response:
        assert json.load(response)["actions"][0]["status"]=="approved"
    print("Container: frontend assets, anonymous denial, secure login, investigation, approval and persistence across restart all passed.")
finally:
    subprocess.run(prefix+["rm","-f",name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(prefix+["volume","rm",volume],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
