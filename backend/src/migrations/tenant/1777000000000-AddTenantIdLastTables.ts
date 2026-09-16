import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Multi-tenancy hardening: add tenant_id to the last two tenant-owned tables that
 * lacked it (operational_budget_period_allocation, conversation_member), backfill
 * from their parent tables, and replace their uniqueness/indexes with
 * tenant-scoped composites so every tenant dataset carries the tenant_id anchor.
 *
 * DEPLOY NOTE (Flaw C): the CREATE UNIQUE INDEX statements below take strong
 * table locks. On small tables this is milliseconds; on large production
 * tables prefer CONCURRENTLY builds — which cannot run inside the migration
 * transaction (set `transaction: false` on this migration if converting).
 * Current form assumes small tables; revisit before running on large datasets.
 */
export class AddTenantIdLastTables1777000000000 implements MigrationInterface {
  name = "AddTenantIdLastTables1777000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM's `schema` DataSource option does NOT set the session search_path
    // (verified against 0.3.28 source): it only qualifies ORM-generated SQL and
    // the migration bookkeeping table name. Raw DDL below resolves through the
    // pooled session's search_path, which on Neon defaults to public — running
    // this migration unguarded would silently ALTER the shared-ledger shadow
    // tables. Guard explicitly, same as InitialTenantSchemaSetup.
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // ---- operational_budget_period_allocation ----
    const hasAllocTenant = await queryRunner.hasColumn(
      "operational_budget_period_allocation",
      "tenant_id",
    );
    if (!hasAllocTenant) {
      await queryRunner.query(
        `ALTER TABLE "operational_budget_period_allocation" ADD "tenant_id" uuid`,
      );
    }

    // FAIL-FAST ORPHAN GUARD: SET NOT NULL below hard-fails if any allocation
    // has no resolvable owning category (orphan row). Detect + report instead
    // of aborting with a bare pg error. Remediation: findFkViolators via
    // SELECT o.operational_budget_period_allocation_id
    //   FROM operational_budget_period_allocation o
    //   LEFT JOIN operational_budget_category c
    //     ON o.operational_budget_category_id = c.operational_budget_category_id
    //   WHERE c.operational_budget_category_id IS NULL;
    const allocOrphans = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM "operational_budget_period_allocation" a
       LEFT JOIN "operational_budget_category" c
         ON a."operational_budget_category_id" = c."operational_budget_category_id"
       WHERE a."tenant_id" IS NULL AND c."operational_budget_category_id" IS NULL`,
    );
    if (allocOrphans?.[0]?.count > 0) {
      throw new Error(
        `[AddTenantIdLastTables] ABORTED: ${allocOrphans[0].count} orphaned ` +
          `operational_budget_period_allocation row(s) (no owning category, so ` +
          `tenant_id cannot be backfilled). Delete or re-parent them before re-running.`,
      );
    }

    // Backfill from the owning category (every allocation belongs to a category)
    await queryRunner.query(`
      UPDATE "operational_budget_period_allocation" a
      SET "tenant_id" = c."tenant_id"
      FROM "operational_budget_category" c
      WHERE a."operational_budget_category_id" = c."operational_budget_category_id"
        AND a."tenant_id" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "operational_budget_period_allocation" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
    // Replace single-column-pair uniqueness with tenant-scoped composite
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_8db201c90d6b5a4956da53ecac"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alloc_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_alloc_unique_per_tenant"
       ON "operational_budget_period_allocation" ("tenant_id", "operational_budget_category_id", "period_date")`,
    );

    // ---- conversation_member ----
    const hasMemberTenant = await queryRunner.hasColumn(
      "conversation_member",
      "tenant_id",
    );
    if (!hasMemberTenant) {
      await queryRunner.query(
        `ALTER TABLE "conversation_member" ADD "tenant_id" uuid`,
      );
    }

    // FAIL-FAST ORPHAN GUARD (see allocation above). Remediation:
    // SELECT m.conversation_member_id
    //   FROM conversation_member m
    //   LEFT JOIN conversation c ON m.conversation_id = c.id
    //   WHERE c.id IS NULL;
    const memberOrphans = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM "conversation_member" m
       LEFT JOIN "conversation" c ON m."conversation_id" = c."id"
       WHERE m."tenant_id" IS NULL AND c."id" IS NULL`,
    );
    if (memberOrphans?.[0]?.count > 0) {
      throw new Error(
        `[AddTenantIdLastTables] ABORTED: ${memberOrphans[0].count} orphaned ` +
          `conversation_member row(s) (no owning conversation, so tenant_id ` +
          `cannot be backfilled). Delete or re-parent them before re-running.`,
      );
    }

    // Backfill from the parent conversation
    await queryRunner.query(`
      UPDATE "conversation_member" m
      SET "tenant_id" = c."tenant_id"
      FROM "conversation" c
      WHERE m."conversation_id" = c."id"
        AND m."tenant_id" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "conversation_member" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
    // Drop legacy single-tenant unique/user index names created by earlier parities
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversation_member_unique"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_member_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_1ebe869c785ab3616b58b55d2e"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b31b403f2e9c21a4a48460b8ed"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_conversation_member_unique_tenant"
       ON "conversation_member" ("tenant_id", "conversation_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_member_user_tenant"
       ON "conversation_member" ("tenant_id", "user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // BEST-EFFORT INVERSE (Flaw B): dropping a backfilled tenant_id column
    // would destroy data, so down() restores the pre-migration INDEX SHAPE
    // and relaxes NOT NULL — it does NOT drop the column or its values.
    // Post-down state is documented here, not identical to pre-up state:
    //   - tenant_id column + data: RETAINED (carrier for a future re-up).
    //   - NOT NULL: relaxed to nullable on both tables.
    //   - tenant-scoped composites: dropped; legacy indexes recreated.
    // Re-running up() afterwards re-applies NOT NULL + composites idempotently.
    await queryRunner.query(
      `ALTER TABLE "operational_budget_period_allocation" ALTER COLUMN "tenant_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_member" ALTER COLUMN "tenant_id" DROP NOT NULL`,
    );
    // Re-create the legacy indexes (safe: only those used by the current schema)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_conversation_member_unique"
       ON "conversation_member" ("conversation_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_member_user"
       ON "conversation_member" ("user_id")`,
    );
    // Restore the legacy allocation uniqueness pair that up() replaced: the
    // TypeORM-generated name and the historical alias.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8db201c90d6b5a4956da53ecac"
       ON "operational_budget_period_allocation" ("operational_budget_category_id", "period_date")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_alloc_unique"
       ON "operational_budget_period_allocation" ("operational_budget_category_id", "period_date")`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_alloc_unique_per_tenant"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversation_member_user_tenant"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversation_member_unique_tenant"`,
    );
  }
}