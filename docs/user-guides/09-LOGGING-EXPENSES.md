# 💸 09: Logging Expenses

Logging Expenses is how you record the "Actual" cash outflow from your organization, against either your **CAPEX (Project)** or **OPEX (Operational)** budgets.

---

## 🏦 The Expense Logging Process

### 1. The Entry Point
- **Where to start**: Navigate to **"Expenses -> Log Expense"** in the sidebar.
- **Action**: Click the **"+ New Expense"** button.

### 2. Filling the Fields (What to Type)
- **Expenditure Type**: 
  - *Select*: `CAPEX` for Project work, `OPEX` for daily operations.
- **Category Mapper**: 
  - *Select*: e.g., `Structural Steel Reinforcement` (CAPEX) or `Office Internet` (OPEX).
- **Amount**: The total invoice value.
  - *Example*: `1,250.75`
- **Vendor Details**: Select from dropdown.
  - *Example*: `General Supplies Ltd`.
- **Reference/Invoice #**: Mandatory for audit.
  - *Example*: `INV-2026-0045`.
- **Attachment**: Click the "Upload" zone to attach the PDF receipt.


---

## 🏗️ Impact on the System

### 🔄 Real-Time Ledger Update
- **The Behavior**: Once saved, the expense is immediately deducted from the **"Remaining Budget"** of the mapped category.
- **The Visual**: In the **[WBS Designer](file:///c:/temp/SentinelFi/docs/user-guides/07-WBS-DESIGNER.md)**, you will see the **"Actual"** column update.

### 🔥 Burn-Rate Spike
- **Forensics**: A high-value expense will trigger an immediate spike in the **[CEO Dashboard](file:///c:/temp/SentinelFi/docs/user-guides/02-CEO-DASHBOARD.md)** burn-rate chart.

---

## 🛡️ Best Practices & Guardrails

- **Avoid Duplicate Logging**: The system will warn you if it detects an expense with the same **Invoice #** and **Vendor** within the same tenant.
- **Variance Check**: If the expense amount exceeds the current uncommitted budget, the entry will be flagged for **CFO Approval**.

---
*Next: [10: P2P Procurement Lifecycle](file:///c:/temp/SentinelFi/docs/user-guides/10-P2P-PROCUREMENT.md)*
