import React, { useState } from 'react';
import MailEntry from './components/MailEntry';
import ApplicationLogins from './components/ApplicationLogins';
import WinSCPLogins from './components/WinSCPLogins';

function Login({ onDone }) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ username: '', password: '' }), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const post = async (url, body) => {
    const r = await fetch('/api/' + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Error'); return j;
  };
  const login = async e => {
    e.preventDefault();
    try {
      const username = (f.username || '').trim();
      const j = await post('login', { username, userId: username, name: username, password: f.password });
      sessionStorage.setItem('t', j.token);
      sessionStorage.setItem('n', j.name);
      onDone(j.name);
    } catch (x) {
      setErr(x.message);
      setOk('');
    }
  };
  const forgot = async e => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return setErr('Passwords do not match');
    try {
      await post('forgot', { recoveryKey: f.recoveryKey, newPassword: f.newPassword });
      setMode('login');
      setOk('Password changed. Sign in with the new password.');
      setErr('');
      setF({ username: f.username || '', password: '' });
    } catch (x) {
      setErr(x.message);
    }
  };
  const brand = <div className="brand"><span className="logo">🛠️</span>Support Hub</div>;
  return (
    <div className="login-wrap">
      <div className="login">
        {mode === 'login' ? (
          <form className="card" onSubmit={login}>
            {brand}
            <p>Sign in to continue</p>
            <div>
              <label>Username</label>
              <input placeholder="Enter username" value={f.username || ''} onChange={set('username')} required autoFocus />
            </div>
            <div>
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={f.password || ''} onChange={set('password')} required />
            </div>
            {ok && <div className="okm">{ok}</div>}
            {err && <div className="err">{err}</div>}
            <button className="btn">Sign in</button>
            <div style={{ textAlign: 'center', margin: '12px 0 0' }}>
              <button type="button" className="btn link" onClick={() => { setMode('forgot'); setErr(''); setOk(''); }}>
                Forgot password?
              </button>
            </div>
          </form>
        ) : (
          <form className="card" onSubmit={forgot}>
            {brand}
            <p>Reset the common password using the recovery key</p>
            <div>
              <label>Recovery key</label>
              <input type="password" value={f.recoveryKey || ''} onChange={set('recoveryKey')} required />
            </div>
            <div>
              <label>New password (min 6 characters)</label>
              <input type="password" value={f.newPassword || ''} onChange={set('newPassword')} required />
            </div>
            <div>
              <label>Confirm new password</label>
              <input type="password" value={f.confirm || ''} onChange={set('confirm')} required />
            </div>
            {err && <div className="err">{err}</div>}
            <button className="btn">Change password</button>
            <div style={{ textAlign: 'center', margin: '12px 0 0' }}>
              <button type="button" className="btn link" onClick={() => { setMode('login'); setErr(''); }}>
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(sessionStorage.getItem('n'));
  const [tab, setTab] = useState('mail');

  if (!user || !sessionStorage.getItem('t')) return <Login onDone={setUser} />;

  const items = [
    ['mail', '📧', 'Mail Entry'],
    ['app', '🗂️', 'Application Logins'],
    ['win', '🔑', 'WinSCP Logins'],
  ];

  const view = {
    mail: <MailEntry key="m" user={user} />,
    app: <ApplicationLogins key="a" user={user} />,
    win: <WinSCPLogins key="w" user={user} />,
  }[tab];

  return (
    <div className="app">
      <div className="sb">
        <div className="sb-top">
          <div className="brand"><span className="logo">🛠️</span>Support Hub</div>
          <div className="sb-mobile-user">
            <div className="av-sm" title={user}>{user[0].toUpperCase()}</div>
            <button className="out-sm" onClick={() => { sessionStorage.clear(); location.reload(); }} title="Sign out">
              Sign out
            </button>
          </div>
        </div>
        <div className="nav">
          {items.map(([k, ic, l]) => (
            <button
              key={k}
              className={`nav-btn ${tab === k ? 'on' : ''}`}
              onClick={() => setTab(k)}
            >
              <span>{ic}</span>
              {l}
            </button>
          ))}
        </div>
        <div className="sb-desktop-user">
          <div className="me">
            <div className="av">{user[0].toUpperCase()}</div>
            <div>
              <b style={{ display: 'block', fontSize: '.95rem', color: '#fff' }}>{user}</b>
              <small>Signed in</small>
            </div>
          </div>
          <button className="out" onClick={() => { sessionStorage.clear(); location.reload(); }}>
            Sign out
          </button>
        </div>
      </div>
      <div className="main">
        <div className="top">
          <h1>{items.find(i => i[0] === tab)[2]}</h1>
          <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        {view}
      </div>
    </div>
  );
}
