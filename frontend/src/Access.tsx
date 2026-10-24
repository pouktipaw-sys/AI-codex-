import {useEffect, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {api} from './api';
import App from './App';

type Session = {required: boolean; authenticated: boolean};

export default function Access() {
  const [session, setSession] = useState<Session>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    try {
      setSession(await api<Session>('/session'));
      setError('');
    } catch {
      setError('The server is unavailable. Please retry.');
    }
  }

  useEffect(() => {
    check();
    const expired = () => setSession(previous => previous?.required ? {required: true, authenticated: false} : previous);
    window.addEventListener('flowstate-unauthorized', expired);
    return () => window.removeEventListener('flowstate-unauthorized', expired);
  }, []);

  async function signOut() {
    try {
      await api('/session', 'DELETE');
      setSession({required: true, authenticated: false});
    } catch {
      setError('Unable to sign out. Please retry.');
    }
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/session', 'POST', {password});
      setPassword('');
      await check();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return <div className="access-screen"><section className="access-loading" aria-live="polite">
      <div className="access-brand"><span className="brand-mark">FS</span><span>FlowState AI</span></div>
      <p>{error || 'Opening the incident desk…'}</p>
      {error && <button onClick={check}>Retry</button>}
    </section></div>;
  }

  if (!session.required || session.authenticated) {
    return <>
      {session.required && <button className="sign-out secondary" onClick={signOut}>Sign out</button>}
      <App/>
      {error && <p role="alert">{error}</p>}
    </>;
  }

  return <div className="access-screen">
    <div className="access-layout">
      <section className="access-context" aria-labelledby="desk-title">
        <div className="access-brand"><span className="brand-mark">FS</span><span>FlowState AI</span></div>
        <span className="access-edition">OPERATIONS / INVESTIGATION RECORDS</span>
        <h1 id="desk-title">The incident desk.</h1>
        <p className="access-brief">Trace an incident through its source records. Compare explanations, check what is missing, and record the next decision.</p>
        <section className="access-case" aria-labelledby="case-title">
          <div className="access-case-meta"><span>FICTIONAL DEMONSTRATION</span><span>CASE / INC-1042</span></div>
          <h2 id="case-title">Northstar authentication failures</h2>
          <p>Repeated scope rejections after a permissions rollout. The cause remains unverified.</p>
          <dl className="access-source-index">
            <div><dt>CHG-281</dt><dd>Strict scope enforcement rollout</dd></div>
            <div><dt>KB-17</dt><dd>Insufficient-scope runbook</dd></div>
            <div><dt>INC-998</dt><dd>Previous policy migration incident</dd></div>
            <div><dt>KB-19</dt><dd>Healthy refresh probes / counterevidence</dd></div>
          </dl>
        </section>
      </section>
      <section className="access-form-panel" aria-labelledby="access-title">
        <div className="access-form-heading"><span className="eyebrow">INVITED ACCESS</span><h2 id="access-title">Open the workspace</h2></div>
        <p>Use the demonstration password supplied by the project owner. No account is needed.</p>
        <form onSubmit={signIn}>
          <label htmlFor="demo-password">Demo access password</label>
          <input id="demo-password" type="password" autoComplete="current-password" required maxLength={256}
            value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'access-error' : undefined}/>
          {error && <p id="access-error" role="alert" className="access-error">{error}</p>}
          <button disabled={busy || !password}>
            {busy ? 'Opening workspace…' : 'Enter demo workspace'}<ArrowRight size={16} aria-hidden="true"/>
          </button>
        </form>
        <p className="access-footnote">All source records are fictional. Approval decisions are recorded without sending messages or executing external actions.</p>
      </section>
    </div>
  </div>;
}
