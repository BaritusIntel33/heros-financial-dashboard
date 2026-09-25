(function () {
  'use strict';

  const { DEFAULTS, compute, scenario } = window.Revenue;
  const STORAGE_KEY = 'required-revenue-inputs';
  const PCT_FIELDS = new Set(['cogsPct', 'laborTargetPct', 'primeLowPct', 'primeHighPct']);
  const FIELDS = Object.keys(DEFAULTS);

  const $ = (id) => document.getElementById(id);
  const form = $('inputs');

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtMoney = (n) => (Number.isFinite(n) ? money.format(n) : '—');
  const fmtPct = (n) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');
  const pctLabel = (n) => `${+(n * 100).toFixed(2)}%`;

  // ---------- storage (optional, never required) ----------
  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }
  function save(values) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* ignore */ }
  }

  // ---------- form <-> values ----------
  function writeForm(values) {
    for (const key of FIELDS) {
      const shown = PCT_FIELDS.has(key) ? +(values[key] * 100).toFixed(2) : values[key];
      $(key).value = shown;
      const slider = form.querySelector(`input[type=range][data-for="${key}"]`);
      if (slider) slider.value = shown;
    }
  }

  function readForm() {
    const values = {};
    for (const key of FIELDS) {
      const n = parseFloat($(key).value);
      const v = Number.isFinite(n) ? n : 0;
      values[key] = PCT_FIELDS.has(key) ? v / 100 : v;
    }
    return values;
  }

  // ---------- render ----------
  function setTone(el, tone) {
    el.classList.remove('good', 'warn', 'bad');
    if (tone) el.classList.add(tone);
  }

  function render() {
    const values = readForm();
    const r = compute(values);
    const i = r.inputs;

    $('errors').hidden = r.errors.length === 0;
    $('errors').textContent = r.errors.join(' ');

    $('requiredRevenue').textContent = fmtMoney(r.requiredRevenue);

    const gap = $('gapLine');
    if (!Number.isFinite(r.revenueGap)) {
      gap.textContent = '—';
      setTone(gap, null);
    } else if (r.revenueGap > 0) {
      gap.textContent = `${fmtMoney(r.revenueGap)} more than current revenue (+${fmtPct(r.revenueGapPct)})`;
      setTone(gap, 'bad');
    } else {
      gap.textContent = `Current revenue already clears the target by ${fmtMoney(-r.revenueGap)}`;
      setTone(gap, 'good');
    }

    renderBar(r);
    renderScenario(r);

    $('breakEvenRevenue').textContent = fmtMoney(r.breakEvenRevenue);

    const profit = $('currentProfit');
    profit.textContent = fmtMoney(r.currentProfit);
    setTone(profit, r.currentProfit >= i.desiredProfit ? 'good' : r.currentProfit >= 0 ? 'warn' : 'bad');
    $('currentProfitNote').textContent = r.currentProfit < 0
      ? `Loss at ${fmtMoney(i.currentRevenue)} of sales`
      : `vs ${fmtMoney(i.desiredProfit)} goal`;

    const labor = $('laborPctRequired');
    labor.textContent = fmtPct(r.laborPctRequired);
    setTone(labor, r.laborPctRequired <= i.laborTargetPct ? 'good' : 'bad');
    $('laborNote').textContent = `At required revenue · target ${fmtPct(i.laborTargetPct)} · today ${fmtPct(r.laborPctCurrent)}`;

    const prime = $('primePctRequired');
    prime.textContent = fmtPct(r.primePctRequired);
    setTone(prime,
      r.primePctRequired <= i.primeHighPct ? 'good'
        : r.primePctRequired <= i.primeHighPct + 0.05 ? 'warn' : 'bad');
    $('primeNote').textContent = `At required revenue · target ${fmtPct(i.primeLowPct)}–${fmtPct(i.primeHighPct)} · today ${fmtPct(r.primePctCurrent)}`;

    $('laborBudget').textContent = fmtMoney(r.laborBudget);
    $('laborOverBudget').textContent = r.laborOverBudget > 0 ? fmtMoney(r.laborOverBudget) : 'None — within target';
    $('requiredRevenueAtLaborTarget').textContent = fmtMoney(r.requiredRevenueAtLaborTarget);
    $('revenueForLaborTarget').textContent = fmtMoney(r.revenueForLaborTarget);
    $('primeHighLabel').textContent = `Revenue where prime cost hits ${pctLabel(i.primeHighPct)}`;
    $('primeLowLabel').textContent = `Revenue where prime cost hits ${pctLabel(i.primeLowPct)}`;
    $('revenueForPrimeHigh').textContent = fmtMoney(r.revenueForPrimeHigh);
    $('revenueForPrimeLow').textContent = fmtMoney(r.revenueForPrimeLow);

    save(values);
  }

  const SEGMENTS = [
    ['cogs', 'COGS'],
    ['labor', 'Labor'],
    ['opex', 'OpEx'],
    ['profit', 'Profit'],
  ];

  function renderBar(r) {
    const total = r.requiredRevenue;
    const bar = $('bar');
    const legend = $('legend');
    bar.replaceChildren();
    legend.replaceChildren();
    if (!Number.isFinite(total) || total <= 0) return;

    for (const [key, label] of SEGMENTS) {
      const amount = r.breakdown[key];
      const share = amount / total;
      const seg = document.createElement('span');
      seg.className = `seg seg-${key}`;
      seg.style.flexGrow = Math.max(share, 0);
      seg.title = `${label}: ${fmtMoney(amount)} (${fmtPct(share)})`;
      bar.append(seg);

      const li = document.createElement('li');
      li.innerHTML = `<span class="swatch seg-${key}"></span>${label}<b>${fmtMoney(amount)}</b><em>${fmtPct(share)}</em>`;
      legend.append(li);
    }
  }

  // ---------- break-even scenario ----------
  // Revenue is kept as an offset from break-even so it follows changes to the inputs.
  const SCENARIO_KEY = 'scenario-offset';
  const STEP = 100;
  let offset = 0;
  try { offset = Number(localStorage.getItem(SCENARIO_KEY)) || 0; } catch { /* ignore */ }
  let lastResult = null;

  const signed = (n) => (n >= 0 ? `+${fmtMoney(n)}` : fmtMoney(n));

  function setOffset(next) {
    offset = Math.round(next * 100) / 100;
    try { localStorage.setItem(SCENARIO_KEY, String(offset)); } catch { /* ignore */ }
    renderScenario(lastResult);
  }

  function renderScenario(r) {
    lastResult = r;
    const base = r.breakEvenRevenue;
    const revInput = $('sc-revenue');
    if (!Number.isFinite(base)) {
      revInput.value = '';
      return;
    }
    const revenue = Math.max(0, base + offset);
    const s = scenario(r.inputs, revenue);
    const i = r.inputs;

    if (document.activeElement !== revInput) revInput.value = Math.round(revenue);
    $('sc-offset').textContent = Math.abs(offset) < 0.5
      ? `At break-even revenue (${fmtMoney(base)})`
      : `${signed(offset)} from break-even (${fmtMoney(base)})`;

    $('sc-rev').textContent = fmtMoney(s.revenue);
    $('sc-cogs-label').textContent = `COGS at ${pctLabel(i.cogsPct)}`;
    $('sc-cogs').textContent = `−${fmtMoney(s.cogs)}`;
    $('sc-labor-label').textContent = `Labor at ${pctLabel(i.laborTargetPct)}`;
    $('sc-labor').textContent = `−${fmtMoney(s.labor)}`;
    $('sc-opex').textContent = `−${fmtMoney(s.opex)}`;

    const tone = s.reserve >= 0 ? 'good' : 'bad';
    const reserve = $('sc-reserve');
    reserve.textContent = signed(s.reserve);
    setTone(reserve, tone);
    $('sc-reserve-box').dataset.tone = tone;
    $('sc-reserve-note').textContent = s.reserve >= 0
      ? `Left over: room to add ${fmtMoney(s.reserve)} a month`
      : `Short: ${fmtMoney(-s.reserve)} a month to cut or cover`;

    $('sc-after-label').textContent = `After ${fmtMoney(i.desiredProfit)} desired profit`;
    const after = $('sc-after');
    after.textContent = signed(s.reserveAfterProfit);
    setTone(after, s.reserveAfterProfit >= 0 ? 'good' : 'bad');

    const laborVs = $('sc-labor-vs');
    laborVs.textContent = s.laborVsCurrent >= 0
      ? `${fmtMoney(s.labor)} budget, ${fmtMoney(s.laborVsCurrent)} to spare`
      : `${fmtMoney(s.labor)} budget, ${fmtMoney(-s.laborVsCurrent)} over`;
    setTone(laborVs, s.laborVsCurrent >= 0 ? 'good' : 'bad');
    $('sc-labor-vs-label').textContent = `Labor budget vs current ${fmtMoney(i.labor)}`;

    $('sc-zero').textContent = fmtMoney(s.zeroReserveRevenue);
    $('sc-goal').textContent = fmtMoney(s.profitReserveRevenue);
  }

  // Step buttons: click for one step, hold to repeat.
  let holdTimer = null;
  function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(holdTimer);
    holdTimer = null;
  }
  document.querySelectorAll('.step').forEach((btn) => {
    const delta = Number(btn.dataset.step);
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      setOffset(offset + delta);
      stopHold();
      holdTimer = setTimeout(() => { holdTimer = setInterval(() => setOffset(offset + delta), 80); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stopHold));
    // Keyboard (Enter/Space) fires click without pointerdown.
    btn.addEventListener('click', (e) => { if (e.detail === 0) setOffset(offset + delta); });
  });

  $('sc-revenue').addEventListener('input', (e) => {
    const n = parseFloat(e.target.value);
    if (Number.isFinite(n) && lastResult) setOffset(n - lastResult.breakEvenRevenue);
  });
  $('sc-revenue').addEventListener('blur', () => renderScenario(lastResult));
  $('sc-reset').addEventListener('click', () => setOffset(0));

  // ---------- events ----------
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'range') {
      $(t.dataset.for).value = t.value;
    } else {
      const slider = form.querySelector(`input[type=range][data-for="${t.id}"]`);
      if (slider) slider.value = t.value;
    }
    render();
  });

  $('reset').addEventListener('click', () => {
    writeForm(DEFAULTS);
    render();
  });

  // ---------- theme ----------
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch { /* ignore */ }

  $('theme-toggle').addEventListener('click', () => {
    const current = root.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.dataset.theme = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch { /* ignore */ }
  });

  // ---------- tabs (hash routing so each tab has its own link) ----------
  const VIEWS = ['revenue', 'pnl'];
  function showView() {
    const name = location.hash.slice(1);
    const active = VIEWS.includes(name) ? name : 'revenue';
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== active; });
    document.querySelectorAll('.tab').forEach((t) => {
      if (t.dataset.view === active) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    document.dispatchEvent(new CustomEvent('viewchange', { detail: active }));
  }
  window.addEventListener('hashchange', showView);

  writeForm(load());
  render();
  showView();

  // Shared with the P&L tab.
  window.RevenueApp = {
    getResult: () => compute(readForm()),
    setInputs(partial) {
      writeForm({ ...readForm(), ...partial });
      render();
    },
  };
})();
