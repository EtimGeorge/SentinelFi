# Project Budgeting

Project Budgeting is the process of defining financial limits for each WBS category and tracking **Commitments (LPOs)** against them.

---

## The Budgeting Process

### Allocating Funds to Categories
1. Navigate to **Project Financials > Project Budgets**.
2. Select the project from the dropdown.
3. Input the "Allocated Amount" for each WBS category.
4. The system prevents allocating more than the total project budget defined during [Portfolio Management](06-PROJECT-PORTFOLIO.md).

### Finalising the Budget
Click **Activate Budget** when satisfied. This locks the budget for editing (unless you are a CFO) and allows procurement to start issuing requisitions against it.

---

## Commitments and LPOs (Local Purchase Orders)

### Commitment Logic
A "Commitment" is money that is "spoken for" but not yet paid out (e.g., an approved Purchase Order). It appears in the **Committed** column and is deducted from Remaining Budget **before** the actual expense is logged.

### Creating an LPO from a Budget
1. Click the **Actions** button next to any WBS category in the budget grid.
2. Select **Create LPO**.
3. **Fields**:
   - **Vendor** - select from the approved vendor list.
   - **Amount** - the contract value.
   - **Delivery Date** - when goods/services are expected.
4. Click **Save LPO**.

---

## Budget Performance Monitoring

- **Burn-Rate Tooltip** - hover over any category to see its specific daily burn.
- **Trend Index** - a percentage (+/-) comparing this week's spend against last week.

---

*Next: [09: Logging Expenses](09-LOGGING-EXPENSES.md)*
