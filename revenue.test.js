// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, DEFAULTS } = require('./revenue.js');

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
