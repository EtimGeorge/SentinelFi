import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectSoftDelete1773015288077 implements MigrationInterface {
    name = 'AddProjectSoftDelete1773015288077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing constraints safely
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "FK_clients_tenant"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_client"`);
        await queryRunner.query(`ALTER TABLE "wbs_category" DROP CONSTRAINT IF EXISTS "FK_wbs_category_parent"`);
        await queryRunner.query(`ALTER TABLE "project_inflow" DROP CONSTRAINT IF EXISTS "FK_project_inflow_project"`);
        await queryRunner.query(`ALTER TABLE "project_audit" DROP CONSTRAINT IF EXISTS "FK_project_audit_project"`);
        await queryRunner.query(`ALTER TABLE "lpo" DROP CONSTRAINT IF EXISTS "FK_lpo_project"`);
        await queryRunner.query(`ALTER TABLE "payroll_entry" DROP CONSTRAINT IF EXISTS "FK_payroll_entry_budget"`);
        await queryRunner.query(`ALTER TABLE "ceo_annotation" DROP CONSTRAINT IF EXISTS "FK_ceo_annotation_author"`);
        await queryRunner.query(`ALTER TABLE "approval_log" DROP CONSTRAINT IF EXISTS "FK_approval_log_actor_ref"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ceo_annotation_context"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ceo_annotation_tenant_target"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_tenant_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_document_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_tenant_id_new"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_document_id_new"`);
        
        await queryRunner.query(`ALTER TABLE "operational_budget_period_allocation" DROP CONSTRAINT IF EXISTS "UQ_period_allocation"`);
        
        // Use DO blocks for types to ensure idempotency across schemas
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wbs_template_industry_enum') THEN
                    CREATE TYPE "wbs_template_industry_enum" AS ENUM('IT', 'CONSTRUCTION', 'OIL_GAS', 'GENERAL');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wbs_template" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "name" character varying(100) NOT NULL, 
                "industry" "wbs_template_industry_enum" NOT NULL DEFAULT 'GENERAL', 
                "structure" jsonb NOT NULL, 
                "tenant_id" uuid, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE, 
                CONSTRAINT "PK_wbs_template" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "settings" (
                "id" integer NOT NULL DEFAULT '1', 
                "maintenanceMode" boolean NOT NULL DEFAULT false, 
                "allowNewRegistrations" boolean NOT NULL DEFAULT true, 
                "defaultUserQuota" integer NOT NULL DEFAULT '50', 
                "defaultStorageQuotaGB" integer NOT NULL DEFAULT '10', 
                "smtpServer" character varying, 
                "smtpPort" integer, 
                "smtpUser" character varying, 
                "smtpPass" character varying, 
                "supportEmail" character varying, 
                "auditRetentionDays" integer NOT NULL DEFAULT '90', 
                "sessionTimeoutMinutes" integer NOT NULL DEFAULT '60', 
                "enableGlobalMfa" boolean NOT NULL DEFAULT false, 
                "sendgridApiKey" character varying, 
                "erpProvider" character varying, 
                "erpApiKey" character varying, 
                "erpBaseUrl" character varying, 
                CONSTRAINT "PK_settings" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "department" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "name" character varying(100) NOT NULL, 
                "code" character varying(50) NOT NULL, 
                "manager_id" uuid, 
                "parent_department_id" uuid, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_department" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_department_tenant" ON "department" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_department_tenant_code" ON "department" ("tenant_id", "code")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "cost_center" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "name" character varying(100) NOT NULL, 
                "code" character varying(50) NOT NULL, 
                "department_id" uuid NOT NULL, 
                "owner_id" uuid, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_cost_center" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cost_center_tenant" ON "cost_center" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cost_center_tenant_code" ON "cost_center" ("tenant_id", "code")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_class_base_type_enum') THEN
                    CREATE TYPE "account_class_base_type_enum" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "account_class" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "name" character varying(100) NOT NULL, 
                "code" character varying(20) NOT NULL, 
                "base_type" "account_class_base_type_enum" NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_account_class" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_account_class_tenant" ON "account_class" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_account_class_tenant_code" ON "account_class" ("tenant_id", "code")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "account_group" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "name" character varying(100) NOT NULL, 
                "code" character varying(20) NOT NULL, 
                "account_class_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_account_group" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_account_group_tenant" ON "account_group" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_account_group_tenant_code" ON "account_group" ("tenant_id", "code")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "gl_account" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "name" character varying(150) NOT NULL, 
                "code" character varying(20) NOT NULL, 
                "description" text, 
                "is_active" boolean NOT NULL DEFAULT true, 
                "account_group_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_gl_account" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gl_account_tenant" ON "gl_account" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gl_account_tenant_code" ON "gl_account" ("tenant_id", "code")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'p2p_invoice_status_enum') THEN
                    CREATE TYPE "p2p_invoice_status_enum" AS ENUM('RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REJECTED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "p2p_invoice" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "invoice_number" character varying(100) NOT NULL, 
                "purchase_order_id" uuid, 
                "cost_center_id" uuid NOT NULL, 
                "gl_account_id" uuid NOT NULL, 
                "vendor_name" character varying(255) NOT NULL, 
                "amount" numeric(19,4) NOT NULL, 
                "invoice_date" date NOT NULL, 
                "due_date" date, 
                "status" "p2p_invoice_status_enum" NOT NULL DEFAULT 'RECEIVED', 
                "receipt_url" character varying(2048), 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_p2p_invoice" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_p2p_invoice_tenant" ON "p2p_invoice" ("tenant_id")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'p2p_purchase_order_status_enum') THEN
                    CREATE TYPE "p2p_purchase_order_status_enum" AS ENUM('ISSUED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "p2p_purchase_order" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "po_number" character varying(50) NOT NULL, 
                "requisition_id" uuid NOT NULL, 
                "vendor_name" character varying(255) NOT NULL, 
                "committed_amount" numeric(19,4) NOT NULL, 
                "status" "p2p_purchase_order_status_enum" NOT NULL DEFAULT 'ISSUED', 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "UQ_po_number" UNIQUE ("po_number"), 
                CONSTRAINT "PK_p2p_purchase_order" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_p2p_po_tenant" ON "p2p_purchase_order" ("tenant_id")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'p2p_requisition_status_enum') THEN
                    CREATE TYPE "p2p_requisition_status_enum" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "p2p_requisition" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "requisition_number" character varying(50) NOT NULL, 
                "requester_id" uuid NOT NULL, 
                "cost_center_id" uuid NOT NULL, 
                "gl_account_id" uuid NOT NULL, 
                "description" text NOT NULL, 
                "vendor_name" character varying(255), 
                "estimated_amount" numeric(19,4) NOT NULL, 
                "required_by_date" date, 
                "status" "p2p_requisition_status_enum" NOT NULL DEFAULT 'DRAFT', 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "UQ_requisition_number" UNIQUE ("requisition_number"), 
                CONSTRAINT "PK_p2p_requisition" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_p2p_req_tenant" ON "p2p_requisition" ("tenant_id")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "fiscal_year" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "year_label" character varying(50) NOT NULL, 
                "start_date" date NOT NULL, 
                "end_date" date NOT NULL, 
                "is_closed" boolean NOT NULL DEFAULT false, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_fiscal_year" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fiscal_year_tenant" ON "fiscal_year" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fiscal_year_tenant_label" ON "fiscal_year" ("tenant_id", "year_label")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiscal_period_period_type_enum') THEN
                    CREATE TYPE "fiscal_period_period_type_enum" AS ENUM('MONTH', 'QUARTER');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "fiscal_period" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "fiscal_year_id" uuid NOT NULL, 
                "period_name" character varying(50) NOT NULL, 
                "period_type" "fiscal_period_period_type_enum" NOT NULL DEFAULT 'MONTH', 
                "start_date" date NOT NULL, 
                "end_date" date NOT NULL, 
                "is_closed" boolean NOT NULL DEFAULT false, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_fiscal_period" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fiscal_period_tenant" ON "fiscal_period" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fiscal_period_tenant_year_name" ON "fiscal_period" ("tenant_id", "fiscal_year_id", "period_name")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_run_status_enum') THEN
                    CREATE TYPE "payroll_run_status_enum" AS ENUM('DRAFT', 'REVIEW', 'APPROVED', 'POSTED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payroll_run" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "run_identifier" character varying(150) NOT NULL, 
                "fiscal_period_id" uuid NOT NULL, 
                "run_date" date NOT NULL, 
                "total_gross_pay" numeric(19,4) NOT NULL DEFAULT '0', 
                "total_taxes_employer" numeric(19,4) NOT NULL DEFAULT '0', 
                "total_benefits_employer" numeric(19,4) NOT NULL DEFAULT '0', 
                "status" "payroll_run_status_enum" NOT NULL DEFAULT 'DRAFT', 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_payroll_run" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payroll_run_tenant" ON "payroll_run" ("tenant_id")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_line_item_item_type_enum') THEN
                    CREATE TYPE "payroll_line_item_item_type_enum" AS ENUM('BASE_SALARY', 'BONUS', 'COMMISSION', 'EMPLOYER_TAX', 'EMPLOYER_BENEFIT');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payroll_line_item" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "payroll_run_id" uuid NOT NULL, 
                "employee_id" uuid NOT NULL, 
                "cost_center_id" uuid NOT NULL, 
                "gl_account_id" uuid NOT NULL, 
                "item_type" "payroll_line_item_item_type_enum" NOT NULL, 
                "amount" numeric(19,4) NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_payroll_line_item" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payroll_line_tenant" ON "payroll_line_item" ("tenant_id")`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_ledger_budget_type_enum') THEN
                    CREATE TYPE "budget_ledger_budget_type_enum" AS ENUM('PRIMARY_ALLOCATION', 'SUPPLEMENT', 'TRANSFER_IN', 'TRANSFER_OUT');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "budget_ledger" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "fiscal_period_id" uuid NOT NULL, 
                "cost_center_id" uuid NOT NULL, 
                "gl_account_id" uuid NOT NULL, 
                "budget_type" "budget_ledger_budget_type_enum" NOT NULL, 
                "amount" numeric(19,4) NOT NULL, 
                "reference_note" character varying(255), 
                "created_by_user_id" uuid, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_budget_ledger" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_budget_ledger_tenant" ON "budget_ledger" ("tenant_id")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "currency_exchange_rates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "from_currency" character varying(3) NOT NULL, 
                "to_currency" character varying(3) NOT NULL, 
                "rate" numeric(18,6) NOT NULL, 
                "last_updated" TIMESTAMP NOT NULL, 
                "source" character varying(100), 
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_currency_exchange_rates" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_currency_pair_date" ON "currency_exchange_rates" ("from_currency", "to_currency", "last_updated")`);

        await queryRunner.query(`ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "wbs_category" ADD COLUMN IF NOT EXISTS "parent_id" uuid`);
        await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
        await queryRunner.query(`COMMENT ON COLUMN "clients"."deleted_at" IS 'Soft delete timestamp for audit trail'`);
        
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "UQ_4ace5911e3c08b15b7034dd89b4"`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "wht_rate" SET DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP CONSTRAINT IF EXISTS "UQ_a2a63a701294cc192e78fb2d023"`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" ALTER COLUMN "unit_cost_budgeted" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" ALTER COLUMN "quantity_budgeted" SET DEFAULT '0'`);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operational_budget_period_allocation_period_type_enum') THEN
                    CREATE TYPE "operational_budget_period_allocation_period_type_enum" AS ENUM('MONTHLY', 'WEEKLY', 'DAILY', 'CUSTOM');
                END IF;
            END $$;
        `);

        // Check columns before altering/adding to prevent errors on multiple runs
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operational_budget_period_allocation' AND column_name = 'period_type') THEN
                    ALTER TABLE "operational_budget_period_allocation" ALTER COLUMN "period_type" DROP DEFAULT;
                    ALTER TABLE "operational_budget_period_allocation" ALTER COLUMN "period_type" TYPE "operational_budget_period_allocation_period_type_enum" USING "period_type"::text::"operational_budget_period_allocation_period_type_enum";
                    ALTER TABLE "operational_budget_period_allocation" ALTER COLUMN "period_type" SET DEFAULT 'MONTHLY';
                END IF;
            END $$;
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e7d8b637725986e7b5fa774a3f" ON "clients" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d8c27af391f272c95fe9efe512" ON "project" ("project_name", "tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_4c7279644b6ed957453aa8ca33" ON "project_inflow" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f2daa2ca3c296a84ff0e8ba58e" ON "project_audit" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_3510976724f58f0bc7af9b2b63" ON "lpo" ("tenant_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8db201c90d6b5a4956da53ecac" ON "operational_budget_period_allocation" ("operational_budget_category_id", "period_date")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bb70ecb18a4e9dd18e5631cc31" ON "budget_category" ("tenant_id", "name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8630b2549c6aeef0a611039221" ON "ceo_annotation" ("tenant_id", "target_type", "target_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_60317c872cf6249a0b5ea8bdac" ON "approval_log" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_3d53b4cb8628750d223b1d1a13" ON "approval_log" ("document_id")`);

        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "unique_client_name_per_tenant"`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "unique_client_name_per_tenant" UNIQUE ("tenant_id", "name")`);
        
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP CONSTRAINT IF EXISTS "UQ_16c330b9775752f649d28d8a63a"`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" ADD CONSTRAINT "UQ_16c330b9775752f649d28d8a63a" UNIQUE ("wbs_code", "project_id")`);

        // Final foreign keys
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_tenants" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_project_clients" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wbs_category" ADD CONSTRAINT "FK_wbs_category_parent_ref" FOREIGN KEY ("parent_id") REFERENCES "wbs_category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_project_inflow_proj_ref" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_project_inflow_user_ref" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_proj_ref" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_user_ref" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_proj_ref" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_wbs_ref" FOREIGN KEY ("wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_user_ref" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational_budget_period_allocation" ADD CONSTRAINT "FK_period_allocation_cat_ref" FOREIGN KEY ("operational_budget_category_id") REFERENCES "operational_budget_category"("operational_budget_category_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_payroll_entry_budget_ref" FOREIGN KEY ("operational_budget_id") REFERENCES "operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_payroll_entry_user_ref" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "department" ADD CONSTRAINT "FK_department_user_ref" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "department" ADD CONSTRAINT "FK_department_parent_ref" FOREIGN KEY ("parent_department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cost_center" ADD CONSTRAINT "FK_cost_center_dept_ref" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cost_center" ADD CONSTRAINT "FK_cost_center_user_ref" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_group" ADD CONSTRAINT "FK_account_group_class_ref" FOREIGN KEY ("account_class_id") REFERENCES "account_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "gl_account" ADD CONSTRAINT "FK_gl_account_group_ref" FOREIGN KEY ("account_group_id") REFERENCES "account_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD CONSTRAINT "FK_p2p_invoice_po_ref" FOREIGN KEY ("purchase_order_id") REFERENCES "p2p_purchase_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD CONSTRAINT "FK_p2p_invoice_cc_ref" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_invoice" ADD CONSTRAINT "FK_p2p_invoice_gl_ref" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_purchase_order" ADD CONSTRAINT "FK_p2p_po_requisition_ref" FOREIGN KEY ("requisition_id") REFERENCES "p2p_requisition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD CONSTRAINT "FK_p2p_requisition_user_ref" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD CONSTRAINT "FK_p2p_requisition_cc_ref" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "p2p_requisition" ADD CONSTRAINT "FK_p2p_requisition_gl_ref" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fiscal_period" ADD CONSTRAINT "FK_fiscal_period_year_ref" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_year"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_run" ADD CONSTRAINT "FK_payroll_run_period_ref" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_period"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_line_item" ADD CONSTRAINT "FK_payroll_line_run_ref" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_line_item" ADD CONSTRAINT "FK_payroll_line_user_ref" FOREIGN KEY ("employee_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_line_item" ADD CONSTRAINT "FK_payroll_line_cc_ref" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_line_item" ADD CONSTRAINT "FK_payroll_line_gl_ref" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_ledger" ADD CONSTRAINT "FK_budget_ledger_period_ref" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_period"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_ledger" ADD CONSTRAINT "FK_budget_ledger_cc_ref" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_ledger" ADD CONSTRAINT "FK_budget_ledger_gl_ref" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ceo_annotation" ADD CONSTRAINT "FK_ceo_annotation_user_ref" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approval_log" ADD CONSTRAINT "FK_approval_log_user_ref" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Safe down logic not required for manual recovery
    }
}
