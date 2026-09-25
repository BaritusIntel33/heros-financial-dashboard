/**
 * Payroll math. Pure functions, no DOM — usable in the browser and Node.
 *
 * Payroll = {
 *   salaried: [{ name, annual }],        // up to 5, monthly = annual / 12
 *   hourly:   [{ name, rate, hours }],   // up to 5, monthly = rate × hours per month
 *   burdenPct: number,                   // payroll taxes & benefits, decimal (0.1 = 10%)
 * }
 */
(function (root) {
  'use strict';

  const MAX_SALARIED = 5;
  const MAX_HOURLY = 5;

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  function emptyPayroll() {
    return {
      salaried: [{ name: '', annual: 0 }],
      hourly: [{ name: '', rate: 0, hours: 0 }],
      burdenPct: 0,
    };
  }

  function compute(payroll) {
    const salariedRows = (payroll.salaried || []).slice(0, MAX_SALARIED)
      .map((p) => ({ ...p, monthly: num(p.annual) / 12 }));
    const hourlyRows = (payroll.hourly || []).slice(0, MAX_HOURLY)
      .map((p) => ({ ...p, monthly: num(p.rate) * num(p.hours) }));

    const salaried = salariedRows.reduce((t, r) => t + r.monthly, 0);
    const hourly = hourlyRows.reduce((t, r) => t + r.monthly, 0);
    const hours = hourlyRows.reduce((t, r) => t + num(r.hours), 0);
    const burden = (salaried + hourly) * num(payroll.burdenPct);

    return {
      salariedRows,
      hourlyRows,
      salaried,
      hourly,
      hours,
      burden,
      total: salaried + hourly + burden,
    };
  }

  /** Labor lines for the P&L; zero-dollar groups are left out. */
  function toLaborLines(totals) {
    return [
      ['Salaried payroll', totals.salaried],
      ['Hourly payroll', totals.hourly],
      ['Payroll taxes & benefits', totals.burden],
    ]
      .filter(([, amount]) => amount > 0)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));
  }

  const api = { MAX_SALARIED, MAX_HOURLY, emptyPayroll, compute, toLaborLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Payroll = api;
})(typeof window !== 'undefined' ? window : globalThis);
