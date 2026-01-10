# Master Implementation Roadmap v2.0: The Rescue Plan

**Date:** January 10, 2026
**Version:** 2.0 (Corrected & Prioritized)
**Status:** **Backtracking to Phase 1 (Architecture Repair)**

---

## Executive Summary
This roadmap supersedes previous versions. It acknowledges that the "Foundational" phase was marked complete prematurely. We are effectively restarting the architectural validation to ensure the application is secure and functional.

---

## Phase 1: Architectural Repair (P0 - CRITICAL)
**Goal:** A backend that handles multi-tenancy correctly and securely.

### 1.1. Context Propagation Repair
*   [x] **Install:** `nestjs-cls@6.2.0` ✅ (January 10, 2026)
*   [x] **Refactor:** `TenancyMiddleware` to store context in CLS ✅ (Stores `TENANT_ID`, `SCHEMA_NAME`, `USER` in CLS)
*   [x] **Implement:** `TenancyAwareDataSource` ✅ (Overrides `createQueryRunner()` to set PostgreSQL `search_path` from CLS context)
*   [ ] **Verify:** Write a test case that proves `Service A` writes to `Schema A` and `Service B` writes to `Schema B` simultaneously.

### 1.2. Tenant Lifecycle Automation
*   [ ] **Refactor:** `TenantService.createTenant`.
*   [ ] **Implement:** Automatic migration execution upon tenant creation.
*   [ ] **Verify:** Create a new tenant via API, then immediately query a table in that tenant's schema.

---

## Phase 2: Unblocking Core Workflows (P1 - HIGH)
**Goal:** Deliver a usable application to the end-user.

### 2.1. Project Creation System
*   [ ] **Frontend:** Create `frontend/pages/projects/new.tsx` (Wizard).
*   [ ] **Backend:** Ensure `ProjectsService.create` connects WBS Templates correctly.
*   [ ] **UI:** Link "New Project" button on Dashboard.

### 2.2. Operational Budgeting System
*   [ ] **Database:** Create entries for `OperationalExpenseEntity` and `OperationalBudgetCategoryEntity`.
*   [ ] **Backend:** Implement `logExpense` logic in `OperationalBudgetsService`.
*   [ ] **Frontend:** Build "Budget Details" page with Expense Logging Modal.

---

## Phase 3: Commercialization & Polish (P2 - MEDIUM)
**Goal:** Ready for public launch.

### 3.1. Public Onboarding
*   [ ] **Frontend:** Public Landing Page.
*   [ ] **Backend:** Stripe Integration.
*   [ ] **Logic:** Webhook listener creates Tenant (using the robust Phase 1 logic).

### 3.2. Advanced Reporting
*   [ ] **Frontend:** Dashboard Burn-down charts.
*   [ ] **Backend:** Analytics Aggregation Endpoints.

---

## Phase 4: Enterprise Features (P3 - LOW)

### 4.1. Audit & Support
*   [ ] **Already Implemented:** Audit Logging (Verified).
*   [ ] **New:** Support Impersonation Mode.

### 4.2. AI Automation
*   [ ] **Integration:** Connect functionality to Python AI service for WBS parsing.
