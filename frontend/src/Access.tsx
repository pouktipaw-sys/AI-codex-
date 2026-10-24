import {useEffect, useState} from 'react';
import {LockKeyhole, Workflow} from 'lucide-react';
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
    return <div className="access-screen"><section className="access-card">
      <div className="logo"><Workflow/></div><h1>FlowState AI</h1>
      <p>{error || 'Opening your workspace…'}</p>
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

  return <div className="access-screen"><section className="access-card">
    <div className="logo"><Workflow size={28}/></div>
    <span className="eyebrow">FLOWSTATE AI · INTERACTIVE DEMO</span>
    <h1>Investigate with evidence.</h1>
    <p>A working operations workspace with fictional incidents, connected evidence and accountable decisions.</p>
    <div className="access-highlights"><span>Evidence graph</span><span>Investigation replay</span><span>Human approvals</span></div>
    <form onSubmit={signIn}>
      <label htmlFor="demo-password">Demo access password</label>
      <input id="demo-password" type="password" autoComplete="current-password" required maxLength={256}
        value={password} onChange={event => setPassword(event.target.value)}/>
      {error && <p role="alert" className="access-error">{error}</p>}
      <button disabled={busy || !password}><LockKeyhole size={15}/>
        {busy ? 'Opening workspace…' : 'Enter demo workspace'}
      </button>
    </form>
    <small>Invitation-only demo · Fictional data · No external actions</small>
  </section></div>;
}
