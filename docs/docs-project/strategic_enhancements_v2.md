# Strategic Enhancements v2.0: The Path to Stability

**Date:** January 10, 2026
**Version:** 2.0
**Focus:** Reliability, Security, Compelteness

---

## 1. Foundational Architecture (The "Must-Fix" P0s)

### 1.1. Implement `ClsModule` (Continuation Local Storage)
*   **The Fix for Tenancy:** Use `nestjs-cls` to store the `tenant_id` and `schema_name` for the duration of the request.
*   **Why:** It allows deep service layers (like `TypeOrmRepository`) to access the current request's context without passing `req` objects through every single function argument (which is the widespread anti-pattern currently seen in the code).
*   **Implementation:**
    *   Wrap the request in a CLS context.
    *   Use a custom `TenancyAwareRepository` that grabs the `EntityManager` associated with the current CLS context.

### 1.2. Programmatic Migrations
*   **The Fix for Tenant Creation:** Use TypeORM's `MigrationExecutor` within the `TenantService`.
*   **Why:** Ensures that every new tenant starts with a database structure that exactly matches the code's expectations.

---

## 2. Core Workflow Enabling (The P1s)

### 2.1. "Project Genesis" Wizard
*   **Enhancement:** Create a multi-step form for Project Creation.
*   **Features:**
    *   Step 1: Meta-data (Name, Dates, Client).
    *   Step 2: Budget Template Selection (Clone categories from a Master Template).
    *   Step 3: Team Assignment (Optional).
*   **Value:** Unblocks the user's primary reason for using the software.

### 2.2. Operational Expense Tracking
*   **Enhancement:** Complete the Operational Budget module.
*   **New Data Structure:**
    *   `OperationalBudget` (Header)
    *   `OperationalBudgetCategory` (Line Items)
    *   `OperationalExpense` (Transactions)
*   **Value:** transforms the module from a "Static Planner" to a "Dynamic Tracker."

---

## 3. Advanced Capabilities (Futureproofing)

### 3.1. Testing Harness
*   **Recommendation:** Install Jest and write **one** End-to-End test for the "Create Tenant -> Login -> Create Project" flow.
*   **Why:** This specific test covers the entire architectural stack (Auth, Tenancy, DB Write). If this passes, the system is fundamentally sound.

### 3.2. AI Integration
*   **Recommendation:** Keep the Python AI Agent plan.
*   **Refinement:** Build the interface first—a simple file upload endpoint that accepts a PDF and returns a raw JSON of extracted WBS items. Do not over-engineer the UI until the extraction logic is proven.

### 3.3. Reporting Dashboard
*   **Recommendation:** Focus on "Burn Rate" visualizations.
*   **Why:** Financial controllers care most about "When will we run out of money?" Visualizing this variance (Budget vs Actual / Time) is the highest-value analytic.
