# FlowState AI
**Operational investigations with cited evidence, explicit uncertainty, and human decisions.**

FlowState correlates fictional incidents, service changes and runbooks into inspectable hypotheses. It includes an evidence graph, event replay, a safe action center, and eight MCP tools sharing the same Python engine as the web application.

This repository was empty at the start. The application is newly implemented. It is a runnable local engineering demonstration with production-oriented boundaries, not a claim of production readiness.

## Interview demo hosting
The default Render configuration uses the **Free** compute plan, no paid disk and no paid AI calls. It runs the real FastAPI backend and React interface behind a shared-password demo login. See [deployment instructions](docs/DEPLOYMENT.md). Free hosting sleeps after inactivity and loses local history on restart/redeploy; download investigation reports to keep a copy. **Live demo:** https://flowstate-ai-demo.onrender.com — invite-only password access. Ask the project owner for the demo password. Open the demo shortly before an interview to allow it to wake from idle.

## Quick start — Linux / WSL
Requires Python 3.11+ and Node 22.12+ (Node 24 recommended).
Run from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e '.[dev]'
cp .env.example .env
python -c 'from flowstate.db import initialize; initialize()'
npm ci --prefix frontend
uvicorn flowstate.api:app --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```bash
npm run dev --prefix frontend
```

Open **http://127.0.0.1:5173**. API reference: http://127.0.0.1:8000/docs.
Startup seeds missing demo records without overwriting existing records. Investigations and approval decisions persist in `flowstate.db`. No API key is required.

## What works
- Overview metrics from persisted records, incident selection, related incident history, knowledge search.
- Service-scoped evidence retrieval; deterministic hypotheses with support, contradictions, unknowns, verification steps and categorical confidence.
- Optional OpenAI-compatible / Anthropic structured-output wording; validated results and fallback on provider failure.
- Three-panel investigation workspace, source citations, source timeline, interactive React Flow graph.
- Replay from persisted events; per-investigation hash chaining.
- Approve/reject decisions with required reason, conflict protection and no external side effects.
- Read-only local ticket connector; visible health and permissions.
- Eight official-SDK MCP tools over stdio with process-level scope restrictions.
- Responsive dark UI, keyboard controls, safe text rendering.

## Verification
```bash
.venv/bin/pytest -q
npm test --prefix frontend
npm run build --prefix frontend
.venv/bin/python scripts/evaluate.py
.venv/bin/pip-audit
npm audit --prefix frontend
```

See [verification](docs/VERIFICATION.md) for actual observed results and limits. The fixture evaluation is deliberately small and does not measure general incident reasoning.

## Models and access
Edit the backend environment and restart:
- `FLOW_PROVIDER=local|openai|anthropic`
- `FLOW_MODEL`, `FLOW_PROVIDER_KEY`, `FLOW_PROVIDER_URL` (OpenAI-compatible endpoint only)
- `FLOW_API_TOKEN`: optional local bearer token; required before any non-local deployment
- `FLOW_DATABASE_URL`: SQLAlchemy URL; SQLite by default
- `FLOW_MCP_SCOPES=read,investigate`: MCP process permissions

With no key, the engine uses deterministic local results. Provider output can improve summary/draft wording; it cannot alter citations, hypotheses or actions. Live provider calls have not been verified without credentials. Settings display server configuration; model/secret changes are made in the environment, not the browser. Use the Settings token input if API authorization is enabled.

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Initial audit and plan](docs/AUDIT.md)
- [MCP integration](docs/MCP.md)
- [Connector development](docs/CONNECTORS.md)
- [Security threat model](docs/SECURITY.md)
- [Evaluation methodology](docs/EVALUATION.md)
- [Five-minute interview demo](docs/DEMO.md)
- [Roadmap](docs/ROADMAP.md)

## Troubleshooting
- WSL: keep the checkout in the Linux filesystem; install Python's venv package if `python3 -m venv` fails.
- Start both terminals from the repository root so the database and `.env` resolve consistently.
- Connection error: check backend port 8000; Vite proxies `/api` to loopback.
- Unauthorized: enter the configured `FLOW_API_TOKEN` in Settings. Never paste provider keys there.
- Database locked: use one backend process locally. PostgreSQL is the next deployment step.
- Provider error: deterministic output remains usable; the replay records fallback.
- Do not bind either development server to `0.0.0.0` for public access.

After installation, `./scripts/dev.sh` launches both local processes and stops the backend when the frontend exits. The checked-in `requirements.lock` records the verified Python environment; install it with `pip install -r requirements.lock` before `pip install -e '.[dev]'` for that exact dependency snapshot.
