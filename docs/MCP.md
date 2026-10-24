# MCP integration
FlowState uses the official Python MCP SDK with FastMCP and stdio. It invokes the same engine and database as FastAPI. Initialize the database first; launch from the repository root.

```bash
.venv/bin/python -m flowstate.mcp_server
```

The eight tools are list_incidents, investigate_incident, search_knowledge, find_related_incidents, summarize_findings, draft_customer_update, generate_incident_report and get_investigation_history. Tool docstrings and annotations provide discovery descriptions and JSON input schemas. The SDK translates exceptions into tool errors. Output domain objects are validated by Pydantic and JSON serialized. None of these tools executes actions or sends messages.

Claude Code example (replace absolute paths):
```json
{
  "mcpServers": {
    "flowstate": {
      "command": "/absolute/path/AI-codex-/.venv/bin/python",
      "args": ["-m", "flowstate.mcp_server"],
      "env": {
        "FLOW_DATABASE_URL": "sqlite:////absolute/path/AI-codex-/flowstate.db",
        "FLOW_MCP_SCOPES": "read,investigate"
      }
    }
  }
}
```

Codex ~/.codex/config.toml example:
```toml
[mcp_servers.flowstate]
command = "/absolute/path/AI-codex-/.venv/bin/python"
args = ["-m", "flowstate.mcp_server"]

[mcp_servers.flowstate.env]
FLOW_DATABASE_URL = "sqlite:////absolute/path/AI-codex-/flowstate.db"
FLOW_MCP_SCOPES = "read,investigate"
```

Remove investigate from scopes for read-only access. HTTP bearer tokens do not authenticate stdio: the host's process-launch permission is the trust boundary. Keep these local configurations and database files restricted to the intended operator. Connect both API and MCP to the same absolute database URL to share results.

Demo prompts: list incidents; investigate INC-1042; use the returned investigation ID to summarize findings, draft a customer update and retrieve history. Drafts are returned as text only.
