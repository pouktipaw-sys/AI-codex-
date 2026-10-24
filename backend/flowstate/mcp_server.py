"""MCP stdio transport; permission scoped with FLOW_MCP_SCOPES."""
import os
from typing import Annotated
from pydantic import Field
from mcp.server.fastmcp import FastMCP
from .db import initialize, Session, events
from . import engine
from .models import InvestigateInput, Source, Findings, StoredFindings, Draft, IncidentReport, ReplayEvent
from .connectors import LocalTickets
mcp=FastMCP("FlowState AI")
def permit(scope):
    if scope not in os.getenv("FLOW_MCP_SCOPES","read,investigate").split(","):
        raise PermissionError("Permission denied: "+scope)
@mcp.tool()
def list_incidents() -> list[Source]:
    """List authorized incident records from the read-only local connector."""
    permit("read")
    return [r for r in LocalTickets().records() if r.kind=="incident"]
@mcp.tool()
async def investigate_incident(incident_id: Annotated[str,Field(min_length=1,max_length=80)],question: Annotated[str,Field(max_length=2000)]="Investigate incident") -> StoredFindings:
    """Retrieve evidence and persist grounded hypotheses and proposed actions. Never execute actions."""
    permit("investigate")
    value=InvestigateInput(incident_id=incident_id,question=question)
    return StoredFindings.model_validate(await engine.investigate(value.incident_id,value.question))
@mcp.tool()
def search_knowledge(query: Annotated[str,Field(min_length=1,max_length=2000)]) -> list[Source]:
    """Search authorized knowledge articles using deterministic lexical retrieval."""
    permit("read")
    return engine.search(query,"knowledge")
@mcp.tool()
def find_related_incidents(incident_id: Annotated[str,Field(min_length=1,max_length=80)]) -> list[Source]:
    """Find incidents sharing the source incident's affected service."""
    permit("read")
    records=LocalTickets().records()
    source=next((r for r in records if r.id==incident_id and r.kind=="incident"),None)
    if source is None: raise ValueError("Incident not found")
    return [r for r in records if r.kind=="incident" and r.service==source.service and r.id!=source.id]
@mcp.tool()
def summarize_findings(investigation_id: Annotated[str,Field(min_length=1,max_length=80)]) -> Findings:
    """Read a persisted investigation with validated evidence and uncertainty."""
    permit("read")
    return engine.load(investigation_id)
@mcp.tool()
def draft_customer_update(investigation_id: Annotated[str,Field(min_length=1,max_length=80)]) -> Draft:
    """Return an unsent customer update draft. No messages are sent."""
    permit("read")
    return Draft(draft=engine.load(investigation_id).customer_update)
@mcp.tool()
def generate_incident_report(investigation_id: Annotated[str,Field(min_length=1,max_length=80)]) -> IncidentReport:
    """Generate a structured incident report from persisted, cited findings."""
    permit("read")
    return IncidentReport(investigation_id=investigation_id,findings=engine.load(investigation_id))
@mcp.tool()
def get_investigation_history(investigation_id: Annotated[str,Field(min_length=1,max_length=80)]) -> list[ReplayEvent]:
    """Read persisted replay events including proposals and approval decisions."""
    permit("read")
    engine.load(investigation_id)
    with Session() as s: return [ReplayEvent.model_validate(e) for e in events(s,investigation_id)]
if __name__=="__main__":
    initialize()
    mcp.run(transport="stdio")
