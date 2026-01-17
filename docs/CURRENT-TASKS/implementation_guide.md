# SentinelFi SuperAdmin Implementation Guide & Roadmap

## Overview
This document outlines the detailed plan to bring the SentinelFi SuperAdmin frontend pages to a production-ready state, integrating them with the necessary backend APIs and enhancing functionality. This plan is based on a comprehensive audit of the current codebase (January 10, 2026) and addresses discrepancies with previous documentation.

**Important Note:** The most critical underlying blocker is the **PENDING Backend Phase 1.2 "Tenant Lifecycle Automation" (automatic migration execution upon tenant creation)**. While frontend tasks will proceed, full functional readiness of tenant creation features is dependent on this backend fix.

---

## Phase 1: Backend Critical Blocker Resolution (Highest Priority)

- [x] **Task 1.1: Implement Tenant Lifecycle Automation**
    - **Description**: Implement programmatic TypeORM migration execution upon new tenant creation in the backend. This ensures that when a SuperAdmin creates a new tenant, its database schema is automatically set up with all necessary tables.
    - **Location**: `backend/src/tenants/tenant.service.ts` and potentially related `scripts/` or `database/` modules.
    - **Dependencies**: This is a prerequisite for a fully functional "Create Tenant" process from the frontend.
    - **Status**: Completed

---

## Phase 2: Frontend SuperAdmin Enhancements (Iterative & API-Driven)

This phase will focus on each SuperAdmin page, replacing mock data with real API calls and adding advanced features. Each page will be considered "completed" only after its full functionality is implemented and verified.

### 2.1. SuperAdmin Dashboard (`/super/index.tsx`)

- [x] **Task 2.1.1: Implement Backend API for System Health Metrics**
    - **Description**: Create a new backend API endpoint (e.g., `/super/dashboard/system-health`) to provide real-time or near real-time data for CPU usage, memory usage, DB connections, and uptime.
    - **Location**: `backend/src/superadmin/` or a new `backend/src/system-metrics/`.
    - **Status**: Completed
- [x] **Task 2.1.2: Implement Backend API for Total Users Across All Tenants**
    - **Description**: Create a backend API endpoint (e.g., `/super/dashboard/total-users`) to accurately count all users across all tenant schemas.
    - **Location**: `backend/src/superadmin/`
    - **Status**: Completed
- [x] **Task 2.1.3: Implement Backend API for MRR Estimate**
    - **Description**: Create a backend API endpoint (e.g., `/super/dashboard/mrr-estimate`) to calculate and provide a Monthly Recurring Revenue (MRR) estimate. This will likely integrate with a billing service.
    - **Location**: `backend/src/superadmin/` or `backend/src/billing/`.
    - **Status**: Completed
- [x] **Task 2.1.4: Integrate Real Data into Frontend Dashboard**
    - **Description**: Update `frontend/pages/super/index.tsx` to fetch and display data from the newly implemented backend APIs for System Load, Total Users, and MRR Estimate. Replace all mock data.
    - **Location**: `frontend/pages/super/index.tsx`
    - **Status**: Completed
- [x] **Task 2.1.5: Enhance Tenant Growth Chart with Backend Data**
    - **Description**: Refine the tenant growth chart to use entirely real data, potentially adding filtering by time range. Ensure the "+X% vs last month" metric is dynamic.
    - **Location**: `frontend/pages/super/index.tsx`
    - **Status**: Completed
- [x] **Task 2.1.6: Integrate Real Audit Log Data into Recent Activity Feed**
    - **Description**: Update the "Recent Activity" widget to fetch a small, recent subset of real audit logs from `/admin/audit/logs`, replacing mock data.
    - **Location**: `frontend/pages/super/index.tsx`
    - **Status**: Completed

### 2.2. SuperAdmin Tenant Management (`/super/tenants.tsx`)

- [x] **Task 2.2.1: Implement Backend API for "Impersonate Admin"**
    - **Description**: Create a backend API endpoint (e.g., `POST /super/tenants/:id/impersonate`) that generates a temporary, auditable token allowing the SuperAdmin to impersonate a tenant's admin. This token would likely be used for a redirect to the tenant's dashboard.
    - **Location**: `backend/src/superadmin/`
    - **Status**: Completed
- [x] **Task 2.2.2: Implement Backend API for "Manage Plan"**
    - **Description**: Create backend API endpoints to manage a tenant's subscription plan (e.g., `GET /super/tenants/:id/plan`, `PATCH /super/tenants/:id/plan`). This will integrate with the billing service.
    - **Location**: `backend/src/superadmin/` or `backend/src/billing/`.
    - **Status**: Completed
- [x] **Task 2.2.3: Integrate Frontend "Impersonate Admin" Functionality**
    - **Description**: Update `frontend/pages/super/tenants.tsx` to integrate the "Impersonate Admin" button with the new backend API. This would involve handling the generated impersonation token (e.g., redirecting the SuperAdmin to the tenant's view with the temporary token).
    - **Location**: `frontend/pages/super/tenants.tsx`
    - **Status**: Completed
- [x] **Task 2.2.4: Integrate Frontend "Manage Plan" Functionality**
    - **Description**: Update `frontend/pages/super/tenants.tsx` to integrate the "Manage Plan" button with the new backend API. This could involve opening a modal or redirecting to a dedicated plan management page.
    - **Location**: `frontend/pages/super/tenants.tsx`
    - **Status**: Completed
- [x] **Task 2.2.5: Enhance Tenant Details View**
    - **Description**: Add functionality to view more detailed information about a tenant, possibly a dedicated "View Details" page or an expandable row in the table.
    - **Location**: `frontend/pages/super/tenants.tsx`
    - **Status**: Pending

### 2.3. SuperAdmin Global Analytics (`/super/analytics.tsx`)

- [x] **Task 2.3.1: Implement Backend APIs for Global Analytics Data**
    - **Description**: Create backend APIs to provide real data for monthly tenant/user growth, plan distribution, and system performance metrics (e.g., `/super/analytics/growth`, `/super/analytics/plans`, `/super/analytics/performance`).
    - **Location**: `backend/src/superadmin/` or a new `backend/src/analytics/`.
    - **Status**: Completed
- [x] **Task 2.3.2: Integrate Real Data into Frontend Analytics Page**
    - **Description**: Update `frontend/pages/super/analytics.tsx` to fetch and display data from the newly implemented backend APIs for all charts. Replace all mock data.
    - **Location**: `frontend/pages/super/analytics.tsx`
    - **Status**: Completed
- [x] **Task 2.3.3: Implement Time Range Filtering**
    - **Description**: Add functional time range filtering (e.g., 1m, 3m, 6m, 1y) to the frontend analytics page, dynamically updating chart data based on user selection.
    - **Location**: `frontend/pages/super/analytics.tsx`
    - **Status**: Completed

### 2.4. SuperAdmin Billing & Revenue (`/super/billing.tsx`)

- [x] **Task 2.4.1: Implement Backend APIs for Billing Overview**
    - **Description**: Create backend APIs to provide real data for Total MRR, Active Subscriptions, and Pending Invoices. This will likely integrate with Stripe or a similar billing provider.
    - **Location**: `backend/src/billing/`
    - **Status**: Completed
- [x] **Task 2.4.2: Implement Backend APIs for Recent Invoices**
    - **Description**: Create backend APIs to fetch a list of recent invoices, including details like ID, tenant, amount, date, and status.
    - **Location**: `backend/src/billing/`
    - **Status**: Completed
- [x] **Task 2.4.3: Implement Backend API for Invoice Download**
    - **Description**: Create a backend API endpoint (e.g., `GET /super/billing/invoices/:id/download`) to retrieve a specific invoice document.
    - **Location**: `backend/src/billing/`
    - **Status**: Completed
- [x] **Task 2.4.4: Integrate Real Data into Frontend Billing Page**
    - **Description**: Update `frontend/pages/super/billing.tsx` to fetch and display data from the newly implemented backend APIs for revenue overview and recent invoices. Replace all mock data.
    - **Location**: `frontend/pages/super/billing.tsx`
    - **Status**: Completed
- [x] **Task 2.4.5: Implement Frontend Invoice Download Functionality**
    - **Description**: Update `frontend/pages/super/billing.tsx` to integrate the "Download" buttons with the backend API for invoice retrieval.
    - **Location**: `frontend/pages/super/billing.tsx`
    - **Status**: Completed

### 2.5. SuperAdmin System Configuration (`/super/settings.tsx`)

- [x] **Task 2.5.1: Implement Backend APIs for Global System Settings**
    - **Description**: Create backend APIs (e.g., `GET /super/settings`, `PUT /super/settings`) to fetch and update global configurations such as Maintenance Mode, Allow New Registrations, Default Quotas, and SMTP settings.
    - **Location**: `backend/src/settings/`
    - **Status**: Completed
- [x] **Task 2.5.2: Integrate Real Data and Save Functionality into Frontend Settings Page**
    - **Description**: Update `frontend/pages/super/settings.tsx` to fetch and display actual global settings from the backend. Implement the save functionality to update these settings via the new backend APIs, replacing mock state and simulated saves.
    - **Location**: `frontend/pages/super/settings.tsx`
    - **Status**: Completed
- [x] **Task 2.5.3: Implement Backend API for "Send Test Email"**
    - **Description**: Create a backend API endpoint (e.g., `POST /super/settings/test-email`) that sends a **simulated** test email using the configured SMTP settings. This is for configuration testing only.
    - **Location**: `backend/src/settings/`
    - **Status**: Completed (Simulated)
- [x] **Task 2.5.4: Integrate Frontend "Send Test Email" Functionality**
    - **Description**: Update `frontend/pages/super/settings.tsx` to integrate the "Send Test Email" button with the backend API.
    - **Location**: `frontend/pages/super/settings.tsx`
    - **Status**: Completed
- [x] **Task 2.5.5: Implement Production-Ready Email Sending System**
    - **Description**: Refactor the email sending mechanism to use a real email service provider (ESP) API or library, implement email templating, robust error handling, retry mechanisms, and asynchronous sending for critical communications like tenant/employee onboarding.
    - **Location**: `backend/src/settings/` or a new `backend/src/email/`
    - **Status**: Completed (Now using Resend. All backend TypeScript compilation errors have been resolved. This involved fixing issues across `settings`, `dashboard`, `email`, `notifications`, `superadmin` (controller and service), `auth.service.spec.ts`, and `wbs` (controller and service) modules.)

### 2.6. SuperAdmin Audit Log (`/super/audit-log.tsx`)

- [ ] **Task 2.6.1: Implement Frontend Date Range Filtering**
    - **Description**: Add a date range picker component to `frontend/pages/super/audit-log.tsx` to allow users to filter audit logs by a specific time period. Integrate this with the backend's `dateRangeDto` parameter.
    - **Location**: `frontend/pages/super/audit-log.tsx`
    - **Status**: Pending
- [ ] **Task 2.6.2: Refine Frontend User Filtering for Audit Logs**
    - **Description**: Ensure the `userFilter` on the frontend correctly translates user input (e.g., email) into a format the backend expects (`userId` or potentially a search by email on the backend).
    - **Location**: `frontend/pages/super/audit-log.tsx`
    - **Status**: Pending

---

## Phase 3: General Enhancements & Security

- [ ] **Task 3.1: Address `TenantController.deleteTenant` Security**
    - **Description**: Review and restrict access to `DELETE /api/v1/admin/tenants/:id` to `SuperAdmin` role only, or implement robust logic in `TenantService` to prevent non-SuperAdmins from deleting tenants they shouldn't.
    - **Location**: `backend/src/tenants/tenant.controller.ts`, `backend/src/tenants/tenant.service.ts`
    - **Status**: Pending
- [ ] **Task 3.2: Create and Test Initial SuperAdmin-Specific Unit/Integration Tests**
    - **Description**: Implement unit and integration tests for the new backend APIs (System Health, Total Users, MRR, Impersonation, Billing, Global Settings).
    - **Location**: `backend/src/superadmin/**/*.spec.ts`, `backend/src/billing/**/*.spec.ts`, etc.
    - **Status**: Pending
- [ ] **Task 3.3: Frontend End-to-End Tests for SuperAdmin Workflow**
    - **Description**: Implement end-to-end tests for critical SuperAdmin workflows (e.g., Login as SuperAdmin -> Create Tenant -> Verify Tenant appears in list -> Navigate to SuperAdmin Dashboard).
    - **Location**: `frontend/e2e/` (if Cypress/Playwright is set up).
    - **Status**: Pending

---

## Testing & Verification Protocol

After each task, especially for backend implementations, `tsc` will be run on both `backend` and `frontend` to check for type errors. Unit and integration tests (once implemented) will also be run. Frontend changes will be visually inspected. Once verified, the corresponding checkbox in this document will be marked as completed.