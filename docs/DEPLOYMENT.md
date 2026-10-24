# Free hosted interview demonstration

The default render.yaml uses one **Free** Docker web service in Frankfurt, no attached disk, no managed database and the deterministic local provider. The interface and FastAPI API are served from the same HTTPS origin.

## What is free, and what is limited
- The service compute plan is Free. No paid service, disk, domain or model API is required.
- Render sleeps Free services after 15 minutes without incoming traffic. Waking takes about one minute.
- SQLite is on the ephemeral filesystem: investigations, approval decisions and audit events can be lost on sleep, restart or redeploy. Fictional source records are seeded again. This is explicitly disclosed in the interface. Download reports to keep a local copy.
- Render grants 750 free instance hours per workspace/month. Bandwidth and build usage have separate included quotas.
- **To avoid overage charges, do not add a payment method and do not upgrade.** Render's current documentation says that without a payment method it suspends service/builds when relevant free quotas are exhausted. If the workspace already has a payment method, review its usage controls: the Free compute plan alone does not guarantee zero bandwidth/build overages.
- No keep-alive jobs bypass sleep. No expiring 30-day free Postgres database is provisioned.
- FLOW_FREE_HOSTING=true rejects non-local model providers or configured provider keys at startup.

This is an invited engineering demonstration, not an always-on production SLA or a durable audit store. Local development retains its normal persistent SQLite behavior.

## Deploy
Use the connected Render service-creation action with runtime docker, plan free, branch main and the repository URL:
https://github.com/pouktipaw-sys/AI-codex-

Required environment:
- FLOW_ENVIRONMENT=hosted
- FLOW_FREE_HOSTING=true
- FLOW_STORAGE_MODE=ephemeral
- FLOW_PROVIDER=local
- FLOW_DATABASE_URL=sqlite:////var/data/flowstate/flowstate.db
- FLOW_API_TOKEN: generate at least 32 random characters, never share this server key
- FLOW_DEMO_PASSWORD: generate at least 12 random characters, share privately with invited interviewers

The connected action does not read render.yaml automatically. Supply the same free plan and variables when creating the service. Never replace free with the default paid plan.

Alternatively, create the complete Blueprint here:
https://dashboard.render.com/blueprint/new?repo=https://github.com/pouktipaw-sys/AI-codex-

Both secrets are generated automatically by the Blueprint. Existing values are preserved. Reveal only FLOW_DEMO_PASSWORD in the service's Environment page for visitor access; do not reveal FLOW_API_TOKEN. Render provides the assigned hostname via RENDER_EXTERNAL_HOSTNAME.

## Verification
Wait for the specific deploy to reach live, then verify:
1. HTTPS frontend and assets load.
2. Anonymous /api/incidents access returns 401.
3. Correct password establishes a Secure/HttpOnly/SameSite cookie.
4. Northstar investigation resolves real fixture citations.
5. Graph and replay load; approval records intent and never executes.
6. Download report contains the actual investigation.
7. Sign out removes access; the interface explains ephemeral history.

Do not put a guessed onrender.com URL on a CV. Use only the URL returned by the service after successful verification.

## Access and storage
The public /healthz endpoint exposes minimal readiness. Data endpoints require a session or bearer token. Hosted mode refuses missing secrets or a missing frontend build. Cookie writes require the app's custom request header and matching Origin host if supplied. OpenAPI is disabled in hosted mode. Frame denial, CSP, HSTS and no-store headers are set.

The shared demo is not tenant-isolated: invited visitors see the same fictional data/history until reset. Sessions expire after eight hours. Rotate FLOW_API_TOKEN to invalidate all sessions.

For local container persistence, mount a Docker volume at /var/data (scripts/test_container.py exercises this). The free Render deployment deliberately has no such volume. Durable cloud storage would require a separately configured datastore; it is not claimed here.

References checked: https://render.com/docs/free and https://render.com/docs/blueprint-spec.


## Current verified service
The free demo is live at https://flowstate-ai-demo.onrender.com (verified 24 October 2026).
Manage it at https://dashboard.render.com/web/srv-dbed72q9lscs73apc420.
The service uses the Free compute plan and manual deployments. No paid disk or database was created. Retrieve the private visitor password from FLOW_DEMO_PASSWORD in the service Environment page; no secrets are stored in this repository.
