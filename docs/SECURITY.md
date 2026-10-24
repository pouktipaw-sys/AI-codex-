# Security threat model
Assets: source records, investigation history, decisions, provider keys, and backend token.
Trust boundaries: browser/API; MCP host/process; connector/evidence; provider/network; database/operator.

| Threat | Current control | Remaining exposure |
|---|---|---|
| Unauthorized API reads/writes | Optional constant-time bearer check on every endpoint; loopback startup | Single shared local identity; require SSO/RBAC and TLS before hosting |
| MCP overreach | Process scopes read/investigate; only read-only tools; no execution tool | Host users can change process environment; scopes are not user identity |
| Prompt injection | Evidence treated as data in system instructions; validated schema; provider cannot replace evidence, hypotheses or actions | Prompt wording is not a complete defense; model prose may be misleading |
| Secret exposure | Keys backend-only, no environment dumps, regex redaction before retrieval/output, no request-body logging | Regex redaction is incomplete; use enterprise DLP and data minimization for real data |
| Unsafe action | No execution adapters; approvals only persist decisions; required reason and CAS update | Real execution needs separate confirmation, identity, least privilege and idempotency |
| XSS | React text rendering; no raw HTML/Markdown injection | A compromised frontend origin could access tab token |
| Path traversal / command injection | No user-controlled filesystem reads or shell tool; IDs validated | Deployment infrastructure remains operator responsibility |
| Audit tampering | Per-investigation hash chains, transactional writes | DB admins can rewrite chains; no external anchoring or signed audit service |
| Supply-chain issues | pip-audit and npm audit commands; tracked lockfiles | Scans are point-in-time checks, not absence of vulnerabilities |
| Resource abuse | Input bounds and provider timeout | No rate limiting or tenant quotas yet |

The local fixture connector exposes the whole fictional organization to the local workspace. Do not use it as a multi-tenant authorization implementation. No external source is live. Live provider use sends retrieved evidence to the configured provider; use fictional/demo data until organizational data policies are established. Custom provider URLs are operator configuration, not user input.

Development servers bind to 127.0.0.1. Never expose them directly. Production requires TLS reverse proxy, restricted origins/hosts, request limits, SSO/RBAC, encrypted backups, dependency monitoring, migrations and external audit retention. Hash chains provide tamper evidence under a trusted anchor, not an immutable ledger.
