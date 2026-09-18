# SentinelFi OPEX — Implementation Plan & Progress Control

**Date Created:** 17 September 2026
**Audit Reference:** `OPEX-AUDIT-17-9-26.md`
**Owner:** Operations Implementation Specialist

---

## Progress Legend

| Status | Meaning |
|--------|---------|
| `⬜ Pending` | Not started |
| `🔄 In Progress` | Actively being worked on |
| `✅ Done` | Implemented & verified |
| `⛔ Blocked` | Waiting on dependency/decision |
| `🔁 Regression` | Reintroduced issue |

---

## The Opex Implementation Strategy

### Guiding Principles

1. **Fix wiring before adding features** — Broken navigation and stubbed handlers are the foundation problem. Nothing new goes in until existing flows work end-to-end.
2. **Single source of truth** — One canonical enum set, one OPEX analytics endpoint, one API access pattern.
3. **Control loop completeness** — Detection without action is theater. Every variance must have an approval path.
4. **Auditability by design** — Before/after state on every mutation, SoD enforcement, immutable audit trail.
5. **Progressive consolidation** — Reduce 13 fragmented pages toward a coherent tabbed workspace without breaking existing deep links.

### Implementation Phases

```
Phase 0: Rapid stabilization ──► Phase 1: Core feature completion
Phase 2: Security hardening ──► Phase 3: Scalability & UX unification
Phase 4: Advanced capability (encumbrance model)
```

---

## PHASE 0 — Rapid Stabilization (System-Breaking)

**Goal:** Make every existing OPEX page reachable and functional. No new features.

| # | Task | Priority | Status | Notes | Date Started | Date Done |
|---|------|----------|--------|-------|--------------|-----------|
| 0.1 | Fix navigation/guard alignment — `navigationMap.ts` roles match `ROLE_CONFIG.visible` | P0 | ⬜ Pending | OpsD default route 403s. Critical. | — | — |
| 0.2 | Fix P2P PDF endpoints — `/finance-core/purchase-orders/:id/pdf` | P0 | ⬜ Pending | Procurement preview 404s | — | — |
| 0.3 | Fix route ordering — move `GET /export` before `GET /:id` | P0 | ⬜ Pending | ParseUUIDPipe swallows export route | — | — |
| 0.4 | Resolve enum drift — **canonical source = shared types** | P0 | ⬜ Pending | Align backend enum + DB values | — | — |
| 0.5 | Unblock `/financials/operations/analytics` — add OpsD/TechD to guard | P0 | ⬜ Pending | Zero authorized roles currently | — | — |

**Phase 0 Exit Criteria:** All 13 OPEX pages reachable by at least one role; no dead sidebar links; export endpoint works; enum insert failures eliminated.

---

## PHASE 1 — Core Feature Completion (Approval Loop & Persistence)

**Goal:** Close the control loop — pending expenses get an approval path; planning actually persists.

| # | Task | Priority | Status | Notes | Date Started | Date Done |
|---|------|----------|--------|-------|--------------|-----------|
| 1.1 | **Expense approval flow** — `POST /expense/:id/approve` + `POST /expense/:id/reject` | P1 | ⬜ Pending | SoD: approver ≠ submitter; audit log entry on action | — | — |
| 1.2 | **Expense approval UI** — Governance view listing PENDING expenses with context | P1 | ⬜ Pending | Must show pipeline-adjusted remaining budget | — | — |
| 1.3 | **PlanningGrid persistence** — save endpoint + load from allocations | P1 | ⬜ Pending | Currently client-only | — | — |
| 1.4 | Replace `setTimeout` submit-to-governance with real API call | P1 | ⬜ Pending | planning.tsx:48 | — | — |
| 1.5 | Wire "Download PDF Dossier" button | P1 | ⬜ Pending | planning.tsx:174 | — | — |
| 1.6 | Wire "Export PDF" button (analytics) | P1 | ⬜ Pending | analytics.tsx:109 | — | — |
| 1.7 | Wire P2P "Filter" button | P1 | ⬜ Pending | procurement.tsx:231 | — | — |
| 1.8 | Wire PO "View" button — open PDF preview | P1 | ⬜ Pending | procurement.tsx:430 | — | — |
| 1.9 | Wire Invoice "Pay" button — payment flow | P1 | ⬜ Pending | procurement.tsx:467; needs invoice payment endpoint | — | — |
| 1.10 | Wire delete line item action | P1 | ⬜ Pending | payroll/[id].tsx:204 | — | — |
| 1.11 | Replace hardcoded analytics values — 2.1% trend, 62%/18% drivers, 92% runway | P1 | ⬜ Pending | Wire to `getOperationalAnalytics` + `getBudgetConsumption` | — | — |
| 1.12 | Fix post-submit redirect — `/financials/expenses/new` → existing ledger route | P1 | ⬜ Pending | Target `/financials/projects/expenses` doesn't exist | — | — |
| 1.13 | Fix `expense/[id].tsx` back link — `/expense/manage` doesn't exist | P1 | ⬜ Pending | Route to operations ledger | — | — |

**Phase 1 Exit Criteria:** Every variance state has a terminal action; planning data persists across sessions; zero hardcoded analytics values.

---

## PHASE 2 — Security & Data Integrity

**Goal:** Close all mass-assignment and validation holes; enforce SoD; make mutations auditable.

| # | Task | Priority | Status | Notes | Date Started | Date Done |
|---|------|----------|--------|-------|--------------|-----------|
| 2.1 | Add `CreateOperationalExpenseDto` + validation pipe | P2 | ⬜ Pending | Replace `@Body() any` | — | — |
| 2.2 | Add `UpdateOperationalExpenseDto` — explicit field whitelist | P2 | ⬜ Pending | Block `tenant_id`, `variance_flag`, `logged_by_user_id` overwrite | — | — |
| 2.3 | Add `LogPayrollEntryDto` + validation | P2 | ⬜ Pending | | — | — |
| 2.4 | Add `RunPayrollBotDto` — typed template structure | P2 | ⬜ Pending | | — | — |
| 2.5 | Add `UpsertAllocationDto` — validate `period_type` enum | P2 | ⬜ Pending | | — | — |
| 2.6 | SoD enforcement — approver ≠ submitter (expense + payroll) | P2 | ⬜ Pending | Backend check on approve endpoints | — | — |
| 2.7 | Expense delete guard — block delete on APPROVED expenses; require reversal | P2 | ⬜ Pending | servia.ts:266-320 | — | — |
| 2.8 | Tiered variance notifications — minor/major/critical all notify approvers | P2 | ⬜ Pending | Currently only zero-budget critical notifies | — | — |
| 2.9 | Export `format` param validated via `@IsIn(["csv","pdf","xlsx","docx"])` | P2 | ⬜ Pending | | — | — |
| 2.10 | Audit-log capture — before/after state on expense mutations | P2 | ⬜ Pending | Append-only; who/what/when/where/why | — | — |
| 2.11 | Payroll entry status enum — replace `varchar(50)` | P2 | ⬜ Pending | | — | — |
| 2.12 | Payroll bot deduction calc — tax/pension/allowances | P2 | ⬜ Pending | net_pay currently = base_salary | — | — |

**Phase 2 Exit Criteria:** No write endpoint accepts `any`; no silent mutation without audit trace; SoD enforced on all approval paths.

---

## PHASE 3 — Scalability & UX Unification

**Goal:** Consolidate fragmented pages/endpoints; standardize patterns; one OPEX experience.

| # | Task | Priority | Status | Notes | Date Started | Date Done |
|---|------|----------|--------|-------|--------------|-----------|
| 3.1 | Consolidate OPEX analytics — one canonical endpoint + typed interface | P3 | ⬜ Pending | Rollup + Intelligence + OperationalAnalytics → unify | — | — |
| 3.2 | Standardize API access — pick one pattern (recommend `useFinanceCore`) | P3 | ⬜ Pending | 4 patterns in 13 pages today | — | — |
| 3.3 | Build shared `ConfirmDialog` component + use on destructive actions | P3 | ⬜ Pending | Replace `window.confirm` in payroll approve/post | — | — |
| 3.4 | Build shared `Pagination` component | P3 | ⬜ Pending | No pagination on any OPEX list | — | — |
| 3.5 | Add `ErrorBoundary` + loading skeletons to all OPEX pages | P3 | ⬜ Pending | Components exist, unused here | — | — |
| 3.6 | Add `EmptyState` handling to OPEX lists | P3 | ⬜ Pending | | — | — |
| 3.7 | Build shared `Tabs` component — unify page tab patterns | P3 | ⬜ Pending | | — | — |
| 3.8 | Parent budget rollup — recalculate `budgeted_amount` from allocations | P3 | ⬜ Pending | servia.ts:789-804 TODO | — | — |
| 3.9 | Write `actual_amount` on period allocations at expense-log time | P3 | ⬜ Pending | Column exists, never written | — | — |
| 3.10 | Paginate `findAllExpenses`, `findAll` budget queries | P3 | ⬜ Pending | Performance at scale | — | — |
| 3.11 | CategoryManager edit/delete capability | P3 | ⬜ Pending | Create-only today | — | — |
| 3.12 | `POST /finance-core/departments` + `cost-centers` UI | P3 | ⬜ Pending | Lookups are read-only | — | — |

**Phase 3 Exit Criteria:** One API pattern, one analytics endpoint, shared UI components in use across all OPEX pages.

---

## PHASE 4 — Advanced Capability (Encumbrance & Control Model)

**Goal:** Match enterprise-level financial control — commitment tracking, tolerance hierarchy, forecasting.

| # | Task | Priority | Status | Notes | Date Started | Date Done |
|---|------|----------|--------|-------|--------------|-----------|
| 4.1 | Encumbrance lifecycle — soft-hold on requisition, firm on PO, liquidate on payment | P4 | ⬜ Pending | New entity + state transitions | — | — |
| 4.2 | Pipeline-adjusted remaining budget display | P4 | ⬜ Pending | budgeted − actual − committed | — | — |
| 4.3 | Dual AND-threshold variance (both % AND $) | P4 | ⬜ Pending | Single % threshold today | — | — |
| 4.4 | Category-specific variance tolerances | P4 | ⬜ Pending | Payroll stricter than discretionary | — | — |
| 4.5 | Timing vs permanent variance classification | P4 | ⬜ Pending | Prevents annual surprises | — | — |
| 4.6 | Rolling forecast bridge — actuals → forecast → plan | P4 | ⬜ Pending | Extends PlanningGrid | — | — |
| 4.7 | Real-time budget check at PO creation | P4 | ⬜ Pending | Block/flag over-commitment | — | — |
| 4.8 | 3-way match — PO + receipt + invoice | P4 | ⬜ Pending | Receipt entity + matching logic | — | — |
| 4.9 | Reversal journal for approved-expense deletion | P4 | ⬜ Pending | Replaces silent delete | — | — |
| 4.10 | Single "needs attention" queue (all pending approvals, variances, overruns) | P4 | ⬜ Pending | | — | — |

**Phase 4 Exit Criteria:** Organization can state funds-available with confidence; every material variance has owner + action + deadline; audit trail is complete & immutable.

---

## Verification Protocol

Before **every** implementation task is marked `✅ Done`, run (sequentially):

```bash
npx tsc --noEmit                        # frontend
npx tsc --noEmit -p backend/tsconfig.json   # backend
npm test --workspace frontend           # jest suite
npx next lint                           # eslint incl. sentinelfi guardrail
```

Plus module-specific verification:
- **Navigation tasks:** log in as each affected role and confirm the route renders without redirect
- **Endpoint tasks:** curl the endpoint with valid + invalid payloads
- **Enum tasks:** insert record with each enum variant against a real DB
- **UI tasks:** confirm loading/empty/error states render

---

## Burn-Down Summary

| Phase | Total Tasks | Pending | In Progress | Done | Blocked |
|-------|-------------|---------|-------------|------|---------|
| Phase 0 — Stabilization | 5 | 5 | 0 | 0 | 0 |
| Phase 1 — Core Completion | 13 | 13 | 0 | 0 | 0 |
| Phase 2 — Security | 12 | 12 | 0 | 0 | 0 |
| Phase 3 — Scalability/UX | 12 | 12 | 0 | 0 | 0 |
| Phase 4 — Advanced | 10 | 10 | 0 | 0 | 0 |
| **Total** | **52** | **52** | **0** | **0** | **0** |

---

## Change Log

| Date | Task | Change | Status Before | Status After |
|------|------|--------|---------------|--------------|
| 17-09-2026 | — | Initial plan created | — | — |

---

## Notes / Decisions / Blockers

*(Append here as work proceeds — decisions, blockers, wild documentation.)*

---