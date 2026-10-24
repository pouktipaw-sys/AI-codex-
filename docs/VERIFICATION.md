# Observed verification — 24 October 2026
Environment: Python 3.12.14, Node 24.19.0, Linux. Commands ran in this checkout.

| Check | Observed result |
|---|---|
| pytest -q | 17 passed |
| npm test --prefix frontend | 3 passed |
| npm run build --prefix frontend | TypeScript and Vite production build passed |
| Actual uvicorn startup and HTTP investigation | Passed on loopback with isolated SQLite database |
| MCP stdio handshake, tool discovery, permission/schema errors | Passed as part of pytest |
| pip-audit | No known vulnerabilities found after upgrades |
| npm audit --prefix frontend | 0 vulnerabilities |
| scripts/evaluate.py | Three fixture cases; observed output in evaluations/latest.json |

Pytest reports one Starlette TestClient/httpx deprecation warning; it does not fail the suite. Dependency scans are point-in-time observations, not a security guarantee. The initial scans found vulnerabilities in development tooling; pip, pytest and Vitest were upgraded before the final passing scans.

No live OpenAI, Anthropic, GitHub Issues, Jira, Slack or Notion connector calls were tested. Provider HTTP shape/validation and preservation of deterministic evidence were exercised with a fake HTTP client. PostgreSQL is not tested. Frontend interaction tests use jsdom and a mocked API; no full-browser rendering, screenshot or accessibility audit was performed. GitHub Actions is configured but its remote run is not claimed here.
