(function () {
  'use strict';

  const { SECTIONS, templateMonth, blankFrom, compute, toCalculatorInputs, toCSV } = window.PnL;
  const STORAGE_KEY = 'pnl-months';

  const $ = (id) => document.getElementById(id);
  const body = $('statement-body');
  const monthInput = $('pnl-month');

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtMoney = (n) => (Number.isFinite(n) ? money.format(n) : '—');
  const fmtPct = (n) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');

  // ---------- storage ----------
  let store = {};
  try { store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { store = {}; }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
  }

  // ---------- months ----------
  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

  function shiftMonth(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function monthLabel(key, style = 'long') {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: style, year: 'numeric' });
  }
  const savedKeys = () => Object.keys(store).sort();
  const previousSaved = (key) => savedKeys().filter((k) => k < key).pop();
  const clone = (x) => JSON.parse(JSON.stringify(x));

  /** Saved month, or a fresh one built from the closest earlier month's line names. */
  function monthFor(key) {
    if (store[key]) return store[key];
    const prev = previousSaved(key) || savedKeys().pop();
    return prev ? blankFrom(store[prev]) : templateMonth();
  }

  let currentKey = thisMonth;
  let month = monthFor(currentKey);

  function save() {
    store[currentKey] = month;
    persist();
  }

  // ---------- statement ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
  }

  function keyRow(label, id, cls) {
    return el('tr', { class: `key-row ${cls || ''}` },
      el('th', { scope: 'row', text: label }),
      el('td', { class: 'num', id: `${id}-amt` }),
      el('td', { class: 'num pct', id: `${id}-pct` }),
      el('td'));
  }

  function renderStatement() {
    const rows = [];
    for (const { key, title, total } of SECTIONS) {
      rows.push(el('tr', { class: 'section-head' }, el('th', { colspan: '4', scope: 'rowgroup', text: title })));

      month[key].forEach((line, index) => {
        const name = el('input', {
          type: 'text', class: 'line-name', 'data-section': key, 'data-index': index, 'data-field': 'name',
          'aria-label': `${title} line name`, placeholder: 'Line item',
        });
        name.value = line.name;
        const amount = el('input', {
          type: 'number', class: 'line-amount', 'data-section': key, 'data-index': index, 'data-field': 'amount',
          'aria-label': `${line.name || title} amount`, step: '0.01', inputmode: 'decimal', min: '0',
        });
        amount.value = line.amount === 0 ? '' : line.amount;
        amount.placeholder = '0';
        const remove = el('button', {
          type: 'button', class: 'remove-btn', 'data-remove': key, 'data-index': index,
          'aria-label': `Remove ${line.name || 'line'}`, title: 'Remove line', text: '×',
        });
        rows.push(el('tr', { class: 'line' },
          el('td', {}, name),
          el('td', { class: 'num' }, el('div', { class: 'input-wrap money' }, amount)),
          el('td', { class: 'num pct', 'data-pct': `${key}:${index}` }),
          el('td', {}, remove)));
      });

      const addCell = el('td', { colspan: '4' },
        el('button', { type: 'button', class: 'text-btn', 'data-add': key, text: '+ Add line' }));
      if (key === 'labor') {
        addCell.append(el('button', { type: 'button', class: 'text-btn', 'data-payroll': 'pnl', text: 'Payroll calculator' }));
      }
      rows.push(el('tr', { class: 'add-row' }, addCell));
      rows.push(keyRow(total, `tot-${key}`, 'subtotal'));

      if (key === 'cogs') rows.push(keyRow('Gross profit', 'gross', 'emphasis'));
      if (key === 'labor') rows.push(keyRow('Prime cost (COGS + labor)', 'prime', 'emphasis'));
    }
    rows.push(keyRow('Net profit', 'net', 'net'));
    body.replaceChildren(...rows);
    update();
  }

  function setTone(node, tone) {
    node.classList.remove('good', 'warn', 'bad');
    if (tone) node.classList.add(tone);
  }

  function setRow(id, amount, pct, tone) {
    const a = $(`${id}-amt`);
    a.textContent = fmtMoney(amount);
    $(`${id}-pct`).textContent = fmtPct(pct);
    setTone(a, tone);
  }

  // ---------- recalculation ----------
  function update() {
    const t = compute(month);

    body.querySelectorAll('[data-pct]').forEach((cell) => {
      const [key, index] = cell.dataset.pct.split(':');
      cell.textContent = fmtPct(t.pct(Number(month[key][index].amount) || 0));
    });
    for (const { key } of SECTIONS) setRow(`tot-${key}`, t[key], t.pct(t[key]));
    setRow('gross', t.grossProfit, t.grossMargin);
    setRow('prime', t.primeCost, t.primePct);
    setRow('net', t.netProfit, t.netMargin, t.netProfit >= 0 ? 'good' : 'bad');

    $('pnl-title').textContent = `${monthLabel(currentKey)} P&L`;
    $('pnl-status').textContent = store[currentKey] ? 'Saved' : 'Not saved yet — edits save automatically';
    $('pnl-delete').disabled = !store[currentKey];
    $('pnl-copy-prev').disabled = !previousSaved(currentKey);

    const net = $('pnl-net');
    net.textContent = fmtMoney(t.netProfit);
    setTone(net, t.netProfit >= 0 ? 'good' : 'bad');
    $('pnl-net-line').textContent = t.sales > 0
      ? `${fmtPct(t.netMargin)} net margin on ${fmtMoney(t.sales)} of sales`
      : 'Enter sales to see margins';

    renderChecks(t);
    renderHistory();
  }

  function renderChecks(t) {
    const app = window.RevenueApp;
    if (!app) return;
    const r = app.getResult();
    const i = r.inputs;
    const has = t.sales > 0;
    const pts = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(1)} pts`;

    const check = (id, text, tone) => {
      const cell = $(id);
      cell.textContent = has ? text : '—';
      setTone(cell, has ? tone : null);
    };
    const band = (actual, target, slack = 0.02) =>
      actual <= target ? 'good' : actual <= target + slack ? 'warn' : 'bad';

    check('chk-sales',
      `${fmtMoney(t.sales)} of ${fmtMoney(r.requiredRevenue)} (${fmtPct(t.sales / r.requiredRevenue)})`,
      t.sales >= r.requiredRevenue ? 'good' : t.sales >= r.breakEvenRevenue ? 'warn' : 'bad');
    check('chk-cogs', `${fmtPct(t.cogsPct)} vs ${fmtPct(i.cogsPct)} plan (${pts(t.cogsPct - i.cogsPct)})`,
      band(t.cogsPct, i.cogsPct));
    check('chk-labor', `${fmtPct(t.laborPct)} vs ${fmtPct(i.laborTargetPct)} (${pts(t.laborPct - i.laborTargetPct)})`,
      band(t.laborPct, i.laborTargetPct));
    check('chk-prime', `${fmtPct(t.primePct)} vs ${fmtPct(i.primeLowPct)}–${fmtPct(i.primeHighPct)}`,
      band(t.primePct, i.primeHighPct, 0.05));
    check('chk-profit', `${fmtMoney(t.netProfit)} vs ${fmtMoney(i.desiredProfit)}`,
      t.netProfit >= i.desiredProfit ? 'good' : t.netProfit >= 0 ? 'warn' : 'bad');
  }

  function renderHistory() {
    const keys = savedKeys().reverse();
    $('pnl-history-empty').hidden = keys.length > 0;
    const rows = keys.map((key) => {
      const t = compute(store[key]);
      const net = el('td', { class: 'num', text: fmtMoney(t.netProfit) });
      setTone(net, t.netProfit >= 0 ? 'good' : 'bad');
      const row = el('tr', key === currentKey ? { 'aria-current': 'true' } : {},
        el('td', {}, el('button', { type: 'button', class: 'link-btn', 'data-open': key, text: monthLabel(key, 'short') })),
        el('td', { class: 'num', text: fmtMoney(t.sales) }),
        el('td', { class: 'num', text: fmtPct(t.primePct) }),
        net);
      return row;
    });
    $('pnl-history').replaceChildren(...rows);
  }

  // ---------- navigation ----------
  function openMonth(key) {
    if (!/^\d{4}-\d{2}$/.test(key)) return;
    currentKey = key;
    month = clone(monthFor(key));
    monthInput.value = key;
    renderStatement();
  }

  // ---------- events ----------
  body.addEventListener('input', (e) => {
    const { section, index, field } = e.target.dataset;
    if (!section) return;
    const line = month[section][index];
    if (field === 'amount') {
      const n = parseFloat(e.target.value);
      line.amount = Number.isFinite(n) ? n : 0;
    } else {
      line.name = e.target.value;
    }
    save();
    update();
  });

  body.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const remove = e.target.closest('[data-remove]');
    if (add) {
      const key = add.dataset.add;
      month[key].push({ name: '', amount: 0 });
      save();
      renderStatement();
      const names = body.querySelectorAll(`.line-name[data-section="${key}"]`);
      names[names.length - 1].focus();
    } else if (remove) {
      month[remove.dataset.remove].splice(Number(remove.dataset.index), 1);
      save();
      renderStatement();
    }
  });

  monthInput.addEventListener('change', () => openMonth(monthInput.value));
  $('pnl-prev').addEventListener('click', () => openMonth(shiftMonth(currentKey, -1)));
  $('pnl-next').addEventListener('click', () => openMonth(shiftMonth(currentKey, 1)));
  $('pnl-history').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) openMonth(btn.dataset.open);
  });

  $('pnl-copy-prev').addEventListener('click', () => {
    const prev = previousSaved(currentKey);
    if (!prev) return;
    if (store[currentKey] && !confirm(`Replace ${monthLabel(currentKey)} with a copy of ${monthLabel(prev)}?`)) return;
    month = clone(store[prev]);
    save();
    renderStatement();
  });

  $('pnl-delete').addEventListener('click', () => {
    if (!store[currentKey] || !confirm(`Delete the ${monthLabel(currentKey)} P&L? This can't be undone.`)) return;
    delete store[currentKey];
    persist();
    openMonth(currentKey);
  });

  $('pnl-to-calc').addEventListener('click', () => {
    window.RevenueApp.setInputs(toCalculatorInputs(compute(month)));
    location.hash = 'revenue';
  });

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $('pnl-export').addEventListener('click', () => {
    download(`heros-pnl-${currentKey}.csv`, toCSV(currentKey, month), 'text/csv');
  });

  $('pnl-backup').addEventListener('click', () => {
    download(`heros-pnl-backup-${thisMonth}.json`, JSON.stringify(store, null, 2), 'application/json');
  });

  $('pnl-restore').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const valid = data && typeof data === 'object' && Object.entries(data).every(([k, m]) =>
        /^\d{4}-\d{2}$/.test(k) && SECTIONS.every(({ key }) => Array.isArray(m[key])));
      if (!valid) throw new Error('bad shape');
      const count = Object.keys(data).length;
      if (!confirm(`Restore ${count} month${count === 1 ? '' : 's'}? Months in the backup replace the same months here.`)) return;
      Object.assign(store, data);
      persist();
      openMonth(currentKey);
    } catch {
      alert("That file isn't a P&L backup from this dashboard.");
    }
  });

  // Shared with the payroll calculator.
  window.PnLApp = {
    monthLabel: () => monthLabel(currentKey),
    /** Replace this month's labor lines, keeping any non-payroll lines (e.g. contract labor). */
    setLaborLines(lines) {
      const payrollNames = new Set(['Wages', 'Salaried payroll', 'Hourly payroll', 'Payroll taxes & benefits']);
      const kept = month.labor.filter((l) => !payrollNames.has(l.name) && (l.name || l.amount));
      month.labor = [...lines, ...kept];
      save();
      renderStatement();
    },
  };

  // Targets may have changed on the calculator tab.
  document.addEventListener('viewchange', (e) => { if (e.detail === 'pnl') update(); });

  openMonth(currentKey);
})();
