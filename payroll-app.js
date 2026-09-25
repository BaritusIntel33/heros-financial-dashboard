(function () {
  'use strict';

  const { MAX_SALARIED, MAX_HOURLY, emptyPayroll, migrate, compute, toLaborLines } = window.Payroll;
  const STORAGE_KEY = 'payroll';

  const $ = (id) => document.getElementById(id);
  const dialog = $('payroll');
  const form = $('payroll-form');

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtMoney = (n) => (Number.isFinite(n) ? money.format(n) : '—');

  const LIMITS = { salaried: MAX_SALARIED, hourly: MAX_HOURLY };
  const BLANK = { salaried: () => ({ name: '', annual: 0 }), hourly: () => ({ name: '', rate: 0, weeklyHours: 0 }) };
  const COLUMNS = {
    salaried: [
      { field: 'annual', label: 'Annual salary', money: true, step: '500' },
    ],
    hourly: [
      { field: 'rate', label: 'Hourly rate', money: true, step: '0.25' },
      { field: 'weeklyHours', label: 'Hours per week', money: false, step: '0.5' },
    ],
  };

  // ---------- storage ----------
  let payroll;
  try { payroll = migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyPayroll()); } catch { payroll = emptyPayroll(); }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payroll)); } catch { /* ignore */ }
  }

  // ---------- rendering ----------
  function input(attrs, value) {
    const node = document.createElement('input');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    node.value = value;
    return node;
  }

  function wrap(node, cls) {
    const div = document.createElement('div');
    div.className = `input-wrap ${cls}`;
    div.append(node);
    return div;
  }

  function cell(child, cls) {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    if (child) td.append(child);
    return td;
  }

  function renderRows() {
    for (const group of ['salaried', 'hourly']) {
      const rows = payroll[group].map((person, index) => {
        const tr = document.createElement('tr');
        tr.append(cell(input({
          type: 'text', class: 'line-name', placeholder: `Employee ${index + 1}`,
          'data-group': group, 'data-index': index, 'data-field': 'name', 'aria-label': `${group} employee ${index + 1} name`,
        }, person.name)));

        for (const col of COLUMNS[group]) {
          const field = input({
            type: 'number', min: '0', step: col.step, inputmode: 'decimal', placeholder: '0',
            'data-group': group, 'data-index': index, 'data-field': col.field,
            'aria-label': `${person.name || `Employee ${index + 1}`} ${col.label.toLowerCase()}`,
          }, person[col.field] || '');
          tr.append(cell(col.money ? wrap(field, 'money') : wrap(field, 'hrs')));
        }

        tr.append(cell(null, 'num monthly'));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-btn';
        remove.textContent = '×';
        remove.title = 'Remove';
        remove.setAttribute('aria-label', `Remove ${person.name || `employee ${index + 1}`}`);
        remove.dataset.payrollRemove = group;
        remove.dataset.index = index;
        tr.append(cell(remove));
        return tr;
      });
      $(`${group}-rows`).replaceChildren(...rows);
    }
    $('burdenPct').value = payroll.burdenPct ? +(payroll.burdenPct * 100).toFixed(2) : '';
    update();
  }

  function update() {
    const t = compute(payroll);
    for (const group of ['salaried', 'hourly']) {
      const rows = t[`${group}Rows`];
      $(`${group}-rows`).querySelectorAll('.monthly').forEach((td, i) => { td.textContent = fmtMoney(rows[i].monthly); });
      $(`${group}-count`).textContent = `${payroll[group].length} of ${LIMITS[group]}`;
      $(`${group}-total`).textContent = `${fmtMoney(t[group])} / mo`;
      form.querySelector(`[data-payroll-add="${group}"]`).disabled = payroll[group].length >= LIMITS[group];
    }
    $('hourly-total').textContent = `${+t.weeklyHours.toFixed(1)} hrs/wk · ${fmtMoney(t.hourly)} / mo`;
    $('burden-total').textContent = fmtMoney(t.burden);
    $('payroll-total').textContent = fmtMoney(t.total);
  }

  // ---------- events ----------
  form.addEventListener('input', (e) => {
    const { group, index, field } = e.target.dataset;
    if (e.target.id === 'burdenPct') {
      const n = parseFloat(e.target.value);
      payroll.burdenPct = Number.isFinite(n) ? n / 100 : 0;
    } else if (group) {
      if (field === 'name') {
        payroll[group][index].name = e.target.value;
      } else {
        const n = parseFloat(e.target.value);
        payroll[group][index][field] = Number.isFinite(n) ? n : 0;
      }
    } else {
      return;
    }
    persist();
    update();
  });

  form.addEventListener('click', (e) => {
    const add = e.target.closest('[data-payroll-add]');
    const remove = e.target.closest('[data-payroll-remove]');
    if (add) {
      const group = add.dataset.payrollAdd;
      if (payroll[group].length >= LIMITS[group]) return;
      payroll[group].push(BLANK[group]());
      persist();
      renderRows();
      const names = $(`${group}-rows`).querySelectorAll('.line-name');
      names[names.length - 1].focus();
    } else if (remove) {
      payroll[remove.dataset.payrollRemove].splice(Number(remove.dataset.index), 1);
      persist();
      renderRows();
    }
  });

  // Enter inside a field shouldn't close the dialog.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  });

  // ---------- open / apply ----------
  let target = 'calculator';

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-payroll]');
    if (!opener) return;
    target = opener.dataset.payroll;
    $('payroll-apply').textContent = target === 'pnl'
      ? `Apply to ${window.PnLApp.monthLabel()} labor`
      : 'Apply to monthly labor';
    renderRows();
    dialog.returnValue = '';
    dialog.showModal();
    form.querySelector('.line-name')?.focus();
  });

  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'apply') return;
    const t = compute(payroll);
    if (target === 'pnl') {
      window.PnLApp.setLaborLines(toLaborLines(t));
    } else {
      window.RevenueApp.setInputs({ labor: Math.round(t.total) });
    }
  });
})();
