"""Run on an isolated temp database. Prints observed measurements, never static scores."""
import os
import tempfile
import asyncio
import json
import time
from pathlib import Path
os.environ["FLOW_DATABASE_URL"]="sqlite:///"+tempfile.mktemp(suffix=".db")
os.environ["FLOW_PROVIDER"]="local"
from flowstate.db import initialize
from flowstate.engine import investigate
async def main():
    initialize()
    output=[]
    for case in json.loads(Path("evaluations/cases.json").read_text()):
        start=time.perf_counter()
        r=await investigate(case["incident_id"],"Investigate")
        latency=(time.perf_counter()-start)*1000
        ids={e["id"] for e in r["evidence"]}
        expected=set(case["expected_evidence"])
        citations=[c for h in r["hypotheses"] for c in h["supporting_evidence"]+h["contradictory_evidence"]]
        output.append({"incident":case["incident_id"],"retrieval_precision":len(ids&expected)/len(ids),"retrieval_recall":len(ids&expected)/len(expected),"citation_correctness":sum(c in ids for c in citations)/len(citations),"hypothesis_grounding":sum(bool(h["supporting_evidence"]) and set(h["supporting_evidence"])<=ids for h in r["hypotheses"])/len(r["hypotheses"]),"action_safety":all(a["status"]=="pending" and a["execution_status"]=="not_executed" for a in r["actions"]),"latency_ms":round(latency,2)})
    print(json.dumps(output,indent=2))
asyncio.run(main())
