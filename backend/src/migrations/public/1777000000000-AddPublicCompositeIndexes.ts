import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Composite indexes on SHARED public-schema tables that mix tenant datasets:
 *   - audit_log: tenant's activity feed is (tenantId, actionType, timestamp)
 *   - email_log: tenant email reports sort by (tenant_id, status, sent_at)
 * Both tables already carry an index on the tenant column alone; these composites
 * serve the dominant filtered+ordered reads without adding tenant data to the ledgers.
 */
export class AddPublicCompositeIndexes1777000000000
  implements MigrationInterface
{
  name = "AddPublicCompositeIndexes1777000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_tenant_action_time"
       ON "audit_log" ("tenantId", "actionType", "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_tenant_user_time"
       ON "audit_log" ("tenantId", "userId", "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_tenant_status_sent"
       ON "email_log" ("tenant_id", "status", "sent_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_tenant_action_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_tenant_user_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_log_tenant_status_sent"`);
  }
}