# Implementation Plan v2.0: SentinelFi Rescue & Upgrade

**Objective:** Repair the broken multi-tenancy core and operationalize the key user workflows.

---

## Phase 1: Architectural Repair (The Foundation)

**Goal:** Ensure that when User A (Tenant A) makes a request, the Database **actually** reads/writes from Schema A.

### Step 1.1: Implement Request-Context Safety
*   **Action:** Install `nestjs-cls` (Continuation Local Storage for NestJS).
*   **Action:** Configure `ClsModule` globally in `app.module.ts`.
*   **Action:** Rewrite `TenancyMiddleware` to:
    1.  Extract `tenant_id` from JWT.
    2.  Determine `schema_name`.
    3.  Store `schema_name` and `tenant_id` in the CLS context.
*   **Action:** Create a custom `TenancyProvider` or Abstract Repository that retrieves the `EntityManager` **from the active CLS context** (or configures the query runner based on it) rather than using the static global connection.

### Step 2.2: Automate Tenant Migrations
*   **Action:** Update `TenantService.createTenant`.
*   **Logic:**
    ```typescript
    await queryRunner.query(\`CREATE SCHEMA "\${schemaName}"\`);
    // NEW: programmatic migration
    const schemaDataSource = ... // create temporary connection or set search path
    await schemaDataSource.runMigrations(); 
    ```

---

## Phase 2: Core Workflow Activation

**Goal:** Allow a user to actually "Start Work".

### Step 2.1: Project Creation Wizard (Frontend)
*   **Action:** Create `frontend/pages/projects/new.tsx`.
*   **UI:** Multi-step wizard:
    1.  **Project Basics:** Name, Description, Start Date, RFQ Number.
    2.  **Budget Strategy:** "Start from Scratch" vs "Use Template".
    3.  **Submit:** POST to `/projects` endpoint.
*   **Action:** Update `/projects` (list page) to include a "New Project" button linking to this wizard.

### Step 2.2: Operational Budgeting Repair (Backend)
*   **Action:** Create `OperationalExpenseEntity` (linked to `OperationalBudget`).
*   **Action:** Update `OperationalBudgetsService`:
    *   Add `logExpense(amount, category, description)`.
    *   Add validation (ensure expense <= remaining budget).
    *   Update `actual_spent` on the parent budget entry.

### Step 2.3: Operational Budgeting UI (Frontend)
*   **Action:** Create `frontend/pages/operational-budgets/[id].tsx` (Details View).
*   **UI:**
    *   Show "Budget vs Actual" progress bar.
    *   "Log Expense" button (opens Modal).
    *   List of recent expenses.

---

## Phase 3: Advanced Features & Polish

**Goal:** Add the "WOW" factor and missing enterprise features.

### Step 3.1: Dashboard Analytics
*   **Action:** Update `ProjectsService` to return `burn_rate` and `forecast_completion_cost`.
*   **UI:** Visual charts on Project Overview page.

### Step 3.2: AI WBS Extraction
*   **Action:** Implement the Python bridge (`/api/v1/ai/parse-wbs`) to allow uploading a PDF/Excel and receiving a JSON structure of WBS items.

---

## Verification Plan

For every phase, we will run:
1.  **Manual Test:** Log in as User A, Create Data. Log in as User B, Verify Data is **NOT** visible.
2.  **Unit Test:** Write Jest tests for the new `TenancyService` to ensure context propagation works.
