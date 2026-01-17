# Implementation Roadmap: Project & Operational Upgrade

## Phase 1: Structural Alignment (Backend)
- [x] **Project Entity Enhancement**:
    - [x] Add fields: `currency`, `contingency_percent`, `vat_rate`, `wht_rate`.
    - [x] Add relationship: `WbsBudgetEntity` has formal `@ManyToOne` relation to `ProjectEntity`.
- [x] **Operational Module Expansion**:
    - [x] Create `PayrollEntryEntity` linked to `OperationalBudget`.
    - [x] Implement salary fields (Base, Bonus, Overtime) in entity and logic.
- [x] **Validation Logic**:
    - [x] Create central `BudgetControlService`.
    - [x] Integrate into `logLiveExpenseEntry` and `logPayrollEntry`.
    - [x] Implement `logOperationalExpense` with budget validation.

## Phase 2: User Journey & UI Upgrade (Frontend)
- [x] **New Project Setup Wizard**:
    - [x] Replace simple creation form with multi-step `Modal` wizard in `projects.tsx`.
- [x] **Tabbed Project Workspace**:
    - [x] Refactor `pages/projects/[id]/overview.tsx` into a Unified Tabbed Workspace (Overview, Budget, Expenses).
- [x] **Hierarchical Selection**:
    - [x] Build `WBSSelect` component for use in expense logging forms.
    - [x] Use `WBSSelect` in the new "Log Expense" modal.

## Phase 3: Advanced Financial Features
- [x] **LPO (Commitment) Module**:
    - [x] Implement `LpoEntity` and repository to track "Committed" costs.
    - [x] Expose LPO creation endpoint.
- [x] **Tax & Retention Calculators**:
    - [x] Update `logLiveExpenseEntry` to automatically calculate WHT/VAT portions based on Project configuration.
- [x] **Operational Payroll Bot**:
    - [x] Implement `runPayrollBot` service and controller endpoint for batch monthly salary generation.

## Phase 4: Polish & Reporting
- [x] **Master Analytics**:
    - [x] Implement Project Gross Margin (PGM) tracking on backend and frontend.
    - [x] Create Cash Flow Heatmap (Inflow vs Outflow) with monthly aggregation.
- [x] **Project Inflow Tracking**:
    - [x] Implement `ProjectInflowEntity` for revenue/milestone tracking.
    - [x] Add "Log Inflow" UI and API.
    - [x] Integrate Total Inflow into Project rollup calculations.
- [x] **Export Engine**:
    - [x] Implement Multi-format Export (CSV, PDF, XLSX) for the Project Expense Journal.
- [ ] **Audit Trail Enhancement**:
    - [ ] Log every change to project "Estimated Cost" to track "Scope Creep".
