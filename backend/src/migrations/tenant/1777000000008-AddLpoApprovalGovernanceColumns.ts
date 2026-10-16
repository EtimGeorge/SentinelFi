import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Brings the three LPO approval-governance columns into the CANONICAL tenant
 * migration set.
 *
 * Why this exists: `LpoApprovalGovernance1780000000000` lives under
 * `backend/src/database/migrations/tenant/`, a directory that nothing globs —
 * `getTenantMigrationsPath()` only resolves `backend/src/migrations/tenant`.
 * That migration therefore never runs during normal tenant provisioning. The
 * only thing that applies it is the manual `scripts/upgrade-lpo-governance.js`
 * one-shot for pre-existing tenants, so every tenant provisioned through the
 * normal path was created WITHOUT these columns while `LpoEntity` declares
 * them — making any LPO insert fail with
 * `column "approval_status" of relation "lpo" does not exist`.
 *
 * `MessagingGroupEntities1773201494945` in the same orphaned directory is
 * harmless by contrast: its work is duplicated by the canonical
 * `EnsureMessagingAndNotificationsParity1776000000002`.
 *
 * Idempotent on purpose so the same SQL also covers tenants already upgraded
 * by the manual script.
 */
export class AddLpoApprovalGovernanceColumns1777000000008
  implements MigrationInterface
{
  name = "AddLpoApprovalGovernanceColumns1777000000008";

  private async setSchema(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}"`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.setSchema(queryRunner);

    await queryRunner.query(
      `ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "override_reason" text`,
    );

    // Approval-queue access path: "my tenant's LPOs awaiting authorisation".
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lpo_tenant_approval_status"
        ON "lpo" ("tenant_id", "approval_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.setSchema(queryRunner);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_lpo_tenant_approval_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP COLUMN IF EXISTS "override_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP COLUMN IF EXISTS "variance_flag"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP COLUMN IF EXISTS "approval_status"`,
    );
  }
}
