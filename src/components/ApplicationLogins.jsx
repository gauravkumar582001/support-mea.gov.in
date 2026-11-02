import React, { useState, useEffect } from 'react';
import { call, downloadCsv, fmt } from '../utils';

/* ---------- Dedicated Application Logins (Portal Name, Username, Password, URL in Red, IP, Incharge/Handler Name & Phone) ---------- */
export default function ApplicationLogins({ user }) {
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
    const pass = (r.pass || '').toLowerCase();
    return p.includes(term) || u.includes(term) || h.includes(term) || ph.includes(term) || ip.includes(term) || url.includes(term) || pass.includes(term);
  });

  const exportAppCsv = () => {
    const cols = [
      { label: 'S.No', val: (r, i) => i + 1 },
      { label: 'Portal Name', val: r => r.portalName || r.name || '' },
      { label: 'Username', val: r => r.username || r.userId || '' },
      { label: 'Password', key: 'pass' },
      { label: 'URL', key: 'url' },
      { label: 'IP Entry', key: 'ip' },
      { label: 'Handler / Incharge (Name)', val: r => r.handler || r.incharge || r.subUser || '' },
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
            placeholder="Search Portal, Username, Handler, IP, URL..."
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

        {/* Total details counter badge */}
        <div className="app-stat-badge">
          <span className="app-stat-text">Total Applications: <b>{rows.length}</b></span>
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

      {/* Table: All Application logins line-by-line */}
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
              <th style={{ width: '14%' }}>Handler / Incharge (Name)</th>
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="pass-badge">
                        {showPass ? r.pass : '••••••••'}
                      </span>
                      <button
                        type="button"
                        className="btn-copy-mini"
                        onClick={() => copyText(r.pass, `Password for "${r.portalName || r.name}"`)}
                        title="Copy Password"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td>
                    {r.url ? (
                      <span
                        className="url-badge-red"
                        onClick={() => copyText(r.url, `URL for "${r.portalName || r.name}"`)}
                        title="Click to copy URL"
                      >
                        {r.url}
                      </span>
                    ) : (
                      <span style={{ color: '#aaa' }}>-</span>
                    )}
                  </td>
                  <td>
                    {r.ip ? (
                      <span
                        className="ip-badge"
                        onClick={() => copyText(r.ip, `IP for "${r.portalName || r.name}"`)}
                        title="Click to copy IP"
                      >
                        {r.ip}
                      </span>
                    ) : (
                      <span style={{ color: '#aaa' }}>-</span>
                    )}
                  </td>
                  <td>
                    {r.handler ? (
                      <span className="handler-badge">{r.handler}</span>
                    ) : (
                      <span style={{ color: '#aaa' }}>-</span>
                    )}
                  </td>
                  <td>
                    {r.phone ? (
                      <span className="phone-badge">{r.phone}</span>
                    ) : (
                      <span style={{ color: '#aaa' }}>-</span>
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
                      <div style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 600 }}>No Application Logins added yet</div>
                      <div style={{ color: 'var(--tx-muted)', marginBottom: 16 }}>Click "+ Add Application Login" button to add a new entry.</div>
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

                  {/* 6. Handler / Incharge Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Handler / Incharge (Name)</label>
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

