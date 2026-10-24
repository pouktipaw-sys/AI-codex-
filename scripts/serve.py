"""Container entrypoint. Persistent directory initialization precedes privilege drop."""
import os
from pathlib import Path
import uvicorn

if os.getuid() == 0:
    data = Path("/var/data/flowstate")
    data.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chown(data, 10001, 10001)
    os.setgroups([])
    os.setgid(10001)
    os.setuid(10001)

uvicorn.run("flowstate.api:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), workers=1, proxy_headers=True, access_log=False)
