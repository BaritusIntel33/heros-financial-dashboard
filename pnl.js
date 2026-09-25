/**
 * Monthly P&L math. Pure functions, no DOM — usable in the browser and Node.
 *
 * A month is { sales: Line[], cogs: Line[], labor: Line[], opex: Line[] }
 * where Line = { name: string, amount: number }.
 */
(function (root) {
  'use strict';

  const SECTIONS = Object.freeze([
    { key: 'sales', title: 'Sales', total: 'Total sales' },
    { key: 'cogs', title: 'Cost of goods sold', total: 'Total COGS' },
    { key: 'labor', title: 'Labor', total: 'Total labor' },
    { key: 'opex', title: 'Operating expenses', total: 'Total operating expenses' },
  ]);

  // Starting month, consistent with the calculator defaults
  // ($17,000 sales, 29% COGS, $13,000 labor, $4,000 OpEx).
  const TEMPLATE = Object.freeze({
    sales: [['Food sales', 15000], ['Beverage sales', 2000]],
    cogs: [['Food cost', 4400], ['Beverage cost', 530]],
    labor: [['Wages', 11500], ['Payroll taxes & benefits', 1500]],
    opex: [
      ['Rent', 2000],
      ['Utilities', 700],
      ['Marketing', 300],
      ['Card processing fees', 500],
      ['Repairs & other', 500],
    ],
  });

  function templateMonth() {
    const month = {};
    for (const { key } of SECTIONS) {
      month[key] = TEMPLATE[key].map(([name, amount]) => ({ name, amount }));
    }
    return month;
  }

  /** Same line names as `month`, amounts set to 0. */
  function blankFrom(month) {
    const next = {};
    for (const { key } of SECTIONS) {
      next[key] = (month[key] || []).map(({ name }) => ({ name, amount: 0 }));
    }
    return next;
  }

  const sum = (lines) => (lines || []).reduce((t, l) => t + (Number(l.amount) || 0), 0);

  function compute(month) {
    const sales = sum(month.sales);
    const cogs = sum(month.cogs);
    const labor = sum(month.labor);
    const opex = sum(month.opex);
    const grossProfit = sales - cogs;
    const primeCost = cogs + labor;
    const netProfit = grossProfit - labor - opex;
    const pct = (n) => (sales > 0 ? n / sales : NaN);

    return {
      sales, cogs, labor, opex, grossProfit, primeCost, netProfit,
      cogsPct: pct(cogs),
      laborPct: pct(labor),
      opexPct: pct(opex),
      grossMargin: pct(grossProfit),
      primePct: pct(primeCost),
      netMargin: pct(netProfit),
      pct,
    };
  }

  /** Calculator inputs derived from a month's actuals. */
  function toCalculatorInputs(totals) {
    const out = { currentRevenue: totals.sales, labor: totals.labor, opex: totals.opex };
    if (totals.sales > 0) out.cogsPct = totals.cogs / totals.sales;
    return out;
  }

  function toCSV(monthKey, month) {
    const t = compute(month);
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '');
    const rows = [['Month', 'Section', 'Line', 'Amount', '% of sales']];
    for (const { key, title, total } of SECTIONS) {
      for (const line of month[key] || []) {
        rows.push([monthKey, title, line.name, (Number(line.amount) || 0).toFixed(2), pct(t.pct(line.amount || 0))]);
      }
      rows.push([monthKey, title, total, t[key].toFixed(2), pct(t.pct(t[key]))]);
    }
    rows.push([monthKey, 'Summary', 'Gross profit', t.grossProfit.toFixed(2), pct(t.grossMargin)]);
    rows.push([monthKey, 'Summary', 'Prime cost', t.primeCost.toFixed(2), pct(t.primePct)]);
    rows.push([monthKey, 'Summary', 'Net profit', t.netProfit.toFixed(2), pct(t.netMargin)]);
    return rows.map((r) => r.map(q).join(',')).join('\r\n');
  }

  const api = { SECTIONS, templateMonth, blankFrom, compute, toCalculatorInputs, toCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PnL = api;
})(typeof window !== 'undefined' ? window : globalThis);
