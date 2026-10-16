import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the operational_budget table (and supporting enums) if not already present.
 *
 * This migration is idempotent: every statement uses IF NOT EXISTS / DO $$ guards so it
 * is safe to re-run on databases where EnterpriseOpexEngine1772335118747 was recorded as
 * executed but never actually ran (the situation we found in production).
 *
 * Order dependency: must run BEFORE AlignOpexEnumsCanonical1774100000000 because that
 * migration ALTERs this table's enum columns.
 */
export class CreateOperationalBudgetTable1773500000000 implements MigrationInterface {
  name = "CreateOperationalBudgetTable1773500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Enum types (idempotent) ----
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'operational_budget_type_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."operational_budget_type_enum" AS ENUM(
            'company_wide', 'departmental', 'project_specific', 'recurring'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'operational_budget_status_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."operational_budget_status_enum" AS ENUM(
            'active', 'inactive', 'archived'
          );
        END IF;
      END
      $$;
    `);

    // ---- Main table ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public"."operational_budget" (
        "operational_budget_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "type" "public"."operational_budget_type_enum" NOT NULL DEFAULT 'company_wide',
        "budgeted_amount" numeric(19,4) NOT NULL DEFAULT '0',
        "actual_spent" numeric(19,4) NOT NULL DEFAULT '0',
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" "public"."operational_budget_status_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_user_id" uuid NOT NULL,
        "department_id" uuid,
        CONSTRAINT "PK_operational_budget" PRIMARY KEY ("operational_budget_id")
      );
    `);

    // ---- Indexes ----
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_budget_tenant" ON "public"."operational_budget" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_budget_tenant_status" ON "public"."operational_budget" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_budget_tenant_type" ON "public"."operational_budget" ("tenant_id", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_budget_department" ON "public"."operational_budget" ("department_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_budget_deleted_at" ON "public"."operational_budget" ("deleted_at")`,
    );

    // ---- Comments for documentation ----
    await queryRunner.query(
      `COMMENT ON COLUMN "public"."operational_budget"."tenant_id" IS 'Tenant ID for multi-tenant isolation'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "public"."operational_budget"."budgeted_amount" IS 'Total budgeted amount for the period'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "public"."operational_budget"."actual_spent" IS 'Actual spend rolled up from categories/expenses'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "public"."operational_budget"."deleted_at" IS 'Soft delete timestamp for audit trail'`,
    );

    // ---- RLS: enable row-level security ----
    await queryRunner.query(
      `ALTER TABLE "public"."operational_budget" ENABLE ROW LEVEL SECURITY`,
    );

    // RLS policy: tenants can only see their own budgets
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'operational_budget'
            AND policyname = 'operational_budget_tenant_isolation'
        ) THEN
          CREATE POLICY "operational_budget_tenant_isolation"
            ON "public"."operational_budget"
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "operational_budget_tenant_isolation" ON "public"."operational_budget"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."operational_budget"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."operational_budget_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."operational_budget_status_enum"`);
  }
}