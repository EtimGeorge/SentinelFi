import { MigrationInterface, QueryRunner } from "typeorm";
import { ensureRbacSeeded } from "../../database/seeds/rbac.seed-data";

/**
 * Guarantees the RBAC rows the application cannot run without.
 *
 * `permissions`, `roles` and `role_permissions` are global (`public` schema)
 * reference data that nothing previously seeded automatically: the only
 * inserters were `currency_metadata` and `tenant_settings`, so `roles` only
 * ever got rows when someone remembered to run the manual
 * `npm run db:seed:roles-permissions` script. The consequences of that gap are
 * hard failures rather than cosmetic ones:
 *
 *   - `InitialSuperAdminSeederService` reads `roles` for `SuperAdmin` and, in
 *     production, throws `SuperAdmin role 'SuperAdmin' not found` — which
 *     propagates out of `onApplicationBootstrap` and aborts boot.
 *   - Every `@Roles(...)` guard resolves role names through
 *     user -> user_roles -> roles, so with an empty table the first invited
 *     Admin Director is authorised by nothing.
 *
 * This is deliberately a shared-code migration (it calls
 * `ensureRbacSeeded()` rather than inlining SQL): permission checks are
 * code-driven, so keeping one source of truth prevents the migration and the
 * seeder from drifting apart. Existing rows are left untouched, so tenants
 * already seeded by the manual script are unaffected.
 *
 * Known trade-off: because the data lives in a module, a *future* permission
 * added to `rbac.seed-data.ts` will not reach tenants that already ran this
 * migration. New permissions need a follow-up migration — the manual
 * `db:seed:roles-permissions` script still handles that case.
 */
export class SeedRbacRolesAndPermissions1777000000004
  implements MigrationInterface
{
  name = "SeedRbacRolesAndPermissions1777000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureRbacSeeded(queryRunner.manager);
  }

  /**
   * Intentionally empty. These rows may have been created by the manual seed
   * script long before this migration ran, and rolling them back would strip
   * role/permission mappings out from under live users (locking the platform
   * out of its own roles). The seed is insert-if-absent, so reverting is a
   * "keep" rather than a "delete".
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op by design
  }
}
