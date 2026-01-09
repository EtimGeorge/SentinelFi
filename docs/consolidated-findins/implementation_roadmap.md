# SentinelFi - Consolidated Implementation Roadmap

**Version:** 1.1
**Date:** January 9, 2026
**Status:** Reconciled with PRD & Senior Dev Report

---

## Executive Summary

This document outlines a phased implementation plan for SentinelFi, integrating findings from the codebase analysis and detailed checklists. The roadmap is structured to first solidify the application's foundation by addressing critical architectural weaknesses, security vulnerabilities, and production-readiness gaps. Following this, it prioritizes the completion of core, currently non-functional user workflows, and then moves into implementing new, high-value features and enhancing existing capabilities. This phased approach aims to evolve SentinelFi into a stable, functional, and feature-rich financial planning and control platform.

---

## Phase 1: Foundational Administration & Architectural Hardening (P0 - Critical)

*This phase combines the PRD's "Phase 1: Foundational Administration" and "Admin Audit & Session History," along with critical architectural and security hardening tasks, many of which are now **COMPLETED**.*

### 1.1. Core Backend Refactoring & Cleanup

*   **Objective**: Resolve all initial backend compilation errors, unify export return types, and fix core service logic.
*   **Status**: ✅ **[COMPLETED]** (Per Senior Dev Report: Phase 1-5, Phase 5.5)
*   **Tasks**:
    *   ✅ Unify Export Return Types: All `export...ToFormat` methods in `operational-budgets`, `projects`, `wbs` services now consistently return `Promise<Buffer>`.
    *   ✅ Fix `wbs.service.ts` Logic: Corrected destructuring from `GetProjectsDto` and query logic in `findAllProjects`, usage of `VarianceFlag` enum, and CSV escaping issues.
    *   ✅ Correct `get-live-expenses.dto.ts`: Ensured `startDate` and `endDate` properties are correctly present.
    *   ✅ Fixed Frontend `Module not found`: Corrected import path for `useSecuredApi` in `frontend/pages/projects.tsx`.

### 1.2. New Backend Bugs & Architectural Enhancements

*   **Objective**: Address critical architectural flaws and implement core multi-tenancy and security components.
*   **Status**: ✅ **[COMPLETED]** (Per Senior Dev Report)
*   **Tasks**:
    *   ✅ `SuperAdminModule` Not Found: Added missing import in `app.module.ts`.
    *   ✅ `AuthService.createTenantUser` Parameter Type / DTO Mismatch: Updated `UserEntity`, `shared/types/user.ts` (User, CreateUserDto, UpdateUserDto) with `first_name`, `last_name`, `is_active`. Fixed `auth.service.ts`'s `createTenantUser` `usersRepository.create()` call and `savedUser` typing. Imported `DeepPartial`.
    *   ✅ `TenantEntity` ID Mismatch: Fixed `backend/src/common/guards/tenancy.guard.ts` to use `tenant_id`. Fixed `backend/src/tenants/tenant.service.ts` to use `tenant_id` and updated DTO imports. Fixed `superadmin.service.ts` (`unknown` error) with type guards.
    *   ✅ Missing Module Imports for SuperAdmin: Fixed `backend/src/superadmin/superadmin.controller.ts` imports for `RolesGuard` and `Roles`. Fixed `backend/src/superadmin/superadmin.service.ts` import for `CreateUserDto`.
    *   ✅ Private Method Access: Removed `generateRandomPassword()` call from `superadmin.service.ts`, aligning with `AuthService.createTenantUser` internal password generation.
    *   ✅ `tenant.controller.ts` DTO Mismatch: Cleaned up `tenant.controller.ts` by removing conflicting `createTenant` method and DTO imports, and adjusted `@Roles` decorator.
    *   ✅ Database Schema Alignment & Multi-Tenancy Foundation: Resolved persistent TypeORM migration issues by cleaning `init.sql`, performing full DB reset, and applying clean baseline migration (`CreateClientTemplateSchema`).
    *   ✅ Role-Based Tenant Assignment & Security: `auth.service.ts` updated to enforce SuperAdmin-only manipulation of `tenant_id`. Frontend (`frontend/pages/admin/users.tsx`) UI conditionally disables tenant assignment dropdown for non-SuperAdmins.
    *   ✅ SuperAdmin Login & Redirection: `auth.service.ts` populates `isSuperAdmin` flag. `AuthContext.tsx` handles secure redirection to `/super/tenants`. `frontend/pages/super/tenants.tsx` implemented.
    *   ✅ Automated Tenant Schema Provisioning: `tenant-schema-template.sql` created. `TenantProvisioningService` created and integrated into `SuperAdminService.createTenant`.
    *   ✅ Centralized Tenancy Middleware: `backend/src/common/middleware/tenancy.middleware.ts` re-implemented for dynamic `search_path`. `app.module.ts` configured for global middleware. `backend/src/common/guards/tenancy.guard.ts` simplified.

### 1.3. PRD Feature 1.1: SuperAdmin Manual Tenant Creation

*   **Objective**: Implement core SuperAdmin functionality for tenant creation and management.
*   **Status**: ✅ **[COMPLETED]** (Per PRD and Senior Dev Report)
*   **Tasks**:
    *   ✅ **Backend:** `SuperAdminModule` (Controller, Service, DTOs, Entity enhancements) is fully implemented.
    *   ✅ **UI:** Created new page `/super/tenants` with role-based access.
    *   ✅ **UI:** Implemented table for listing tenants.
    *   ✅ **UI:** Implemented "Create New Tenant" button and modal form.

### 1.4. PRD Feature 1.2: Enhanced User Management for Tenant Assignment

*   **Objective**: Enhance user management to allow SuperAdmins to assign tenants to users.
*   **Status**: ✅ **[COMPLETED]** (Per PRD and Senior Dev Report)
*   **Tasks**:
    *   ✅ **Backend:** `auth.service.ts`'s `updateUser` method updated to handle saving the `tenant_id`.
    *   ✅ **Backend:** `PATCH /auth/users/:id` request payload correctly processed.
    *   ✅ **Backend:** `auth.service.ts` updated to include `tenant_name` in `findAllUsers` and `createUser` responses.
    *   ✅ **Backend:** `admin-user.dto.ts` updated to include `tenant_id` and `tenant_name`.
    *   ✅ **Frontend:** `handleSaveUser` in `frontend/pages/admin/users.tsx` updated to send `tenant_id` in update payload.
    *   ✅ **UI:** "Tenant" dropdown functional in "Edit" mode on the `/admin/users` page.

### 1.5. PRD New Feature: Admin Audit & Session History

*   **Objective**: Introduce comprehensive audit logging and a UI for review.
*   **Status**: ✅ **[COMPLETED]** (Per PRD and Senior Dev Report)
*   **Tasks**:
    *   ✅ **Backend:** New table `audit_log` created in `public` schema (id, timestamp, userId, userEmail, action, targetType, targetId, details, ipAddress).
    *   ✅ **Backend:** New `AuditModule` and `AuditService` created (`logEvent` method).
    *   ✅ **Backend:** `AuditService` integrated into `AuthService`, `TenantService`, `TenancyMiddleware` for logging events.
    *   ✅ **Backend:** New `AuditController` created with `GET /api/v1/admin/audit-log` endpoint (protected by `Admin`/`SuperAdmin` roles, supports pagination/filtering).
    *   ✅ **Frontend:** New page at `/admin/audit-log` created (accessible to `Admin`/`SuperAdmin`).
    *   ✅ **Frontend:** UI controls for filtering (Date range, User Email, Action Type) implemented.
    *   ✅ **Frontend:** Data displayed in a clear, paginated table view and a bar chart for events per day.

### 1.6. Testing: Integrate a Full Test Suite & CI/CD (Initial Setup)

*   **Objective**: Establish a comprehensive testing framework and automated pipeline for quality assurance.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Add and configure Jest for backend (unit/integration) and frontend (unit) packages.
    *   [ ] Add and configure Cypress or Playwright for End-to-End (E2E) testing.
    *   [ ] Write initial unit tests for a critical backend service (e.g., `AuthService`).
    *   ✅ Write initial unit tests for a critical frontend component (e.g., `LoginForm`).
    *   [ ] Write a single E2E test for the login flow.
    *   [ ] Configure a CI/CD pipeline (e.g., using GitHub Actions) to run linting and all tests automatically on every push.

### 1.7. Frontend Core: Standardize API & State Management

*   **Objective**: Improve frontend performance, maintainability, and user experience through consistent data handling.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Create a centralized Axios (or fetch) instance for all frontend API calls.
    *   [ ] Refactor all existing `fetch` calls in components and pages to use the new instance.
    *   [ ] Integrate `TanStack Query` (React Query) and wrap the `_app.tsx` with its provider.
    *   [ ] Refactor the CEO Dashboard's data fetching logic to use the `useQuery` hook.

### 1.8. Security: Harden Roles & Access Control

*   **Objective**: Ensure strict type safety and robust access control enforcement across the application.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Perform a full audit of all backend API routes, ensuring the correct `Roles` guards are applied where appropriate.
    *   [ ] Refactor frontend components to conditionally render UI elements (links, buttons, pages) based on the user's role from the `AuthContext` to prevent unauthorized visibility.
    *   [ ] Replace all instances of `any` in backend controllers (`e.g., @Req() req: any`) with strongly-typed request objects, ideally using `AuthenticatedRequest`.
    *   [ ] Ensure all DTOs used for `update` operations (e.g., `UpdateWbsCategoryDto`) correctly use `@IsOptional()` decorators for fields that are not always provided.

---

## Phase 2: Core Workflow Completion & Tenant Self-Management (P0 - Critical)

*This phase integrates the critical missing core workflows from findings with the PRD's "Phase 2: Tenant Self-Management" features.*

### 2.1. Backend: Implement Operational Expense Module

*   **Objective**: Enable tracking and management of expenses against operational budgets.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Create `operational-budget-category.entity.ts`.
    *   [ ] Create `operational-expense.entity.ts`.
    *   [ ] Update `operational-budgets.service.ts` to manage categories and expenses (add `createCategory`, `logExpense`, `approveExpense`, `rejectExpense`, `getExpensesForBudget` methods, and logic to aggregate approved expenses into `actual_spent`).
    *   [ ] Create a new `operational-expenses.controller.ts`.

### 2.2. Frontend: Build Operational Budgeting UI

*   **Objective**: Provide a complete user interface for managing operational budgets and expenses.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Create a page at `/operational-budgets/create` for making new annual/quarterly budgets.
    *   [ ] Create a details page `/operational-budgets/{id}`.
    *   [ ] On the details page, implement a UI to add/edit/delete `OperationalBudgetCategories`.
    *   [ ] Implement a modal or form to log a new `OperationalExpense` against a category.
    *   [ ] Display a table of expenses for each category, showing their status.

### 2.3. Frontend: Build Project Creation & WBS Drafting User Journey

*   **Objective**: Enable users to create new projects and draft their WBS budgets via a guided flow.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Create a dedicated "Create Project" wizard/page at `/projects/new`.
    *   [ ] Add a "Create Project" button to the `/projects` page to link to the new wizard.
    *   [ ] The wizard should have steps for Project Details and choosing a WBS Template (from `/wbs/categories`).
    *   [ ] On successful project creation, redirect the user to a new project-specific budgeting page: `/projects/{newProjectId}/budget`.
    *   [ ] Create the project-specific budgeting page at `frontend/pages/projects/[id]/budget.tsx` with UI controls for adding, editing, and deleting WBS nodes and assigning budget amounts.

### 2.4. Frontend: Fix Broken Project Link & Create Overview Page

*   **Objective**: Provide a functional entry point for project-specific information.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Create the project overview page at `frontend/pages/projects/[id]/overview.tsx`.
    *   [ ] This page will serve as the main dashboard for a single project. Initially, it can display project details and link to the new budget page.

### 2.5. Backend: Code Cleanup

*   **Objective**: Remove redundant and confusing logic.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **Action:** Delete the `findAllProjects` method from `wbs.service.ts`.
    *   **Justification:** It is redundant and confusing. All project lookups should be done through `projects.service.ts`.

### 2.6. PRD Feature 2.1: User Invitation System

*   **Objective**: Implement a user-friendly system for Tenant Admins to invite new users.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **UI:** Add an "Invite User" button and modal to the `/admin/users` page for Tenant Admins.
    *   [ ] **Backend:** Create a new endpoint `POST /users/invite` to generate a secure invitation token.
    *   [ ] **Frontend:** Update the `/register` page to handle the `invitation_token` from the URL.

### 2.7. PRD Feature 2.2: Tenant-Specific Settings

*   **Objective**: Allow Tenant Admins to manage tenant-level configurations.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **UI:** Create a new `/settings/tenant` page for Tenant Admins.
    *   [ ] **Backend:** Create endpoints to manage tenant-level settings (e.g., company name, billing details).

---

## Phase 3: Public Onboarding & Commercialization (PRD Phase 3)

*This phase focuses on the features required to enable self-service onboarding for new tenants and full commercialization of the platform.*

### 3.1. PRD Feature 3.1: Marketing & Pricing Pages

*   **Objective**: Provide public-facing pages for product discovery and subscription choices.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **UI:** Create a new public-facing landing page (`/`).
    *   [ ] **UI:** Create a `/pricing` page with subscription tiers.

### 3.2. PRD Feature 3.2: Stripe Integration & Checkout

*   **Objective**: Implement a secure and automated payment processing system.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **UI:** Implement a checkout form using Stripe Elements.
    *   [ ] **Backend:** Create endpoints to manage the Stripe Checkout Session.
    *   [ ] **Backend:** Implement a webhook endpoint `POST /stripe-webhook` to receive events from Stripe.

### 3.3. PRD Feature 3.3: Automated Tenant Provisioning

*   **Objective**: Automate the creation and setup of new tenant environments upon successful subscription.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **Backend:** Create a `provisionNewTenant` service triggered by the Stripe webhook.
    *   [ ] **Backend:** The service should automate tenant and user creation as specified in `PRD Section 3.1` (New Tenant Self-Service Onboarding Flow).

---

## Phase 4: Advanced Security & Enterprise Features (PRD Phase 4)

*This phase introduces advanced security features and capabilities typically required for enterprise environments.*

### 4.1. PRD Feature 4.1: Audited Support Impersonation

*   **Objective**: Develop a secure and auditable mechanism for SuperAdmins to impersonate tenant users for support.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] **UI (SuperAdmin):** Add a "Start Support Session" button to the SuperAdmin tenant dashboard.
    *   [ ] **UI (Tenant Admin):** Implement a notification and approval modal for support requests.
    *   [ ] **Backend:** Develop the system for generating and validating short-lived impersonation JWTs.
    *   [ ] **Backend:** Ensure all impersonated actions are logged to the `audit_log` table.

---

## Phase 5: Enhancements & Polish (Ongoing)

*This phase includes general enhancements, UI/UX improvements, and remaining architectural tasks not directly tied to specific PRD phases.*

### 5.1. Feature: AI-Powered WBS Extraction

*   **Objective**: Automate WBS creation from documents.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Define a clear API contract between the NestJS backend and the Python AI agent.
    *   [ ] Create a new backend module (`AiBridgeModule`?) to handle communication with the Python service.
    *   [ ] Implement the logic in `tenant.service.ts` to call the AI agent for WBS extraction.
    *   [ ] Build a frontend UI component that allows a user to upload a document and review the extracted WBS data before saving.

### 5.2. Feature: User Profile & Settings Page (General)

*   **Objective**: Provide a standard user profile and settings interface beyond tenant-specific settings.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Build the UI for the `/settings` page (general user settings).
    *   [ ] Implement the backend endpoints for updating user information (name, password).
    *   [ ] Connect the frontend UI to the backend APIs.

### 5.3. Feature: Real-Time Notification System

*   **Objective**: Enhance user engagement and awareness.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Integrate the `NotificationsGateway` with key business services (`AuthService`, `TenantService`, `WbsService`).
    *   [ ] Implement the frontend client to connect to the WebSocket gateway.
    *   [ ] Create a "Notification Bell" component in the UI to display recent, real-time notifications.

### 5.4. Feature: Global Search

*   **Objective**: Improve usability by allowing quick access to information.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Implement the backend `SearchModule` (choosing a search strategy, e.g., multi-table `ILIKE` queries).
    *   [ ] Create a global search bar component in the frontend layout.
    *   [ ] Display search results in a unified, easy-to-navigate format.

### 5.5. Backend: Granular RBAC

*   **Objective**: Implement a more detailed and flexible role-based access control system.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Design and implement a more detailed role system (e.g., using a `ProjectUserLink` entity that maps a `User` to a `Project` with a specific `Role` like `ProjectManager`, `TeamMember`).
    *   [ ] Update API guards (`@UseGuards`) across all relevant controllers to check these granular permissions.

### 5.6. Frontend: Role-Based UI Rendering

*   **Objective**: Dynamically adapt the UI based on the user's granular permissions.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Conditionally render UI elements (links, buttons, pages) based on the user's role (e.g., hide "Approve" buttons for `TeamMember` if they lack approval rights).

### 5.7. Backend: Analytics Endpoints

*   **Objective**: Provide data for advanced financial analytics and reporting.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] In `projects.service.ts`, create an endpoint to get data for a burn-down chart (e.g., cumulative actual spend per day/week).
    *   [ ] In `wbs.service.ts`, create an endpoint to get a summary of spending by top-level WBS category for a project.

### 5.8. Frontend: Project Dashboard Enhancements (General)

*   **Objective**: Enhance the `/projects/[id]/overview.tsx` page with insightful visualizations.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] On the `/projects/[id]/overview.tsx` page, add new components for:
        *   A line chart for budget burn-down (using a library like Recharts or Chart.js).
        *   A pie chart for expense breakdown by category.

### 5.9. Backend/Frontend: PDF/CSV Exports

*   **Objective**: Provide comprehensive and richly formatted export capabilities.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Enhance the existing export utilities (`pdf.utility.ts`, `word.utility.ts`, `excel.utility.ts`) to produce more richly formatted and detailed reports.
    *   [ ] Add more "Export" buttons throughout the UI for relevant data.

### 5.10. Frontend Styling & Layout Enhancements (PRD Phase 6)

*   **Objective:** Apply the requested styling improvements for a more polished UI.
*   **Status:** [ ] **PENDING** (Per Senior Dev Report)
*   **Task:** Implement a consistent border, padding, and margin strategy for page layouts and components.

### 5.11. Advanced PDF Generation Refactor (PRD Phase 7)

*   **Objective:** Improve the performance and architecture of the PDF generation utility.
*   **Status:** [ ] **PENDING** (Per Senior Dev Report)
*   **Task:** Refactor `pdf.utility.ts` to calculate total pages *before* rendering the document, avoiding the current inefficient final loop.

### 5.12. UI/UX Polish (General)

*   **Objective**: Refine the overall user interface and experience.
*   **Status**: [ ] **PENDING**
*   **Tasks**:
    *   [ ] Fix all minor UI placeholders and inconsistencies noted in the findings report.
    *   [ ] Implement a global error boundary in `_app.tsx` to handle uncaught exceptions gracefully.
    *   [ ] Enhance the `SummaryCard` to show trend indicators.
    *   [ ] Improve the design of the `unauthorized` page.
    *   [ ] Clean up unused files and code (`uiStore.ts`, legacy `api.js`).