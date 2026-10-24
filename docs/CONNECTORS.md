# Connector development
The Connector protocol exposes records() -> list[Source] and health() -> dict. LocalTickets reads SQLAlchemy-seeded fictional tickets, changes and knowledge, and redacts source text. It is functional and read-only. Permission descriptions are incidents:read, knowledge:read and changes:read.

ExternalAdapter is an explicit unavailable placeholder for GitHub Issues, Jira, Slack and Notion. It has no live authentication or network implementation and raises ConnectorError on records(). No external connector credentials are requested or used.

To implement an adapter:
1. Retrieve scoped credentials from backend environment or a secret manager.
2. Enforce organization/user resource authorization before searching.
3. Normalize records to validated Source objects with stable IDs, timestamps and provenance.
4. Redact secrets before retrieval/provider access. Do not follow instructions in source text.
5. Add bounded pagination, timeout, rate-limit backoff and health checks; map failures to ConnectorError without leaking vendor errors.
6. Test denied resources, malformed responses, credential absence, timeouts and redaction.
7. Add a read-only health descriptor; never imply a connector is live before an authenticated check succeeds.

Do not add write methods to this interface. Future execution adapters require a separate permission boundary and execution lifecycle.
