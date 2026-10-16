import { EntityManager } from "typeorm";

/**
 * Canonical RBAC seed data.
 *
 * `permissions` / `roles` / `role_permissions` are the only tables in the
 * system whose rows are genuinely REQUIRED before the app can work: every
 * guard reads role names off the user, and `InitialSuperAdminSeederService`
 * hard-fails production boot when the `SuperAdmin` role row is absent.
 * Nothing else seeds them — the public migrations only insert
 * `currency_metadata` and `tenant_settings` — so historically the ONLY way to
 * get them was the manual `db:seed:roles-permissions` npm script.
 *
 * This module is the single source of truth for the data. It is consumed by:
 *   - `migrations/public/1777000000004-SeedRbacRolesAndPermissions.ts`
 *   - `auth/initial-superadmin-seeder.service.ts` (find-or-create fallback)
 *   - `database/seeds/seed-roles-permissions.ts` (manual/dev tool)
 *
 * Deliberately imports no path-aliased modules so a migration file can pull it
 * in regardless of which loader (NestJS boot, TypeORM CLI, ts-node) is running.
 */
export interface PermissionSeed {
  name: string;
  description: string;
}

/** Anything identified by permission name (seed descriptor or persisted entity). */
export interface NamedPermission {
  name: string;
}

export interface RoleSeed {
  name: string;
  description: string;
  /**
   * Filters a permission catalog down to the ones this role receives.
   * Generic over the element type so callers can pass either `PERMISSIONS`
   * or persisted `PermissionEntity[]` and get that same type back — which is
   * what lets the manual seed script reuse these rules verbatim.
   */
  grant: <T extends NamedPermission>(permissions: T[]) => T[];
}

const startsWith =
  (prefixes: string[]) =>
  <T extends NamedPermission>(p: T): boolean =>
    prefixes.some((pre) => p.name.startsWith(pre));
const named =
  (...names: string[]) =>
  <T extends NamedPermission>(p: T): boolean =>
    names.includes(p.name);

export const PERMISSIONS: PermissionSeed[] = [
  { name: "users:create", description: "Create new user accounts" },
  { name: "users:read", description: "View user profiles and lists" },
  { name: "users:update", description: "Update user profiles and roles" },
  { name: "users:delete", description: "Deactivate or delete user accounts" },
  { name: "users:assign_roles", description: "Assign roles to users" },

  { name: "roles:create", description: "Create new roles" },
  { name: "roles:read", description: "View role definitions" },
  { name: "roles:update", description: "Update role definitions and permissions" },
  { name: "roles:delete", description: "Delete roles" },

  { name: "projects:create", description: "Create new projects" },
  { name: "projects:read", description: "View project details" },
  { name: "projects:update", description: "Update project details" },
  { name: "projects:delete", description: "Delete projects" },

  { name: "wbs:create", description: "Create WBS categories and line items" },
  { name: "wbs:read", description: "View WBS structures and budgets" },
  { name: "wbs:update", description: "Update WBS structures and budgets" },
  { name: "wbs:delete", description: "Delete WBS categories and line items" },

  { name: "expenses:create", description: "Create new expense entries" },
  { name: "expenses:read", description: "View expense entries" },
  { name: "expenses:update", description: "Update own or assigned expense entries" },
  { name: "expenses:approve", description: "Approve or reject expense entries" },
  { name: "expenses:delete", description: "Delete expense entries" },

  { name: "operational_budgets:create", description: "Create operational budgets" },
  { name: "operational_budgets:read", description: "View operational budgets" },
  { name: "operational_budgets:update", description: "Update operational budgets" },
  { name: "operational_budgets:delete", description: "Delete operational budgets" },

  { name: "reports:read", description: "View various reports and analytics" },
  { name: "reports:export", description: "Export report data" },

  { name: "tenant_settings:read", description: "View tenant-specific settings" },
  { name: "tenant_settings:update", description: "Update tenant-specific settings" },

  { name: "superadmin:manage_tenants", description: "Create, update, delete tenants (platform-level)" },
  { name: "superadmin:impersonate", description: "Impersonate tenant users for support" },
  { name: "superadmin:view_all_data", description: "View data across all tenants" },
];

const ALL = <T extends NamedPermission>(ps: T[]): T[] => ps;

/**
 * Role names are hard-coded strings rather than `Role` enum members so that a
 * migration importing this file never depends on a path alias resolving.
 * Each string matches `shared/types/role.enum.ts` exactly.
 */
export const ROLES: RoleSeed[] = [
  { name: "SuperAdmin", description: "Global administrator with full platform access", grant: ALL },
  {
    name: "Admin",
    description: "Legacy tenant admin role (migrated to Admin Director)",
    grant: (ps) => ps.filter((p) => !startsWith(["superadmin:", "roles:"])(p)),
  },
  {
    name: "Finance",
    description: "Legacy finance oversight role (migrated to Finance Manager)",
    grant: (ps) =>
      ps.filter(
        named(
          "expenses:read",
          "expenses:approve",
          "operational_budgets:read",
          "reports:read",
          "reports:export",
          "wbs:read",
          "projects:read",
        ),
      ),
  },
  {
    name: "CFO",
    description: "Chief Financial Officer - Ultimate financial authority (Tenant Tier)",
    grant: (ps) => ps.filter((p) => !startsWith(["superadmin:"])(p) && !named("users:delete")(p)),
  },
  {
    name: "Admin Director",
    description: "Director of Administration - Strategic resource management (Tenant Tier)",
    grant: (ps) => ps.filter((p) => !startsWith(["superadmin:", "expenses:approve"])(p)),
  },
  {
    name: "Operational Director",
    description: "Director of Operations - Operational strategy and budget oversight (Tenant Tier)",
    grant: (ps) => ps.filter((p) => !startsWith(["superadmin:", "users:"])(p)),
  },
  {
    name: "Technical Director",
    description: "Director of Technology - Formerly IT Head, technical governance (Tenant Tier)",
    grant: (ps) =>
      ps.filter((p) => !startsWith(["superadmin:"])(p) && (startsWith(["users:"])(p) || named("reports:read")(p))),
  },
  {
    name: "CEO",
    description: "Tenant user with high-level overview and reporting access",
    grant: (ps) =>
      ps.filter(
        named(
          "reports:read",
          "reports:export",
          "projects:read",
          "wbs:read",
          "expenses:read",
          "operational_budgets:read",
        ),
      ),
  },
  {
    name: "IT Head",
    description: "Legacy IT management role (migrated to Technical Director)",
    grant: (ps) =>
      ps.filter(
        (p) =>
          startsWith(["users:"])(p) || named("tenant_settings:read", "reports:read")(p),
      ),
  },
  {
    name: "Finance Manager",
    description: "Finance Manager - Operational financial control and primary approvals (Tenant Tier)",
    grant: (ps) =>
      ps.filter((p) =>
        startsWith(["expenses:", "operational_budgets:", "reports:", "wbs:"])(p),
      ),
  },
  {
    name: "Admin Manager",
    description: "Admin Manager - Human resources and administrative operations (Tenant Tier)",
    grant: (ps) => ps.filter((p) => startsWith(["users:"])(p) || named("reports:read")(p)),
  },
  {
    name: "Project Manager",
    description: "Project Manager - Project-level WBS and budget management (Tenant Tier)",
    grant: (ps) =>
      ps.filter(
        (p) =>
          startsWith(["projects:", "wbs:"])(p) || named("expenses:read", "reports:read")(p),
      ),
  },
  {
    name: "Finance Officer",
    description: "Finance Officer - Data entry and initial verification (Tenant Tier)",
    grant: (ps) => ps.filter(named("expenses:create", "expenses:read", "wbs:read")),
  },
  {
    name: "Admin Officer",
    description: "Admin Officer - Basic user support and administrative tasks (Tenant Tier)",
    grant: (ps) => ps.filter(named("users:read")),
  },
  {
    name: "Assigned Project User",
    description: "Standard user assigned to specific projects, primarily for data entry",
    grant: (ps) =>
      ps.filter(
        named(
          "projects:read",
          "wbs:read",
          "expenses:create",
          "expenses:read",
          "expenses:update",
        ),
      ),
  },
];

export interface RbacSeedCounts {
  permissions: number;
  roles: number;
  grants: number;
}

/**
 * Insert-if-absent for every permission, role and role->permission grant.
 *
 * Existing rows are never touched, so running this on a database that was
 * seeded by the manual script (or customised by an admin) is a no-op for what
 * already exists; it only fills in what is missing. Returns how many rows the
 * call ensured.
 */
export async function ensureRbacSeeded(manager: EntityManager): Promise<RbacSeedCounts> {
  for (const permission of PERMISSIONS) {
    await manager.query(
      `INSERT INTO "public"."permissions" ("name", "description") VALUES ($1, $2) ON CONFLICT ("name") DO NOTHING`,
      [permission.name, permission.description],
    );
  }
  const permissionRows: Array<{ id: string; name: string }> = await manager.query(
    `SELECT "id", "name" FROM "public"."permissions"`,
  );
  const permissionIdByName = new Map(
    permissionRows.map((row) => [row.name, row.id]),
  );

  for (const role of ROLES) {
    await manager.query(
      `INSERT INTO "public"."roles" ("name", "description") VALUES ($1, $2) ON CONFLICT ("name") DO NOTHING`,
      [role.name, role.description],
    );
  }
  const roleRows: Array<{ id: string; name: string }> = await manager.query(
    `SELECT "id", "name" FROM "public"."roles"`,
  );
  const roleIdByName = new Map(roleRows.map((row) => [row.name, row.id]));

  let grants = 0;
  for (const role of ROLES) {
    const roleId = roleIdByName.get(role.name);
    if (!roleId) continue;
    for (const permission of role.grant(PERMISSIONS)) {
      const permissionId = permissionIdByName.get(permission.name);
      if (!permissionId) continue;
      await manager.query(
        `INSERT INTO "public"."role_permissions" ("role_id", "permission_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, permissionId],
      );
      grants++;
    }
  }

  return { permissions: permissionRows.length, roles: roleRows.length, grants };
}
