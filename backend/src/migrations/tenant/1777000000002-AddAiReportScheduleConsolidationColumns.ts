import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Consolidates ai_report_schedule as the single authoritative schedule table.
 *
 * Adds the columns the canonical entity gained during consolidation
 * (absorbed from the legacy `report_schedule` model):
 *   - name: human label for the schedule
 *   - filters: report filter payload (jsonb)
 *   - last_error: scheduler failure detail for auditability
 *
 * Plus the composite indexes the @Cron scheduler's due-query needs
 * (status + next_run_at ordering), so ticks stay fast as rows grow.
 *
 * Deliberately does NOT backfill rows from the legacy `report_schedule`
 * table: that table has no created_by_id, which is NOT NULL here, so an
 * automatic copy would either fail or invent fake creators. Legacy rows
 * stay untouched for manual review (see docs/ai-implementation-progress.md).
 */
export class AddAiReportScheduleConsolidationColumns1777000000002
  implements MigrationInterface
{
  name = "AddAiReportScheduleConsolidationColumns1777000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // Tenant schemas predate this migration to varying degrees: some were
    // provisioned before `ai_report_schedule` existed at all. `ALTER TABLE` on a
    // missing table aborts the whole transaction, which would strand every
    // LATER migration in this tenant (they are applied in one ordered run) —
    // including the vendor/P2P ones. Skip cleanly when the table is absent; the
    // table is created by the canonical AI-assistant migration for that tenant.
    const tableRows: Array<{ present: number }> = await queryRunner.query(
      `SELECT 1 AS present FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'ai_report_schedule'`,
    );
    if (tableRows.length === 0) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "filters" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "last_error" text`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_sched_tenant" ON "ai_report_schedule" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_sched_next_run" ON "ai_report_schedule" ("next_run_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_sched_tenant_status_next" ON "ai_report_schedule" ("tenant_id", "status", "next_run_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_sched_tenant_status_next"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sched_next_run"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sched_tenant"`);
    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" DROP COLUMN IF EXISTS "last_error"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" DROP COLUMN IF EXISTS "filters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_report_schedule" DROP COLUMN IF EXISTS "name"`,
    );
  }
}
