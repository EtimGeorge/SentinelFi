# SentinelFi: Granular UI/UX Interface Guide

This guide provides a "stone unturned" walkthrough of the SentinelFi platform, detailing how to navigate, interpret, and master every feature of the Predictive Financial Intelligence suite.

---

## 🧭 1. Core Navigation & Layout

### 📌 The Global Sidebar
Accessible from the left-hand side, the sidebar is your primary command rail.
- **Top Section**: Quick-access to the **CEO Dashboard** and **Global Overview**.
- **Financial Intelligence**: The "Brain" of the app. Houses forensics, AI insights, and real-time burn rates.
- **Strategic Operations (CAPEX)**: Manage large-scale projects, LPOs, and Work Decomposition Structures (WBS).
- **Core Operations (OPEX)**: Departmental budgeting, Payroll, and recurring procurement.
- **Governance & Approvals**: The centralized queue for all Delegation of Authority (DOA) actions.

### 🏢 The Tenant Switcher
Located at the top-right (User Profile), this allows executives to switch between different business units or client schemas instantly.
> [!NOTE]
> All data, reports, and permissions are strictly isolated to the selected Tenant.

---

## 🏎️ 2. The CEO Intelligence Hub

The dashboard is designed for "At-a-glance" decision making.

### 🛡️ KPIs & Predictive Metrics
- **Current Burn-Rate**: Displays average daily spend. Calculated by `FinancialForensicsService`.
- **Exhaustion Date**: The most critical field. It predicts *exactly when* your budget will hit zero based on trend analysis.
- **Health Indicators**: 
  - 🟢 **OK**: Sufficient funding for 90+ days.
  - 🟡 **WARNING**: Exhaustion predicted within 30-60 days.
  - 🔴 **CRITICAL**: Exhaustion predicted within <30 days.

### 🧠 Narrative AI Insights
Click the "Generate AI Narrative" button to invoke the **SentinelFi AI Agent**. 
- It analyzes the raw ledger data and produces a human-readable summary of risk factors.
- **Action**: You can export this direct to a PDF report for board presentations.

---

## 🏗️ 3. Strategic Project Hub (WBS Manager)

The WBS Manager is where you decompose complex project budgets.

### 🌳 Hierarchical Grid
- **Recursive Rollups**: Each "Parent" category automatically sums up the budget, commitments, and actual spend of its "Children."
- **Adding Categories**: Click the `+` icon on any row to add a sub-category (e.g., "Civil Works" -> "Foundation").
- **Cost Centers**: Every row is mapped to a unique Cost Center ID for accounting precision.

### 📊 Real-Time Forecasting
Look for the **Predictive Run-Rate** widget in the project header. It shows the specific burn-rate for *that project alone*, rather than the whole company.

---

## 🛍️ 4. Procurement & Governance Hub

### 📝 Requisition Pipeline (Submitter)
1. Navigate to **Financials -> Operations -> Procurement**.
2. Click **"New Requisition"**.
3. Select the **WBS Category/Cost Center** to pull from.
4. **Validation**: The system will block you if the amount exceeds the remaining budget (Variance Check).

### ⚖️ Approval Workflow (Approver)
1. Navigate to **Governance -> Approvals**.
2. **DOA Enforcement**: You will only see requisitions within your authority tier (e.g., Managers see <$20k).
3. **Approval Log**: Click "Approve" to sign-off. The system records your timestamp and IP for the audit trail.

---

## 💵 5. Operational (OPEX) & Payroll

### 🗓️ Period Budgeting
Located under **Operational Budgets**, this allows you to set Monthly or Quarterly limits for recurring costs (Rent, Utilities).
- Use the **Variance Tab** to see which departments are over-spending their recurring allocations.

### 👤 Payroll Management
- Manage staff base pay, allowances, and departmental allocations.
- **Automated Burn**: Once a payroll run is confirmed, it automatically deducts the total from the relevant OPEX budget category.

---

## 📄 6. Reporting & Exports

### 📥 Data Portability
Nearly every table in SentinelFi supports:
- **CSV/Excel Export**: For raw data manipulation in spreadsheets.
- **High-Fidelity PDF**: For formal reporting (Executive/Audit style).
- **Word Export**: Specifically for project summaries and bid documents.

---

## 🔒 7. Settings & Resilience

- **Profile**: Enable **Two-Factor Authentication (2FA)** for secure sign-on.
- **Security Logs**: View your recent login history and active sessions.
- **Notifications**: Configure "Variance Alerts" to receive real-time pings when a project enters the **WARNING** zone.

---
*Precision. Resilience. Intelligence. SentinelFi.*
