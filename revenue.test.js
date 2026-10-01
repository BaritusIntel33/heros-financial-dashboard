// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, scenario, migrate, DEFAULTS } = require('./revenue.js');

const close = (actual, expected, eps = 0.01) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

test('required revenue matches the formula with starting values', () => {
  const r = compute(DEFAULTS);
  // (13,000 + 4,000) / (1 − 0.29 − 0.075)
  close(r.requiredRevenue, 17000 / 0.635);
  close(r.requiredRevenue, 26771.65);
  close(r.desiredProfit, r.requiredRevenue * 0.075); // 2,007.87
  // Same as the dollar form: (Labor + OpEx + Profit $) / (1 − COGS %)
  close(r.requiredRevenue, (17000 + r.desiredProfit) / 0.71);
  close(r.revenueGap, 26771.65 - 17000);
});

test('saved dollar profit converts to the % with the same required revenue', () => {
  const saved = migrate({ desiredProfit: 2000 });
  assert.equal(saved.desiredProfit, undefined);
  close(compute(saved).requiredRevenue, 19000 / 0.71, 5); // old result, within % rounding
  assert.equal(migrate({ desiredProfit: 0 }).desiredProfitPct, 0);
  assert.equal(migrate({ desiredProfitPct: 0.1 }).desiredProfitPct, 0.1);
});

test('break-even and current profit', () => {
  const r = compute(DEFAULTS);
  close(r.breakEvenRevenue, 17000 / 0.71);
  close(r.currentProfit, 17000 * 0.71 - 13000 - 4000); // −4,930
});

test('labor and prime cost percentages', () => {
  const r = compute(DEFAULTS);
  close(r.laborPctRequired, 13000 / (17000 / 0.635), 1e-9);
  close(r.primePctRequired, 0.29 + r.laborPctRequired, 1e-9);
});

test('inputs override defaults', () => {
  const r = compute({ labor: 8000 });
  close(r.requiredRevenue, 12000 / 0.635);
});

test('invalid COGS is reported, not thrown', () => {
  const r = compute({ cogsPct: 1 });
  assert.ok(r.errors.length > 0);
  assert.ok(Number.isNaN(r.requiredRevenue));
});

test('break-even scenario holds COGS and labor at their percentages', () => {
  const breakEven = compute(DEFAULTS).breakEvenRevenue; // 23,943.66
  const s = scenario(DEFAULTS, breakEven);
  close(s.cogs, breakEven * 0.29);
  close(s.labor, breakEven * 0.315);
  close(s.reserve, breakEven * (1 - 0.29 - 0.315) - 4000); // 5,457.75 left over
  close(s.profit, breakEven * 0.075);
  close(s.reserveAfterProfit, s.reserve - breakEven * 0.075);
  close(s.laborVsCurrent, breakEven * 0.315 - 13000);
});

test('each $100 step moves the reserve by $100 × (1 − COGS% − labor%)', () => {
  const a = scenario(DEFAULTS, 20000);
  const b = scenario(DEFAULTS, 20100);
  close(b.reserve - a.reserve, 100 * 0.395);
});

test('reserve is zero at OpEx / (1 − COGS% − labor%)', () => {
  const s = scenario(DEFAULTS, 0);
  close(s.zeroReserveRevenue, 4000 / 0.395);
  close(scenario(DEFAULTS, s.zeroReserveRevenue).reserve, 0);
  close(scenario(DEFAULTS, s.profitReserveRevenue).reserveAfterProfit, 0);
});

test('actual-labor scenario keeps labor at fixed dollars', () => {
  const r = compute(DEFAULTS);
  const s = scenario(DEFAULTS, r.breakEvenRevenue, 'actual');
  assert.equal(s.labor, 13000);
  close(s.reserve, 0); // break-even means $0 left with real labor
  close(s.zeroReserveRevenue, r.breakEvenRevenue);
  close(s.profitReserveRevenue, r.requiredRevenue);
  close(scenario(DEFAULTS, r.requiredRevenue, 'actual').reserveAfterProfit, 0);
  close(s.laborPctOfRevenue, 13000 / r.breakEvenRevenue, 1e-9);
});

test('actual-labor scenario: each $100 adds $100 × (1 − COGS%)', () => {
  const a = scenario(DEFAULTS, 20000, 'actual');
  const b = scenario(DEFAULTS, 20100, 'actual');
  close(b.reserve - a.reserve, 71);
});

test('target mode starts where actual payroll equals the target %', () => {
  const r = compute(DEFAULTS);
  close(r.laborTargetRevenue, 13000 / 0.315); // 41,269.84
  const s = scenario(DEFAULTS, r.laborTargetRevenue, 'target');
  close(s.labor, 13000); // target % of that revenue is exactly the real payroll
  close(s.laborVsCurrent, 0);
  close(s.reserve, r.laborTargetRevenue * (1 - 0.29) - 13000 - 4000);

  // Higher payroll → higher revenue; higher target % → lower revenue.
  assert.ok(compute({ labor: 14000 }).laborTargetRevenue > r.laborTargetRevenue);
  close(compute({ laborTargetPct: 0.35 }).laborTargetRevenue, 13000 / 0.35); // 37,142.86
});
