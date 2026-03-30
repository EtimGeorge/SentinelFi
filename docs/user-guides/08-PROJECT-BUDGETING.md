# 💰 08: Project Budgeting

Project Budgeting is the process of defining the financial limits for each WBS category and tracking **Commitments (LPOs)** against them.

---

## 🏗️ The Budgeting Process

### 1. Allocating Funds to categories
- **Where to start**: Navigate to **"Project Financials -> Project Budgets"**.
- **Action**: Select the project from the dropdown.
- **The Process**: Input the "Allocated Amount" for each WBS category.
- **Validation**: The system will prevent you from allocating more than the total project budget defined during the **[Portfolio Management](file:///c:/temp/SentinelFi/docs/user-guides/06-PROJECT-PORTFOLIO.md)** step.

### 2. Finalizing the Budget
- **The Status**: Once you are satisfied with the allocations, click **"Activate Budget"**.
- **The Behavior**: This locks the budget for editing (unless you are a **CFO**) and allows procurement to start issuing requisitions against it.

---

## 🏹 Commitments & LPOs (Local Purchase Orders)

### 1. The Commitment Logic
- **What it is**: A "Commitment" is money that is "spoken for" but not yet paid out (e.g., an approved Purchase Order).
- **The Metric**: SentinelFi tracks this in the **"Committed"** column. It is deducted from your "Remaining Budget" BEFORE the actual expense is logged.

### 2. Creating an LPO from a Budget
1. **Click** on the **"Actions"** button next to any WBS category in the budget grid.
2. **Select "Create LPO"**.
3. **Fields**:
   - **Vendor**: Select from the approved vendor list.
   - **Amount**: The contract value.
   - **Delivery Date**: When the service/items are expected.
4. **Click "Save LPO"**.

---

## 📈 Budget Performance Monitoring

- **Burn-Rate Tooltip**: Hover over any category to see its specific daily burn.
- **Trend Index**: A percentage value (+/-) comparing this week's spend against last week's.

---
*Next: [09: Logging Expenses](file:///c:/temp/SentinelFi/docs/user-guides/09-LOGGING-EXPENSES.md)*
