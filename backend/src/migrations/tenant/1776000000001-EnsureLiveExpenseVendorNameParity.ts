import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Generic parity fix for live_expense.vendor_name and any remaining project/dashboard columns.
 * Previous EnsureSoftDeleteParity (1776000000000) missed live_expense.vendor_name (entity expects it)
 * causing GET /wbs/expenses 500 "column liveExpense.vendor_name does not exist" and potentially
 * leftJoin issues for projects/dashboard if related tables are missing columns.
 * This migration is fully generic: uses ADD COLUMN IF NOT EXISTS on the current tenant schema
 * via queryRunner (search_path set by TenantMigrationService), no hardcoded tenant names.
 */
export class EnsureLiveExpenseVendorNameParity1776000000001 implements MigrationInterface {
  name = "EnsureLiveExpenseVendorNameParity1776000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- live_expense vendor_name (critical for WBS expenses and any query that hydrates LiveExpenseEntity) ---
    await queryRunner.query(`ALTER TABLE "live_expense" ADD COLUMN IF NOT EXISTS "vendor_name" character varying(255)`);
    // also ensure nullable vendor_name for other finance entities if they were moved to tenant schema
    // project parity re-assert (idempotent)
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "project_code" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "client_id" uuid`);
    // ensure clients table exists (for leftJoinAndSelect in ProjectsService) – idempotent
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying,
        "phone" character varying,
        "address" text,
        "industry" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_clients" PRIMARY KEY ("id")
      )
    `);
    // indexes for projects soft-delete and client FK lookup
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_deleted_at" ON "project" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clients_tenant" ON "clients" ("tenant_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "unique_client_name_per_tenant" ON "clients" ("tenant_id", "name")`);
    // ensure wbs_budget enum has correct values – already handled in previous migration but re-ensure for safety
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'wbs_budget_status_enum' AND e.enumlabel = 'draft') THEN
          ALTER TYPE "wbs_budget_status_enum" ADD VALUE IF NOT EXISTS 'draft';
        END IF;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no down – column is additive
  }
}
