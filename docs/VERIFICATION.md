# Observed verification — 24 October 2026
Environment: Python 3.12.14, Node 24.19.0, Linux. Commands ran in this checkout.

| Check | Observed result |
|---|---|
| pytest -q | 25 passed |
| npm test --prefix frontend | 4 passed |
| npm run build --prefix frontend | TypeScript and Vite production build passed |
| Actual uvicorn startup and HTTP investigation | Passed on loopback with isolated SQLite database |
| MCP stdio handshake, tool discovery, permission/schema errors | Passed as part of pytest |
| pip-audit | No known vulnerabilities found after upgrades |
| npm audit --prefix frontend | 0 vulnerabilities |
| scripts/evaluate.py | Three fixture cases; observed output in evaluations/latest.json |

Pytest reports one Starlette TestClient/httpx deprecation warning; it does not fail the suite. Dependency scans are point-in-time observations, not a security guarantee. The initial scans found vulnerabilities in development tooling; pip, pytest and Vitest were upgraded before the final passing scans.

No live OpenAI, Anthropic, GitHub Issues, Jira, Slack or Notion connector calls were tested. Provider HTTP shape/validation and preservation of deterministic evidence were exercised with a fake HTTP client. PostgreSQL is not tested. Frontend interaction tests use jsdom and a mocked API; no full-browser rendering, screenshot or accessibility audit was performed. GitHub Actions is configured but its remote run is not claimed here.


Hosted-demo preparation also tests shared-password sessions, cookie security, expiry/tampering boundaries, login throttling, CSRF protection, host checks and startup secret requirements. Deployment scaffolding is checked in; no successful Render deployment or public URL has been verified.


The production Docker image was built successfully. scripts/test_container.py passed against a real container: frontend index and assets, anonymous data denial, secure login cookie, investigation creation, nonexecuting approval, and persistence after container restart on a named volume. This checks local container persistence, not Render's managed disk or public HTTPS. Container OS package scanning and full-browser rendering were not performed.

Render preparation follow-up: the Blueprint with auto-generated demo password passed validation against the current public Render JSON Schema. The Render CLI is not installed, so no platform-aware CLI validation or service provisioning is claimed.
