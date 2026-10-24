# Hosted interview demonstration
The app now builds into one Docker image: Vite's production assets are served by FastAPI on the same origin. A shared-password login issues an HttpOnly, Secure, SameSite=Strict cookie for eight hours. API bearer authentication remains available for local tools; the generated API token is never displayed to visitors. Authentication is a demo access gate, not SSO or per-user identity.

## Deploy to Render
The checked-in render.yaml Blueprint declares one Docker web service in Frankfurt and a 1 GB persistent disk. **This uses Render's paid Starter plan plus disk billing. Review current charges in Render before creating the service.** No paid resource is created by editing the repository.

1. Sign in to Render and connect the GitHub account containing pouktipaw-sys/AI-codex-.
2. Create a Blueprint from that repository and review render.yaml.
3. Render automatically generates FLOW_DEMO_PASSWORD and FLOW_API_TOKEN. After deployment, reveal only FLOW_DEMO_PASSWORD in the service Environment page and share it privately with interviewers. Never share FLOW_API_TOKEN. Existing generated values are preserved on later syncs.
4. Review and accept Render's current service/disk charges before deploying.
5. Wait for the service's build and health check to pass. Render supplies the HTTPS URL and RENDER_EXTERNAL_HOSTNAME automatically.
6. Open the URL in a private browser window. Verify login, investigate Northstar, approve an action, sign out and sign back in. Restart the service and verify the history survives.
7. Only after that verification, add the actual URL to the README/CV. No live deployment URL is claimed in this repository.

The deployment uses local deterministic mode, fictional records and no action executor. One process/instance writes SQLite on /var/data/flowstate/flowstate.db. Do not scale horizontally or remove the disk. Persistent disks are not backups; configure backups/exports before relying on the history.

## One-click entry point
https://dashboard.render.com/blueprint/new?repo=https://github.com/pouktipaw-sys/AI-codex-

Choose this repository. The deployment requires a Render account, GitHub authorization if prompted, and acceptance of the displayed cost. Both secrets are generated automatically; no password entry is required at creation.

## Container run outside Render
After building the image:
```bash
docker volume create flowstate-data
docker run --rm --name flowstate \
  -p 127.0.0.1:8000:8000 \
  --mount source=flowstate-data,target=/var/data \
  --env-file .env.hosted \
  flowstate-demo:verified
```
Use a private .env.hosted file (never commit it) containing:
```dotenv
FLOW_ENVIRONMENT=hosted
FLOW_API_TOKEN=<random value of at least 32 characters>
FLOW_DEMO_PASSWORD=<unique password of at least 12 characters>
FLOW_DATABASE_URL=sqlite:////var/data/flowstate/flowstate.db
FLOW_ALLOWED_HOSTS=["localhost","127.0.0.1","your-domain.example"]
```
Secure cookies require HTTPS: terminate TLS at a trusted reverse proxy for browser login. Loopback HTTP is suitable only for readiness/API smoke checks with bearer auth. Port 8000 binds inside the container; the host binding above remains loopback-only.

## Access controls
- /healthz is a public minimal readiness endpoint for the platform.
- /api/session is public for login/status/logout; wrong-password attempts are limited to eight per minute per observed client IP per process.
- /api/* data routes require a valid session or bearer token.
- Cookie-authenticated writes and login/logout require the app's custom request header and matching Origin host when present. No CORS is enabled.
- Hosted startup refuses missing/short secrets or a missing frontend build.
- Hosts are restricted to explicit configuration plus Render's assigned hostname.
- Built frontend assets are public; they contain no credentials or source data.
- Hosted OpenAPI/Swagger UI is disabled. CSP, frame denial, HSTS and no-store headers are applied.

Shared visitors can see and alter the same fictional investigation history. This is intentional for a small invited demo. It is not a multi-tenant product. Sessions are stateless; sign-out clears the browser cookie, and rotating FLOW_API_TOKEN invalidates all sessions. Brute-force protection is in-memory and should be replaced with edge/shared rate limits for broader exposure.

## Current verification boundary
Local tests and container checks are documented in VERIFICATION.md. Render provisioning, HTTPS, disk persistence across Render restarts and actual public access must be confirmed on the deployed service. Do not describe the application as online until the platform returns a successful deployment and the access flow is verified.

The current Render connection can create web services but does not expose attached-disk or Blueprint-creation operations. This Blueprint applies the complete service and persistent disk together through the Dashboard. Creating only the web service via the connection would not attach the disk or make SQLite persistent.
