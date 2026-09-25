// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, scenario, DEFAULTS } = require('./revenue.js');

const close = (actual, expected, eps = 0.01) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

test('required revenue matches the formula with starting values', () => {
  const r = compute(DEFAULTS);
  // (13,000 + 4,000 + 2,000) / (1 − 0.29)
  close(r.requiredRevenue, 19000 / 0.71);
  close(r.requiredRevenue, 26760.56);
  close(r.revenueGap, 9760.56);
});

test('break-even and current profit', () => {
  const r = compute(DEFAULTS);
  close(r.breakEvenRevenue, 17000 / 0.71);
  close(r.currentProfit, 17000 * 0.71 - 13000 - 4000); // −4,930
});

test('labor and prime cost percentages', () => {
  const r = compute(DEFAULTS);
  close(r.laborPctRequired, 13000 / (19000 / 0.71), 1e-9);
  close(r.primePctRequired, 0.29 + r.laborPctRequired, 1e-9);
  close(r.laborBudget, 0.315 * r.requiredRevenue);
  close(r.revenueForLaborTarget, 13000 / 0.315);
  close(r.revenueForPrimeHigh, 13000 / (0.60 - 0.29));
});

test('required revenue when labor scales at target %', () => {
  const r = compute(DEFAULTS);
  // (4,000 + 2,000) / (1 − 0.29 − 0.315)
  close(r.requiredRevenueAtLaborTarget, 6000 / 0.395);
});

test('inputs override defaults', () => {
  const r = compute({ labor: 8000 });
  close(r.requiredRevenue, 14000 / 0.71);
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
  close(s.reserveAfterProfit, s.reserve - 2000);
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
