# Product Requirements Document: SentinelFi Multi-Tenancy, Administration, and Onboarding

**Version:** 1.0
**Date:** 2026-01-02
**Status:** In Progress

---

## 1.0 Introduction & Vision

This document outlines the requirements for transforming SentinelFi from a single-instance application into a scalable, secure, and commercially viable multi-tenant Software as a Service (SaaS) platform.

The vision is to create a system where multiple client companies ("Tenants") can operate in complete data isolation, manage their own users, and subscribe to the service, while a master administrator ("Landlord") can manage the platform and its tenants. This architecture is the foundation for all future growth and commercialization efforts.

---

## 2.0 User Personas & Roles

### 2.1 The Landlord (SentinelFi `SuperAdmin`)
-   **Who:** A SentinelFi employee responsible for platform operations.
-   **Core Needs:**
    -   View all active tenants on the platform.
    -   Manually create, suspend, and manage tenant accounts.
    -   Monitor overall platform health.
    -   Securely assist tenants with support issues without compromising their data privacy.
-   **Does NOT Need:** Direct, unsolicited access to a tenant's private financial data.

### 2.2 The Tenant Admin (Client's Admin)
-   **Who:** The primary contact at a client company. This is the user who initially subscribes or is first assigned administrative rights for their company.
-   **Core Needs:**
    -   Manage their company's subscription and billing details.
    -   Invite new users from their company to the platform.
    -   Assign and manage roles for users within their own tenant.
    -   Manage tenant-wide settings.
-   **Permissions:** Has full control over their own tenant's users and settings. Can be a `CEO`, `Admin`, or `ITHead` role.

### 2.3 The Tenant User
-   **Who:** An employee of a client company (e.g., CEO, Finance user, Project User).
-   **Core Needs:**
    -   Access the core financial tools (Dashboards, WBS Manager, Expense Tracker) for their company only.
    -   Collaborate with other users from their own company.
-   **Permissions:** Their actions are confined entirely within their company's tenant data. They have no visibility of other tenants.

### 2.4 The Prospective Customer
-   **Who:** An anonymous visitor to the SentinelFi public website.
-   **Core Needs:**
    -   Understand what SentinelFi does and its value proposition.
    -   View pricing and subscription options.
    -   Sign up for the service and become the first Tenant Admin for their company.

---

## 3.0 Core User Flows & Journeys

### 3.1 New Tenant Self-Service Onboarding Flow
1.  **Discovery:** A Prospective Customer lands on the public SentinelFi marketing page.
2.  **Evaluation:** They navigate to the `/pricing` page and select a subscription tier.
3.  **Checkout:** They click "Subscribe" and are taken to a checkout form (powered by Stripe) where they enter their company name, email, and payment details.
4.  **Provisioning:** Upon successful payment, the backend automatically:
    a. Creates a new `tenant` record.
    b. Creates a new, isolated database schema for that tenant.
    c. Creates a new `user` record for the subscriber, assigns them the `Admin` role, and links them to the new `tenant_id`.
5.  **First Login:** The new Tenant Admin receives a "Welcome" email with a link to set their password and log in for the first time.

### 3.2 New User Invitation Flow (Tenant-Driven)
1.  **Initiation:** A Tenant Admin logs into SentinelFi and navigates to the "User Management" page.
2.  **Invitation:** They click "Invite User" and enter the new user's email address and assign them a role (e.g., `CEO`, `Finance`).
3.  **Email & Token:** The backend generates a unique invitation token and sends an email to the invitee.
4.  **Registration:** The invitee clicks the link in the email, which takes them to a registration page with their email pre-filled. The invitation token is passed in the URL.
5.  **Activation:** The new user sets their password. The backend validates the token and creates the user account, automatically associating it with the correct tenant.

---

## 4.0 Phased Feature Implementation

### Phase 1: Foundational Administration (Immediate Priority)

- [ ] **Feature 1.1: SuperAdmin Manual Tenant Creation**
    - [ ] **UI:** Create a new page at `/super/tenants`, accessible only to `SuperAdmin` roles.
    - [ ] **UI:** The page should contain a table listing all tenants.
    - [ ] **UI:** Implement a "Create New Tenant" button and form.
    - [ ] **Backend:** Create a `SuperAdminController` with a `POST /super/tenants` endpoint.
    - [ ] **Backend:** Implement `GET /super/tenants` and `PATCH /super/tenants/:id` endpoints.
- [x] **Feature 1.2: Enhanced User Management for Tenant Assignment**
    - [x] **UI:** Make the "Tenant" dropdown functional in the "Edit" mode on the `/admin/users` page.
    - [x] **Backend:** Update `auth.service.ts`'s `updateUser` method to handle saving the `tenant_id`.
    - [x] **Backend:** Ensure the `PATCH /auth/users/:id` request payload is correctly processed.
    - [x] **Backend:** Updated `auth.service.ts` to include `tenant_name` in `findAllUsers` and `createUser` responses.
    - [x] **Backend:** Updated `admin-user.dto.ts` to include `tenant_id` and `tenant_name`.
    - [x] **Frontend:** Updated `handleSaveUser` in `frontend/pages/admin/users.tsx` to send `tenant_id` in update payload.

### Phase 2: Tenant Self-Management

- [ ] **Feature 2.1: User Invitation System**
    - [ ] **UI:** Add an "Invite User" button and modal to the `/admin/users` page for Tenant Admins.
    - [ ] **Backend:** Create a new endpoint `POST /users/invite` to generate a secure invitation token.
    - [ ] **Frontend:** Update the `/register` page to handle the `invitation_token` from the URL.
- [ ] **Feature 2.2: Tenant-Specific Settings**
    - [ ] **UI:** Create a new `/settings/tenant` page for Tenant Admins.
    - [ ] **Backend:** Create endpoints to manage tenant-level settings (e.g., company name, billing details).

### Phase 3: Public Onboarding & Commercialization

- [ ] **Feature 3.1: Marketing & Pricing Pages**
    - [ ] **UI:** Create a new public-facing landing page (`/`).
    - [ ] **UI:** Create a `/pricing` page with subscription tiers.
- [ ] **Feature 3.2: Stripe Integration & Checkout**
    - [ ] **UI:** Implement a checkout form using Stripe Elements.
    - [ ] **Backend:** Create endpoints to manage the Stripe Checkout Session.
    - [ ] **Backend:** Implement a webhook endpoint `POST /stripe-webhook` to receive events from Stripe.
- [ ] **Feature 3.3: Automated Tenant Provisioning**
    - [ ] **Backend:** Create a `provisionNewTenant` service triggered by the Stripe webhook.
    - [ ] **Backend:** The service should automate tenant and user creation as specified in the User Flow (Section 3.1).

### Phase 4: Advanced Security & Enterprise Features

- [ ] **Feature 4.1: Audited Support Impersonation**
    - [ ] **UI (SuperAdmin):** Add a "Start Support Session" button to the SuperAdmin tenant dashboard.
    - [ ] **UI (Tenant Admin):** Implement a notification and approval modal for support requests.
    - [ ] **Backend:** Create a new `audit_log` table in the database.
    - [ ] **Backend:** Develop the system for generating and validating short-lived impersonation JWTs.
    - [ ] **Backend:** Ensure all impersonated actions are logged to the `audit_log` table.

---

## 5.0 Non-Functional Requirements

-   **Security:** All new endpoints must be protected with `JwtAuthGuard` and `RolesGuard`. All user input must be validated using DTOs and `class-validator`.
-   **Data Isolation:** The architecture must strictly enforce that no query can accidentally cross from one tenant's schema to another. All tenant-specific queries must be dynamically scoped to the `tenant_id` from the user's authenticated session.
-   **Scalability:** The automated tenant provisioning process must be robust and handle potential failures gracefully.
-   **Usability:** User flows, especially for registration and invitation, must be intuitive and minimize friction.

This document will serve as our blueprint. The immediate next step is to begin implementation of **Phase 1**.
