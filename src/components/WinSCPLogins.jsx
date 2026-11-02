import React, { useState, useEffect } from 'react';
import { call, downloadCsv, fmt } from '../utils';

/* ---------- Dedicated WinSCP Logins (3 Entries: Mission Name, Username, Password) ---------- */
export default function WinSCPLogins({ user }) {
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
                      <div style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 600 }}>No WinSCP logins added yet</div>
                      <div style={{ color: 'var(--tx-muted)', marginBottom: 16 }}>Click "+ Add WinSCP Login" button to add a new entry.</div>
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

