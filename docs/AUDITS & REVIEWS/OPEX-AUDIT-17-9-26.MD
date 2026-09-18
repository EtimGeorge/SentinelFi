# SentinelFi OPEX — Deep Review & Implementation Analysis

**Date:** 17 September 2026
**Scope:** OPEX (Operations Excellence) module — user journey, navigation, routing, backend capabilities, frontend implementation
**Role:** Operations Implementation Specialist & Consultant

---

## Executive Summary

The OPEX module has **significant backend capability** (variance detection, multi-format export, payroll bot, rollup analytics) but suffers from **critical wiring failures** that make most pages unreachable or non-functional. The navigation system has a fundamental misalignment between what the sidebar shows and what the route guard allows — roles see links they can't click, and roles that should access pages can't find them.

**Verdict: ~40% production-ready. The bones are strong but the connective tissue is broken.**

---

## 1. User Journey Map — What Should Exist vs What Does

### The Ideal OPEX Lifecycle (6 stages)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. PLANNING │───▶│ 2. ALLOCATION │───▶│ 3. EXPENSE   │
│  (Fiscal     │    │ (Budget Grid  │    │   TRACKING   │
│   Setup)     │    │  per period)  │    │ (Log/Approve)│
└─────────────┘    └──────────────┘    └──────────────┘
                                              │
┌─────────────┐    ┌──────────────┐    ┌──────▼────────┐
│ 6. AUDIT &  │◀───│ 5. REPORTING │◀───│ 4. VARIANCE   │
│   GOVERNANCE │    │ (Export/PDF) │    │   ANALYSIS    │
└─────────────┘    └──────────────┘    └──────────────┘
```

### Stage-by-Stage Assessment

| Stage | What Exists | What's Broken/Missing | Status |
|-------|-------------|----------------------|--------|
| **1. Planning** | Fiscal Setup page, Planning Grid component | Grid is **client-only** (no save endpoint wired), `handleSubmitToGovernance` is a `setTimeout` stub, "Download PDF Dossier" button has no handler, audit attestation checkboxes are stateless | **30% — UI shell exists, no persistence** |
| **2. Allocation** | BudgetGrid with debounced auto-save, CategoryManager, `POST /allocation` endpoint | CategoryManager has no edit/delete, parent `budgeted_amount` never recalculated from allocations, `actual_amount` column on period allocations is never written | **60% — core works, refinement missing** |
| **3. Expense Tracking** | Log Expense page (814 lines), expense CRUD endpoints, variance detection engine | After submit redirects to `/financials/projects/expenses` (broken link), no file/document upload, sequential OPEX submit with no partial-failure handling, no approval endpoint for PENDING expenses | **55% — logging works, approval loop is open** |
| **4. Variance Analysis** | Three-tier variance detection (minor/major/critical), variance_flag on expenses | No `PENDING` → `APPROVED`/`REJECTED` endpoint exists, notifications only sent for zero-budget critical (other variance levels are silent), no dual-threshold (AND logic), no timing vs permanent classification | **40% — detection exists, action loop is broken** |
| **5. Reporting** | OPEX Efficiency report, Export CSV/PDF/XLSX/DOCX, Intelligence dashboard with OpexDashboard | Export button exists but format param isn't validated, Intelligence OPEX tab has hardcoded NGN currency, Analytics page has hardcoded percentages (2.1%, 62%, 18%) | **50% — data exists, presentation is partially fake** |
| **6. Audit & Governance** | `ApprovalLogEntity` exists, `variance_flag` + `override_reason` columns | No dedicated audit view for OPEX, no append-only audit trail, no before/after state capture, `deleteExpense()` doesn't check approval state, mass-assignment vulnerability in `updateExpense()` | **20% — entity exists, no OPEX-specific governance** |

---

## 2. Navigation & Routing — The Alignment Crisis

### The Core Problem: Three Layers, Three Different Truths

```
navigationMap.ts  ←→  RouteGuard (AuthContext)  ←→  Backend @Roles()
     (who SEES it)        (who CAN click it)           (who can CALL API)
```

**These three are out of sync for almost every OPEX route.**

### Detailed Route Audit

| Route | Nav Shows To | Guard Allows | Backend Allows | Status |
|-------|-------------|--------------|----------------|--------|
| `/financials/operations/manage` | CEO, CFO, AdminD, FM | **OpsD only** (their default) | AdminD, AdminMgr, CFO, FM, CEO, OpsD, TechD (read) | **BROKEN** — CEO/CFO/AdminD/FM see it in sidebar, click it, get bounced |
| `/financials/operations/planning` | CEO, CFO, AdminD, FM | **TechD** (prefix match) | TechD (read via rollup) | **BROKEN** — all 4 nav roles bounce |
| `/financials/operations/procurement` | CEO, CFO, AdminD, AdminMgr, TechD, OpsD, FM | OpsD, TechD | Finance roles only — **not OpsD** | **CRITICAL** — OpsD is the default role for this page, but backend 403s them |
| `/financials/operations/payroll` | CEO, CFO, AdminD, FM | TechD, AdminMgr | CFO, FM, AdminD, AdminMgr, CEO, TechD | **BROKEN** — nav roles bounce |
| `/financials/operations/analytics` | CEO, CFO, AdminD, FM | **Nobody** | CFO, FM, FO, AdminD, AdminMgr, CEO | **CRITICAL** — zero guard-authorized roles |
| `/financials/operations/setup` | CEO, CFO, AdminD, FM | TechD (prefix) | CFO, FM, FO, AdminD, AdminMgr, CEO | **BROKEN** |
| `/financials/intelligence` | CEO, CFO, AdminD, FM, TechD, OpsD | CEO, CFO, AdminD, FM, TechD | CFO, FM, AdminD, CEO | **Partial** — OpsD sees nav but bounces |
| `/reporting/opex` | CEO, CFO, AdminD, TechD, OpsD | CEO, CFO, AdminD, TechD | AdminD, AdminMgr, CEO, CFO, FM, OpsD, TechD | **Partial** — OpsD sees nav but guard blocks |

### Dead Links / Broken Navigation

| From Page | Link Target | Issue |
|-----------|-------------|-------|
| `expenses/new.tsx` (post-submit) | `/financials/projects/expenses` | **Page doesn't exist** |
| `expense/[id].tsx` (back button) | `/expense/manage` | **Route doesn't exist** |
| `operational-budgets/[id].tsx` | `/operational-budgets/manage` | Redirects (extra hop, not a bug but sloppy) |
| `procurement.tsx` PDF preview | `/procurement/purchase-orders/:id/pdf` | **404** — real endpoint is `/finance-core/purchase-orders/:id/pdf` |
| `procurement.tsx` PDF preview | `/procurement/invoices/:id/pdf` | **404** — real endpoint is `/finance-core/invoices/:id/pdf` |

### Unreachable Pages (zero authorized roles in guard)

- `/financials/operations/analytics` — Corporate Analytics
- `/financials/projects/analytics` — Project Analytics
- `/projects` — Project Portfolio (old path, no role has it in `ROLE_CONFIG.visible`)

---

## 3. Backend Gaps — What's Built vs What's Needed

### 3a. Enum Drift (CRITICAL)

| Field | Backend Enum | Shared Type | DB Migration |
|-------|-------------|-------------|--------------|
| Budget Type | `DEPARTMENTAL, COMPANY_WIDE, RECURRING` | `COMPANY_WIDE, DEPARTMENTAL, PROJECT_SPECIFIC` | `departmental, company-wide, recurring` |
| Budget Status | `ACTIVE, CLOSED, ARCHIVED` | `ACTIVE, INACTIVE, ARCHIVED` | `active, closed, archived` |

**`RECURRING` vs `PROJECT_SPECIFIC` is a semantic mismatch.** `CLOSED` vs `INACTIVE` will cause runtime failures if frontend sends `INACTIVE` but backend expects `CLOSED`.

### 3b. Route Conflict Bug

`GET /operational-budgets/export` is registered **after** `GET /operational-budgets/:id`. NestJS evaluates top-to-bottom; `ParseUUIDPipe` on `/:id` will reject `"export"` as a UUID → **400 error instead of hitting the export endpoint**. Must reorder.

### 3c. Missing DTOs (Security Risk)

| Endpoint | Accepts | Risk |
|----------|---------|------|
| `POST /expense` | `any` | No validation, injection surface |
| `PATCH /expense/:id` | `any` | Mass-assignment: can overwrite `tenant_id`, `variance_flag`, `logged_by_user_id` |
| `POST /payroll` | `any` | No structure validation |
| `POST /run-bot` | `{ template: any[] }` | No template shape validation |
| `POST /allocation` | `period_type: any` | No enum validation |

### 3d. Business Logic Gaps

| Gap | Impact | Best Practice |
|-----|--------|---------------|
| No expense approval endpoint | PENDING expenses have nowhere to go | Threshold-based routing with SoD |
| `deleteExpense()` doesn't check approval state | Approved expenses silently reverted | Block delete on APPROVED, require reversal |
| Parent `budgeted_amount` never recalculated | Budget totals drift from allocations | Cascading rollup on allocation change |
| `actual_amount` column never written | Period-level actuals are query-time only | Write actuals at expense log time |
| Payroll bot ignores deductions | `net_pay = base_salary` | Tax/pension/allowance calculation |
| Notifications only for zero-budget critical | 5-10% overruns are silent | Tiered notification by variance level |
| Three overlapping OPEX analytics endpoints | Frontend confusion, data inconsistency | Consolidate to one canonical endpoint |

### 3e. Missing API Endpoints (Frontend Calls Them or Should)

| Need | Status |
|------|--------|
| `POST /operational-budgets/expense/:id/approve` | **MISSING** — no approval flow |
| `POST /operational-budgets/expense/:id/reject` | **MISSING** — no rejection flow |
| `POST /finance-core/departments` | **MISSING** — read-only UI, can't create |
| `POST /finance-core/cost-centers` | **MISSING** — read-only UI, can't create |

---

## 4. Frontend Gaps — What's Stubbed

### 4a. Hardcoded/Fake Data

| Page | Line | Fake Value | What It Should Be |
|------|------|-----------|-------------------|
| `analytics.tsx` | 130 | `"2.1%"` trend badge | Calculated from actual data |
| `analytics.tsx` | 256-263 | `62%`, `18%` spending drivers | Real breakdown |
| `procurement.tsx` | 198 | `"92%"` Budget Runway | `fetchBudgetConsumption()` result |
| `intelligence/index.tsx` | 275 | Hardcoded `'NGN'` currency | Project/user currency |

### 4b. Non-Functional Handlers

| Page | Element | Issue |
|------|---------|-------|
| `planning.tsx:48` | "Submit to Governance" | `setTimeout` stub |
| `planning.tsx:174` | "Download PDF Dossier" | No `onClick` |
| `analytics.tsx:109` | "Export PDF" | No `onClick` |
| `procurement.tsx:231` | "Filter" button | No handler |
| `procurement.tsx:430` | PO "View" button | No handler |
| `procurement.tsx:467` | Invoice "Pay" button | No handler |
| `payroll/[id].tsx:204` | Delete line item | Empty `() => {}` |

### 4c. UX Deficiencies Across All Pages

| Pattern | Status | Impact |
|---------|--------|--------|
| Error boundaries | `ErrorBoundary.tsx` exists but not used on OPEX pages | Unhandled API errors crash the page |
| Loading skeletons | `LoadingSkeleton.tsx` has 7 variants but OPEX pages use inline `Loading...` text or nothing | Poor perceived performance |
| Confirmation dialogs | No shared `ConfirmDialog` — uses `window.confirm()` | Inconsistent, no audit trail |
| Pagination | No shared component — lists dump all data | Performance issues at scale |
| Empty states | `EmptyState.tsx` exists with route-aware config but OPEX pages don't use it | Confusing blank screens |
| Form validation | No shared validation layer — each page does ad-hoc `!field` checks | Inconsistent error messages |
| Tab component | No shared `<Tabs>` — each page builds its own | Inconsistent styling |
| Undo/rollback | `ToastWithUndo` exists but unused in OPEX | No safety net for destructive actions |

### 4d. API Client Inconsistency

| Page | Import | Pattern |
|------|--------|---------|
| `manage.tsx` | `api` from `lib/api` | `res.data` unwrap |
| `planning.tsx`, `analytics.tsx`, `setup.tsx`, `procurement.tsx`, `payroll/*` | `useFinanceCore` hook | Hook-managed |
| `reporting/opex.tsx`, `expense/[id].tsx` | `useSecuredApi` hook | Different auth path |
| `expenses/new.tsx` | `apiClient` from `lib/api` | Auto-unwrap |

Four different API access patterns in the same module. This is a maintenance nightmare.

---

## 5. Best Practices Comparison

### What SentinelFi Gets RIGHT

| Practice | Implementation |
|----------|---------------|
| Variance detection engine | Three-tier (minor/major/critical) with role-based override |
| Tenant-scoped data isolation | All entities have `tenant_id`, TypeORM filters |
| Multi-format export | CSV, PDF, XLSX, DOCX with StreamableFile |
| Soft-delete on entities | `@DeleteDateColumn` on budget/expense entities |
| Budget grid with debounced save | Good UX for allocation editing |
| P2P procurement flow | Requisition → PO → Invoice with PDF generation |
| Payroll run lifecycle | Create → Add items → Approve → Post to ledger |
| Role-based navigation filtering | Sidebar respects roles |

### What SentinelFi Gets WRONG vs Best Practices

| Best Practice | SentinelFi Gap | Severity |
|---------------|---------------|----------|
| **Dual AND-threshold variance** (both % AND $ must breach) | Single threshold (% only) — a $5 overrun at 11% triggers CRITICAL | High |
| **Category-specific tolerances** (payroll 1%, standard 5%, discretionary 10%) | One blended threshold for all categories | High |
| **Encumbrance lifecycle** (pre-encumbrance → encumbrance → expenditure → actual) | Only tracks actuals — no committed/encumbered state | Critical |
| **Pipeline-adjusted balances** at approval time | No commitment tracking — remaining budget = budgeted - actual | Critical |
| **SoD: "cannot approve own submission"** | No such check — same user can create and approve | Critical |
| **Append-only audit log** with before/after state | `deleteExpense()` reverts silently, no before/after capture | Critical |
| **4 W's audit trail** (who, what, when, where + why) | `override_reason` exists but no full audit trail | High |
| **Timing vs permanent variance classification** | Not implemented — all variances are treated the same | Medium |
| **Rolling forecast** bridge | Planning Grid is client-only with no persistence | High |
| **Real-time budget checks** during requisition | No budget availability check at PO creation time | High |
| **3-way match** (PO + receipt + invoice) | PO and Invoice exist but no receipt entity, no matching logic | Critical |
| **Single "needs attention" queue** | Multiple separate pages — no unified action center | Medium |
| **Hybrid nav** (sidebar + contextual tabs) | Implemented but tabs are inconsistent across pages | Low |

---

## 6. Prioritized Recommendations

### P0 — System-Breaking (Fix Immediately)

1. **Fix navigation/guard alignment** — The `ROLE_CONFIG.visible` in `AuthContext.tsx` must match `navigationMap.ts` roles for every OPEX route. OpsD's default route (`/procurement`) 403s them. This is the most user-visible bug.

2. **Fix P2P PDF endpoints** — `procurement.tsx` calls `/procurement/purchase-orders/:id/pdf` but the real endpoint is `/finance-core/purchase-orders/:id/pdf`. PO/Invoice preview is completely broken.

3. **Fix route ordering** — Move `GET /export` before `GET /:id` in `operational-budgets.controller.ts` to prevent `ParseUUIDPipe` from swallowing the export route.

4. **Resolve enum drift** — Pick one canonical source (recommend shared types) and align backend enum, DB values, and frontend types. This is a latent insert-failure time bomb.

### P1 — Feature-Breaking (Fix This Sprint)

5. **Implement expense approval flow** — Create `POST /expense/:id/approve` and `POST /expense/:id/reject` endpoints. PENDING expenses currently have no path forward.

6. **Wire PlanningGrid persistence** — The planning grid is entirely client-only. It needs a save endpoint and load from `budget_ledger` or period allocations.

7. **Fix all stub handlers** — Replace `setTimeout` governance submit, wire PDF download buttons, implement PO View, implement Invoice Pay, implement delete line item.

8. **Replace hardcoded analytics** — The 2.1% trend, 62%/18% drivers, and 92% runway are all fake. Wire to real data from `getOperationalAnalytics` and `getBudgetConsumption`.

### P2 — Security & Data Integrity (Fix This Month)

9. **Add DTOs for all write endpoints** — `expense`, `payroll`, `run-bot`, `allocation` all accept `any`. Create proper DTOs with class-validator decorators.

10. **Fix mass-assignment in `updateExpense()`** — Replace `Object.assign(expense, updateData)` with explicit field mapping.

11. **Add SoD enforcement** — "Cannot approve own submission" for expenses and payroll.

12. **Add expense delete guard** — Block deletion of APPROVED expenses; require reversal journal instead.

### P3 — Scalability & UX (Fix This Quarter)

13. **Consolidate OPEX analytics** — Three overlapping endpoints (`getOpexRollup`, `getOpexIntelligence`, `getOperationalAnalytics`) → one canonical endpoint with a typed response interface.

14. **Standardize API access pattern** — Pick one: `useFinanceCore` or `useSecuredApi` or `apiClient`. Currently four different patterns across 13 pages.

15. **Implement shared UI primitives** — `ConfirmDialog`, `Pagination`, `Tabs`, `FormValidation` layer. These exist partially but aren't used in OPEX pages.

16. **Add encumbrance tracking** — Model the committed lifecycle (requisition → PO → invoice → paid) instead of only tracking actuals. This is the single biggest capability gap vs enterprise systems.

17. **Build parent budget rollup** — When allocations change, cascade the sum up to `OperationalBudgetEntity.budgeted_amount`.

18. **Wire `actual_amount` on period allocations** — Write actuals at expense log time instead of computing at query time.

---

## 7. Perspective & Counterarguments (Consultant Notes)

**1. "Add more features" isn't the right priority.** The existing features are broken. 7 of 13 OPEX pages have navigation that bounces the intended users. 6 handlers are stubs. 3 analytics values are hardcoded. Adding features on top of a broken foundation compounds technical debt. **Fix the wiring first.**

**2. The OPEX module is over-fragmented.** You have 13 separate page files for what is essentially one domain. Enterprise best practice is a **tabbed workspace** — one URL (`/operations`) with internal tabs (Planning | Budget | Expenses | Procurement | Payroll | Analytics). This reduces navigation complexity, eliminates the role-alignment problem (one guard rule per tab, not per page), and makes the user journey coherent.

**3. Three analytics endpoints is a design smell, not a feature.** `getOpexRollup`, `getOpexIntelligence`, and `getOperationalAnalytics` overlap significantly. The Intelligence page and the Analytics page show different slices of the same data. Consolidate.

**4. The variance detection is sophisticated but the action loop is missing.** You can detect a 10% overrun, but there's no way to approve, reject, or route it. Detection without action is dashboard theater. The approval workflow is the #1 missing capability.

**5. Encumbrance tracking isn't optional — it's the foundation of financial control.** Without it, you can't answer "how much budget is actually available?" You can only answer "how much have we spent?" That's a rearview mirror, not a steering wheel.

---

**Bottom line:** The OPEX module has strong backend primitives (variance detection, multi-format export, budget grid, payroll lifecycle) but critical failures in three areas: **(1) navigation/guard alignment makes most pages unreachable, (2) the approval workflow is completely absent despite being the core control mechanism, and (3) three overlapping analytics endpoints with hardcoded frontend values create a false sense of completeness.** Fix these three categories and the module goes from 40% to 80% production-ready.