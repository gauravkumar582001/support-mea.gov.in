const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const USER = process.env.PORTAL_USER || 'support';
const PASS = process.env.PORTAL_PASS || 'ChangeMe@123';
const KEY = crypto.createHash('sha256').update(process.env.SECRET_KEY || 'change-this-secret').digest();
const FILE = path.join(__dirname, 'data', 'data.json');
let db = { creds: [], mail: [], audit: [] };
fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const persist = () => fs.writeFileSync(FILE, JSON.stringify(db, null, 1));

// passwords are encrypted (AES-256-GCM) before being written to disk
const SECRET = ['pass', 'subPass'];
const enc = t => { if (!t) return t; const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const b = Buffer.concat([c.update(t, 'utf8'), c.final()]); return 'enc:' + Buffer.concat([iv, c.getAuthTag(), b]).toString('base64'); };
const dec = t => { if (!t || !String(t).startsWith('enc:')) return t; try { const b = Buffer.from(t.slice(4), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); } catch { return ''; } };
const mapSecrets = (r, fn) => { const o = { ...r }; SECRET.forEach(k => { if (o[k]) o[k] = fn(o[k]); }); return o; };

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// password can be changed via "Forgot password" (needs RECOVERY_KEY); stored hashed in data/auth.json
const AUTH = path.join(__dirname, 'data', 'auth.json'), RECOVERY = process.env.RECOVERY_KEY || 'RESET-ME-123';
let authOv = fs.existsSync(AUTH) ? JSON.parse(fs.readFileSync(AUTH, 'utf8')) : null;
const hashPw = (p, salt) => crypto.scryptSync(String(p).slice(0, 200), salt, 32).toString('hex');
const checkPw = p => authOv ? same(hashPw(p, authOv.salt), authOv.hash) : same(p, PASS);
const sessions = new Map(), fails = new Map();
const app = express();
app.use(express.json({ limit: '200kb' }));

app.post('/api/login', (q, s) => {
  const ip = q.ip, f = fails.get(ip) || { n: 0, until: 0 };
  if (f.until > Date.now()) return s.status(429).json({ error: 'Too many attempts. Try after 15 minutes.' });
  const { name, userId, username, password } = q.body || {};
  const userVal = (username || userId || '').trim();
  if (!same(userVal, USER) || !checkPw(password || '')) {
    f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; } fails.set(ip, f);
    return s.status(401).json({ error: 'Wrong username or password' });
  }
  fails.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  const sessionName = String(name || userVal).slice(0, 60);
  sessions.set(token, { name: sessionName, exp: Date.now() + 12 * 3600 * 1000 });
  s.json({ token, name: sessionName });
});

app.post('/api/forgot', (q, s) => {
  const f = fails.get(q.ip) || { n: 0, until: 0 };
  if (f.until > Date.now()) return s.status(429).json({ error: 'Too many attempts. Try after 15 minutes.' });
  const { recoveryKey, newPassword } = q.body || {};
  if (!same(recoveryKey || '', RECOVERY)) {
    f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; } fails.set(q.ip, f);
    return s.status(401).json({ error: 'Wrong recovery key' });
  }
  if (!newPassword || String(newPassword).length < 6) return s.status(400).json({ error: 'Password must be at least 6 characters' });
  const salt = crypto.randomBytes(16).toString('hex');
  authOv = { salt, hash: hashPw(newPassword, salt) };
  fs.writeFileSync(AUTH, JSON.stringify(authOv)); sessions.clear(); fails.delete(q.ip);
  s.json({ ok: true });
});

app.use('/api', (q, s, n) => {
  const x = sessions.get((q.headers.authorization || '').replace('Bearer ', ''));
  if (!x || x.exp < Date.now()) return s.status(401).json({ error: 'Login required' });
  q.user = x.name; n();
});

const COLL = ['creds', 'mail'], RESERVED = ['id', 'addedAt', 'editedAt'];
const label = r => r.name || r.subject || r.mission || r.id;
const log = (by, action, coll, r, changes) => {
  db.audit.unshift({ at: new Date().toISOString(), by, action, coll, kind: r.type, item: label(r), info: coll === 'mail' ? [r.mission, r.module, r.status].filter(Boolean).join(' · ') : (r.ip || ''), changes });
  db.audit = db.audit.slice(0, 5000);
};
const clean = b => Object.fromEntries(Object.entries(b || {}).filter(([k, v]) => !RESERVED.includes(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 2000)]));

app.get('/api/audit', (q, s) => s.json(db.audit));
app.get('/api/trash', (q, s) => s.json(db.trash || []));
app.post('/api/:c/:id/restore', (q, s) => {
  const c = q.params.c; if (!COLL.includes(c)) return s.sendStatus(404);
  const i = db[c].findIndex(x => x.id === q.params.id); if (i < 0) return s.sendStatus(404);
  const r = { ...db[c][i] };
  delete r.isDeleted;
  delete r.deletedBy;
  delete r.deletedAt;
  db[c][i] = r;
  log(q.user, 'RESTORE', c, r);
  persist();
  s.json(r);
});

app.get('/api/:c', (q, s) => COLL.includes(q.params.c) ? s.json(db[q.params.c].map(r => mapSecrets(r, dec))) : s.sendStatus(404));
app.post('/api/:c', (q, s) => {
  const c = q.params.c; if (!COLL.includes(c)) return s.sendStatus(404);
  const body = clean(q.body);
  const addedBy = body.addedBy || body.attendedBy || q.user;
  const r = { ...body, id: crypto.randomUUID(), addedBy, addedAt: new Date().toISOString() };
  db[c].unshift(mapSecrets(r, enc)); log(addedBy, 'ADD', c, r); persist(); s.json(r);
});
app.put('/api/:c/:id', (q, s) => {
  const c = q.params.c; if (!COLL.includes(c)) return s.sendStatus(404);
  const i = db[c].findIndex(r => r.id === q.params.id); if (i < 0) return s.sendStatus(404);
  const old = mapSecrets(db[c][i], dec), nw = clean(q.body), changes = {};
  Object.keys({ ...old, ...nw }).filter(k => !RESERVED.includes(k)).forEach(k => {
    if ((old[k] || '') !== (nw[k] || '')) changes[k] = SECRET.includes(k) ? 'changed' : { from: old[k] || '', to: nw[k] || '' };
  });
  const editedBy = nw.editedBy || (q.body && q.body.editedBy) || q.user;
  const r = { ...nw, id: old.id, addedBy: old.addedBy, addedAt: old.addedAt, editedBy, editedAt: new Date().toISOString() };
  db[c][i] = mapSecrets(r, enc);
  if (Object.keys(changes).length) log(editedBy, 'EDIT', c, r, changes);
  persist(); s.json(r);
});
app.delete('/api/:c/:id', (q, s) => {
  const c = q.params.c; if (!COLL.includes(c)) return s.sendStatus(404);
  const i = db[c].findIndex(x => x.id === q.params.id); if (i < 0) return s.sendStatus(404);
  const r = db[c][i];
  const deletedBy = q.headers['x-deleted-by'] || (q.query && q.query.by) || (q.body && q.body.deletedBy) || q.user;
  if (q.query && q.query.permanent === 'true') {
    db[c].splice(i, 1);
    log(deletedBy, 'PERMANENT_DELETE', c, r);
  } else {
    db[c][i] = { ...r, isDeleted: true, deletedBy, deletedAt: new Date().toISOString() };
    log(deletedBy, 'DELETE', c, r);
  }
  persist();
  s.json({ ok: true, item: db[c][i] });
});

const OPTS_FILE = path.join(__dirname, 'data', 'options.json');
let dynamicOptions = {
  users: ['Md Asif', 'Mayank Sharma', 'Naveen Sandhu', 'Rahul Kumar', 'Ritesh Kumar', 'Vineet Sharma', 'Gaurav Kumar'],
  missions: ['INDIA', 'ALGERIA-ALGIERS', 'ANGOLA-LUANDA', 'ARGENTINA-BUENOS AIRES', 'ARMENIA-YEREVAN', 'AUSTRALIA-BRISBANE', 'AUSTRALIA-CANBERRA', 'AUSTRALIA-MELBOURNE', 'AUSTRALIA-PERTH', 'AUSTRALIA-SYDNEY', 'AUSTRIA-VIENNA', 'AZERBAIJAN-BAKU', 'BAHRAIN-ADLIYA', 'BANGLADESH-CHITTAGONG', 'BANGLADESH-DHAKA', 'BANGLADESH-KHULNA', 'BANGLADESH-RAJSHAHI', 'BANGLADESH-SYLHET', 'CHINA-HONG KONG', 'GERMANY-BERLIN', 'IRELAND-DUBLIN', 'ITALY-MILAN', 'NEW ZEALAND-WELLINGTON', 'NORWAY-OSLO', 'SLOVAKIA-BRATISLAVA', 'SRI LANKA-COLOMBO', 'SWITZERLAND-GENEVA', 'UK-LONDON', 'USA-CHICAGO', 'USA-SAN FRANCISCO'],
  districts: ['Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow'],
  modules: ['Biometric', 'Black List Checking (BL)', 'Centralized Visa Issuance System (CVISA)', 'CIPPS', 'CONSPROM', 'Consular Issuance System (CIS)', 'District Police Module (DPM)', 'DVISA', 'eFRRO', 'EMAIL Related', 'E-SANAD', 'eSEWA (Online Indian Consular Services)/eCCSS', 'e-VISA', 'e-VISA (PLI Application)', 'Global Entry Program (GEP)', 'Indian Citizenship Portal', 'Indian Visa Online (VSS)', 'Overseas Citizen of India (OCI)', 'Prior Referral Check (PRC)', 'Virtual Private Network Token (VPN)', 'Other'],
  shifts: ['Morning', 'Afternoon', 'Night'],
  states: ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
  resolutions: ['Issue resolved with remote meeting', 'Issue resolved on Call', 'Issue resolved through mail reply', 'Forwarded to concerned team', 'Meeting sent but Mission not responded', 'Information only mail', 'Transferred to next shift person', 'Replied mail for more information', 'Pending']
};
if (fs.existsSync(OPTS_FILE)) {
  try { dynamicOptions = { ...dynamicOptions, ...JSON.parse(fs.readFileSync(OPTS_FILE, 'utf8')) }; } catch (e) {}
}
const persistOptions = () => fs.writeFileSync(OPTS_FILE, JSON.stringify(dynamicOptions, null, 1));

app.get('/api/options', (q, s) => s.json(dynamicOptions));
app.post('/api/options', (q, s) => {
  if (q.body && typeof q.body === 'object') {
    Object.keys(q.body).forEach(k => {
      if (Array.isArray(q.body[k])) dynamicOptions[k] = q.body[k];
    });
    persistOptions();
  }
  s.json(dynamicOptions);
});

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((q, s) => s.sendFile(path.join(dist, 'index.html')));
app.listen(PORT, () => console.log('Support Hub running on http://localhost:' + PORT));
