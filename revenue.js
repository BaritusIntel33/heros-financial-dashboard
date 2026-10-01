/**
 * Required-revenue math. Pure functions, no DOM — usable in the browser and Node.
 *
 *   Required Revenue = (Labor + OpEx) ÷ (1 − COGS % − Desired Profit %)
 *
 * Desired profit is a % of revenue, so it is the same as
 * (Labor + OpEx + Profit $) ÷ (1 − COGS %) with Profit $ = Revenue × Profit %.
 *
 * All percentages are decimals (0.29 = 29%). All money values are monthly.
 */
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    currentRevenue: 17000,
    cogsPct: 0.29,
    labor: 13000,
    laborTargetPct: 0.315,
    opex: 4000,
    desiredProfitPct: 0.075,
    primeLowPct: 0.55,
    primeHighPct: 0.60,
  });

  /** Revenue needed to cover `fixed` dollars when each sales dollar keeps (1 − rate). */
  function grossUp(fixed, rate) {
    const margin = 1 - rate;
    return margin > 0 ? fixed / margin : NaN;
  }

  /**
   * Inputs saved before profit was a % (`desiredProfit` in dollars) are converted to the
   * % that gives the same required revenue: P × (1 − COGS) ÷ (Labor + OpEx + P).
   */
  function migrate(saved) {
    const s = { ...saved };
    if (s.desiredProfitPct === undefined && s.desiredProfit !== undefined) {
      const i = { ...DEFAULTS, ...s };
      const p = Number(s.desiredProfit) || 0;
      const total = i.labor + i.opex + p;
      s.desiredProfitPct = total > 0 ? Math.round((p * (1 - i.cogsPct) / total) * 10000) / 10000 : 0;
    }
    delete s.desiredProfit;
    return s;
  }

  function compute(input) {
    const i = { ...DEFAULTS, ...input };
    const errors = [];
    if (i.cogsPct >= 1) errors.push('COGS must be below 100%.');
    if (i.cogsPct < 0) errors.push('COGS cannot be negative.');
    if (i.cogsPct + i.desiredProfitPct >= 1) errors.push('COGS % plus desired profit % must be below 100%.');
    if (i.primeLowPct > i.primeHighPct) errors.push('Prime cost low target is above the high target.');

    const requiredRevenue = grossUp(i.labor + i.opex, i.cogsPct + i.desiredProfitPct);
    const desiredProfit = requiredRevenue * i.desiredProfitPct;
    const breakEvenRevenue = grossUp(i.labor + i.opex, i.cogsPct);
    const revenueGap = requiredRevenue - i.currentRevenue;

    const currentProfit = i.currentRevenue * (1 - i.cogsPct) - i.labor - i.opex;
    const laborPctCurrent = i.currentRevenue > 0 ? i.labor / i.currentRevenue : NaN;
    const laborPctRequired = i.labor / requiredRevenue;

    // Revenue at which actual payroll is exactly the labor target % of sales.
    const laborTargetRevenue = i.laborTargetPct > 0 ? i.labor / i.laborTargetPct : NaN;

    return {
      inputs: i,
      errors,
      requiredRevenue,
      breakEvenRevenue,
      revenueGap,
      revenueGapPct: i.currentRevenue > 0 ? revenueGap / i.currentRevenue : NaN,
      currentProfit,
      laborPctCurrent,
      laborPctRequired,
      laborTargetRevenue,
      desiredProfit,
      currentProfitGoal: i.currentRevenue * i.desiredProfitPct,
      primePctCurrent: i.cogsPct + laborPctCurrent,
      primePctRequired: i.cogsPct + laborPctRequired,
      breakdown: {
        cogs: requiredRevenue * i.cogsPct,
        labor: i.labor,
        opex: i.opex,
        profit: desiredProfit,
      },
    };
  }

  /**
   * What's left at a given revenue when COGS and labor are held at their set
   * percentages (COGS % and labor target %) and OpEx stays fixed.
   */
  function scenario(input, revenue, laborMode = 'target') {
    const i = { ...DEFAULTS, ...input };
    const actual = laborMode === 'actual';
    const cogs = revenue * i.cogsPct;
    // Target: labor scales with revenue at the target %. Actual: labor is the fixed monthly dollars.
    const labor = actual ? i.labor : revenue * i.laborTargetPct;
    const reserve = revenue - cogs - labor - i.opex;
    return {
      laborMode: actual ? 'actual' : 'target',
      revenue,
      cogs,
      labor,
      opex: i.opex,
      reserve,
      // Desired profit at this revenue, taken out of the reserve.
      profit: revenue * i.desiredProfitPct,
      reserveAfterProfit: reserve - revenue * i.desiredProfitPct,
      // Labor dollars the target % allows here, compared with actual monthly labor.
      laborBudget: revenue * i.laborTargetPct,
      laborVsCurrent: revenue * i.laborTargetPct - i.labor,
      laborPctOfRevenue: revenue > 0 ? i.labor / revenue : NaN,
      // Revenue at which the reserve is exactly $0, and exactly the desired profit.
      zeroReserveRevenue: actual
        ? grossUp(i.labor + i.opex, i.cogsPct)
        : grossUp(i.opex, i.cogsPct + i.laborTargetPct),
      profitReserveRevenue: actual
        ? grossUp(i.labor + i.opex, i.cogsPct + i.desiredProfitPct)
        : grossUp(i.opex, i.cogsPct + i.laborTargetPct + i.desiredProfitPct),
    };
  }

  const api = { DEFAULTS, migrate, compute, grossUp, scenario };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Revenue = api;
})(typeof window !== 'undefined' ? window : globalThis);
