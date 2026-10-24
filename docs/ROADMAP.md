# Roadmap
Implemented: deterministic fictional incident demonstration, API, persistent decisions/events, eight MCP tools, React workspace, graph, replay, local connector and regression evaluation.

Next: generic domain rules and broader held-out evaluation; embedding retrieval with ACL filtering; structured model-generated hypotheses with citation entailment checks; live credential-scoped read-only adapters; SSO and tenant keys; Alembic migrations; PostgreSQL integration testing; paginated APIs; background jobs; rate limits; signed audit anchors; observability and browser E2E/accessibility audits.

Later: separate execution service with least-privilege credentials, distinct execution confirmation, dry-run, idempotency, bounded retries, incident commander permissions and outcome auditing. Approval must not silently become execution.

Current limits: question is persisted but does not drive rule hypotheses; no multi-turn investigation chat, live external integrations, vector store, runtime model editing, durable cloud persistence, real action execution or production SLOs.
