# Hero's Pizza Financial Dashboard

A small, dependency-free financial dashboard. It has two tabs and a payroll calculator that works with both.

**Live site:** https://baritusintel33.github.io/heros-financial-dashboard/

## Required Revenue

This tab works out the monthly revenue needed to cover costs and hit a profit goal.

```
Required Revenue = (Labor + OpEx + Desired Profit) ÷ (1 − COGS %)
```

| Input                   | Default   |
| ----------------------- | --------- |
| Current monthly revenue | $17,000   |
| COGS                    | 29%       |
| Monthly labor           | $13,000   |
| Labor target            | 31.5%     |
| OpEx                    | $4,000    |
| Desired profit          | $2,000    |
| Prime cost target       | 55–60%    |

With these defaults the required revenue is **$26,761** per month, which is $9,761 (+57.4%) above current revenue.

It also shows:

- the break-even revenue
- profit at current revenue
- labor % and prime cost % compared with your targets
- a breakdown of the required revenue into COGS, labor, OpEx and profit

Labor and OpEx are treated as fixed monthly dollars. COGS scales with revenue.

### Break-even scenario

Use **− $100** and **+ $100** to move revenue down or up (hold a button to repeat), or type an amount. Where the scenario starts depends on the **Labor** switch below.

As revenue moves, COGS and labor stay at their set percentages (COGS % and the labor target %) and OpEx stays fixed. The **Reserve** is what's left:

```
Reserve = Revenue − Revenue × COGS % − Revenue × Labor target % − OpEx
```

Green means money left over that you could add to spending. Red means a shortfall to cut or cover. Each $100 of revenue changes the reserve by $100 × (1 − COGS % − labor %), which is $39.50 at the defaults.

The **Labor** switch chooses how labor is counted:

- **Target %**, the default: starts at the revenue where your actual payroll equals the labor target %. That is **Revenue = Payroll ÷ Target %**, so $13,000 ÷ 31.5% = $41,270. If payroll goes up, that revenue goes up; if the target % goes up, it goes down (35% gives $37,143). As you step, labor moves with revenue at the target %, so each $100 supports $31.50 of payroll and adds $100 × (1 − COGS % − labor %) = $39.50 to the reserve. You can change the target % right in the scenario; it's the same value as the Labor target input.
- **Actual $:** starts at break-even revenue. Labor is your real monthly labor dollars and stays fixed as revenue moves. The reserve is your real profit or loss at that revenue: $0 at break-even, and it reaches your profit goal at the required revenue. Each $100 of revenue adds $100 × (1 − COGS %), which is $71. The box shows labor as a % of revenue compared with your target.

A stacked bar shows how the scenario revenue splits into COGS, labor, OpEx and the reserve, in dollars and as a % of revenue. When costs exceed revenue, the overrun shows as a striped red **Shortfall** past a marker where revenue ends.

The Reserve box also shows:

- the reserve after your desired profit
- the labor budget at this revenue compared with your current monthly labor
- the revenue where the reserve is $0
- the revenue where the reserve covers your profit goal

## Monthly P&L

This tab is a profit and loss statement for each month, with editable line items grouped into **Sales**, **Cost of goods sold**, **Labor** and **Operating expenses**.

- Each line shows its **% of sales**. The statement shows subtotals, **gross profit**, **prime cost** and **net profit**.
- **Compared with targets** checks the month against the Required Revenue tab: required revenue, COGS %, labor %, prime cost range and profit goal.
- Use the arrows or the month picker to move between months. A new month starts with the previous month's line names, and **Copy previous month** copies the amounts as well.
- **Send to calculator** loads the month's sales, COGS %, labor and OpEx into the Required Revenue tab.
- **Export CSV** downloads the month's statement.
- **Back up** and **Restore** save and load every month as a JSON file.

## Payroll calculator

Open it with **Payroll calculator** next to *Monthly labor* on the Required Revenue tab, or in the Labor section of the P&L.

- **Salaried:** up to 5 people. Each has an annual salary, and the monthly amount is the salary ÷ 12.
- **Hourly:** up to 5 people. Each has an hourly rate and hours per week, and the monthly amount is rate × hours per week × 52 ÷ 12 (about 4.33 weeks a month).
- **Payroll taxes & benefits:** an optional percentage added on top.

**Apply** puts the total into *Monthly labor* on the calculator. When opened from the P&L, it replaces the month's payroll lines with *Salaried payroll*, *Hourly payroll* and *Payroll taxes & benefits*. Any other labor lines you've added are kept.

## Data

Everything is saved in your browser's local storage, so it stays on your device and isn't uploaded anywhere. Use **Back up** on the P&L tab to keep a copy or move your data to another browser.

## Run it

Open `index.html` in a browser. There is nothing to build or install. To serve it locally:

```bash
npx serve .
```

## Tests

The calculations have no DOM code, so they can be tested with Node 18+:

```bash
node --test
```

## Files

| File              | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `index.html`      | Page markup for both tabs and the payroll dialog |
| `style.css`       | Styles, with light and dark themes              |
| `revenue.js`      | Required revenue math                           |
| `pnl.js`          | P&L math and CSV export                         |
| `payroll.js`      | Payroll math                                    |
| `app.js`          | Required Revenue tab, tab switching, theme      |
| `pnl-app.js`      | Monthly P&L tab                                 |
| `payroll-app.js`  | Payroll dialog                                  |
| `*.test.js`       | Unit tests                                      |
