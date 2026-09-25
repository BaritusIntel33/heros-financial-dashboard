// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const PnL = require('./pnl.js');
const Payroll = require('./payroll.js');
const Revenue = require('./revenue.js');

const close = (actual, expected, eps = 0.01) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

test('template month matches the calculator defaults', () => {
  const t = PnL.compute(PnL.templateMonth());
  assert.equal(t.sales, 17000);
  assert.equal(t.cogs, 4930); // 29% of 17,000
  assert.equal(t.labor, 13000);
  assert.equal(t.opex, 4000);
  assert.equal(t.netProfit, Revenue.compute({}).currentProfit); // −4,930
  close(t.primePct, (4930 + 13000) / 17000, 1e-9);
});

test('blank month keeps line names with zero amounts', () => {
  const blank = PnL.blankFrom(PnL.templateMonth());
  assert.equal(blank.opex.length, 5);
  assert.equal(PnL.compute(blank).sales, 0);
  assert.ok(Number.isNaN(PnL.compute(blank).primePct));
});

test('calculator inputs from a month', () => {
  const inputs = PnL.toCalculatorInputs(PnL.compute(PnL.templateMonth()));
  assert.deepEqual(inputs, { currentRevenue: 17000, labor: 13000, opex: 4000, cogsPct: 0.29 });
});

test('CSV export quotes values and includes totals', () => {
  const csv = PnL.toCSV('2026-09', PnL.templateMonth());
  assert.match(csv, /"2026-09","Sales","Total sales","17000.00","100.0%"/);
  assert.match(csv, /"Net profit","-4930.00"/);
});

test('payroll: salaried is annual / 12, hourly is rate × hours, plus burden', () => {
  const t = Payroll.compute({
    salaried: [{ name: 'GM', annual: 54000 }, { name: 'AM', annual: 42000 }],
    hourly: [{ name: 'Cook', rate: 16, hours: 160 }, { name: 'Server', rate: 12.5, hours: 100 }],
    burdenPct: 0.1,
  });
  close(t.salaried, 8000);
  close(t.hourly, 2560 + 1250);
  close(t.burden, 1181);
  close(t.total, 12991);
  assert.equal(t.hours, 260);
});

test('payroll caps each group at 5 people', () => {
  const six = Array.from({ length: 6 }, () => ({ annual: 12000, rate: 10, hours: 10 }));
  const t = Payroll.compute({ salaried: six, hourly: six, burdenPct: 0 });
  close(t.salaried, 5000);
  close(t.hourly, 500);
});

test('payroll to P&L labor lines skips empty groups', () => {
  const lines = Payroll.toLaborLines(Payroll.compute({ salaried: [], hourly: [{ rate: 15, hours: 100 }], burdenPct: 0 }));
  assert.deepEqual(lines, [{ name: 'Hourly payroll', amount: 1500 }]);
});
