import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1769129257137 implements MigrationInterface {
  name = "AddPerformanceIndexes1769129257137";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop any existing indexes before creating to ensure idempotency and prevent errors on re-run
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_user_email_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_user_tenant_id_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_log_userId_action_tenantId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_log_timestamp"`,
    );

    // Indexes for 'user' table
    await queryRunner.query(
      `CREATE INDEX "IDX_user_email_is_active" ON "public"."user" ("email", "is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_tenant_id_is_active" ON "public"."user" ("tenant_id", "is_active")`,
    );

    // Indexes for 'audit_log' table
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_userId_action_tenantId" ON "public"."audit_log" ("userId", "action", "tenantId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_timestamp" ON "public"."audit_log" ("timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes in reverse order of creation
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_timestamp"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_log_userId_action_tenantId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_tenant_id_is_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_email_is_active"`);
  }
}
