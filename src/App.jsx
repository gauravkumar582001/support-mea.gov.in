import { useState, useEffect } from 'react';

const DEFAULT_OPTIONS = {
  users: ['Md Asif', 'Mayank Sharma', 'Naveen Sandhu', 'Rahul Kumar', 'Ritesh Kumar', 'Vineet Sharma', 'Gaurav Kumar'],
  shifts: ['Morning', 'Afternoon', 'Night'],
  resolutions: ['Issue resolved with remote meeting', 'Issue resolved on Call', 'Issue resolved through mail reply', 'Forwarded to concerned team', 'Meeting sent but Mission not responded', 'Information only mail', 'Transferred to next shift person', 'Replied mail for more information', 'Pending'],
  modules: ['Biometric', 'Black List Checking (BL)', 'Centralized Visa Issuance System (CVISA)', 'CIPPS', 'CONSPROM', 'Consular Issuance System (CIS)', 'District Police Module (DPM)', 'DVISA', 'eFRRO', 'EMAIL Related', 'E-SANAD', 'eSEWA (Online Indian Consular Services)/eCCSS', 'e-VISA', 'e-VISA (PLI Application)', 'Global Entry Program (GEP)', 'Indian Citizenship Portal', 'Indian Visa Online (VSS)', 'Overseas Citizen of India (OCI)', 'Prior Referral Check (PRC)', 'Virtual Private Network Token (VPN)', 'Other'],
  states: ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
  missions: ['INDIA', 'ALGERIA-ALGIERS', 'ANGOLA-LUANDA', 'ARGENTINA-BUENOS AIRES', 'ARMENIA-YEREVAN', 'AUSTRALIA-BRISBANE', 'AUSTRALIA-CANBERRA', 'AUSTRALIA-MELBOURNE', 'AUSTRALIA-PERTH', 'AUSTRALIA-SYDNEY', 'AUSTRIA-VIENNA', 'AZERBAIJAN-BAKU', 'BAHRAIN-ADLIYA', 'BANGLADESH-CHITTAGONG', 'BANGLADESH-DHAKA', 'BANGLADESH-KHULNA', 'BANGLADESH-RAJSHAHI', 'BANGLADESH-SYLHET', 'CHINA-HONG KONG', 'GERMANY-BERLIN', 'IRELAND-DUBLIN', 'ITALY-MILAN', 'NEW ZEALAND-WELLINGTON', 'NORWAY-OSLO', 'SLOVAKIA-BRATISLAVA', 'SRI LANKA-COLOMBO', 'SWITZERLAND-GENEVA', 'UK-LONDON', 'USA-CHICAGO', 'USA-SAN FRANCISCO'],
  districts: ['Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow']
};

const today = () => new Date().toLocaleDateString('en-CA');
const fmt = d => d ? new Date(d).toLocaleString('en-GB') : '';
const pill = v => { const t = (v || '').toLowerCase(); const c = t.includes('not responded') || t.includes('more information') ? 'warn' : t.includes('resolved') ? 'ok' : t.includes('pending') ? 'wait' : t.includes('forwarded') || t.includes('transferred') ? 'fwd' : 'info'; return v ? <span className={'pill ' + c}>{v}</span> : null; };
const call = async (p, o = {}) => {
  const r = await fetch('/api/' + p, { ...o, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sessionStorage.getItem('t') }, body: o.body && JSON.stringify(o.body) });
  if (r.status === 401) { sessionStorage.clear(); location.reload(); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
};
const downloadCsv = (filename, columns, rows) => {
  if (!rows || !rows.length) {
    alert('Export karne ke liye koi data nahi hai');
    return;
  }
  const headerLine = columns.map(c => `"${String(c.label || c.key).replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((r, i) =>
    columns.map(c => {
      let val = c.val ? c.val(r, i) : r[c.key];
      if (val === undefined || val === null) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csvContent = '\ufeff' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
  return <div className="login-wrap"><div className="login">
    {mode === 'login' ? <form className="card" onSubmit={login}>
      {brand}<p>Sign in to continue</p>
      <div><label>Username</label><input placeholder="Enter username" value={f.username || ''} onChange={set('username')} required autoFocus /></div>
      <div><label>Password</label><input type="password" placeholder="Enter password" value={f.password || ''} onChange={set('password')} required /></div>
      {ok && <div className="okm">{ok}</div>}{err && <div className="err">{err}</div>}
      <button className="btn">Sign in</button>
      <div style={{ textAlign: 'center', margin: '12px 0 0' }}><button type="button" className="btn link" onClick={() => { setMode('forgot'); setErr(''); setOk(''); }}>Forgot password?</button></div>
    </form> : <form className="card" onSubmit={forgot}>
      {brand}<p>Reset the common password using the recovery key</p>
      <div><label>Recovery key</label><input type="password" value={f.recoveryKey || ''} onChange={set('recoveryKey')} required /></div>
      <div><label>New password (min 6 characters)</label><input type="password" value={f.newPassword || ''} onChange={set('newPassword')} required /></div>
      <div><label>Confirm new password</label><input type="password" value={f.confirm || ''} onChange={set('confirm')} required /></div>
      {err && <div className="err">{err}</div>}
      <button className="btn">Change password</button>
      <div style={{ textAlign: 'center', margin: '12px 0 0' }}><button type="button" className="btn link" onClick={() => { setMode('login'); setErr(''); }}>Back to sign in</button></div>
    </form>}
  </div></div>;
}

/* Modal to manage options (add and delete items) */
function ManageModal({ title, categoryName, list, onAdd, onDelete, onClose }) {
  const [val, setVal] = useState('');
  const submit = e => {
    e.preventDefault();
    if (val.trim()) {
      onAdd(val.trim());
      setVal('');
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window manage-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage {title}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form className="inline-add-box" onSubmit={submit}>
            <input
              placeholder={`Add new ${categoryName || 'item'}...`}
              value={val}
              onChange={e => setVal(e.target.value)}
              autoFocus
            />
            <button className="btn btn-sm" type="submit">+ Add</button>
          </form>
          <div className="manage-list">
            {list && list.length ? list.map(item => (
              <div key={item} className="manage-item">
                <span>{item}</span>
                <button
                  type="button"
                  className="btn-del-mini"
                  title={`Delete ${item}`}
                  onClick={() => {
                    if (confirm(`Remove "${item}" from list?`)) onDelete(item);
                  }}
                >
                  🗑️
                </button>
              </div>
            )) : <div className="empty" style={{ padding: 12 }}>No items in list</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn g" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* Question card wrapper for Google Form style */
const Q = ({ l, req, action, children }) => (
  <div className="gq">
    <div className="gl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      <span>{l}{req && <i> *</i>}</span>
      {action}
    </div>
    {children}
  </div>
);

/* ---------- Mail entry: Google-Form style questionnaire + Responses sheet ---------- */
function MailEntry({ user }) {
  const [options, setOptions] = useState(() => {
    try {
      const s = localStorage.getItem('sh_options_v1');
      if (s) return { ...DEFAULT_OPTIONS, ...JSON.parse(s) };
    } catch (e) {}
    return DEFAULT_OPTIONS;
  });

  useEffect(() => {
    call('options').then(data => {
      if (data && typeof data === 'object') {
        setOptions(prev => {
          const merged = { ...prev, ...data };
          localStorage.setItem('sh_options_v1', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(() => {});
  }, []);

  const addOption = async (category, value) => {
    const cleanVal = (value || '').trim();
    if (!cleanVal) return;
    const current = options[category] || [];
    if (!current.some(x => x.toLowerCase() === cleanVal.toLowerCase())) {
      const updated = [...current, cleanVal];
      const newOpts = { ...options, [category]: updated };
      setOptions(newOpts);
      localStorage.setItem('sh_options_v1', JSON.stringify(newOpts));
      call('options', { method: 'POST', body: { [category]: updated } }).catch(() => {});
    }
    return cleanVal;
  };

  const deleteOption = async (category, value) => {
    const current = options[category] || [];
    const updated = current.filter(x => x !== value);
    const newOpts = { ...options, [category]: updated };
    setOptions(newOpts);
    localStorage.setItem('sh_options_v1', JSON.stringify(newOpts));
    call('options', { method: 'POST', body: { [category]: updated } }).catch(() => {});
  };

  const def = () => ({
    date: today(),
    attendedBy: user || (options.users && options.users[0]) || '',
    medium: 'Mail',
    shift: (options.shifts && options.shifts[0]) || 'Morning',
    mission: '',
    state: '',
    district: '',
    subject: '',
    module: (options.modules && options.modules[0]) || '',
    status: 'Pending',
    remarks: '',
    editedBy: ''
  });

  const [view, setView] = useState('sheet');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState(def());
  const [eid, setEid] = useState(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(true);
  const [managingCategory, setManagingCategory] = useState(null);
  const [quickAddCat, setQuickAddCat] = useState(null);
  const [quickAddVal, setQuickAddVal] = useState('');
  const [toast, setToast] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePerson, setDeletePerson] = useState('');

  const load = () => {
    call('mail').then(setRows).catch(e => setErr(e.message));
  };

  useEffect(() => { load(); }, []);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const set = k => v => setF(o => ({ ...o, [k]: v }));
  const clear = () => {
    setF(def());
    setEid(null);
    setErr('');
    setQuickAddCat(null);
    setQuickAddVal('');
  };

  const REQ = [
    ['attendedBy', 'Attended by'],
    ['medium', 'Medium'],
    ['date', 'Date'],
    ['shift', 'Shift/Duty'],
    ['mission', 'Mission name'],
    ['subject', 'Mail subject'],
    ['module', 'Module name']
  ];

  const submit = async () => {
    const miss = REQ.find(([k]) => !f[k]);
    if (miss) return setErr(miss[1] + ' is a required question');
    if (eid && !f.editedBy) return setErr('Please select who is editing this entry (Edited by)');
    try {
      await call(eid ? 'mail/' + eid : 'mail', { method: eid ? 'PUT' : 'POST', body: f });
      const wasEdit = !!eid;
      clear();
      await load();
      if (wasEdit) {
        showToast('Entry updated successfully!');
        setView('sheet');
      } else {
        setDone(true);
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  const promptDelete = r => {
    setDeleteTarget(r);
    setDeletePerson(user && user !== 'support' ? user : (options.users && options.users[0]) || '');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const by = deletePerson || 'Unknown';
    try {
      await call('mail/' + deleteTarget.id + '?by=' + encodeURIComponent(by), {
        method: 'DELETE',
        headers: { 'x-deleted-by': by }
      });
      showToast(`Entry marked as deleted by ${by}`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const restore = async r => {
    try {
      await call('mail/' + r.id + '/restore', { method: 'POST' });
      showToast('Entry restored successfully!');
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const doQuickAdd = async (category, fieldKey) => {
    if (quickAddVal.trim()) {
      const added = await addOption(category, quickAddVal.trim());
      if (added && fieldKey) set(fieldKey)(added);
      setQuickAddVal('');
      setQuickAddCat(null);
    }
  };

  // Calculations for Summary
  const activeRows = rows.filter(r => !r.isDeleted);
  const deletedRows = rows.filter(r => r.isDeleted);
  const totalActive = activeRows.length;
  const todayDate = today();
  const todayActiveCount = activeRows.filter(r => r.date === todayDate).length;

  const userStats = {};
  activeRows.forEach(r => {
    const person = r.attendedBy || 'Unassigned';
    userStats[person] = (userStats[person] || 0) + 1;
  });
  (options.users || []).forEach(u => {
    if (userStats[u] === undefined) userStats[u] = 0;
  });
  const sortedPeople = Object.keys(userStats).sort((a, b) => userStats[b] - userStats[a]);

  // Filtering: Mail subject se search kr sake
  const list = rows.filter(r => {
    if (!showDeleted && r.isDeleted) return false;
    if (userFilter && r.attendedBy !== userFilter) return false;
    if (day && r.date !== day) return false;
    if (q) {
      const term = q.trim().toLowerCase();
      const matchSubject = (r.subject || '').toLowerCase().includes(term);
      const matchOther = (r.mission || '').toLowerCase().includes(term) ||
                         (r.attendedBy || '').toLowerCase().includes(term) ||
                         (r.module || '').toLowerCase().includes(term) ||
                         (r.district || '').toLowerCase().includes(term) ||
                         (r.remarks || '').toLowerCase().includes(term) ||
                         (r.editedBy || '').toLowerCase().includes(term) ||
                         (r.deletedBy || '').toLowerCase().includes(term);
      if (!matchSubject && !matchOther) return false;
    }
    return true;
  });

  const allMissions = [...new Set([...(options.missions || []), ...rows.map(r => r.mission).filter(Boolean)])].sort();
  const allDistricts = [...new Set([...(options.districts || []), ...rows.map(r => r.district).filter(Boolean)])].sort();

  const exportMailCsv = () => {
    const cols = [
      { label: 'S.No', val: (r, i) => i + 1 },
      { label: 'Timestamp (Added At)', val: r => fmt(r.addedAt) },
      { label: 'Attended By', key: 'attendedBy' },
      { label: 'Medium', key: 'medium' },
      { label: 'Date', key: 'date' },
      { label: 'Shift/Duty', key: 'shift' },
      { label: 'Mission Name', key: 'mission' },
      { label: 'State', key: 'state' },
      { label: 'District', key: 'district' },
      { label: 'Mail Subject', key: 'subject' },
      { label: 'Module Name', key: 'module' },
      { label: 'Status', key: 'status' },
      { label: 'Remarks / Solution', key: 'remarks' },
      { label: 'Added By', val: r => r.attendedBy || r.addedBy || '' },
      { label: 'Edited By', key: 'editedBy' },
      { label: 'Edited At', val: r => fmt(r.editedAt) },
      { label: 'Deleted Status', val: r => r.isDeleted ? 'Deleted' : 'Active' },
      { label: 'Deleted By', key: 'deletedBy' },
      { label: 'Deleted At', val: r => fmt(r.deletedAt) }
    ];
    downloadCsv('support-mail-responses.csv', cols, list);
  };

  return (
    <div>
      {toast && <div className="toast-alert">{toast}</div>}

      {/* Tabs: Only 2 main tabs as requested */}
      <div className="tabs">
        <button
          className={view === 'sheet' ? 'on' : ''}
          onClick={() => setView('sheet')}
        >
          Responses ({totalActive})
        </button>
        <button
          className={view === 'form' ? 'on' : ''}
          onClick={() => {
            if (!eid) clear();
            setDone(false);
            setView('form');
          }}
        >
          {eid ? '✏️ Edit entry' : '➕ New entry (Form)'}
        </button>
      </div>

      {view === 'form' ? (
        done ? (
          <div className="gform">
            <div className="gq head">
              <h2>IVFRT Support Mail Status</h2>
              <p>Your response has been recorded.</p>
              <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
                <button className="btn link" onClick={() => { clear(); setDone(false); }}>
                  Submit another response
                </button>
                <button className="btn link" onClick={() => { clear(); setDone(false); setView('sheet'); }}>
                  View responses ({totalActive})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="gform">
            <div className="gq head">
              <h2>IVFRT Support Mail Status</h2>
              <p>Entry regarding the status of mails received in Support Center</p>
              {eid && (
                <div style={{ background: '#eef3fe', padding: '10px 14px', borderRadius: 8, margin: '10px 0', color: '#1f4fa8' }}>
                  <b>✏️ You are editing an existing entry. (Galt entry theek karke "Update" karein)</b>
                </div>
              )}
              <p style={{ color: '#d63b3b', margin: 0 }}>* Indicates required question</p>
            </div>

            {/* If editing, select who is editing */}
            {eid && (
              <Q l="Edited by (Kisne edit kiya)" req>
                <select
                  value={f.editedBy || ''}
                  onChange={e => set('editedBy')(e.target.value)}
                  required
                >
                  <option value="">-- Choose person who is editing --</option>
                  {(options.users || []).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Q>
            )}

            {/* Attended by */}
            <Q
              l="Attended by"
              req
              action={
                <div className="field-actions">
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => setQuickAddCat(quickAddCat === 'users' ? null : 'users')}
                    title="Quick add person"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className="btn-text-action manage"
                    onClick={() => setManagingCategory('users')}
                    title="Manage / Delete team members"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              }
            >
              {quickAddCat === 'users' && (
                <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                  <input
                    placeholder="Enter new person name..."
                    value={quickAddVal}
                    onChange={e => setQuickAddVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('users', 'attendedBy'); } }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('users', 'attendedBy')}>Save</button>
                  <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
                </div>
              )}
              <select value={f.attendedBy || ''} onChange={e => set('attendedBy')(e.target.value)}>
                <option value="">Choose</option>
                {(options.users || []).map(o => <option key={o} value={o}>{o}</option>)}
                {f.attendedBy && !(options.users || []).includes(f.attendedBy) && (
                  <option value={f.attendedBy}>{f.attendedBy}</option>
                )}
              </select>
            </Q>

            {/* Medium */}
            <Q l="Medium" req>
              {['Mail', 'Call'].map(m => (
                <label className="radio" key={m}>
                  <input
                    type="radio"
                    name="medium"
                    checked={f.medium === m}
                    onChange={() => set('medium')(m)}
                  />
                  {m}
                </label>
              ))}
            </Q>

            {/* Date */}
            <Q l="Date" req>
              <input
                type="date"
                className="gi"
                value={f.date || ''}
                onChange={e => set('date')(e.target.value)}
              />
            </Q>

            {/* Shift/Duty */}
            <Q l="Shift/Duty" req>
              <select value={f.shift || ''} onChange={e => set('shift')(e.target.value)}>
                <option value="">Choose</option>
                {(options.shifts || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Q>

            {/* Mission name */}
            <Q
              l="Mission name"
              req
              action={
                <div className="field-actions">
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => setQuickAddCat(quickAddCat === 'missions' ? null : 'missions')}
                    title="Quick add mission"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className="btn-text-action manage"
                    onClick={() => setManagingCategory('missions')}
                    title="Manage / Delete missions"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              }
            >
              {quickAddCat === 'missions' && (
                <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                  <input
                    placeholder="Enter new mission (e.g. FRANCE-PARIS)..."
                    value={quickAddVal}
                    onChange={e => setQuickAddVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('missions', 'mission'); } }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('missions', 'mission')}>Save</button>
                  <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
                </div>
              )}
              <input
                className="gi"
                style={{ maxWidth: '100%' }}
                list="missions"
                placeholder="Choose or type, e.g. USA-CHICAGO"
                value={f.mission || ''}
                onChange={e => set('mission')(e.target.value.toUpperCase())}
              />
              <datalist id="missions">
                {allMissions.map(m => <option key={m} value={m} />)}
              </datalist>
            </Q>

            {/* State (India only) */}
            <Q l="State (In case of INDIA only)">
              <select value={f.state || ''} onChange={e => set('state')(e.target.value)}>
                <option value="">Choose</option>
                {(options.states || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Q>

            {/* District/Location */}
            <Q
              l="District/Location (In case of INDIA only)"
              action={
                <div className="field-actions">
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => setQuickAddCat(quickAddCat === 'districts' ? null : 'districts')}
                    title="Quick add district"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className="btn-text-action manage"
                    onClick={() => setManagingCategory('districts')}
                    title="Manage / Delete districts"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              }
            >
              {quickAddCat === 'districts' && (
                <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                  <input
                    placeholder="Enter new district name..."
                    value={quickAddVal}
                    onChange={e => setQuickAddVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('districts', 'district'); } }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('districts', 'district')}>Save</button>
                  <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
                </div>
              )}
              <input
                className="gi"
                style={{ maxWidth: '100%' }}
                list="districts"
                placeholder="Choose or type district"
                value={f.district || ''}
                onChange={e => set('district')(e.target.value)}
              />
              <datalist id="districts">
                {allDistricts.map(d => <option key={d} value={d} />)}
              </datalist>
            </Q>

            {/* Mail subject */}
            <Q l="Mail subject" req>
              <input
                className="gi"
                style={{ maxWidth: '100%' }}
                placeholder="Your answer (Mail Subject)"
                value={f.subject || ''}
                onChange={e => set('subject')(e.target.value)}
              />
            </Q>

            {/* Module name */}
            <Q
              l="Module name"
              req
              action={
                <div className="field-actions">
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => setQuickAddCat(quickAddCat === 'modules' ? null : 'modules')}
                    title="Quick add module"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className="btn-text-action manage"
                    onClick={() => setManagingCategory('modules')}
                    title="Manage / Delete modules"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              }
            >
              {quickAddCat === 'modules' && (
                <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                  <input
                    placeholder="Enter new module name..."
                    value={quickAddVal}
                    onChange={e => setQuickAddVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('modules', 'module'); } }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('modules', 'module')}>Save</button>
                  <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
                </div>
              )}
              <select value={f.module || ''} onChange={e => set('module')(e.target.value)}>
                <option value="">Choose</option>
                {(options.modules || []).map(o => <option key={o} value={o}>{o}</option>)}
                {f.module && !(options.modules || []).includes(f.module) && (
                  <option value={f.module}>{f.module}</option>
                )}
              </select>
            </Q>

            {/* Status / Action taken */}
            <Q l="Status / Action taken">
              <select value={f.status || ''} onChange={e => set('status')(e.target.value)}>
                <option value="">Choose</option>
                {(options.resolutions || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Q>

            {/* How it was solved / Remarks */}
            <Q l="How it was solved / Remarks">
              <input
                className="gi"
                style={{ maxWidth: '100%' }}
                placeholder="Your answer"
                value={f.remarks || ''}
                onChange={e => set('remarks')(e.target.value)}
              />
            </Q>

            {err && <div className="err">{err}</div>}

            <div className="gfoot">
              <button className="btn" onClick={submit}>
                {eid ? 'Update' : 'Submit'}
              </button>
              <button
                className="btn link"
                onClick={() => {
                  clear();
                  if (eid) setView('sheet');
                }}
              >
                {eid ? 'Cancel edit' : 'Clear form'}
              </button>
            </div>
          </div>
        )
      ) : (
        /* Active Responses sheet view */
        <div>
          {/* Summary counters: "kiski kitni entry hai total" */}
          <div className="summary-section">
            <div className="summary-cards-row">
              <div className="stat-card primary">
                <div className="stat-icon">📊</div>
                <div>
                  <div className="stat-num">{totalActive}</div>
                  <div className="stat-label">Total Mail Responses</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div>
                  <div className="stat-num">{todayActiveCount}</div>
                  <div className="stat-label">Today's Responses</div>
                </div>
              </div>
              {deletedRows.length > 0 && (
                <div className="stat-card" style={{ background: '#fff9f9' }}>
                  <div className="stat-icon" style={{ background: '#fdecec', color: '#c0392b' }}>🗑️</div>
                  <div>
                    <div className="stat-num" style={{ color: '#c0392b' }}>{deletedRows.length}</div>
                    <div className="stat-label">Deleted Entries in Table</div>
                  </div>
                </div>
              )}
            </div>

            <div className="person-stats-box">
              <div className="person-stats-header">
                <h4>👥 Total Entries by Person (Kiski Kitni Entry):</h4>
                {userFilter && (
                  <button type="button" className="btn-clear-filter" onClick={() => setUserFilter('')}>
                    ✕ Clear filter ({userFilter})
                  </button>
                )}
              </div>
              <div className="person-chips-scroll">
                <div
                  className={'person-chip ' + (!userFilter ? 'active' : '')}
                  onClick={() => setUserFilter('')}
                  title="Show all team entries"
                >
                  <span className="chip-name">All Team</span>
                  <span className="chip-count">{totalActive}</span>
                </div>
                {sortedPeople.map(p => (
                  <div
                    key={p}
                    className={'person-chip ' + (userFilter === p ? 'active' : '')}
                    onClick={() => setUserFilter(userFilter === p ? '' : p)}
                    title={`Click to filter entries for ${p}`}
                  >
                    <span className="chip-avatar">{p[0]}</span>
                    <span className="chip-name">{p}</span>
                    <span className="chip-count">{userStats[p]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar & toolbar */}
          <div className="bar">
            <div className="search-box">
              <input
                placeholder="Search by Mail Subject / keyword..."
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ width: '100%', paddingRight: q ? 32 : 14 }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    color: 'var(--tx-muted)',
                    fontSize: '1rem',
                    lineHeight: 1
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <input
              type="date"
              value={day}
              onChange={e => setDay(e.target.value)}
              style={{ maxWidth: 170 }}
              title="Filter by date"
            />
            {day && <button className="btn g" onClick={() => setDay('')}>All dates</button>}

            {/* Toggle show/hide deleted entries right in the table */}
            {deletedRows.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '.88rem', fontWeight: 600, color: '#4a4d66', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={e => setShowDeleted(e.target.checked)}
                />
                Show deleted ({deletedRows.length})
              </label>
            )}

            <span className="cnt">{list.length} entries</span>

            <div className="bar-actions">
              <button className="btn g" onClick={exportMailCsv} title="Export Mail Responses to CSV">
                📥 Export CSV
              </button>
              <button
                className="btn"
                onClick={() => {
                  clear();
                  setDone(false);
                  setView('form');
                }}
              >
                + New Entry (Form)
              </button>
            </div>
          </div>

          {/* Table: "vahi dike kisne delete oe edit kiya hai mail ko" */}
          <div className="sheet">
            <table>
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th>Timestamp</th>
                  <th>Attended by</th>
                  <th>Medium</th>
                  <th>Date</th>
                  <th>Shift/Duty</th>
                  <th>Mission name</th>
                  <th>State</th>
                  <th>District</th>
                  <th>Mail subject</th>
                  <th>Module name</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Audit Log</th>
                  <th style={{ textAlign: 'center', width: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length ? (
                  list.map((r, i) => (
                    <tr key={r.id || i} className={r.isDeleted ? 'row-deleted' : ''}>
                      <td className="col-num">{i + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.addedAt)}</td>
                      <td><b>{r.attendedBy}</b></td>
                      <td>{r.medium}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td>{r.shift}</td>
                      <td><b style={{ color: 'var(--navy)' }}>{r.mission}</b></td>
                      <td>{r.state}</td>
                      <td>{r.district}</td>
                      <td>
                        <b style={r.isDeleted ? { textDecoration: 'line-through', color: '#888' } : {}}>
                          {r.subject}
                        </b>
                      </td>
                      <td>{r.module}</td>
                      <td>
                        {r.isDeleted ? (
                          <span className="pill del" style={{ fontWeight: 700 }}>DELETED</span>
                        ) : (
                          pill(r.status)
                        )}
                      </td>
                      <td>{r.remarks || '-'}</td>
                      <td>
                        {/* Who added, who edited, and who deleted visible directly on the row */}
                        <div>
                          <span className="pill info" style={{ fontSize: '.72rem', padding: '2px 6px', marginRight: 4 }}>Added</span>
                          <b>{r.attendedBy || r.addedBy}</b>
                        </div>
                        <div className="m">{fmt(r.addedAt)}</div>

                        {r.editedBy && (
                          <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px dashed #dcd8e8' }}>
                            <div>
                              <span className="pill edit" style={{ fontSize: '.72rem', padding: '2px 6px', marginRight: 4 }}>Edited by</span>
                              <b style={{ color: '#1f4fa8' }}>{r.editedBy}</b>
                            </div>
                            <div className="m">{fmt(r.editedAt)}</div>
                          </div>
                        )}

                        {r.isDeleted && (
                          <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px dashed #f5c6cb' }}>
                            <div>
                              <span className="pill del" style={{ fontSize: '.72rem', padding: '2px 6px', marginRight: 4 }}>Deleted by</span>
                              <b style={{ color: '#c0392b' }}>{r.deletedBy || 'Unknown'}</b>
                            </div>
                            <div className="m">{fmt(r.deletedAt)}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="btn-row">
                          {r.isDeleted ? (
                            <button
                              className="btn g"
                              style={{ padding: '6px 12px', fontSize: '.85rem' }}
                              title="Restore this deleted entry"
                              onClick={() => restore(r)}
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn g"
                                title="Edit this entry"
                                onClick={() => {
                                  setF({
                                    ...r,
                                    editedBy: (user && user !== 'support') ? user : (options.users && options.users[0]) || ''
                                  });
                                  setEid(r.id);
                                  setView('form');
                                  setDone(false);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn r"
                                title="Delete this entry"
                                onClick={() => promptDelete(r)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="15" className="empty">
                      {q ? `No entries found matching mail subject "${q}"` : 'No responses found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal: asks who is deleting */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-window manage-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#c0392b' }}>🗑️ Delete Mail Entry</h3>
              <button type="button" className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px' }}>
                Kya aap is entry ko delete karna chahte hain?
              </p>
              <div style={{ background: '#faf9fd', border: '1px solid #e2deee', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '.9rem' }}>
                <div><b>Subject:</b> {deleteTarget.subject || '-'}</div>
                <div><b>Mission:</b> {deleteTarget.mission || '-'}</div>
                <div><b>Attended by:</b> {deleteTarget.attendedBy || '-'}</div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Kisne delete kiya? (Select your name) <i>*</i>
                </label>
                <select
                  value={deletePerson}
                  onChange={e => setDeletePerson(e.target.value)}
                  style={{ width: '100%' }}
                  autoFocus
                >
                  <option value="">-- Choose your name --</option>
                  {(options.users || []).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn g" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                className="btn r"
                style={{ background: '#c0392b', color: '#fff' }}
                onClick={confirmDelete}
                disabled={!deletePerson}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Manage Modal (Add & Delete) */}
      {managingCategory && (
        <ManageModal
          title={
            managingCategory === 'users' ? 'Team Members (Attended By)' :
            managingCategory === 'missions' ? 'Missions' :
            managingCategory === 'districts' ? 'Districts' : 'Modules'
          }
          categoryName={
            managingCategory === 'users' ? 'person name' :
            managingCategory === 'missions' ? 'mission code' :
            managingCategory === 'districts' ? 'district' : 'module'
          }
          list={options[managingCategory] || []}
          onAdd={val => addOption(managingCategory, val)}
          onDelete={val => deleteOption(managingCategory, val)}
          onClose={() => setManagingCategory(null)}
        />
      )}
    </div>
  );
}

/* ---------- Dedicated WinSCP Logins (3 Entries: Mission Name, Username, Password) ---------- */
function WinSCPLogins({ user }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ mission: '', username: '', pass: '' });
  const [eid, setEid] = useState(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = () => call('creds').then(r => {
    const wins = r.filter(x => x.type === 'WinSCP' && !x.isDeleted);
    setRows(wins);
  }).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyPass = (p, label) => {
    if (!p) return;
    navigator.clipboard.writeText(p);
    showToast(`Copied password for "${label}"!`);
  };

  const openAdd = () => {
    setF({ mission: '', username: '', pass: '' });
    setEid(null);
    setErr('');
    setShowAddModal(true);
  };

  const openEdit = r => {
    setF({
      mission: r.mission || '',
      username: r.username || r.name || '',
      pass: r.pass || ''
    });
    setEid(r.id);
    setErr('');
    setShowAddModal(true);
  };

  const save = async e => {
    if (e) e.preventDefault();
    if (!f.mission || !f.mission.trim()) return setErr('Mission Name is required');
    if (!f.username || !f.username.trim()) return setErr('Username is required');
    if (!f.pass || !f.pass.trim()) return setErr('Password is required');
    try {
      const payload = {
        type: 'WinSCP',
        mission: f.mission.trim(),
        username: f.username.trim().toLowerCase(),
        name: f.username.trim().toLowerCase(),
        pass: f.pass.trim(),
        editedBy: eid ? (user || 'support') : undefined
      };
      await call(eid ? 'creds/' + eid : 'creds', {
        method: eid ? 'PUT' : 'POST',
        body: payload
      });
      showToast(eid ? 'Entry updated successfully!' : 'New entry added successfully!');
      setShowAddModal(false);
      setF({ mission: '', username: '', pass: '' });
      setEid(null);
      load();
    } catch (x) {
      setErr(x.message);
    }
  };

  const del = async r => {
    const displayName = r.mission ? `${r.mission} (${r.username || r.name})` : (r.username || r.name);
    if (confirm(`Delete WinSCP login for "${displayName}"?`)) {
      try {
        await call('creds/' + r.id, { method: 'DELETE' });
        showToast(`Deleted "${displayName}"`);
        load();
      } catch (x) {
        alert(x.message);
      }
    }
  };

  // Search by Username AND Mission Name (and password)
  const list = rows.filter(r => {
    if (!q) return true;
    const term = q.trim().toLowerCase();
    const u = (r.username || r.name || '').toLowerCase();
    const m = (r.mission || '').toLowerCase();
    const p = (r.pass || '').toLowerCase();
    return u.includes(term) || m.includes(term) || p.includes(term);
  });

  const missionSuggestions = [...new Set(rows.map(r => r.mission).filter(Boolean))].sort();

  const exportWinCsv = () => {
    const cols = [
      { label: 'S.No', val: (r, i) => i + 1 },
      { label: 'Mission Name', key: 'mission' },
      { label: 'Username', val: r => r.username || r.name || '' },
      { label: 'Password', key: 'pass' },
      { label: 'Added By', key: 'addedBy' },
      { label: 'Timestamp (Added At)', val: r => fmt(r.addedAt) },
      { label: 'Edited By', key: 'editedBy' }
    ];
    downloadCsv('winscp-logins.csv', cols, list);
  };

  return (
    <div>
      {toast && <div className="toast-alert">{toast}</div>}

      {/* Top Toolbar */}
      <div className="bar">
        {/* Search by Username and Mission Name */}
        <div className="search-box">
          <input
            placeholder="Search by Username or Mission Name..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', paddingRight: q ? 30 : 12 }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--tx-muted)', fontSize: '1rem' }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Number of details simple counter */}
        <div className="win-stat-badge">
          <span className="win-stat-text">Total Details: <b>{rows.length}</b></span>
          {q && <span className="win-stat-sub">({list.length} matched)</span>}
        </div>

        {/* Mask/Show Passwords */}
        <button
          className="btn g"
          onClick={() => setShowPass(!showPass)}
          title={showPass ? 'Mask passwords' : 'Show passwords'}
        >
          {showPass ? 'Mask Passwords' : 'Show Passwords'}
        </button>

        {/* Actions */}
        <div className="bar-actions">
          <button className="btn g" onClick={exportWinCsv} title="Export WinSCP Logins to CSV">
            📥 Export CSV
          </button>
          <button className="btn" style={{ background: '#17693a' }} onClick={openAdd}>
            + Add WinSCP Login
          </button>
        </div>
      </div>

      {/* Table View: 3 Simple Entries (Mission Name, Username, Password) */}
      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th style={{ width: '38%' }}>Mission Name</th>
              <th style={{ width: '22%' }}>Username</th>
              <th style={{ width: '24%' }}>Password</th>
              <th style={{ width: 130, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="col-num">{i + 1}</td>
                  <td>
                    <b style={{ color: 'var(--navy)', fontSize: '.95rem' }}>{r.mission || '-'}</b>
                  </td>
                  <td>
                    <span className="code-badge">{r.username || r.name}</span>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="pass-badge">
                        {showPass ? r.pass : '••••••••'}
                      </span>
                      <button
                        type="button"
                        className="btn-copy-mini"
                        onClick={() => copyPass(r.pass, r.username || r.name)}
                        title="Copy Password"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="btn-row">
                      <button className="btn g" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn r" onClick={() => del(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
                  {q ? (
                    `No details found matching "${q}"`
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 600 }}>Koi bhi WinSCP login add nahi hai</div>
                      <div style={{ color: 'var(--tx-muted)', marginBottom: 16 }}>Nayi entry add karne ke liye "+ Add WinSCP Login" button par click karein.</div>
                      <button className="btn" style={{ background: '#17693a' }} onClick={openAdd}>
                        + Add First WinSCP Login
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal with 3 Simple Fields */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-window manage-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{eid ? 'Edit WinSCP Login' : 'Add WinSCP Login'}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                {/* 1. Mission Name */}
                <div className="form-group">
                  <label>Mission Name <i>*</i></label>
                  <input
                    placeholder="Enter or choose Mission Name (e.g. China - Hong Kong (CHNH))"
                    value={f.mission || ''}
                    onChange={e => setF({ ...f, mission: e.target.value })}
                    list="winscp-missions-list"
                    required
                    autoFocus
                  />
                  <datalist id="winscp-missions-list">
                    {missionSuggestions.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* 2. Username */}
                <div className="form-group">
                  <label>Username (Code) <i>*</i></label>
                  <input
                    placeholder="Enter username (e.g. chnh, jpno, rusm)"
                    value={f.username || ''}
                    onChange={e => setF({ ...f, username: e.target.value })}
                    required
                  />
                </div>

                {/* 3. Password */}
                <div className="form-group">
                  <label>Password <i>*</i></label>
                  <input
                    placeholder="Enter password (e.g. Chnh35#54321)"
                    value={f.pass || ''}
                    onChange={e => setF({ ...f, pass: e.target.value })}
                    required
                  />
                </div>

                {err && <div className="err">{err}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn g" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn">{eid ? 'Update Entry' : 'Add Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Dedicated Application Logins (Portal Name, Username, Password, URL in Red, IP, Incharge/Handler Name & Phone) ---------- */
function ApplicationLogins({ user }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ portalName: '', username: '', pass: '', url: '', ip: '', handler: '', phone: '' });
  const [eid, setEid] = useState(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = () => call('creds').then(r => {
    const apps = r.filter(x => x.type !== 'WinSCP' && !x.isDeleted).map(x => ({
      ...x,
      portalName: x.portalName || x.name || '',
      username: x.username || x.userId || '',
      handler: x.handler || x.incharge || x.subUser || '',
      phone: x.phone || x.notes || '',
      url: x.url || '',
      ip: x.ip || ''
    }));
    setRows(apps);
  }).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyText = (val, label) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    showToast(`Copied ${label}!`);
  };

  const openAdd = () => {
    setF({ portalName: '', username: '', pass: '', url: '', ip: '', handler: '', phone: '' });
    setEid(null);
    setErr('');
    setShowAddModal(true);
  };

  const openEdit = r => {
    setF({
      portalName: r.portalName || r.name || '',
      username: r.username || r.userId || '',
      pass: r.pass || '',
      url: r.url || '',
      ip: r.ip || '',
      handler: r.handler || r.incharge || r.subUser || '',
      phone: r.phone || r.notes || ''
    });
    setEid(r.id);
    setErr('');
    setShowAddModal(true);
  };

  const save = async e => {
    if (e) e.preventDefault();
    if (!f.portalName || !f.portalName.trim()) return setErr('Portal Name is required');
    if (!f.username || !f.username.trim()) return setErr('Username is required');
    if (!f.pass || !f.pass.trim()) return setErr('Password is required');
    try {
      const payload = {
        type: 'Application',
        portalName: f.portalName.trim(),
        name: f.portalName.trim(),
        username: f.username.trim(),
        userId: f.username.trim(),
        pass: f.pass.trim(),
        url: (f.url || '').trim(),
        ip: (f.ip || '').trim(),
        handler: (f.handler || '').trim(),
        phone: (f.phone || '').trim(),
        editedBy: eid ? (user || 'support') : undefined
      };
      await call(eid ? 'creds/' + eid : 'creds', {
        method: eid ? 'PUT' : 'POST',
        body: payload
      });
      showToast(eid ? 'Application updated successfully!' : 'New Application Login added!');
      setShowAddModal(false);
      setF({ portalName: '', username: '', pass: '', url: '', ip: '', handler: '', phone: '' });
      setEid(null);
      load();
    } catch (x) {
      setErr(x.message);
    }
  };

  const del = async r => {
    const displayName = r.portalName || r.name || r.username || 'this entry';
    if (confirm(`Delete Application Login for "${displayName}"?`)) {
      try {
        await call('creds/' + r.id, { method: 'DELETE' });
        showToast(`Deleted "${displayName}"`);
        load();
      } catch (x) {
        alert(x.message);
      }
    }
  };

  // Search across Portal Name, Username, Handler, IP, URL
  const list = rows.filter(r => {
    if (!q) return true;
    const term = q.trim().toLowerCase();
    const p = (r.portalName || r.name || '').toLowerCase();
    const u = (r.username || r.userId || '').toLowerCase();
    const h = (r.handler || '').toLowerCase();
    const ph = (r.phone || '').toLowerCase();
    const ip = (r.ip || '').toLowerCase();
    const url = (r.url || '').toLowerCase();
    return p.includes(term) || u.includes(term) || h.includes(term) || ph.includes(term) || ip.includes(term) || url.includes(term);
  });

  const exportAppCsv = () => {
    const cols = [
      { label: 'S.No', val: (r, i) => i + 1 },
      { label: 'Portal Name', val: r => r.portalName || r.name || '' },
      { label: 'Username', val: r => r.username || r.userId || '' },
      { label: 'Password', key: 'pass' },
      { label: 'URL', key: 'url' },
      { label: 'IP Entry', key: 'ip' },
      { label: 'Kon Sambhalta Hai (Name)', val: r => r.handler || r.incharge || r.subUser || '' },
      { label: 'Phone Number', val: r => r.phone || r.notes || '' },
      { label: 'Added By', key: 'addedBy' },
      { label: 'Timestamp (Added At)', val: r => fmt(r.addedAt) },
      { label: 'Edited By', key: 'editedBy' }
    ];
    downloadCsv('application-logins.csv', cols, list);
  };

  return (
    <div>
      {toast && <div className="toast-alert">{toast}</div>}

      {/* Top Toolbar */}
      <div className="bar">
        {/* Search */}
        <div className="search-box">
          <input
            placeholder="Search by Portal, Username, Incharge, IP, URL..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', paddingRight: q ? 30 : 12 }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--tx-muted)', fontSize: '1rem' }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Total Details Counter */}
        <div className="app-stat-badge">
          <span>Total Portals: <b>{rows.length}</b></span>
          {q && <span className="app-stat-sub">({list.length} matched)</span>}
        </div>

        {/* Mask/Show Passwords */}
        <button
          className="btn g"
          onClick={() => setShowPass(!showPass)}
          title={showPass ? 'Mask passwords' : 'Show passwords'}
        >
          {showPass ? 'Mask Passwords' : 'Show Passwords'}
        </button>

        {/* Actions */}
        <div className="bar-actions">
          <button className="btn g" onClick={exportAppCsv} title="Export Application Logins to CSV">
            📥 Export CSV
          </button>
          <button className="btn" style={{ background: '#5e35b1' }} onClick={openAdd}>
            + Add Application Login
          </button>
        </div>
      </div>

      {/* Table Sheet: Clean, Professional & Highly Readable */}
      <div className="sheet">
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th style={{ width: '16%' }}>Portal Name</th>
              <th style={{ width: '13%' }}>Username</th>
              <th style={{ width: '16%' }}>Password</th>
              <th style={{ width: '16%' }}>URL (Red Highlight)</th>
              <th style={{ width: '12%' }}>IP Entry</th>
              <th style={{ width: '14%' }}>Kon Sambhalta Hai (Name)</th>
              <th style={{ width: '13%' }}>Phone Number</th>
              <th style={{ width: 130, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="col-num">{i + 1}</td>
                  <td>
                    <b style={{ color: 'var(--navy)', fontSize: '.95rem' }}>{r.portalName || r.name}</b>
                  </td>
                  <td>
                    <span className="code-badge">{r.username || r.userId}</span>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="pass-badge">
                        {showPass ? r.pass : '••••••••'}
                      </span>
                      <button
                        type="button"
                        className="btn-copy-mini"
                        onClick={() => copyText(r.pass, 'Password')}
                        title="Copy Password"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td>
                    {r.url ? (
                      <a
                        href={r.url.startsWith('http') ? r.url : 'http://' + r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-red"
                        title={r.url}
                      >
                        {r.url}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--tx-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    {r.ip ? (
                      <span className="ip-text">{r.ip}</span>
                    ) : (
                      <span style={{ color: 'var(--tx-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <b style={{ color: 'var(--navy)', fontSize: '.92rem' }}>{r.handler || '-'}</b>
                  </td>
                  <td>
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="phone-link" title="Call">
                        {r.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--tx-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-row">
                      <button className="btn g" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn r" onClick={() => del(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
                  {q ? (
                    `No applications found matching "${q}"`
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 600 }}>Koi bhi Application Login add nahi hai</div>
                      <div style={{ color: 'var(--tx-muted)', marginBottom: 16 }}>Naya portal/application login add karne ke liye "+ Add Application Login" button par click karein.</div>
                      <button className="btn" style={{ background: '#5e35b1' }} onClick={openAdd}>
                        + Add First Application Login
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-window manage-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{eid ? 'Edit Application Login' : 'Add Application Login'}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {/* 1. Portal Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Portal Name <i>*</i></label>
                    <input
                      placeholder="e.g. eFRRO Portal, CVISA, CONSPROM"
                      value={f.portalName || ''}
                      onChange={e => setF({ ...f, portalName: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  {/* 2. Username */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Username <i>*</i></label>
                    <input
                      placeholder="e.g. admin_delhi, cvisa_user"
                      value={f.username || ''}
                      onChange={e => setF({ ...f, username: e.target.value })}
                      required
                    />
                  </div>

                  {/* 3. Password */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Password <i>*</i></label>
                    <input
                      placeholder="Enter password"
                      value={f.pass || ''}
                      onChange={e => setF({ ...f, pass: e.target.value })}
                      required
                    />
                  </div>

                  {/* 4. URL */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ color: '#d32f2f', fontWeight: 700 }}>URL (Red Highlighted) </label>
                    <input
                      placeholder="e.g. https://indianvisaonline.gov.in"
                      value={f.url || ''}
                      onChange={e => setF({ ...f, url: e.target.value })}
                      style={{ borderColor: '#f8b4b4' }}
                    />
                  </div>

                  {/* 5. IP Entry */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>IP Entry / Server Host</label>
                    <input
                      placeholder="e.g. 10.20.30.40 or 192.168.1.100"
                      value={f.ip || ''}
                      onChange={e => setF({ ...f, ip: e.target.value })}
                    />
                  </div>

                  {/* 6. Handler / Sambhalne Wala Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Kon Sambhalta Hai (Name)</label>
                    <input
                      placeholder="e.g. Amit Sharma, Mayank"
                      value={f.handler || ''}
                      onChange={e => setF({ ...f, handler: e.target.value })}
                    />
                  </div>

                  {/* 7. Phone Number */}
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Phone Number (Mobile / Landline)</label>
                    <input
                      placeholder="e.g. 9876543210, 011-23456789"
                      value={f.phone || ''}
                      onChange={e => setF({ ...f, phone: e.target.value })}
                    />
                  </div>
                </div>

                {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn g" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ background: '#5e35b1' }}>{eid ? 'Update Login' : 'Add Application Login'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(sessionStorage.getItem('n')), [tab, setTab] = useState('mail');
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
