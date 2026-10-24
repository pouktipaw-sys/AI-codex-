from typing import Protocol
from sqlalchemy import select
from .db import Session, Record
from .models import Source
from .security import redact
class ConnectorError(Exception): pass
class Connector(Protocol):
    def records(self) -> list[Source]: ...
    def health(self) -> dict: ...
class LocalTickets:
    permissions = ["incidents:read","knowledge:read","changes:read"]
    def records(self):
        try:
            with Session() as s:
                records = [Source.model_validate_json(r.data) for r in s.scalars(select(Record))]
                return [r.model_copy(update={"body":redact(r.body),"title":redact(r.title)}) for r in records]
        except Exception as exc:
            raise ConnectorError("Local source unavailable") from exc
    def health(self):
        self.records()
        return dict(id="local",name="Demo ticket system",status="healthy",permissions=self.permissions,mode="fixture-backed")
class ExternalAdapter:
    def __init__(self,name): self.name=name
    def records(self): raise ConnectorError(f"{self.name} adapter is not implemented")
    def health(self): return dict(id=self.name.lower(),name=self.name,status="unavailable",permissions=["read-only planned"],mode="not implemented")
def health():
    try: local=LocalTickets().health()
    except ConnectorError: local=dict(id="local",name="Demo ticket system",status="unhealthy",permissions=LocalTickets.permissions,mode="fixture-backed")
    return [local]+[ExternalAdapter(n).health() for n in ["GitHub Issues","Jira","Slack","Notion"]]
