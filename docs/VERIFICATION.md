# Observed verification — 24 October 2026
Environment: Python 3.12.14, Node 24.19.0, Linux. Commands ran in this checkout.

| Check | Observed result |
|---|---|
| pytest -q | 27 passed |
| npm test --prefix frontend | 7 passed |
| npm run build --prefix frontend | TypeScript and Vite production build passed |
| Actual uvicorn startup and HTTP investigation | Passed on loopback with isolated SQLite database |
| MCP stdio handshake, tool discovery, permission/schema errors | Passed as part of pytest |
| pip-audit | No known vulnerabilities found after upgrades |
| npm audit --prefix frontend | 0 vulnerabilities |
| scripts/evaluate.py | Three fixture cases; observed output in evaluations/latest.json |

Pytest reports one Starlette TestClient/httpx deprecation warning; it does not fail the suite. Dependency scans are point-in-time observations, not a security guarantee. The initial scans found vulnerabilities in development tooling; pip, pytest and Vitest were upgraded before the final passing scans.

No live OpenAI, Anthropic, GitHub Issues, Jira, Slack or Notion connector calls were tested. Provider HTTP shape/validation and preservation of deterministic evidence were exercised with a fake HTTP client. PostgreSQL is not tested. Frontend interaction tests use jsdom and a mocked API; no full-browser rendering, screenshot or accessibility audit was performed. GitHub Actions is configured but its remote run is not claimed here.


Hosted-demo preparation also tests shared-password sessions, cookie security, expiry/tampering boundaries, login throttling, CSRF protection, host checks and startup secret requirements. The later free-service deployment was verified over HTTPS; details are below.


The production Docker image was built successfully. scripts/test_container.py passed against a real container: frontend index and assets, anonymous data denial, secure login cookie, investigation creation, nonexecuting approval, and persistence after container restart on a named volume. This checks local container persistence, not Render's managed disk or public HTTPS. Container OS package scanning and full-browser rendering were not performed.

Render preparation follow-up: the Blueprint with auto-generated demo password passed validation against the current public Render JSON Schema. The Render CLI is not installed, so no platform-aware CLI validation is claimed. Service provisioning was later performed through the connected Render action, as recorded below.

Free-mode follow-up: backend tests cover ephemeral-storage disclosure and rejection of non-local paid model configuration. Frontend tests cover the free-hosting notice and real report serialization/download cleanup. No durable storage is claimed for the free cloud service.


## Verified live free deployment
On 24 October 2026, Render deploy dep-dbed73a9lscs73apc6u0 reached live for service srv-dbed72q9lscs73apc420, source commit 1a20863cafbd844f930d92bb5cf36e9d36bac94c. The service details confirmed plan free and no attached disk.

Verified URL: https://flowstate-ai-demo.onrender.com

Actual HTTPS checks passed: frontend and compiled download feature, anonymous API denial, protected cookie login, local/no-key/free/ephemeral settings, Northstar source citations, graph with contradictory evidence, approval with not_executed status, replay including the approval event, audit access and logout denial. The smoke test created a fictional-data investigation with an explicitly labeled verification decision.

No full-browser rendering or remote file-download interaction was tested. The report serializer/download controls are covered by frontend tests. Free cloud history is temporary; durable persistence is not claimed. Deployment auto-updates are off to avoid unintended rebuilds and preserve the verified running version. Later documentation-only commits do not change that deployed application build.


## Incident-ledger redesign verification
The visual redesign passed all 7 frontend tests and TypeScript/Vite production build. npm audit reported zero known vulnerabilities after adding self-hosted IBM Plex Sans.

Actual local Chromium checks ran against the real FastAPI API with an isolated fictional SQLite database at 1440×1100 and 390×844 viewports. Login, populated overview, investigation creation, graph source inspection, absence of graph dot background, approval with a required reason, actual JSON report download containing the approved/not_executed decision, replay, knowledge search, connector-unavailable controls, and mobile layouts passed with no page JavaScript errors. A mobile login overflow found during testing was corrected before the passing run. Desktop and mobile screenshots were visually inspected. This supersedes the earlier local full-browser verification limitation for these flows; it is not a comprehensive accessibility audit or coverage of every browser.
