# Hero's Pizza Financial Dashboard — Required Revenue Calculator

A small, dependency-free web calculator that works out the monthly revenue a business needs to cover its costs and hit a profit goal.

```
Required Revenue = (Labor + OpEx + Desired Profit) ÷ (1 − COGS %)
```

Every input can be edited, results update as you type, and your last values are remembered in the browser.

## Inputs

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

## Outputs

- **Required monthly revenue**, the gap to current revenue, and a breakdown into COGS, labor, OpEx and profit
- **Break-even revenue**: the revenue that covers all costs with $0 profit
- **Profit at current revenue**
- **Labor %** and **prime cost %** (COGS + labor) at the required revenue, compared with your targets
- **Paths to target**:
  - the labor budget at the target %
  - how much labor would need to come down to reach it
  - the revenue needed if labor ran at the target %
  - the revenue at which current labor or prime cost reaches each target

Labor and OpEx are treated as fixed monthly dollars. COGS scales with revenue.

## Run it

Open `index.html` in a browser. There is nothing to build or install.

To serve it locally:

```bash
npx serve .
```

## Tests

The calculation logic is in `revenue.js`, which has no DOM code, so it can be tested with Node 18+:

```bash
node --test
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then save.

## Files

| File              | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `index.html`      | Page markup                              |
| `style.css`       | Styles, with light and dark themes       |
| `revenue.js`      | Calculation logic                        |
| `app.js`          | Connects the inputs and results          |
| `revenue.test.js` | Unit tests                               |
