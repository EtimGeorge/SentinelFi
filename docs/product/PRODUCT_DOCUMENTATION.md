# SentinelFi User Manual

SentinelFi is an enterprise **Financial Intelligence and Resilience** platform. It combines multi-tenant project and operational budgeting with AI-driven forecasting, real-time governance, and full audit traceability, built to keep finance teams ahead of risk rather than reacting to it.

This manual is the single entry point for using SentinelFi. Module-level detail lives in the [End-User Guides](user-guides) and the [User Process Guide](USER_PROCESS_GUIDE.md).

---

## 1. What SentinelFi Does

| Capability | What it gives you |
| :--- | :--- |
| **Project (CAPEX) budgeting** | Hierarchical Work Breakdown Structures (WBS), multi-level budgets, commitments (LPOs), and actual spend tracking. |
| **Operational (OPEX) budgeting** | Period-based departmental budgets for recurring costs such as rent, utilities, payroll, and overhead. |
| **Governance and approvals** | Delegation of Authority (DOA) tiers with variance guardrails, multi-tier approval queues, and mandatory rejection reasons. |
| **Predictive intelligence** | Daily burn-rate, projected exhaustion dates, variance forecasting, and AI-generated board-ready narratives. |
| **Audit trail** | Immutable logs of every administrative and financial action, with correlation IDs for traceability. |
| **Multi-currency** | Expenses and analytics aggregated in a tenant base currency with safe cross-currency conversion. |
| **Reporting** | High-fidelity PDF exports, Excel and CSV data dumps, variance, CAPEX and OPEX analytics, and a searchable document archive. |

---

## 2. Roles and Permissions

SentinelFi uses a four-tier Delegation of Authority (DOA) model. Approval power, visibility, and menu options are derived from your role.

| Tier | Role | Typical holder | Notes |
| :--- | :--- | :--- | :--- |
| Platform | **SuperAdmin** | Platform owner | Tenant lifecycle, global analytics, platform billing, platform audit logs. Uses the dedicated Super Admin console. |
| Executive | **CEO** | MD / company head | Full visibility; Executive (unlimited) approval tier. |
| Director | **CFO**, **Admin Director**, **Operational Director**, **Technical Director** | C-level / heads | DOA level 3 ($100k+). The CFO owns fiscal setup and budget activation. |
| Management | **Finance Manager**, **Admin Manager**, **Project Manager** | Managers | DOA level 2 ($20k). Run day-to-day budget, approval, and project workflows. |
| Operational | **Finance Officer**, **Admin Officer**, **Assigned Project User** | Officers / team | DOA level 1. Log expenses, submit requisitions, work on assigned projects. |

Confirm your own role under **Settings** if you are unsure what you can see or approve.

---

## 3. Getting Started

1. **Create your first project.** [Quick Start](user-guides/00-QUICK-START.md) walks through project → WBS → expense → approval → AI narrative in about five minutes.
2. **Configure fiscal fundamentals first.** Fiscal Setup (OPEX categories and periods) and Currencies should be confirmed by the CFO before heavy logging. See [Fiscal Setup](user-guides/13-FISCAL-SETUP.md).
3. **Know where things live.** The sidebar is organised into Dashboard, Governance Hub, Project Portfolio, Financial Intelligence, Expenses, Project Financials, Corporate Operations, Reporting, and Admin.

---

## 4. Core Workflows

### 4.1 Project Lifecycle (CAPEX)

1. **Create** the project ([Project Portfolio](user-guides/06-PROJECT-PORTFOLIO.md)).
2. **Decompose** it with the [WBS Designer](user-guides/07-WBS-DESIGNER.md) into hierarchical, cost-centre-mapped categories.
3. **Allocate and activate** the budget ([Project Budgeting](user-guides/08-PROJECT-BUDGETING.md)).
4. **Procure** via the P2P lifecycle ([guide](user-guides/10-P2P-PROCUREMENT.md)): Requisition → Governance review → LPO → Liquidation.
5. **Track actuals.** Every expense updates the Remaining Budget live ([Logging Expenses](user-guides/09-LOGGING-EXPENSES.md)).

### 4.2 Operational Budgeting (OPEX)

1. **Define categories and periods** in [Fiscal Setup](user-guides/13-FISCAL-SETUP.md).
2. **Set periodic allocations** in [OPEX Planning](user-guides/11-OPEX-PLANNING.md).
3. **Run payroll** against OPEX categories in the [Payroll Desk](user-guides/12-PAYROLL-DESK.md).
4. **Monitor variance** in OPEX Planning and the dashboards.

### 4.3 Governance and Approvals

Every spend that crosses a DOA threshold enters the [Governance Hub](user-guides/04-GOVERNANCE-HUB.md) queue, where it is checked against WBS variance guardrails before sign-off. Mandatory rejection reasons and full approval logs keep the process audit-ready.

### 4.4 Intelligence and Reporting

- Generate AI narratives at the [Reporting and AI Hub](user-guides/14-REPORTING-HUB.md).
- Export board-ready PDFs and analyst CSVs.
- Retrieve every generated report from the [Document Archive](user-guides/15-DOCUMENT-ARCHIVE.md).

### 4.5 The AI Assistant

Click the SentinelFi AI bubble at the bottom-right on any page. The assistant auto-injects context for the page you are on (for example, the current project's data on the WBS Designer) and answers in plain language: variances, approval history, burn-rate risk analysis, and more. See [AI Communication](user-guides/17-AI-COMMUNICATION.md).

---

## 5. Multi-Currency

Tenants can record spend in multiple currencies. The platform aggregates CAPEX analytics into the tenant base currency using safe conversion maps, so dashboards and reports display a consistent picture regardless of how each expense was logged. Configure the base currency during fiscal setup.

---

## 6. Platform Administration (SuperAdmin)

- **Tenants.** Create, deactivate, and scale organisations.
- **Analytics.** Aggregated financial trends across the platform.
- **Billing.** Usage, invoice generation, and plan management.
- **Audit.** Platform-wide logs.

See [SuperAdmin Controls](user-guides/16-SUPERADMIN-CONTROLS.md).

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
| :--- | :--- |
| Not seeing a menu or approval | Your role tier controls visibility. Confirm your role under **Settings**. |
| Approval queue empty | Requisitions only enter the queue when they cross your DOA tier threshold. |
| Emails not arriving | Ask your platform administrator to verify email delivery is enabled for your tenant. |
| Currency totals look off | Confirm the tenant base currency is set correctly in fiscal setup. |
| AI narrative fails | Check that the AI assistant is reachable and that at least one expense exists for context. |
| Report missing from Archive | Reports are saved at generation time; check the Archive filters (date and category). |

---

## 8. Support

- **Tenant admins** can use **Admin → Landlord Support** for support requests.
- **Traceability.** Every audit entry carries a **Correlation ID**; include it when reporting issues (see [Audit Trail](user-guides/05-AUDIT-TRAIL.md)).

---

*Precision. Resilience. Intelligence. SentinelFi.*