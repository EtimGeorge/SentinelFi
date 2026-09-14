# Logging Expenses

Logging Expenses is how you record actual cash outflows, against either **CAPEX (Project)** or **OPEX (Operational)** budgets.

---

## The Expense Logging Process

### The Entry Point
1. Navigate to **Expenses > Log Expense** in the sidebar.
2. Click **+ New Expense**.

### Filling the Fields
- **Expenditure Type** - select `CAPEX` for project work, `OPEX` for daily operations.
- **Category Mapper** - select the WBS or OPEX category (e.g., "Structural Steel Reinforcement" or "Office Internet").
- **Amount** - the total invoice value (e.g., `1250.75`).
- **Vendor Details** - select from dropdown (e.g., "General Supplies Ltd").
- **Reference / Invoice #** - mandatory for audit (e.g., `INV-2026-0045`).
- **Attachment** - upload the PDF receipt via the upload zone.

---

## System Impact

### Real-Time Ledger Update
Once saved, the expense is immediately deducted from the **Remaining Budget** of the mapped category. The [WBS Designer](07-WBS-DESIGNER.md) shows the **Actual** column updating in real time.

### Burn-Rate Spike
A high-value expense triggers an immediate spike in the [CEO Dashboard](02-CEO-DASHBOARD.md) burn-rate chart.

---

## Guardrails

- **Duplicate Detection** - the system warns if it detects an expense with the same Invoice # and Vendor within the same tenant.
- **Variance Check** - if the expense amount exceeds the current uncommitted budget, the entry is flagged for CFO Approval.

---

*Next: [10: P2P Procurement Lifecycle](10-P2P-PROCUREMENT.md)*
