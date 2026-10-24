from typing import Literal
from pydantic import BaseModel, Field
class Source(BaseModel):
    id: str
    kind: Literal["incident", "change", "knowledge"]
    title: str
    service: str
    body: str
    timestamp: str
    tags: list[str] = []
    status: str = "active"
class Hypothesis(BaseModel):
    id: str
    explanation: str
    supporting_evidence: list[str]
    contradictory_evidence: list[str]
    missing_information: list[str]
    verification_steps: list[str]
    confidence: Literal["low", "moderate", "strong"]
class Action(BaseModel):
    id: str
    title: str
    evidence: list[str]
    status: Literal["pending", "approved", "rejected"] = "pending"
    execution_status: str = "not_executed"
class Findings(BaseModel):
    incident_id: str
    summary: str
    evidence: list[Source]
    hypotheses: list[Hypothesis]
    actions: list[Action]
    customer_update: str
    provider: str = "local"
class InvestigateInput(BaseModel):
    incident_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    question: str = Field(default="Investigate authentication failures", max_length=2000)
class Decision(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: str = Field(min_length=3, max_length=1000)
class StoredFindings(Findings):
    id: str
class Draft(BaseModel):
    draft: str
    sent: Literal[False] = False
class IncidentReport(BaseModel):
    investigation_id: str
    findings: Findings
    root_cause_verified: Literal[False] = False
class ReplayEvent(BaseModel):
    seq: int
    investigation_id: str
    timestamp: str
    kind: str
    payload: dict
    previous_hash: str
    digest: str
