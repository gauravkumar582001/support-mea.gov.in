import React from 'react';

export const DEFAULT_OPTIONS = {
  users: [],
  shifts: [],
  resolutions: [],
  modules: [],
  states: [],
  missions: [],
  districts: []
};

export const today = () => new Date().toLocaleDateString('en-CA');

export const fmt = d => d ? new Date(d).toLocaleString('en-GB') : '';

export const pill = v => {
  const t = (v || '').toLowerCase();
  const c = t.includes('not responded') || t.includes('more information') ? 'warn' :
    t.includes('resolved') ? 'ok' :
      t.includes('pending') ? 'wait' :
        t.includes('forwarded') || t.includes('transferred') ? 'fwd' : 'info';
  return v ? <span className={'pill ' + c}>{v}</span> : null;
};

export const call = async (p, o = {}) => {
  const r = await fetch('/api/' + p, {
    ...o,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + sessionStorage.getItem('t')
    },
    body: o.body && JSON.stringify(o.body)
  });
  if (r.status === 401) {
    sessionStorage.clear();
    location.reload();
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
};

export const downloadCsv = (filename, columns, rows) => {
  if (!rows || !rows.length) {
    alert('No data available to export');
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

