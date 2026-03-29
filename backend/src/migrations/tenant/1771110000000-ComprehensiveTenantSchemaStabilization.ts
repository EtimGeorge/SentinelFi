import { MigrationInterface, QueryRunner } from "typeorm";

export class ComprehensiveTenantSchemaStabilization1771110000000 implements MigrationInterface {
  name = "ComprehensiveTenantSchemaStabilization1771110000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. ENUMS ---
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_category_type_enum') THEN
                    CREATE TYPE "budget_category_type_enum" AS ENUM('CAPEX', 'OPEX');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_type_enum') THEN
                    CREATE TYPE "period_type_enum" AS ENUM('MONTHLY', 'WEEKLY', 'DAILY', 'CUSTOM');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lpo_status_enum') THEN
                    CREATE TYPE "lpo_status_enum" AS ENUM('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'CANCELLED');
                END IF;
            END $$;
        `);

    // --- 2. MISSING TABLES ---

    // project_audit
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

    // project_inflow
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

    // lpo
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
                "expected_delivery_date" date, 
                "created_by_user_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_lpo_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_lpo_number" UNIQUE ("lpo_number")
            )
        `);

    // budget_category
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "budget_category" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid, 
                "name" character varying(255) NOT NULL, 
                "description" text, 
                "type" "budget_category_type_enum" NOT NULL DEFAULT 'OPEX', 
                "is_system_default" boolean NOT NULL DEFAULT false, 
                "is_active" boolean NOT NULL DEFAULT true, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_budget_category_id" PRIMARY KEY ("id")
            )
        `);

    // operational_budget_period_allocation
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "operational_budget_period_allocation" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "operational_budget_category_id" uuid NOT NULL, 
                "period_date" date NOT NULL, 
                "period_type" "period_type_enum" NOT NULL DEFAULT 'MONTHLY', 
                "planned_amount" numeric(19,4) NOT NULL DEFAULT '0', 
                "actual_amount" numeric(19,4) NOT NULL DEFAULT '0', 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_period_allocation_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_period_allocation" UNIQUE ("operational_budget_category_id", "period_date")
            )
        `);

    // payroll_entry
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payroll_entry" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "operational_budget_id" uuid NOT NULL, 
                "employee_name" character varying(255) NOT NULL, 
                "employee_id" character varying(100), 
                "base_salary" numeric(19,4) NOT NULL, 
                "bonus" numeric(19,4) NOT NULL DEFAULT '0', 
                "overtime" numeric(19,4) NOT NULL DEFAULT '0', 
                "other_allowances" numeric(19,4) NOT NULL DEFAULT '0', 
                "pension_deduction" numeric(19,4) NOT NULL DEFAULT '0', 
                "tax_deduction" numeric(19,4) NOT NULL DEFAULT '0', 
                "net_pay" numeric(19,4) NOT NULL, 
                "pay_period_start" date NOT NULL, 
                "pay_period_end" date NOT NULL, 
                "payment_date" date NOT NULL, 
                "status" character varying(50) NOT NULL DEFAULT 'PAID', 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "processed_by_user_id" uuid NOT NULL, 
                CONSTRAINT "PK_payroll_entry_id" PRIMARY KEY ("id")
            )
        `);

    // --- 3. MISSING COLUMNS ---

    await queryRunner.query(`
            DO $$ BEGIN
                -- clients.deleted_at
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deleted_at') THEN
                    ALTER TABLE "clients" ADD COLUMN "deleted_at" TIMESTAMP WITH TIME ZONE;
                END IF;
                
                -- live_expense.vat_amount / wht_amount
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_expense' AND column_name = 'vat_amount') THEN
                    ALTER TABLE "live_expense" ADD COLUMN "vat_amount" numeric(19,4) NOT NULL DEFAULT '0';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_expense' AND column_name = 'wht_amount') THEN
                    ALTER TABLE "live_expense" ADD COLUMN "wht_amount" numeric(19,4) NOT NULL DEFAULT '0';
                END IF;

                -- project financial columns (redundancy check for safety)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'currency') THEN
                    ALTER TABLE "project" ADD COLUMN "currency" character varying(10) NOT NULL DEFAULT 'NGN';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'contract_value') THEN
                    ALTER TABLE "project" ADD COLUMN "contract_value" numeric(19,4) NOT NULL DEFAULT '0';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'contingency_percent') THEN
                    ALTER TABLE "project" ADD COLUMN "contingency_percent" numeric(5,2) NOT NULL DEFAULT '0';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'vat_rate') THEN
                    ALTER TABLE "project" ADD COLUMN "vat_rate" numeric(5,2) NOT NULL DEFAULT '7.5';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'wht_rate') THEN
                    ALTER TABLE "project" ADD COLUMN "wht_rate" numeric(5,2) NOT NULL DEFAULT '5.0';
                END IF;
            END $$;
        `);

    // --- 4. CONSTRAINTS (Missing Foreign Keys) ---
    await queryRunner.query(`
            DO $$ BEGIN
                -- project_audit -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_audit_project') THEN
                    ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
                -- project_audit -> user
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_audit_performer') THEN
                    ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_performer" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                
                -- project_inflow -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_inflow_project') THEN
                    ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_project_inflow_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;

                -- lpo -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lpo_project') THEN
                    ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                -- lpo -> wbs
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lpo_wbs') THEN
                    ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_wbs" FOREIGN KEY ("wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;

                -- payroll_entry -> operational_budget
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payroll_entry_budget') THEN
                    ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_payroll_entry_budget" FOREIGN KEY ("operational_budget_id") REFERENCES "operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                -- payroll_entry -> user (author)
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payroll_entry_processed_by') THEN
                    ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_payroll_entry_processed_by" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                -- allocation -> category
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_period_allocation_category') THEN
                    ALTER TABLE "operational_budget_period_allocation" ADD CONSTRAINT "FK_period_allocation_category" FOREIGN KEY ("operational_budget_category_id") REFERENCES "operational_budget_category" ("operational_budget_category_id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration can be complex with multi-tenancy, usually we focus on 'up' stability
    // But for completeness:
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_entry"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "operational_budget_period_allocation"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "period_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "budget_category_type_enum"`);
  }
}
