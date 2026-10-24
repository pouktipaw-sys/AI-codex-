import {useCallback, useEffect, useState} from 'react';
import {ArrowUpRight, BookOpen, Box, ChevronRight, Clock3, Download, LayoutDashboard, LoaderCircle, Search, Settings, ShieldCheck, Workflow, X} from 'lucide-react';
import {api} from './api';
import {Action, AuditEvent, Connector, Investigation, Source} from './types';
import {EvidenceGraph} from './Graph';
import {downloadReport} from './report';

const navigation = [
  ['Overview', LayoutDashboard], ['Investigations', Workflow], ['Knowledge', BookOpen],
  ['Connectors', Box], ['Action center', ShieldCheck], ['Audit trail', Clock3], ['Settings', Settings],
] as const;

function Badge({children}: {children: React.ReactNode}) {
  return <span className="badge">{children}</span>;
}

export function ActionCard({action, onDecision}: {action: Action; onDecision: (decision: string) => void}) {
  return <article className="action">
    <div className="row"><span className="eyebrow">{action.id}</span><Badge>{action.status}</Badge></div>
    <h3>{action.title}</h3>
    <p className="muted">Evidence: {action.evidence.join(', ')}</p>
    <small>Execution: {action.execution_status}. Approval records intent only.</small>
    {action.status === 'pending' && <div className="row buttons">
      <button onClick={() => onDecision('approved')}>Approve</button>
      <button className="secondary" onClick={() => onDecision('rejected')}>Reject</button>
    </div>}
  </article>;
}

export default function App({onSignOut}: {onSignOut?: () => void} = {}) {
  const [page, setPage] = useState('Overview');
  const [incidents, setIncidents] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Investigation[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [knowledge, setKnowledge] = useState<Source[]>([]);
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState('Why is Northstar experiencing authentication failures, has this happened before, and what should we do next?');
  const [selected, setSelected] = useState<Investigation>();
  const [tab, setTab] = useState('Findings');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState('');
  const [decision, setDecision] = useState<{run: Investigation; action: Action; value: string}>();
  const [reason, setReason] = useState('');
  const [replay, setReplay] = useState<AuditEvent[]>([]);

  const refresh = useCallback(async () => {
    const [i, r, c, a, m, s, k] = await Promise.all([
      api<Source[]>('/incidents'), api<Investigation[]>('/investigations'), api<Connector[]>('/connectors'),
      api<AuditEvent[]>('/audit'), api<Record<string, number>>('/overview'),
      api<Record<string, unknown>>('/settings'), api<Source[]>('/knowledge'),
    ]);
    setIncidents(i); setRuns(r); setConnectors(c); setAudit(a); setMetrics(m); setSettings(s); setKnowledge(k);
  }, []);

  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);

  async function start(incident: Source) {
    setBusy(true); setError('');
    try {
      const result = await api<Investigation>('/investigations', 'POST', {incident_id: incident.id, question});
      setSelected(result); setPage('Investigations'); setTab('Findings');
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function openReplay() {
    if (!selected) return;
    try { setReplay(await api<AuditEvent[]>('/investigations/' + selected.id + '/replay')); setTab('Replay'); }
    catch (e) { setError((e as Error).message); }
  }

  async function confirmDecision() {
    if (!decision) return;
    setBusy(true);
    try {
      await api('/investigations/' + decision.run.id + '/actions/' + decision.action.id + '/decision', 'POST', {decision: decision.value, reason});
      const result = await api<Investigation>('/investigations/' + decision.run.id);
      if (selected?.id === result.id) setSelected(result);
      await refresh(); setDecision(undefined); setReason('');
      setNotice('Decision recorded. No external action executed.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function cite(ids: string[]) {
    return <div className="citations">{ids.map(id => <button key={id} className="citation" onClick={() => {
      setTab('Evidence'); setNotice('Source ' + id + ' is listed in the evidence panel.');
    }}>{id}</button>)}</div>;
  }

  function downloadSelected() {
    if (!selected) return;
    try { downloadReport(selected); setNotice('Investigation report downloaded. This copy includes evidence and action decisions.'); }
    catch { setError('Unable to download the report. Please try again.'); }
  }

  const actions = runs.flatMap(run => run.actions.map(action => ({run, action})));
  const activeIncidents = incidents.filter(incident => incident.status !== 'resolved');
  const northstar = incidents.find(incident => incident.id === 'INC-1042');
  const pageDescription: Record<string, string> = {
    Overview: 'Open incidents, available records, and decisions awaiting review.',
    Investigations: 'Follow each hypothesis back to its source records.',
    Knowledge: 'Runbooks and reference material available to this workspace.',
    Connectors: 'Source availability and the permissions granted to each adapter.',
    'Action center': 'Review the evidence before recording an approval or rejection.',
    'Audit trail': 'Persisted proposals, retrievals, and human decisions in order.',
    Settings: 'Workspace access, model configuration, and storage behavior.',
  };

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#" aria-label="FlowState home" onClick={e => {e.preventDefault(); setPage('Overview');}}>
        <span className="brand-mark" aria-hidden="true">fs.</span><span className="brand-name">flowstate<small>OPERATIONS RECORD</small></span>
      </a>
      <div className="workspace-label"><span className="workspace-number">01</span><div>Northstar workspace<small>Fictional demonstration data</small></div></div>
      <p className="nav-label">INDEX</p>
      <nav aria-label="Workspace navigation">{navigation.map(([name, Icon], index) => <button
        key={name} aria-label={name} aria-current={page === name ? 'page' : undefined}
        className={page === name ? 'nav active' : 'nav'} onClick={() => {setPage(name); setError('');}}
      ><Icon size={17} aria-hidden="true"/><span className="nav-text">{name}</span>
        {name === 'Action center' ? <span className="count">{metrics.pending_approvals || 0}</span> : <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>}
      </button>)}</nav>
      <div className="sidebar-bottom"><div className="local-status">{settings.free_hosting === true ? 'FREE HOSTED DEMO' : 'LOCAL WORKSPACE'}</div>
        <p>Sources first.<br/>Decisions on the record.</p><div className="profile"><span className="workspace-number">OP</span><div>Operations team<small>Shared demo workspace</small></div></div>
      </div>
    </aside>
    <main>
      <header className="topbar"><span>Northstar <span aria-hidden="true">/</span> <strong>{page}</strong></span><div><Badge>FICTIONAL DATA</Badge><span className="top-status">{error ? 'Connection needs attention' : 'Investigation workspace'}</span>{onSignOut && <button className="sign-out" onClick={onSignOut}>Sign out</button>}</div></header>
      <div className="content">
        {settings.free_hosting === true && <div className="callout free-demo-notice" role="note"><p><strong>Free demonstration.</strong> The service can sleep when idle and may take a moment to wake up. {settings.storage_mode === 'ephemeral' && <>Investigation history may reset when the server restarts. Download a report to keep a copy.</>}</p></div>}
        {error && <div role="alert" className="alert">{error} <button className="text-button" onClick={() => setPage('Settings')}>Connection settings</button></div>}
        {notice && <div role="status" className="notice">{notice}<button aria-label="Dismiss notification" className="icon-button" onClick={() => setNotice('')}><X size={14}/></button></div>}
        <div className="page-heading"><div><span className="eyebrow">INCIDENT DESK / {String(navigation.findIndex(([name]) => name === page) + 1).padStart(2, '0')}</span><h1>{page === 'Overview' ? 'Operations log' : page}</h1><p className="muted">{pageDescription[page]}</p></div>
          <button className="secondary" disabled={busy} onClick={() => {setBusy(true); refresh().then(() => setNotice('Workspace refreshed.')).catch(e => setError(e.message)).finally(() => setBusy(false));}}>Refresh records</button>
        </div>

        {page === 'Overview' && <>
          <dl className="metric-grid metric-strip" aria-label="Workspace totals">{[
            ['Active incidents', metrics.active_incidents], ['Investigations', metrics.investigations],
            ['Pending approvals', metrics.pending_approvals], ['Healthy sources', metrics.sources],
          ].map(([label, value]) => <div className="metric" key={String(label)}><dt>{label}</dt><dd>{String(value ?? '—')}</dd></div>)}</dl>
          <section className="intake-section" aria-labelledby="intake-title">
            <div className="intake-main"><span className="eyebrow">OPEN A CASE</span><h2 id="intake-title">Investigate an incident</h2>
              <p>Begin with the reported symptoms. The investigation will collect related records and identify what still needs to be verified.</p>
              <label className="dossier-label" htmlFor="overview-question">Investigation question</label>
              <textarea id="overview-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000}/>
              <div className="row intake-meta"><small>{northstar ? northstar.id + ' / ' + northstar.service : 'Choose an incident from the register below'}</small>
                <button disabled={busy || !northstar} onClick={() => northstar && start(northstar)}>{busy && <LoaderCircle size={15} className="spin"/>}Investigate Northstar <ArrowUpRight size={15}/></button>
              </div>
            </div>
            <aside className="intake-context" aria-label="Available source records"><span className="eyebrow">SOURCE REGISTER</span>
              <p className="muted">Records available before retrieval. Relevance is established inside each investigation.</p>
              <div className="source-register">{knowledge.length ? knowledge.map(source => <button key={source.id} className="source-register-row" onClick={() => {setPage('Knowledge'); setQuery('');}}><span>{source.id}</span><strong>{source.title}</strong><small>{source.service}</small></button>) : <p className="muted">No knowledge records loaded.</p>}</div>
              <small>{connectors.filter(connector => connector.status === 'healthy').length} healthy connector{connectors.filter(connector => connector.status === 'healthy').length === 1 ? '' : 's'} / {knowledge.length} knowledge records</small>
            </aside>
          </section>
          <div className="ledger-layout">
            <section className="panel incident-register"><div className="section-title"><h2><span className="section-number">01</span> Incident register</h2><span className="eyebrow">{activeIncidents.length} OPEN</span></div>
              <div className="incident-register-head" aria-hidden="true"><span>Record</span><span>Incident / service</span><span>State</span></div>
              {activeIncidents.map(incident => <button className="record-button incident-row" key={incident.id} disabled={busy} onClick={() => start(incident)}><span className="incident-id">{incident.id}</span><span className="incident-title"><strong>{incident.title}</strong><small>{incident.service}</small></span><span className="incident-state">{incident.status}</span><ArrowUpRight size={14}/></button>)}
              {!activeIncidents.length && <p className="muted">No active incidents loaded.</p>}
            </section>
            <section className="panel"><div className="section-title"><h2><span className="section-number">02</span> Recent entries</h2><button className="text-button" onClick={() => setPage('Audit trail')}>View log <ChevronRight size={13}/></button></div>
              {audit.length ? <ol className="activity-list">{audit.slice(-5).reverse().map(event => <li className="activity" key={event.seq}><span className="activity-sequence">{String(event.seq).padStart(3, '0')}</span><div><strong>{event.kind.replaceAll('_', ' ')}</strong><small>{new Date(event.timestamp).toLocaleString()}</small></div></li>)}</ol> : <div className="empty"><p>No entries recorded.</p><small>An investigation creates the first entry.</small></div>}
            </section>
          </div>
        </>}

        {page === 'Investigations' && <>{!selected ? <section className="panel record-list"><h2>Investigation records</h2>
          {runs.map(run => <button className="record-button" key={run.id} onClick={() => {setSelected(run); setTab('Findings');}}><span className="incident-id">{run.incident_id}</span><div><strong>{run.summary}</strong><small>{run.id}</small></div><ChevronRight size={15}/></button>)}
          {!runs.length && <p className="muted">No investigation has been recorded yet.</p>}
          <h3>Start an investigation</h3><label className="dossier-label" htmlFor="case-question">Investigation question</label><textarea id="case-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000}/>
          {incidents.map(incident => <button className="record-button" key={incident.id} disabled={busy} onClick={() => start(incident)}><span className="incident-id">{incident.id}</span><span>{incident.title}</span><ArrowUpRight size={15}/></button>)}
        </section> : <>
          <div className="row investigation-tools"><button className="text-button" onClick={() => setSelected(undefined)}>← All investigations</button><button className="secondary" onClick={downloadSelected}><Download size={14}/> Download report</button></div>
          <div className="investigation-grid">
            <aside className="panel case-context"><span className="eyebrow">CASE FILE / {selected.incident_id}</span><h2>{selected.evidence[0].title}</h2><Badge>{selected.evidence[0].status}</Badge><p>{selected.evidence[0].body}</p><hr/>
              <h3>Related records</h3>{selected.evidence.slice(1).map(evidence => <button className="source-link" key={evidence.id} onClick={() => {setTab('Evidence'); setNotice('Inspect ' + evidence.id + ' in the center panel.');}}><small>{evidence.id} / {evidence.kind}</small>{evidence.title}</button>)}<hr/>
              <h3>Investigation history</h3>{runs.filter(run => run.incident_id === selected.incident_id).map(run => <button className="source-link" key={run.id} onClick={() => {setSelected(run); setTab('Findings');}}>{run.id.slice(0, 8)} / {run.provider}</button>)}
            </aside>
            <section className="panel center-panel"><div className="tabs" aria-label="Investigation views">{['Findings', 'Evidence', 'Graph', 'Replay'].map(view => <button className={tab === view ? 'selected' : ''} aria-pressed={tab === view} key={view} onClick={() => view === 'Replay' ? openReplay() : setTab(view)}>{view}</button>)}</div>
              {tab === 'Findings' && <><div className="assistant-heading"><div><strong>FlowState investigator</strong><small>{selected.provider === 'local' ? 'Deterministic local engine' : selected.provider}</small></div><Badge>UNVERIFIED</Badge></div><p>{selected.summary}</p><h2>Working hypotheses</h2>
                {selected.hypotheses.map(hypothesis => <article className="hypothesis" key={hypothesis.id}><div className="row"><span className="eyebrow">HYPOTHESIS / {hypothesis.id}</span><Badge>{hypothesis.confidence} confidence</Badge></div><p>{hypothesis.explanation}</p><h4>Supporting evidence</h4>{cite(hypothesis.supporting_evidence)}
                  {hypothesis.contradictory_evidence.length > 0 && <><h4>Contradictory evidence</h4>{cite(hypothesis.contradictory_evidence)}</>}
                  <h4>Still unknown</h4><ul>{hypothesis.missing_information.map(text => <li key={text}>{text}</li>)}</ul><h4>Verification steps</h4><ol>{hypothesis.verification_steps.map(text => <li key={text}>{text}</li>)}</ol>
                </article>)}
                <div className="callout"><p>Sources establish correlation, not a verified root cause. Approval never triggers external execution.</p></div>
              </>}
              {tab === 'Evidence' && [...selected.evidence].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map(evidence => <article key={evidence.id}><span className="eyebrow">{evidence.id} / {evidence.kind}</span><h3>{evidence.title}</h3><p>{evidence.body}</p><small>{evidence.timestamp} / local demo connector</small></article>)}
              {tab === 'Graph' && <EvidenceGraph id={selected.id}/>}
              {tab === 'Replay' && <><h2>Investigation replay</h2>{replay.map((event, index) => <article key={event.seq}><span className="eyebrow">STEP {String(index + 1).padStart(2, '0')} / {new Date(event.timestamp).toLocaleTimeString()}</span><h3>{event.kind.replaceAll('_', ' ')}</h3><pre>{JSON.stringify(event.payload, null, 2)}</pre></article>)}</>}
            </section>
            <aside className="panel decision-column"><span className="eyebrow">DECISION REGISTER</span><h3>Recommended actions</h3>
              {selected.actions.map(action => <ActionCard key={action.id} action={action} onDecision={value => {setReason(''); setDecision({run: selected, action, value});}}/>)}<hr/>
              <h3>Customer update</h3><Badge>UNSENT DRAFT</Badge><p>{selected.customer_update}</p><button className="secondary" onClick={() => {navigator.clipboard.writeText(selected.customer_update).then(() => setNotice('Draft copied. Nothing sent.')).catch(() => setError('Clipboard unavailable; select and copy the draft text.'));}}>Copy draft</button><hr/>
              <h3>Evidence sources</h3><small>{selected.evidence.length} records / local fixture-backed connector</small>
            </aside>
          </div>
        </>}</>}

        {page === 'Knowledge' && <><form className="search-box" onSubmit={e => {e.preventDefault(); api<Source[]>('/knowledge?q=' + encodeURIComponent(query)).then(setKnowledge).catch(e => setError(e.message));}}><Search size={17} aria-hidden="true"/><input aria-label="Search knowledge" placeholder="Search runbooks and source records" value={query} onChange={e => setQuery(e.target.value)} maxLength={2000}/><button>Search</button></form>
          <div className="knowledge-list">{knowledge.map(record => <article className="panel knowledge-entry" key={record.id}><div><span className="eyebrow">{record.id} / {record.service}</span><h2>{record.title}</h2></div><div><p>{record.body}</p><small>Local demo connector / {record.timestamp}</small></div></article>)}</div>{!knowledge.length && <p>No matching knowledge articles.</p>}
        </>}

        {page === 'Connectors' && <div className="connector-list">{connectors.map(connector => <article className="panel connector-row" key={connector.id}><div><span className="eyebrow">SOURCE / {connector.id}</span><h2>{connector.name}</h2><p>{connector.mode}</p></div><div><h4>Permissions</h4><p className="muted">{connector.permissions.join(' / ')}</p></div><div className="connector-status"><Badge>{connector.status}</Badge>{connector.status === 'healthy' ? <button className="secondary" onClick={() => refresh().then(() => setNotice('Connector health checked.')).catch(e => setError(e.message))}>Check health</button> : <button disabled>Adapter unavailable</button>}</div></article>)}</div>}

        {page === 'Action center' && <><div className="callout"><p>Human decisions are recorded locally. External execution is disabled.</p></div><div className="action-register">{actions.map(({run, action}) => <section className="panel action-register-entry" key={run.id + action.id}><span className="eyebrow">{run.incident_id} / {run.id.slice(0, 8)}</span><ActionCard action={action} onDecision={value => {setReason(''); setDecision({run, action, value});}}/><button className="text-button" onClick={() => {setSelected(run); setPage('Investigations'); setTab('Evidence');}}>Inspect supporting evidence →</button></section>)}</div>{!actions.length && <p>Investigate an incident to propose actions.</p>}</>}

        {page === 'Audit trail' && <section className="panel"><p className="muted">Persisted events with per-investigation hash chains. Database administrators can rewrite chains; external anchoring is future work.</p>{audit.map(event => <details key={event.seq}><summary><span className="eyebrow">#{event.seq}</span> {event.kind.replaceAll('_', ' ')} <small>{new Date(event.timestamp).toLocaleString()}</small></summary><pre>{JSON.stringify(event, null, 2)}</pre></details>)}{!audit.length && <p>No audit events yet.</p>}</section>}

        {page === 'Settings' && <div className="settings-layout"><section className="panel"><span className="eyebrow">01 / CONNECTION</span><h2>Workspace access</h2><p className="muted">If the server requires a bearer token, enter it here. Stored in this browser tab’s session only.</p><label>API token<input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)}/></label><button onClick={() => {token ? sessionStorage.setItem('flow-token', token) : sessionStorage.removeItem('flow-token'); setToken(''); refresh().then(() => {setError(''); setNotice('Connection updated.');}).catch(e => setError(e.message));}}>Save connection</button></section>
          <section className="panel"><span className="eyebrow">02 / INVESTIGATION ENGINE</span><h2>Model configuration</h2><dl className="settings-facts"><div><dt>Provider</dt><dd>{String(settings.provider || 'unknown')}</dd></div><div><dt>Model</dt><dd>{String(settings.model || 'unknown')}</dd></div><div><dt>Provider key configured</dt><dd>{settings.key_configured ? 'Yes' : 'No'}</dd></div><div><dt>External execution</dt><dd>Disabled</dd></div></dl><p className="muted">Configure FLOW_PROVIDER, FLOW_MODEL and FLOW_PROVIDER_KEY in the backend environment and restart. Secrets are never sent to the browser. With no key, the engine uses the local deterministic fallback.</p><h3>Demo behavior</h3><p>{settings.storage_mode === 'ephemeral' ? 'This free demo uses temporary server storage. Investigations and approval history may be reset on restart or redeploy. Download an investigation report to retain its evidence and decisions.' : 'Fictional records are seeded once. Investigation and approval history persist across restarts. No reset button deletes your history.'}</p></section>
        </div>}
      </div>
      <footer><span>FLOWSTATE / OPERATIONS RECORD</span><span>Fictional source data. Human decisions.</span></footer>
    </main>
    {decision && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="decision-title" onKeyDown={e => {
      if (e.key === 'Escape') {setDecision(undefined); return;}
      if (e.key === 'Tab') {const controls = e.currentTarget.querySelectorAll<HTMLElement>('textarea,button:not(:disabled)'); const first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus();} else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first?.focus();}}
    }}><span className="eyebrow">DECISION / {decision.action.id}</span><h2 id="decision-title">{decision.value === 'approved' ? 'Approve' : 'Reject'} action</h2><p>{decision.action.title}</p><p>Evidence: {decision.action.evidence.join(', ')}</p><p className="muted">This decision is recorded. Nothing will be sent or executed.</p><label>Decision reason<textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} maxLength={1000}/></label><div className="row buttons"><button disabled={busy || reason.trim().length < 3} onClick={confirmDecision}>Record decision</button><button className="secondary" onClick={() => setDecision(undefined)}>Cancel</button></div></section></div>}
  </div>;
}
