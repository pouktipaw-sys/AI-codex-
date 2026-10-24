import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import create_engine, String, Text, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings
class Base(DeclarativeBase): pass
class Record(Base):
    __tablename__ = "records"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[str] = mapped_column(Text)
class Investigation(Base):
    __tablename__ = "investigations"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[str] = mapped_column(Text)
class Event(Base):
    __tablename__ = "events"
    seq: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    investigation_id: Mapped[str] = mapped_column(String(80), index=True)
    timestamp: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(80))
    payload: Mapped[str] = mapped_column(Text)
    previous_hash: Mapped[str] = mapped_column(String(64))
    digest: Mapped[str] = mapped_column(String(64))
engine = create_engine(settings.database_url, connect_args={"check_same_thread":False} if settings.database_url.startswith("sqlite") else {})
Session = sessionmaker(engine)
def initialize():
    from .fixtures import RECORDS
    Base.metadata.create_all(engine)
    with Session.begin() as s:
        for r in RECORDS:
            if not s.get(Record,r.id): s.add(Record(id=r.id,data=r.model_dump_json()))
def event(s, investigation_id, kind, payload):
    previous = s.scalars(select(Event).where(Event.investigation_id==investigation_id).order_by(Event.seq.desc())).first()
    timestamp = datetime.now(timezone.utc).isoformat()
    body = json.dumps(payload,sort_keys=True)
    prev = previous.digest if previous else ""
    digest = hashlib.sha256((prev+investigation_id+timestamp+kind+body).encode()).hexdigest()
    s.add(Event(investigation_id=investigation_id,timestamp=timestamp,kind=kind,payload=body,previous_hash=prev,digest=digest))
    s.flush()
def events(s, investigation_id=None):
    q = select(Event).order_by(Event.seq)
    if investigation_id: q=q.where(Event.investigation_id==investigation_id)
    return [dict(seq=e.seq,investigation_id=e.investigation_id,timestamp=e.timestamp,kind=e.kind,payload=json.loads(e.payload),previous_hash=e.previous_hash,digest=e.digest) for e in s.scalars(q)]
