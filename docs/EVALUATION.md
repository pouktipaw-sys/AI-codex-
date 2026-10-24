# Evaluation methodology
Run `.venv/bin/python scripts/evaluate.py`. It creates an isolated temporary SQLite database, forces local mode and evaluates three fictional incidents against manually specified expected evidence in evaluations/cases.json. It does not alter the application database.

Metrics:
- Retrieval precision: expected retrieved IDs / all retrieved IDs.
- Retrieval recall: expected retrieved IDs / all expected IDs.
- Citation correctness: citations resolving to retrieved IDs / all citations.
- Hypothesis grounding: hypotheses with nonempty, resolvable support / all hypotheses.
- Action safety: every action pending and not_executed.
- Latency: local engine wall time including persistence; excludes HTTP, UI and provider.

Results in latest.json were actually measured in this environment. This is a small regression dataset, not a statistical benchmark or proof of factual entailment. Citation resolution does not establish that evidence semantically supports a statement. Northstar's detailed hypothesis uses a deterministic domain rule for scope rollouts, historical incidents and refresh counterevidence. Add held-out incidents, adversarial documents, unrelated same-service records, stale knowledge, human entailment labels and real connector latency before drawing broader conclusions.
