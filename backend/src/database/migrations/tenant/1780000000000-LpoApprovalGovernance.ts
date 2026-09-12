import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * LPO / Project Inflow / Project Audit tables + LPO approval governance columns.
 *
 * These tables were previously created out-of-band (manual scripts), so fresh
 * tenants never received them. This migration is idempotent: it creates the
 * tables when missing and adds the governance columns to existing ones.
 *
 * Existing tenants are upgraded by backend/scripts/upgrade-lpo-governance.js
 * (runMigrations only executes on tenant creation).
 */
export class LpoApprovalGovernance1780000000000 implements MigrationInterface {
  name = "LpoApprovalGovernance1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum used by the LPO lifecycle
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lpo_status_enum') THEN
          CREATE TYPE "lpo_status_enum" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'CANCELLED');
        END IF;
      END $$;
    `);

    // LPO table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lpo" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "lpo_number" character varying(100) NOT NULL,
        "project_id" uuid NOT NULL,
        "wbs_id" uuid NOT NULL,
        "vendor_name" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "amount_committed" numeric(19,4) NOT NULL,
        "amount_paid" numeric(19,4) NOT NULL DEFAULT '0',
        "status" "lpo_status_enum" NOT NULL DEFAULT 'OPEN',
        "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED',
        "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE',
        "override_reason" text,
        "expected_delivery_date" date,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lpo_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_lpo_number" UNIQUE ("lpo_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lpo_tenant" ON "lpo" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lpo_project" ON "lpo" ("project_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lpo_wbs" ON "lpo" ("wbs_id")`);

    // Project inflow (revenue) table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_inflow" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "milestone_name" character varying(100) NOT NULL,
        "description" text,
        "amount_received" numeric(19,4) NOT NULL,
        "receipt_date" date NOT NULL,
        "bank_reference" character varying(255),
        "received_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_inflow_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inflow_tenant" ON "project_inflow" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inflow_project" ON "project_inflow" ("project_id")`);

    // Project audit trail table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_audit" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "change_type" character varying(100) NOT NULL,
        "old_value" numeric(19,4),
        "new_value" numeric(19,4),
        "description" text NOT NULL,
        "performed_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_audit_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_tenant" ON "project_audit" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_project" ON "project_audit" ("project_id")`);

    // Governance columns on existing lpo tables
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED'`);
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE'`);
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "override_reason" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_inflow"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lpo"`);
  }
}