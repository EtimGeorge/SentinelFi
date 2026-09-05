import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ensures all tenant schemas have soft-delete and audit columns parity.
 * Previously `saencrystal_global_services` was created before `AddProjectSoftDelete` and missed `deleted_at`
 * on `wbs_category`, `project_inflow`, `lpo` etc., causing `WbsService` 500 `column project.deleted_at does not exist`.
 * This migration is idempotent via `ADD COLUMN IF NOT EXISTS` and must run for every tenant schema.
 */
export class EnsureSoftDeleteParity1776000000000 implements MigrationInterface {
  name = "EnsureSoftDeleteParity1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use IF NOT EXISTS so it is safe to run on already-correct schemas like `solution_energy`
    // Generic parity migration: ensures ALL tenant schemas have consistent columns
    // Do NOT hardcode tenant names; this runs with search_path set to tenant schema via TenantMigrationService

    // --- project parity (entity expects project_code, soft-delete) ---
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "project_code" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "client_id" uuid`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "currency" character varying(10) DEFAULT 'NGN'`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "contract_value" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "contingency_percent" numeric(5,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "vat_rate" numeric(5,2) DEFAULT '7.5'`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "wht_rate" numeric(5,2) DEFAULT '5.0'`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`);

    // --- wbs_budget parity ---
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "quantity_actual" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "days_actual" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "uom" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "custom_metadata" jsonb`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "total_committed_lpo" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "total_cost_actual" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`);

    // --- wbs_category parity (entity has code, description, color, sort_order, parent_id, is_active, updated_at, deleted_at) ---
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "code" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "description" text`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "color" character varying(7)`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "parent_id" uuid`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`);
    // Ensure self-referencing FK for hierarchy (idempotent check)
    const fkExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'FK_wbs_category_parent'
            AND table_name = 'wbs_category'
        `);
    if (fkExists.length === 0) {
      try {
        await queryRunner.query(`
                 ALTER TABLE "wbs_category"
                 ADD CONSTRAINT "FK_wbs_category_parent"
                 FOREIGN KEY ("parent_id") REFERENCES "wbs_category"("id")
                 ON DELETE CASCADE ON UPDATE NO ACTION
             `);
      } catch (_e) { /* ignore if fails due to existing data */ }
    }

    // --- live_expense parity ---
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "vendor_name" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "approval_status" character varying(50) DEFAULT 'APPROVED'`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "override_reason" text`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "days" numeric(19,4)`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "vat_amount" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "wht_amount" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "category_id" uuid`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "project_id" uuid`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "commitment_lpo_amount" numeric(19,4) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) DEFAULT 'NO_VARIANCE'`);

    // --- project_inflow / lpo ---
    await queryRunner.query(`ALTER TABLE "project_inflow" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "project_inflow" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now()`);

    // --- operational budgets parity ---
    await queryRunner.query(`ALTER TABLE "operational_budget" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "operational_budget_category" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "operational_budget_category" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "operational_expense" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "operational_expense" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "operational_expense" ADD COLUMN IF NOT EXISTS "variance_flag" character varying(50) DEFAULT 'NO_VARIANCE'`);
    await queryRunner.query(`ALTER TABLE "operational_expense" ADD COLUMN IF NOT EXISTS "override_reason" text`);
    await queryRunner.query(`ALTER TABLE "payroll_entry" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);

    // Ensure wbs_budget_status_enum has recalled value (from AddFulfillmentTrackingFields)
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'wbs_budget_status_enum' AND e.enumlabel = 'recalled') THEN
                    ALTER TYPE "wbs_budget_status_enum" ADD VALUE IF NOT EXISTS 'recalled';
                END IF;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);

    // Ensure indexes for soft-delete queries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_deleted_at" ON "project" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wbs_budget_deleted_at" ON "wbs_budget" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wbs_category_deleted_at" ON "wbs_category" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_live_expense_deleted_at" ON "live_expense" ("deleted_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No down - soft-delete columns are additive and should remain
  }
}
