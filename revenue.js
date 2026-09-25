/**
 * Required-revenue math. Pure functions, no DOM — usable in the browser and Node.
 *
 *   Required Revenue = (Labor + OpEx + Desired Profit) ÷ (1 − COGS %)
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
    desiredProfit: 2000,
    primeLowPct: 0.55,
    primeHighPct: 0.60,
  });

  /** Revenue needed to cover `fixed` dollars when each sales dollar keeps (1 − rate). */
  function grossUp(fixed, rate) {
    const margin = 1 - rate;
    return margin > 0 ? fixed / margin : NaN;
  }

  function compute(input) {
    const i = { ...DEFAULTS, ...input };
    const errors = [];
    if (i.cogsPct >= 1) errors.push('COGS must be below 100%.');
    if (i.cogsPct < 0) errors.push('COGS cannot be negative.');
    if (i.primeLowPct > i.primeHighPct) errors.push('Prime cost low target is above the high target.');

    const requiredRevenue = grossUp(i.labor + i.opex + i.desiredProfit, i.cogsPct);
    const breakEvenRevenue = grossUp(i.labor + i.opex, i.cogsPct);
    const revenueGap = requiredRevenue - i.currentRevenue;

    const currentProfit = i.currentRevenue * (1 - i.cogsPct) - i.labor - i.opex;
    const laborPctCurrent = i.currentRevenue > 0 ? i.labor / i.currentRevenue : NaN;
    const laborPctRequired = i.labor / requiredRevenue;

    // Labor dollars allowed if labor sat exactly at its target share of required revenue.
    const laborBudget = i.laborTargetPct * requiredRevenue;

    // Required revenue if labor scaled with sales at the target %:
    //   R = (t·R + OpEx + Profit) / (1 − COGS)  →  R = (OpEx + Profit) / (1 − COGS − t)
    const requiredRevenueAtLaborTarget = grossUp(i.opex + i.desiredProfit, i.cogsPct + i.laborTargetPct);

    // Revenue at which the current labor dollars hit each target %.
    const revenueForLaborTarget = i.laborTargetPct > 0 ? i.labor / i.laborTargetPct : NaN;
    const primeGap = (p) => (p > i.cogsPct ? i.labor / (p - i.cogsPct) : NaN);

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
      laborBudget,
      laborOverBudget: i.labor - laborBudget,
      requiredRevenueAtLaborTarget,
      revenueForLaborTarget,
      primePctCurrent: i.cogsPct + laborPctCurrent,
      primePctRequired: i.cogsPct + laborPctRequired,
      revenueForPrimeHigh: primeGap(i.primeHighPct),
      revenueForPrimeLow: primeGap(i.primeLowPct),
      breakdown: {
        cogs: requiredRevenue * i.cogsPct,
        labor: i.labor,
        opex: i.opex,
        profit: i.desiredProfit,
      },
    };
  }

  const api = { DEFAULTS, compute, grossUp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Revenue = api;
})(typeof window !== 'undefined' ? window : globalThis);
