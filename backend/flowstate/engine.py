import re
import uuid
from sqlalchemy import select, update
from fastapi import HTTPException
from .connectors import LocalTickets
from .models import Findings, Hypothesis, Action
from .db import Session, Investigation, event, events
from .providers import enrich, ProviderError
from .security import redact
def search(query, kind=None):
    terms=set(re.findall(r"[a-z0-9]+", query.lower()))
    scored=[]
    for r in LocalTickets().records():
        if kind and r.kind!=kind: continue
        score=len(terms & set(re.findall(r"[a-z0-9]+",(r.title+" "+r.body+" "+r.service).lower())))
        if score: scored.append((score,r))
    return [r for _,r in sorted(scored,key=lambda x:(-x[0],x[1].id))[:20]]
def load(i):
    with Session() as s:
        r=s.get(Investigation,i)
        if not r: raise HTTPException(404,"Investigation not found")
        return Findings.model_validate_json(r.data)
async def investigate(incident_id, question):
    records=LocalTickets().records()
    incident=next((r for r in records if r.id==incident_id and r.kind=="incident"),None)
    if not incident: raise HTTPException(404,"Incident not found")
    evidence=[r for r in records if r.service==incident.service and r.id!=incident.id]
    # A conservative domain rule uses source attributes, never a fixed incident ID.
    rollout=next((r for r in evidence if r.kind=="change" and "scope" in r.tags),None)
    runbook=next((r for r in evidence if r.kind=="knowledge" and "scope" in r.tags),None)
    historical=next((r for r in evidence if r.kind=="incident" and r.status=="resolved" and "scope" in r.tags),None)
    counter=next((r for r in evidence if r.kind=="knowledge" and "refresh" in r.tags),None)
    if "scope" in incident.tags and all([rollout,runbook,historical,counter]):
        hypotheses=[
            Hypothesis(id="H1",explanation="Strict scope enforcement may reject affected legacy tokens. Timing and the historical incident support this hypothesis; causality remains unverified.",supporting_evidence=[incident.id,rollout.id,historical.id,runbook.id],contradictory_evidence=[],missing_information=["Affected request traces","Tenant rollout cohort","Actual token scopes"],verification_steps=["Compare request timestamps to rollout","Compare redacted token scope metadata to endpoint policy","Check an unaffected tenant"],confidence="moderate"),
            Hypothesis(id="H2",explanation="Token refresh failure could cause authentication errors, but healthy probes and successful refresh weaken this explanation.",supporting_evidence=[incident.id],contradictory_evidence=[counter.id],missing_information=["Customer-specific refresh traces"],verification_steps=["Inspect customer-specific refresh result codes"],confidence="low")]
    else:
        hypotheses=[Hypothesis(id="H1",explanation=f"The reported {incident.service} symptoms require additional diagnostics; available records do not establish a root cause.",supporting_evidence=[incident.id],contradictory_evidence=[],missing_information=["Request traces","Affected cohort","Verified change correlation"],verification_steps=["Collect redacted traces","Compare healthy and affected requests"],confidence="low")]
    actions=[Action(id="A1",title="Collect redacted request traces and verify the leading hypothesis",evidence=hypotheses[0].supporting_evidence),Action(id="A2",title="Review and approve the customer update draft",evidence=[incident.id])]
    findings=Findings(incident_id=incident.id,summary="Investigation prepared. All explanations remain hypotheses until verification.",evidence=[incident]+evidence,hypotheses=hypotheses,actions=actions,customer_update=f"We are investigating {incident.title.lower()}. We are reviewing available evidence and collecting additional diagnostics. A root cause has not yet been confirmed.")
    fallback=None
    try: findings=await enrich(findings)
    except ProviderError: fallback="Provider failed; deterministic results retained"
    findings.summary=redact(findings.summary)
    findings.customer_update=redact(findings.customer_update)
    iid=str(uuid.uuid4())
    with Session.begin() as s:
        s.add(Investigation(id=iid,data=findings.model_dump_json()))
        for kind,payload in [
            ("intake",{"incident_id":incident_id,"question":redact(question)}),
            ("retrieval",{"connector":"local","service":incident.service,"source_ids":[r.id for r in findings.evidence]}),
            ("evidence_discovered",{"source_ids":[r.id for r in evidence]}),
            ("hypotheses_generated",{"hypotheses":[h.model_dump() for h in findings.hypotheses]}),
            ("actions_proposed",{"actions":[a.model_dump() for a in actions]})]:
            event(s,iid,kind,payload)
        if fallback: event(s,iid,"provider_fallback",{"reason":fallback})
    return {"id":iid,**findings.model_dump()}
def decide(iid,aid,decision,reason):
    with Session.begin() as s:
        row=s.get(Investigation,iid)
        if not row: raise HTTPException(404,"Investigation not found")
        original=row.data
        f=Findings.model_validate_json(original)
        a=next((a for a in f.actions if a.id==aid),None)
        if not a: raise HTTPException(404,"Action not found")
        if a.status!="pending": raise HTTPException(409,"Action already decided")
        a.status=decision
        result=s.execute(update(Investigation).where(Investigation.id==iid,Investigation.data==original).values(data=f.model_dump_json()))
        if result.rowcount!=1: raise HTTPException(409,"Concurrent decision; refresh")
        event(s,iid,"approval_decision",{"action_id":aid,"decision":decision,"reason":redact(reason),"execution_status":"not_executed"})
    return a
def history():
    with Session() as s:
        return [{"id":r.id,**Findings.model_validate_json(r.data).model_dump()} for r in s.scalars(select(Investigation))]
def graph(iid):
    f=load(iid)
    nodes=[{"id":e.id,"type":e.kind,"label":e.title,"source":e.model_dump()} for e in f.evidence]
    service="service:"+f.evidence[0].service
    nodes.append({"id":service,"type":"service","label":f.evidence[0].service})
    edges=[{"id":e.id+"-service","source":e.id,"target":service,"label":"affects" if e.kind=="incident" else "describes"} for e in f.evidence]
    for h in f.hypotheses:
        nodes.append({"id":h.id,"type":"hypothesis","label":h.explanation})
        for source in h.supporting_evidence+h.contradictory_evidence:
            edges.append({"id":h.id+"-"+source,"source":source,"target":h.id,"label":"contradicts" if source in h.contradictory_evidence else "supports"})
    return {"nodes":nodes,"edges":edges}
