# ARCH-010: Frontend Financial Flow Design Report

**Status:** Draft (staging in `.workspace-temp/`; promoted to `docs/technical/` on review)  
**Scope:** Frontend financial flows (CAPEX + OPEX + Payroll + P2P + Governance + Reporting)  
**Precedence rule:** Backend endpoint = source of truth; product docs = intent; UI = currently wrong where it conflicts with either.

---

## 1. Purpose & How to Use This Document

This report tells a coding agent how to rebuild the SentinelFi frontend financial flows so they:

1. **Match backend wiring exactly** — only canonical endpoints are consumed; orphaned/dead endpoints are identified and retired.
2. **Match documented business logic** — the CAPEX/OPEX mirror loops, DOA (delegation of authority) tiers, encumbrance → actual spend, and payroll burn described in ARCH-004/ARCH-005/ARCH-008 and the product guides.
3. **Produce one confusion-free user flow** — setup → plan → commit → spend → approve → report, with no broken forms, fake governance actions, or lying copy.

**Rule of precedence (in order):**
1. Backend endpoint contract (controller + DTO + service)
2. Documented intent (ARCH docs, product guides, user guides)
3. Current frontend implementation (only where it does not conflict with 1 or 2)

Every fix in Section 10 is tagged `FRONTEND-ONLY` (safe to implement now) or `REQUIRES-BACKEND` (blocked on an API change; do not start the dependent UI until the backend change lands).

---

## 2. Business Context

### 2.1 Problems SentinelFi Solves

SentinelFi is a fintech platform for **project budgeting and expenditure management**. Its core DNA is construction/engineering/contractor firms; ministries, government agencies, power companies, accountants, financial institutions, and financial auditors are value-added verticals that consume the same two engines with appropriate configuration.

Three core problems:

| Problem | Engine | What it controls |
|---------|--------|------------------|
| Project capital spend | **CAPEX** (`wbs_budget` / `live_expense`) | Project budgets via WBS, LPOs, retention, cost-center-mapped categories |
| Departmental recurring spend | **OPEX** (`operational_budget` + categories × periods + encumbrances) | Payroll, utilities, rent, overhead vs period allocations |
| Commitment-to-pay chain | **P2P** (`finance-core` requisitions → POs → invoices → receipts → payments) | Budget-reserved purchasing, three-way match, accrual and payment |

### 2.2 Users & Personas

| Persona | Primary flows |
|---------|---------------|
| Project Manager / Site Engineer | Log expenses against WBS nodes; view remaining budget |
| Finance Manager / Officer | OPEX planning grid, expense approvals, payroll runs, P2P oversight |
| CFO / Finance Director | Governance Hub, intelligence dashboard, variance reporting, export |
| CEO / AdminDirector | Executive dashboard, approval queues, tenant settings |
| Operational / Technical Director | Procurement kanban, requisitions, vendor master |
| Assigned Project User | Expense logging (own project) |
| Financial Auditor (secondary) | Read-only view, exports, commitment register, audit trail |
| Accountant (secondary) | COA, GL postings visibility, bank reconciliation (P2) |
| Government Ministry / Agency (value-added) | Same flows; configurable DOA thresholds, optional separate personnel envelope, multi-year appropriations (P2) |

---

## 3. Domain Model: Two Engines, One Gate

### 3.1 CAPEX Engine (project-based)

| Concept | Backend entity/table | Key file |
|---------|---------------------|----------|
| Project budget line | `wbs_budget` / `WbsBudgetEntity` | `backend/src/wbs/wbs-budget.entity.ts` |
| Project expense | `live_expense` / `LiveExpenseEntity` | `backend/src/wbs/live-expense.entity.ts` |
| Commitment (LPO) | `lpo` / `LpoEntity` | `backend/src/projects/lpo.entity.ts` |
| Budget category | `wbs_category` | `backend/src/wbs/wbs-category.entity.ts` |
| Approval audit | `approval_log` / `ApprovalLogEntity` (`WBS_BUDGET`, `REQUISITION`, `PAYROLL_RUN`) | `backend/src/common/entities/approval-log.entity.ts` |

- **No GL posting on CAPEX path** — expenses hit `live_expense` + budget actuals + `project_audit` journal only; VAT/WHT stored but never journalized.
- Status machine: `DRAFT → PENDING → APPROVED | REJECTED`; `REJECTED → DRAFT`; `APPROVED` final; overruns `OVERRIDE_APPLIED`.
- Budget drafts submitted via `PATCH /wbs/project/:projectId/submit`; DOA enforced on approve.

### 3.2 OPEX Engine (departmental, period-based)

| Concept | Backend entity/table | Key file |
|---------|---------------------|----------|
| Budget | `operational_budget` / `OperationalBudgetEntity` | `backend/src/operational-budgets/` |
| Period allocation | `operational_budget_period_allocation` | keyed by `operational_budget_category_id` |
| Expense | `operational_expense` | variance-checked, auto-approved or PENDING |
| Encumbrance | `operational_budget_encumbrance` | RESERVED / FIRM / LIQUIDATED / RELEASED |
| Payroll entry | `payroll_entry` | budget-linked (dormant path: `POST /operational-budgets/payroll`) |

- **Period-based allocation**, not project-based. Each category assigned an amount per period.
- Consumption = spent + committed; variance = allocated − actual.
- Budget lifecycle: create → allocate via `POST /operational-budgets/:id/planning-grid` → submit-to-governance → log expense → approve/reject → variance.

### 3.3 Shared Plumbing

- **DOA** — 4 tiers (TIER 1 Officer submit-only; TIER 2 Manager ≤ $20k; TIER 3 Director/CFO ≤ $100k; TIER 4 CEO unlimited), USD-normalized. Service: `backend/src/common/doa.service.ts`.
- **Commitments** — shared `BudgetControlService` + `queryOutstandingCommitment` used by both P2P PO creation and OPEX encumbrances.
- **Governance Hub** — single UI aggregating CAPEX budgets, CAPEX overruns, P2P requisitions, OPEX expenses, OPEX procurement (+ payroll to be added).
- **GL** — `chart-of-accounts` per tenant; automated postings (payroll `Dr line / Cr Payable`, invoice accrual `Dr expense / Cr AP`, payment `Dr AP / Cr Cash`).

---

## 4. Backend Wiring Reference (Canonical Endpoints)

Frontend must consume only these canonical endpoints. Orphaned/dead endpoints (Section 5) must not be called by new UI.

### 4.1 OPEX (`operational-budgets` controller, base `/api/v1/operational-budgets`)

| Method | Path | Controller line | Status |
|--------|------|-----------------|--------|
| POST | `/` | 64 | Canonical — create budget |
| POST | `/expense` | 94 | Canonical — log OPEX expense (zero frontend callers today) |
| PATCH | `/expense/:id` | 124 | Canonical — update expense |
| DELETE | `/expense/:id` | 153 | Canonical — reverse/delete |
| POST | `/expense/:id/approve` | 180 | Canonical |
| POST | `/expense/:id/reject` | 207 | Canonical |
| POST | `/expense/:id/reverse` | 238 | Canonical |
| GET | `/expense/all` | 266 | Canonical — list expenses |
| POST | `/payroll` | 294 | Canonical — deducts `actual_spent` (no frontend caller) |
| GET | `/rollup` | 327 | Canonical — OPEX rollup |
| GET | `/analytics` | 361 | Canonical — OPEX analytics |
| GET | `/needs-attention` | 397 | Governance stream |
| GET | `/` | 426 | List budgets |
| GET | `/export` | 459 | PDF export |
| GET | `/:id` | 533 | Get budget |
| PATCH | `/:id` | 560 | Update budget |
| DELETE | `/:id` | 590 | Delete budget |
| POST | `/run-bot` | 609 | No frontend caller |
| Categories CRUD | `/categories*` | 638-711 | Category management |
| GET | `/:id/grid` | 735 | Budget grid data |
| GET | `/:id/forecast-bridge` | 761 | Plan vs actual vs committed |
| POST | `/:id/planning-grid` | 784 | Save allocations (keyed on `operational_budget_category_id`) |
| POST | `/:id/submit-to-governance` | 809 | **Returns summary only — no status change** (REQUIRES-BACKEND) |
| POST | `/allocation` | 832 | Single-cell allocation |

### 4.2 Finance-Core (`finance-core` controller)

| Method | Path | Line | Purpose |
|--------|------|------|---------|
| GET/POST | `/fiscal-years` | 31, 47 | Fiscal years + 12 auto-generated periods |
| GET/POST | `/departments` | 67, 83 | Departments (+ cost centers relation) |
| GET/POST | `/cost-centers` | 99 | Cost centers |
| GET/POST/PATCH/DELETE | `/vendors*` | 120-193 | Vendor master |
| GET/POST | `/requisitions` | 208, 224 | Requisition → reserve encumbrance |
| POST | `/requisitions/:id/reject` | 302 | Release hold |
| GET/POST | `/purchase-orders` | 255, 271 | PO → firm encumbrance, capacity check |
| GET/POST/PATCH/DELETE | `/invoices*` | 353, 368, 398, 430 | Invoice accrual → payment → liquidate |
| GET/POST | `/receipts` | 452, 496 | Receipt → PO status only (no GL/actuals) |
| GET | `/purchase-orders/:id/three-way-match` | 517 | Match PO/receipt/invoice |
| GET | `/finance/payroll/runs` | payroll.controller 21-169 | Payroll runs (GL-only, used by UI) |
| GET/POST | `/chart-of-accounts*` | coa.controller 45-131 | Per-tenant COA tree + seed defaults |
| GET | `/operational-analytics` | 582 | Finance-core analytics source |
| GET | `/opex-intelligence` | 618 | OPEX intelligence |

### 4.3 WBS/CAPEX (`wbs.controller.ts`)

| Method | Path | Line | Purpose |
|--------|------|------|---------|
| POST | `/wbs/budget-draft` (+batch) | 422, 466 | Draft budget lines |
| PATCH | `/wbs/project/:projectId/submit` | 955 | Submit for DOA |
| PATCH | `/wbs/budget/:id/recall` | 1163 | Recall approved |
| POST | `/wbs/expense/live-entry` (+batch) | 601, 644 | Log project expense |
| GET | `/wbs/expense/overruns/pending` | — | Pending overruns |
| POST | `/wbs/expense/overruns/:id/approve|reject` | 697, 726 | Overrun actions |
| GET | `/wbs/budgets` (+export/rollup/exceptions) | — | Budget lines list |
| GET | `/wbs/capex-intelligence` | — | CAPEX intelligence |

### 4.4 Dashboards & Reporting

| Path | Module | Purpose |
|------|--------|---------|
| `/dashboard/executive` | dashboard.service | WBS root rows + live_expense + lpo; pending = DRAFT+PENDING only |
| `/dashboard/summary` | dashboard.service | Summary KPIs |
| `/admin/audit-logs[/tenant]` | — | Audit log |
| `/reporting/generate` | — | Report generation |
| `/reporting/history` | — | Report history |
| `/reporting/export/{id}` | — | Report export |

### 4.5 AI (`/api/v1/ai/chat/stream`)

- Streaming chat endpoint used by `useAIChat` (`frontend/hooks/useAIChat.ts:175`).
- Quick actions are prompt templates → advisory only; writes go through `fillForm` (document extraction) requiring user confirmation.

---

## 5. Current-State Defect Inventory

All verified against actual file reads. `FRONTEND-ONLY` = fixable in UI; `REQUIRES-BACKEND` = needs API change first.

| ID | Defect | Evidence | Tag |
|----|--------|----------|-----|
| D1 | OPEX expense creation broken 3 ways | `expenses/new.tsx:398` posts to `/operational-budgets/${id}/expenses` (route doesn't exist); budget typed `{id,name}` but API returns `operational_budget_id` → `b.id` undefined (line ~343); payload sends `description`/`amount` but DTO requires `operational_budget_category_id`/`item_description` | FRONTEND-ONLY |
| D2 | Canonical `POST /operational-budgets/expense` has zero frontend callers | Repo-wide grep: no caller; only `useFinanceCore.ts:586-613` touches approve/reject/reverse | FRONTEND-ONLY |
| D3 | Planning Matrix never saved | `PlanningGrid.tsx` pure local state; no API import; `POST /:id/planning-grid` (controller:784) has no caller | FRONTEND-ONLY |
| D4 | Structural mismatch: grid rows are GL accounts, backend keys on `operational_budget_category_id` | `service:2155-2181` vs `PlanningGrid.tsx:214-224` | REQUIRES-BACKEND |
| D5 | "Seal & Submit to Governance" persists nothing | `submitToGovernance` (service:2248-2316) computes summary, logs, notifies — no status change, no `approval_log` write | REQUIRES-BACKEND |
| D6 | Receipts don't post GL or actuals | `finance-core.service.ts:1436-1455` — PO status only | REQUIRES-BACKEND |
| D7 | Two parallel payroll systems | UI posts to finance-core (GL-only); dormant `logPayrollEntry` (service:815-874) deducts `actual_spent` but no caller | FRONTEND-ONLY (wire) + REQUIRES-BACKEND (unify) |
| D8 | False UI copy: payroll "debits OPEX budgets" | `payroll/[id].tsx:280` — posting never touches OPEX | FRONTEND-ONLY |
| D9 | Two divergent analytics sources | `operational-budgets/analytics` vs finance-core `getOperationalAnalytics` (different tables) | REQUIRES-BACKEND |
| D10 | `getBudgetConsumption` ignores OPEX budgets | `finance-core.service.ts:1755-1830` — legacy `budget_ledger` + POs + invoices + payroll only | REQUIRES-BACKEND |
| D11 | BudgetGrid ignores selected fiscal year | `BudgetGrid.tsx:38` `new Date().getFullYear()`; writes current calendar year | FRONTEND-ONLY |
| D12 | Operations Ledger shows only PENDING expenses | `manage.tsx:82` `fetchOperationalExpenses(selectedBudgetId, 'PENDING')` | FRONTEND-ONLY |
| D13 | Legacy orphan pages routed but unlinked | `/operational-budgets/*`, `/budget/*` (redirect shims only); stray link `dashboard/ceo.tsx:272` | FRONTEND-ONLY |
| D14 | KPI ribbon double-counts across years | `manage.tsx:198-221` sums all budgets | FRONTEND-ONLY |
| D15 | `/financials` 404s | No `frontend/pages/financials/index.tsx`; nav never links to bare `/financials` | FRONTEND-ONLY |
| D16 | CAPEX has no GL posting | `wbs.service.ts` — zero GL posting code; expenses hit `live_expense` + `project_audit` only | REQUIRES-BACKEND (document as gap) |
| D17 | Asymmetric `approval_log` | Written for WBS budgets + requisitions only; OPEX/payroll/overrun approvals unaudited; `PAYROLL_RUN` enum dead | REQUIRES-BACKEND |
| D18 | Dashboard vs Governance Hub pending-stream divergence | Dashboard counts WBS DRAFT+PENDING (1 stream); Hub shows PENDING across 6 streams | FRONTEND-ONLY (align counts) |
| D19 | Batch live-entry skips validation | `wbs.controller.ts:656` inline body type — nested DTO + 100-row cap skipped; doc claims atomic, impl is partial | REQUIRES-BACKEND |
| D20 | `budget_ledger` has no writer | Read-only (`find` at service:1763,1857; raw SQL :1988,:2035); no insert/save anywhere | REQUIRES-BACKEND |

---

## 6. Intent vs Implementation Contradictions (from docs)

| Topic | What docs say | What code does | Resolution |
|-------|--------------|----------------|------------|
| Fiscal Setup scope | Manages OPEX categories AND fiscal periods (product docs) | `setup.tsx` creates fiscal years only; categories live in `manage.tsx` Categories tab; COA is a separate page | Page spec: setup = fiscal years; categories = Categories tab; COA = COA page (document the split) |
| Variance thresholds | 4 different scales across docs (ARCH-005 85%/100%; OPEX guide 80/100; financial guide 2-5%; tutorial 80/100) | No single threshold source in code | Define ONE threshold config per tenant in ARCH-010 design decisions |
| Base currency | USD-centric DOA docs | UI defaults vendor/currency to NGN; projects default NGN with 7.5% VAT/5% WHT | Keep NGN default; make DOA thresholds USD-normalized per ARCH-005 |
| System-default OPEX categories | `is_system_default` supported in entity | Zero inserts anywhere — never seeded | Frontend must create categories on first use; document gap |
| Payroll auto-burn | ARCH-008 / Payroll Desk guide promise | Live payroll posts GL only; burn endpoint dormant | Resolve per Section 12 (OPEX burn default; separate envelope configurable) |
| Tutorial `procurement` module | Describes procurement as setup page (categories/UOMs) | Actual `procurement.tsx` is a P2P workflow page | Fix tutorial content to match shipped UI |
| Employee creation | "Staff Name/ID — link to internal employee record" | No Employees page; payroll uses platform `user` table | Document gap (P2) |

---

## 7. Target User Flows (Prescriptive)

### 7.1 First-Run Tenant Setup (no empty tables)

1. Tenant provisioned (SuperAdmin) → schema + migrations + admin invited. No financial data seeded.
2. Admin creates users via Admin → Users (`/billing/invite`).
3. **Fiscal Setup** (`/financials/operations/setup`): create fiscal year → backend auto-generates 12 periods.
4. **Categories** (`manage.tsx` → Categories tab): create OPEX budget categories (nothing pre-seeded).
5. **Departments + cost centers** (same Categories tab → `CostCenterManager`): required for requisitions and payroll.
6. **Chart of Accounts** (`chart-of-accounts.tsx`): seed defaults or lazy-create on first automated posting (payroll depends on 2120/2130/2140).
7. **Vendors** (`vendors.tsx`): required for P2P.
8. **Projects + WBS** for CAPEX: create project → WBS Designer → budget drafts.

Gate rule: a page must not show an empty table where a prerequisite is missing — it must show a guided setup call-to-action.

### 7.2 CAPEX Lifecycle

1. Create project (`pages/projects.tsx` → spawns `ProjectEntity` only; no budget/WBS spawned — frontend routes creator to WBS Designer).
2. WBS Designer (`wbs.tsx`): save WBS → `POST /wbs/budget-draft` (+batch); status `DRAFT`.
3. Submit budget drafts → `PATCH /wbs/project/:projectId/submit` → `PENDING`.
4. DOA approval → `PATCH /wbs/budget-draft/{id}/status` → `APPROVED` (or `REJECTED → DRAFT`). Writes `approval_log` (`WBS_BUDGET`).
5. Log expense → `POST /wbs/expense/live-entry` (+batch). Guard: APPROVED/RECALLED only; capacity check via `validateWbsExpense`; variance flags; auto-APPROVED or `PENDING_APPROVAL`; increments `total_cost_actual` only when approved.
6. Overruns → `GET /wbs/expense/overruns/pending` → approve (`OVERRIDE_APPLIED` + increment actuals) or reject.
7. Reporting → `GET /wbs/budget/rollup`, variance, capex intelligence.
8. GL: **none** on CAPEX path — document as gap; expense hits `live_expense` + `project_audit` only.

### 7.3 OPEX Lifecycle

1. Create budget → `POST /operational-budgets/` (controller:64).
2. Planning grid → `GET /:id/grid` (load) → `POST /:id/planning-grid` (save, keyed on `operational_budget_category_id` × periods). Categories × periods matrix.
3. Submit to governance → `POST /:id/submit-to-governance` — **REQUIRES-BACKEND**: must transition budget status and write `approval_log` before UI treats it as done.
4. Log expense → `POST /operational-budgets/expense` (canonical, controller:94). Variance check vs category tolerance; auto-approve or `PENDING`; increments `category.actual_spent` + `budget.actual_spent` when APPROVED; writes encumbrance row; posts GL `Dr expense / Cr AP`.
5. Approve/reject → `POST /expense/:id/approve|reject`. Reverse → `POST /expense/:id/reverse` (mirror GL entry).
6. Ledger view → `GET /expense/all` — show ALL statuses, not just PENDING (fix D12).
7. Variance → `GET /operational-budgets/rollup` or `/analytics`.

### 7.4 Payroll (OPEX burn default; separate envelope configurable)

**Default (construction DNA):** Payroll run → items → approve → **burn departmental OPEX `actual_spent`** via `POST /operational-budgets/payroll` (`logPayrollEntry`, service:815-874) AND post GL (`Dr line / Cr Payable 2120/2130/2140`).
**Configurable (ministries/agencies):** tenant flag `payrollMode: 'opex-burn' | 'personnel-separate'`. Separate → payroll posts GL only; copy corrected (fix D8); no OPEX debit claim.

Current UI posts to finance-core GL-only and falsely claims OPEX debit. Fix: align UI to the tenant's configured mode; default burns OPEX.

### 7.5 P2P (reference flow — already works; keep as model)

1. Requisition → `POST /finance-core/requisitions` → resolves active OPEX budget from cost-center department → raises RESERVED encumbrance.
2. PO issue → `POST /finance-core/purchase-orders` → budget-capacity check (blocks `[OPEX-CONTROL]`) → releases requisition hold → FIRM PO encumbrance.
3. Invoice → `POST /finance-core/invoices` → accrual `Dr expense / Cr AP + WHT + retention`.
4. Receipt → `POST /finance-core/receipts` → PO status only (no GL/actuals yet — document; release commitments at receipt as P1).
5. Payment → `POST /finance-core/invoices/:id/pay` → encumbrance LIQUIDATED → PO FULFILLED → `Dr AP / Cr Cash`.
6. Three-way match → `GET /.../three-way-match`.

### 7.6 Governance Hub (six streams + payroll)

| Stream | GET endpoint | Action endpoint |
|--------|-------------|-----------------|
| CAPEX budgets | `/wbs/budgets?status=pending` | `PATCH /wbs/budget-draft/{id}/status` |
| CAPEX overruns | `/wbs/expense/overruns/pending` | `POST /wbs/expense/overruns/{id}/approve|reject` |
| P2P requisitions | `/finance-core/requisitions` | `POST /finance-core/purchase-orders` (issue) or `POST /finance-core/requisitions/{id}/reject` |
| OPEX expenses | `/operational-budgets/needs-attention` | `POST /operational-budgets/expense/{id}/approve|reject` |
| OPEX procurement | `/finance-core/procurement-needs-attention` | same P2P family |
| Payroll | **(add)** `/finance/payroll/runs` pending | `PATCH /finance/payroll/runs/{id}/approve` |

Actions per DOA tier. `approval_log` must be written for all six streams (REQUIRES-BACKEND for OPEX/payroll/overruns — currently only WBS_BUDGET and REQUISITION are written).

### 7.7 Reporting & Analytics (single source of truth)

- CAPEX: `GET /wbs/budget/rollup`, `/wbs/capex-intelligence`, `/wbs/exceptions`.
- OPEX: `GET /operational-budgets/rollup`, `/operational-budgets/analytics`.
- Unified: reporting pages must not read from two divergent sources (fix D9/D10 REQUIRES-BACKEND).
- Export: `POST /reporting/generate`, `GET /reporting/export/{id}`.

---

## 8. Page-by-Page Design Spec

### 8.1 `/financials` (hub) — NEW
- Purpose: resolve the 404; entry point to financial domain.
- Content: quick-cards to Operations Ledger, OPEX Planning, CAPEX Projects, Procurement, Governance Hub, Intelligence.
- Role-filtered visibility.
- **FRONTEND-ONLY**: create `frontend/pages/financials/index.tsx` or a Next.js redirect to `/financials/operations/manage`.

### 8.2 `/financials/operations/manage` (Operations Ledger)
- Purpose: OPEX budget workspace + expense ledger + categories/cost-center administration.
- Tabs: Workspace (BudgetGrid), Expenses (ALL statuses, not just PENDING), Categories (`CategoryManager` + `CostCenterManager`).
- KPI ribbon: filter by selected fiscal year (fix D14).
- Expense actions: approve/reject/edit/void per row.
- **FRONTEND-ONLY**: change `fetchOperationalExpenses(selectedBudgetId, 'PENDING')` to load all statuses; add year filter to KPI ribbon.

### 8.3 `/financials/operations/planning` (OPEX Planning Matrix)
- Purpose: plan allocations per category × period; submit to governance.
- Tabs: Temporal Setup (fiscal year), Planning Matrix, Governance Audit.
- Grid: categories × periods (backend-mandated key `operational_budget_category_id`).
- **FRONTEND-ONLY**: wire `PlanningGrid` to `GET /:id/grid` (load) and `POST /:id/planning-grid` (save). Current `PlanningGrid.tsx` is pure local state — replace data flow.
- **REQUIRES-BACKEND**: "Seal & Submit to Governance" must persist budget status transition + write `approval_log` before UI shows review state.

### 8.4 `/financials/expenses/new` (Log Expenditure)
- Purpose: single form for CAPEX and OPEX expense entry.
- CAPEX mode: `POST /wbs/expense/live-entry` (+batch) — payload per `CreateLiveExpenseDto` (validated).
- OPEX mode: `POST /operational-budgets/expense` — payload `operational_budget_category_id`, `item_description`, `amount`, `expense_date`, optional `document_reference`, `notes_justification`, `override_reason`. Budget dropdown must use `operational_budget_id` (not `id`).
- **FRONTEND-ONLY**: rewrite OPEX submit handler (lines 396-406) to canonical endpoint/payload; type budgets correctly.

### 8.5 `/financials/projects/*` (CAPEX)
- `projects/index.tsx` — project list.
- `projects/wbs.tsx` — WBS Designer; budget drafts.
- `projects/budgets.tsx` — lists WBS budget lines (`GET /wbs/budgets`); status PATCH; export.
- `projects/expenses.tsx` — `GET /wbs/expenses`; edit PATCH `live-entry/{id}`; delete; add.
- `projects/analytics.tsx` — CAPEX dashboard (`/wbs/capex-intelligence`); PDF report.
- **No changes needed** unless Section 10 fixes are applied; CAPEX path is the coherent half.

### 8.6 `/financials/operations/payroll/*` (Payroll)
- `index.tsx` — runs list; KPIs; create run.
- `[id].tsx` — run detail; line items; approve/post.
- **FRONTEND-ONLY**: fix copy at line 280 ("debits OPEX budgets" → reflect tenant's payroll mode); wire approve/post to OPEX burn when `payrollMode === 'opex-burn'` (call `POST /operational-budgets/payroll` after GL post).
- **REQUIRES-BACKEND**: unify GL posting + budget burn in one approved path; write `approval_log` (`PAYROLL_RUN`).

### 8.7 `/financials/operations/procurement` (P2P)
- Requisition → PO → Invoice → Receipt → Payment kanban/stepper.
- Three-way match view.
- **No changes** — reference flow.

### 8.8 `/financials/approvals` (Governance Hub)
- Aggregate all six streams; actions per DOA tier.
- **FRONTEND-ONLY**: add payroll stream; align pending-count with dashboard (fix D18).
- **REQUIRES-BACKEND**: write `approval_log` for OPEX/payroll/overrun approvals.

### 8.9 `/financials/intelligence` (AI Forecasting)
- Burn-rate, exhaustion date, risk classification; AI narrative; PDF pipeline.
- Read-only from chat endpoint; no writes.

### 8.10 Setup pages
- `setup.tsx` — fiscal years only (12 auto-periods).
- `chart-of-accounts.tsx` — per-tenant COA tree + seed defaults.
- `vendors.tsx` — vendor CRUD.
- Departments/cost centers — inside `manage.tsx` Categories tab (`CostCenterManager`).

---

## 9. Information Architecture

**Target nav structure** (already regrouped in `frontend/lib/navigationMap.ts`):

- Dashboard
- Governance Hub (`/financials/approvals`)
- Projects (CAPEX: Portfolio, Project Hub, WBS Designer, Project Budgets, Project Analytics, Project Ledger, Log Expense)
- Insights & Reporting (Reporting Hub, Financial Intelligence, Variance Analysis, CAPEX Performance, OPEX Efficiency, Document Archive)
- Corporate Operations (OPEX: Operations Ledger, OPEX Planning, P2P Procurement, Vendor Master, Payroll Desk, Corporate Analytics, Fiscal Setup, Chart of Accounts)
- Admin (Tenant)
- Documentation, Settings

**Redirect shims (keep):**
- `pages/budget/index.tsx` → `/financials/projects`
- `pages/budget/manage.tsx` → `/financials/projects/budgets`
- `pages/operational-budgets/manage.tsx` → `/financials/operations/manage`
- `pages/wbs-manager.tsx` → `/financials/projects/wbs`

**Remove/fix:**
- Stray `/operational-budgets/manage` link in `dashboard/ceo.tsx:272` → point to `/financials/operations/manage`.
- Dead `/expense/tracker` and `/projects/manage` references.

---

## 10. Fix Backlog (Prioritized)

### P0 — Breaks core flow (implement first)

| # | Fix | File(s) | Tag |
|---|-----|---------|-----|
| P0-1 | Add `/financials` hub or redirect | `frontend/pages/financials/index.tsx` (new) | FRONTEND-ONLY |
| P0-2 | Fix OPEX expense creation: canonical endpoint, budget ID mapping, correct payload | `frontend/pages/financials/expenses/new.tsx` | FRONTEND-ONLY |
| P0-3 | Wire Planning Matrix persistence (`GET /:id/grid`, `POST /:id/planning-grid`) | `frontend/components/budget/PlanningGrid.tsx`, `frontend/pages/financials/operations/planning.tsx` | FRONTEND-ONLY |
| P0-4 | Operations Ledger: show ALL expense statuses | `manage.tsx:82` | FRONTEND-ONLY |
| P0-5 | KPI ribbon: filter by selected fiscal year | `manage.tsx:198-221` | FRONTEND-ONLY |
| P0-6 | BudgetGrid: use selected budget's fiscal year | `BudgetGrid.tsx:38` | FRONTEND-ONLY |
| P0-7 | Payroll: correct copy (remove false OPEX debit claim) | `payroll/[id].tsx:280` | FRONTEND-ONLY |
| P0-8 | Governance Hub: add payroll stream; align pending count with dashboard | `approvals.tsx` | FRONTEND-ONLY |
| P0-9 | Fix redirect targets: `dashboard/ceo.tsx:272` | `dashboard/ceo.tsx` | FRONTEND-ONLY |

### P1 — Correctness & auditability

| # | Fix | File(s) | Tag |
|---|-----|---------|-----|
| P1-1 | "Seal & Submit to Governance": persist status transition + write `approval_log` | backend service:2248 + UI planning.tsx | REQUIRES-BACKEND |
| P1-2 | Write `approval_log` for OPEX expense approvals, overruns, payroll | backend `approval-log.entity.ts` + service call sites | REQUIRES-BACKEND |
| P1-3 | Commitment register: visible P2P encumbrance register | frontend (new page) + backend `getActiveEncumbrancesForBudget` | FRONTEND-ONLY (UI) |
| P1-4 | Document attachments: receipts/LPOs/contracts with content hash | frontend upload + backend | REQUIRES-BACKEND |
| P1-5 | External auditor role: read-only, export, no mutations | frontend role guard + backend | REQUIRES-BACKEND |
| P1-6 | DOA threshold configurability per tenant/economic class | frontend settings + backend `doa.service.ts` | REQUIRES-BACKEND |
| P1-7 | Approval escalation for stale pending items | backend + frontend notifications | REQUIRES-BACKEND |
| P1-8 | `budget_ledger` writer | backend `budget-ledger.entity.ts` | REQUIRES-BACKEND |
| P1-9 | Batch expense validation (nested DTO + 100-row cap; atomic vs partial) | backend `wbs.controller.ts:656` | REQUIRES-BACKEND |

### P2 — Advanced capabilities

| # | Capability | Tag |
|---|-----------|-----|
| P2-1 | Budget virements + supplemental requests (DOA approval) | REQUIRES-BACKEND |
| P2-2 | Multi-year appropriations & rollover | REQUIRES-BACKEND |
| P2-3 | Bank reconciliation + cash management | REQUIRES-BACKEND |
| P2-4 | Cash flow forecasting (burn-rate → exhaustion on OPEX + payroll) | FRONTEND-ONLY (chat read) + REQUIRES-BACKEND |
| P2-5 | Multi-currency with spot rates (USD normalization) | REQUIRES-BACKEND |
| P2-6 | MDA portfolio roll-up (ministries/agencies consolidation) | REQUIRES-BACKEND |
| P2-7 | Receipts post GL + actuals (commitment release at receipt) | REQUIRES-BACKEND |

---

## 11. AI Assistant Quick-Action Alignment Per Page

Quick actions route through `/api/v1/ai/chat/stream` (`useAIChat.ts:175`). Rule: **read actions stream directly; write actions open a pre-filled review form via `fillForm` requiring explicit user confirmation. No silent writes from chat.**

| Page | Quick actions | Type | Backend capability |
|------|--------------|------|-------------------|
| Dashboard | Portfolio summary; top overruns; variance alerts | Read | `/dashboard/executive`, `/dashboard/summary` |
| WBS | Explain variances; log expense guide | Read + guided write | `/wbs/capex-intelligence` (read); expense creation via fillForm (write, confirmed) |
| Projects / OPEX manage | Budget health; runway; category breakdown | Read | `/operational-budgets/rollup`, `/wbs/budget/rollup` |
| Procurement | P2P status; overdue items; create requisition (guide) | Read + guided write | `/finance-core/requisitions` via fillForm |
| Approvals | Pending count; high-value items; approve/reject (guide) | Read + guided write | needs-attention streams + approve/reject |
| Payroll | Payroll insight; department burn | Read | `/finance/payroll/runs`, `/operational-budgets/rollup` |
| Setup/Fiscal | Setup guide; category creation | Guided write | `/finance-core/fiscal-years`, `/operational-budgets/categories` |
| Intelligence | Burn-rate; exhaustion date; AI narrative | Read | `/wbs/capex-intelligence`, `/finance-core/opex-intelligence` |

No quick actions exist for onboarding/setup pages today — add coaching prompts for fiscal setup, COA seed, departments, vendors (advisory only).

---

## 12. Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Payroll OPEX burn default; separate personnel envelope configurable for ministries | Matches ARCH-008 / product docs (construction DNA); ministries/agencies can opt into separate envelope via tenant flag |
| Invoice-accrual as single P&L actualization point for P2P | Backend already posts invoice accrual; receipts release commitments; shows both in commitment register |
| Planning grid keyed on `operational_budget_category_id` × periods | Backend-mandated (`savePlanningGrid`, service:2155-2181); frontend must not invent GL-account grid |
| One variance-threshold scale per tenant | Docs have 4 contradictory scales; configure in tenant settings, default 80%/100% |
| NGN default currency; DOA thresholds USD-normalized | Matches existing UI defaults + ARCH-005 USD benchmark |
| `/financials` hub resolves 404 | No index page exists; nav never links to bare `/financials` |
| AI writes are guided (fillForm + confirmation), never silent | Prevents accidental mutations from chat |

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| CAPEX | Capital Expenditure — project-based, time-limited, WBS-controlled |
| OPEX | Operational Expenditure — departmental, recurring, period-allocated |
| Encumbrance | Committed but not yet paid (RESERVED → FIRM → LIQUIDATED → RELEASED) |
| DOA | Delegation of Authority — 4 approval tiers with USD-normalized thresholds |
| WBS | Work Breakdown Structure — project cost hierarchy |
| LPO | Local Purchase Order — procurement commitment document |
| GFS | Government Finance Statistics — economic classification (ministry reporting) |
| MDA | Ministry, Department, Agency |
| burn | Actual spend deducted from budget allocation |
| rollover | Moving unspent appropriation to next fiscal year (P2) |
| virement | Moving budget between categories mid-year (P2) |

---

**End of draft.** Review this in `.workspace-temp/`. On approval I will write it to `docs/technical/ARCH-010-FRONTEND-FINANCIAL-FLOW-DESIGN.md`, then begin P0 implementation.
