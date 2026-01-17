# Proposal: Implementing a Granular Role-Based Access Control (RBAC) System

**Sparring Partner:** Gemini
**Date:** 2026-01-14

## 1. Executive Summary

Our current authorization model is based solely on a user's `role` (e.g., `Admin`, `Finance`). This is inflexible and will not scale as the application's complexity grows. We cannot, for example, create a "read-only" admin or a finance user who can only approve budgets but not create them, without creating a new hardcoded role for every permutation.

This document proposes a significant architectural enhancement: the implementation of a true, database-driven granular RBAC system. This system will decouple **Roles** from **Permissions**, allowing SuperAdmins to dynamically define what each role can and cannot do.

This is a foundational feature for any enterprise-grade SaaS application, enabling greater security, flexibility, and easier management of user access.

## 2. Why This Is Necessary

*   **Scalability:** Avoids "role explosion" where we have to create dozens of roles for minor variations in access.
*   **Flexibility:** Allows administrators to fine-tune access control without requiring new code deployments.
*   **Security:** Enforces the principle of least privilege. Users only have access to the specific actions they need to perform.
*   **Enterprise Readiness:** This is a standard and expected feature for customers who need to manage teams of users with varying levels of responsibility.

## 3. Proposed Architecture

We will introduce two new database tables and a join table in the `public` schema:

1.  **`permissions` table:**
    *   `id`: `uuid`, primary key
    *   `name`: `varchar`, unique (e.g., `users:create`, `wbs:delete`, `reports:view`)
    *   `description`: `text`, optional

2.  **`roles` table:**
    *   `id`: `uuid`, primary key
    *   `name`: `varchar`, unique (e.g., `Tenant Administrator`, `Financial Controller`)
    *   `description`: `text`, optional

3.  **`role_permissions` table (many-to-many join):**
    *   `role_id`: `uuid`, foreign key to `roles.id`
    *   `permission_id`: `uuid`, foreign key to `permissions.id`

The existing `user.role` column will be replaced with a `user.role_id` foreign key pointing to the new `roles` table.

## 4. Implementation Plan

This will be a multi-phase implementation.

### Phase 1: Backend Foundation

#### 1.1. Create Database Entities & Migrations
-   **Task:** Create `RoleEntity`, `PermissionEntity`, and `RolePermissionEntity` in `backend/src/auth/`.
-   **Task:** Modify `UserEntity` to replace the `role` enum with a `role_id` and a `ManyToOne` relationship to `RoleEntity`.
-   **Task:** Generate a new TypeORM migration to create these tables and update the `user` table.

#### 1.2. Seed Initial Roles & Permissions
-   **Task:** first sanitise review the files in ( /backend/scripts ) and what they do or intend to do, then investigate the database schemas, typerom entities, and migration and seeding files.
-   **Task:** Create a database seeding script (`backend/src/database/seeds/seed-roles-permissions.ts`) that populates the `roles` and `permissions` tables with initial data.
    -   **Permissions:** `users:create`, `users:read`, `users:update`, `users:delete`, `wbs:create`, `wbs:read`, `wbs:update`, `wbs:delete`, `reports:read`, `tenant:edit-settings`.
    -   **Roles:** `SuperAdmin`, `Admin`, `Finance`, `CEO`, `AssignedProjectUser`.
-   **Task:** Assign all permissions to the `SuperAdmin` and a default set to the `Admin` role.

#### 1.3. Update JWT & Auth Service
-   **Task:** Modify `AuthService` (`login` method) to query the user's role and associated permissions.
-   **Task:** Modify the `JwtPayload` to include an array of permission strings (e.g., `permissions: ['users:read', 'wbs:create']`).
-   **Task:** Update `JwtService` logic to embed these permissions into the JWT upon login.

#### 1.4. Create a `PermissionsGuard`
-   **Task:** Create a new `PermissionsGuard` (`backend/src/common/guards/permissions.guard.ts`).
-   **Task:** Create a `@RequirePermissions()` decorator.
-   **Task:** The guard will read the required permissions from the decorator and check if they exist in the `user.permissions` array from the JWT payload.
-   **Task:** Apply this guard to a sample controller endpoint (e.g., the `createUser` method in `auth.controller.ts` should get `@RequirePermissions('users:create')`).

### Phase 2: Frontend Integration

#### 2.1. Update `AuthContext`
-   **Task:** Modify the `User` interface in `shared/types/user.ts` to include `permissions: string[]`.
-   **Task:** Update `AuthContext.tsx` to handle the new `permissions` array in the user object.
-   **Task:** Implement the logic for the `hasPermission()` function to check against this new array.

#### 2.2. Implement UI Authorization
-   **Task:** On a sample page (e.g., the User Management page), use the `hasPermission` hook to conditionally render UI elements. For example, the "Create User" button should only be visible if `hasPermission('users:create')` is true.

### Phase 3: SuperAdmin Management UI

#### 3.1. Create Role & Permission Management UI
-   **Task:** Create a new page at `/super/roles` for SuperAdmins.
-   **Task:** Build a UI that lists all available roles.
-   **Task:** Implement functionality to create, edit, and delete roles.
-   **Task:** When editing a role, display a list of all available permissions with checkboxes, allowing the SuperAdmin to dynamically assign and un-assign permissions to that role.

#### 3.2. Create Backend APIs for Role Management
-   **Task:** Create a new `RolesController` and `RolesService` in the backend.
-   **Task:** Implement CRUD endpoints (`/roles`, `/roles/:id`, etc.) for managing roles and their associated permissions. These endpoints must be protected and only accessible by SuperAdmins.

## 5. Success Criteria

The implementation will be considered successful when:
1.  A SuperAdmin can log in and use the new UI to create a custom role (e.g., "Junior Accountant").
2.  The SuperAdmin can assign a limited set of permissions (e.g., only `reports:read`) to this new role.
3.  A new user can be assigned the "Junior Accountant" role.
4.  When this new user logs in, they can view reports but are blocked by the `PermissionsGuard` (backend) and hidden UI elements (frontend) from performing actions they don't have permission for, like creating users.

This proposal outlines a robust, scalable, and secure path forward for authorization in SentinelFi. I await your approval before proceeding with Phase 1.
