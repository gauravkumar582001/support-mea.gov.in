import React, { useState, useEffect } from 'react';
import { call, downloadCsv, fmt, today, pill, DEFAULT_OPTIONS } from '../utils';

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
export default function MailEntry({ user }) {
  const [options, setOptions] = useState(() => {
    try {
      const s = localStorage.getItem('sh_options_v2');
      if (s) return { ...DEFAULT_OPTIONS, ...JSON.parse(s) };
    } catch (e) { }
    return DEFAULT_OPTIONS;
  });

  useEffect(() => {
    call('options').then(data => {
      if (data && typeof data === 'object') {
        setOptions(prev => {
          const merged = { ...prev, ...data };
          localStorage.setItem('sh_options_v2', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(() => { });
  }, []);

  const addOption = async (category, value) => {
    const cleanVal = (value || '').trim();
    if (!cleanVal) return;
    const current = options[category] || [];
    if (!current.some(x => x.toLowerCase() === cleanVal.toLowerCase())) {
      const updated = [...current, cleanVal];
      const newOpts = { ...options, [category]: updated };
      setOptions(newOpts);
      localStorage.setItem('sh_options_v2', JSON.stringify(newOpts));
      call('options', { method: 'POST', body: { [category]: updated } }).catch(() => { });
    }
    return cleanVal;
  };

  const deleteOption = async (category, value) => {
    const current = options[category] || [];
    const updated = current.filter(x => x !== value);
    const newOpts = { ...options, [category]: updated };
    setOptions(newOpts);
    localStorage.setItem('sh_options_v2', JSON.stringify(newOpts));
    call('options', { method: 'POST', body: { [category]: updated } }).catch(() => { });
  };

  const def = () => ({
    date: today(),
    attendedBy: user || (options.users && options.users[0]) || '',
    medium: 'Mail',
    shift: (options.shifts && options.shifts[0]) || '',
    mission: '',
    state: '',
    district: '',
    subject: '',
    module: (options.modules && options.modules[0]) || '',
    status: (options.resolutions && options.resolutions[0]) || '',
    remarks: '',
    editedBy: ''
  });

  const [view, setView] = useState('sheet');
  const [rows, setRows] = useState([]);
  const [f, setF] = useState(def());
  const [eid, setEid] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [managingCategory, setManagingCategory] = useState(null);
  const [quickAddCat, setQuickAddCat] = useState(null);
  const [quickAddVal, setQuickAddVal] = useState('');
  const [toast, setToast] = useState('');

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
      showToast(wasEdit ? 'Entry updated successfully!' : 'New entry added successfully!');
      setView('sheet');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr(e.message);
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
  const list = activeRows.filter(r => {
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
        (r.editedBy || '').toLowerCase().includes(term);
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
      { label: 'Edited By', key: 'editedBy' },
      { label: 'Edited At', val: r => fmt(r.editedAt) }
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
            setView('form');
          }}
        >
          {eid ? '✏️ Edit entry' : '➕ New entry (Form)'}
        </button>
      </div>

      {view === 'form' ? (
        <div className="gform">
          <div className="gq head">
            <h2>IVFRT Support Mail Status</h2>
            <p>Entry regarding the status of mails received in Support Center</p>
            {eid && (
              <div style={{ background: '#eef3fe', padding: '10px 14px', borderRadius: 8, margin: '10px 0', color: '#1f4fa8' }}>
                <b>✏️ You are editing an existing entry.</b>
              </div>
            )}
            <p style={{ color: '#d63b3b', margin: 0 }}>* Indicates required question</p>
          </div>

          {/* If editing, select who is editing */}
          {eid && (
            <Q l="Edited by" req>
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
          <Q
            l="Shift/Duty"
            req
            action={
              <div className="field-actions">
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => setQuickAddCat(quickAddCat === 'shifts' ? null : 'shifts')}
                  title="Quick add shift"
                >
                  + Add
                </button>
                <button
                  type="button"
                  className="btn-text-action manage"
                  onClick={() => setManagingCategory('shifts')}
                  title="Manage / Delete shifts"
                >
                  ⚙️ Manage
                </button>
              </div>
            }
          >
            {quickAddCat === 'shifts' && (
              <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                <input
                  placeholder="Enter new shift (e.g. Morning, Evening)..."
                  value={quickAddVal}
                  onChange={e => setQuickAddVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('shifts', 'shift'); } }}
                  autoFocus
                />
                <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('shifts', 'shift')}>Save</button>
                <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
              </div>
            )}
            <select value={f.shift || ''} onChange={e => set('shift')(e.target.value)}>
              <option value="">Choose</option>
              {(options.shifts || []).map(o => <option key={o} value={o}>{o}</option>)}
              {f.shift && !(options.shifts || []).includes(f.shift) && (
                <option value={f.shift}>{f.shift}</option>
              )}
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
          <Q
            l="State (In case of INDIA only)"
            action={
              <div className="field-actions">
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => setQuickAddCat(quickAddCat === 'states' ? null : 'states')}
                  title="Quick add state"
                >
                  + Add
                </button>
                <button
                  type="button"
                  className="btn-text-action manage"
                  onClick={() => setManagingCategory('states')}
                  title="Manage / Delete states"
                >
                  ⚙️ Manage
                </button>
              </div>
            }
          >
            {quickAddCat === 'states' && (
              <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                <input
                  placeholder="Enter new state name..."
                  value={quickAddVal}
                  onChange={e => setQuickAddVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('states', 'state'); } }}
                  autoFocus
                />
                <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('states', 'state')}>Save</button>
                <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
              </div>
            )}
            <select value={f.state || ''} onChange={e => set('state')(e.target.value)}>
              <option value="">Choose</option>
              {(options.states || []).map(o => <option key={o} value={o}>{o}</option>)}
              {f.state && !(options.states || []).includes(f.state) && (
                <option value={f.state}>{f.state}</option>
              )}
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
          <Q
            l="Status / Action taken"
            action={
              <div className="field-actions">
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => setQuickAddCat(quickAddCat === 'resolutions' ? null : 'resolutions')}
                  title="Quick add status"
                >
                  + Add
                </button>
                <button
                  type="button"
                  className="btn-text-action manage"
                  onClick={() => setManagingCategory('resolutions')}
                  title="Manage / Delete statuses"
                >
                  ⚙️ Manage
                </button>
              </div>
            }
          >
            {quickAddCat === 'resolutions' && (
              <div className="quick-add-inline" style={{ marginBottom: 12 }}>
                <input
                  placeholder="Enter new status (e.g. Issue resolved on Call)..."
                  value={quickAddVal}
                  onChange={e => setQuickAddVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doQuickAdd('resolutions', 'status'); } }}
                  autoFocus
                />
                <button type="button" className="btn btn-sm" onClick={() => doQuickAdd('resolutions', 'status')}>Save</button>
                <button type="button" className="btn btn-sm g" onClick={() => setQuickAddCat(null)}>✕</button>
              </div>
            )}
            <select value={f.status || ''} onChange={e => set('status')(e.target.value)}>
              <option value="">Choose</option>
              {(options.resolutions || []).map(o => <option key={o} value={o}>{o}</option>)}
              {f.status && !(options.resolutions || []).includes(f.status) && (
                <option value={f.status}>{f.status}</option>
              )}
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
      ) : (
        /* Active Responses sheet view */
        <div>
          {/* Summary counters: Total entries by person */}
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
            </div>

            <div className="person-stats-box">
              <div className="person-stats-header">
                <h4>👥 Total Entries by Person:</h4>
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

            <span className="cnt">{list.length} entries</span>

            <div className="bar-actions">
              <button className="btn g" onClick={exportMailCsv} title="Export Mail Responses to CSV">
                📥 Export CSV
              </button>
              <button
                className="btn"
                onClick={() => {
                  clear();
                  setView('form');
                }}
              >
                + New Entry (Form)
              </button>
            </div>
          </div>

          {/* Table: Mail responses */}
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
                  <th>Edited By</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.length ? (
                  list.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="col-num">{i + 1}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '.84rem', color: '#555' }}>{fmt(r.addedAt)}</td>
                      <td><b>{r.attendedBy || '-'}</b></td>
                      <td><span className="pill info" style={{ fontSize: '.78rem', padding: '2px 8px' }}>{r.medium || 'Mail'}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.date || '-'}</td>
                      <td>{r.shift || '-'}</td>
                      <td><b style={{ color: 'var(--navy)' }}>{r.mission || '-'}</b></td>
                      <td>{r.state || '-'}</td>
                      <td>{r.district || '-'}</td>
                      <td style={{ minWidth: 200, maxWidth: 360, wordBreak: 'break-word' }}>
                        <b>{r.subject}</b>
                      </td>
                      <td>{r.module || '-'}</td>
                      <td>{pill(r.status)}</td>
                      <td style={{ minWidth: 150, maxWidth: 260, wordBreak: 'break-word', color: '#555' }}>{r.remarks || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.editedBy ? (
                          <div>
                            <span className="pill edit" style={{ fontSize: '.72rem', padding: '2px 6px' }}>{r.editedBy}</span>
                            <div className="m" style={{ marginTop: 2 }}>{fmt(r.editedAt)}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#aaa' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn g"
                          style={{ padding: '6px 14px', fontSize: '.84rem' }}
                          title="Edit this entry"
                          onClick={() => {
                            setF({
                              ...r,
                              editedBy: (user && user !== 'support') ? user : (options.users && options.users[0]) || ''
                            });
                            setEid(r.id);
                            setView('form');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="15" className="empty">
                      {q ? `No entries found matching mail subject "${q}"` : 'No responses found. Click "+ New Entry (Form)" to add a response.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Options Manage Modal (Add & Delete) */}
      {managingCategory && (
        <ManageModal
          title={
            managingCategory === 'users' ? 'Team Members (Attended By)' :
              managingCategory === 'missions' ? 'Missions' :
                managingCategory === 'districts' ? 'Districts' :
                  managingCategory === 'shifts' ? 'Shifts/Duties' :
                    managingCategory === 'states' ? 'States' :
                      managingCategory === 'resolutions' ? 'Statuses / Actions' : 'Modules'
          }
          categoryName={
            managingCategory === 'users' ? 'person name' :
              managingCategory === 'missions' ? 'mission code' :
                managingCategory === 'districts' ? 'district' :
                  managingCategory === 'shifts' ? 'shift' :
                    managingCategory === 'states' ? 'state' :
                      managingCategory === 'resolutions' ? 'status' : 'module'
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

