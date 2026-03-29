import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperationalBudgetCategories1769686463113 implements MigrationInterface {
  name = "AddOperationalBudgetCategories1769686463113";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_tenant_id_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d79be558ff58a353061c6b1a8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_log_userId_action_tenantId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_timestamp"`);
    await queryRunner.query(
      `CREATE TABLE "live_expense" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "project_id" uuid, "wbs_id" uuid NOT NULL, "category_id" uuid, "updated_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "expense_date" date NOT NULL DEFAULT ('now'::text)::date, "description" text NOT NULL, "unit_cost" numeric(19,4) NOT NULL, "quantity" numeric(19,4) NOT NULL, "commitment_lpo_amount" numeric(19,4) NOT NULL DEFAULT '0', "amount" numeric(19,4) NOT NULL, "vat_amount" numeric(19,4) NOT NULL DEFAULT '0', "wht_amount" numeric(19,4) NOT NULL DEFAULT '0', "document_reference" character varying(255), "notes_justification" text, "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_63ca1ecf90dfa34da4087e9fcd4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wbs_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_73c7c495009c60748399c9cf90a" UNIQUE ("name", "tenant_id"), CONSTRAINT "PK_5df28f7dc4baaa36d9db6cca9da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected', 'draft')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wbs_budget" ("wbs_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "parent_wbs_id" uuid, "category_id" uuid, "wbs_code" character varying(50) NOT NULL, "description" text NOT NULL, "unit_cost_budgeted" numeric(19,4) NOT NULL, "quantity_budgeted" numeric(19,4) NOT NULL, "days_budgeted" integer, "total_cost_budgeted" numeric(19,4) NOT NULL, "total_cost_actual" numeric(19,4) NOT NULL DEFAULT '0', "status" "public"."wbs_budget_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "user_id" uuid, CONSTRAINT "UQ_a2a63a701294cc192e78fb2d023" UNIQUE ("wbs_code"), CONSTRAINT "PK_5b0a844da38bcd3e566b601bf43" PRIMARY KEY ("wbs_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_enum" AS ENUM('active', 'archived', 'completed', 'on_hold')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project" ("project_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_name" character varying(255) NOT NULL, "rfq_number" text, "sow_details" text, "notes" text, "status" "public"."project_status_enum" NOT NULL DEFAULT 'active', "currency" character varying(10) NOT NULL DEFAULT 'NGN', "contract_value" numeric(19,4) NOT NULL DEFAULT '0', "contingency_percent" numeric(5,2) NOT NULL DEFAULT '0', "vat_rate" numeric(5,2) NOT NULL DEFAULT '7.5', "wht_rate" numeric(5,2) NOT NULL DEFAULT '5', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by_user_id" uuid NOT NULL, CONSTRAINT "UQ_4ace5911e3c08b15b7034dd89b4" UNIQUE ("project_name"), CONSTRAINT "PK_1a480c5734c5aacb9cef7b1499d" PRIMARY KEY ("project_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_inflow" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "project_id" uuid NOT NULL, "milestone_name" character varying(100) NOT NULL, "description" text, "amount_received" numeric(19,4) NOT NULL, "receipt_date" date NOT NULL, "bank_reference" character varying(255), "received_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7a74fa2f3c9773221c5c0b6e8fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c7279644b6ed957453aa8ca33" ON "project_inflow" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "project_id" uuid NOT NULL, "change_type" character varying(100) NOT NULL, "old_value" numeric(19,4), "new_value" numeric(19,4), "description" text NOT NULL, "performed_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c27bdcc0080d0b2ea44f68d0e52" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2daa2ca3c296a84ff0e8ba58e" ON "project_audit" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lpo_status_enum" AS ENUM('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lpo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "lpo_number" character varying(100) NOT NULL, "project_id" uuid NOT NULL, "wbs_id" uuid NOT NULL, "vendor_name" character varying(255) NOT NULL, "description" text NOT NULL, "amount_committed" numeric(19,4) NOT NULL, "amount_paid" numeric(19,4) NOT NULL DEFAULT '0', "status" "public"."lpo_status_enum" NOT NULL DEFAULT 'OPEN', "expected_delivery_date" date, "created_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c0e44e2b7f9b67efb18f934e2a7" UNIQUE ("lpo_number"), CONSTRAINT "PK_2ef66e0daed35ac686f997f3331" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3510976724f58f0bc7af9b2b63" ON "lpo" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operational_expense_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operational_expense" ("operational_expense_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_category_id" uuid NOT NULL, "item_description" character varying(255) NOT NULL, "amount" numeric(10,2) NOT NULL, "expense_date" TIMESTAMP NOT NULL, "vendor" character varying(255), "receipt_url" character varying(255), "status" "public"."operational_expense_status_enum" NOT NULL DEFAULT 'PENDING', "logged_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dffb1a026b254442c6d74273a1f" PRIMARY KEY ("operational_expense_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ec3e4d84a24a5d1902cde3173" ON "operational_expense" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operational_budget_period_allocation_period_type_enum" AS ENUM('MONTHLY', 'WEEKLY', 'DAILY', 'CUSTOM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operational_budget_period_allocation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operational_budget_category_id" uuid NOT NULL, "period_date" date NOT NULL, "period_type" "public"."operational_budget_period_allocation_period_type_enum" NOT NULL DEFAULT 'MONTHLY', "planned_amount" numeric(19,4) NOT NULL DEFAULT '0', "actual_amount" numeric(19,4) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_878848f068bb1a54477e56b92ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8db201c90d6b5a4956da53ecac" ON "operational_budget_period_allocation" ("operational_budget_category_id", "period_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "operational_budget_category" ("operational_budget_category_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "budgeted_amount" numeric(10,2) NOT NULL DEFAULT '0', "actual_spent" numeric(10,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3e38ea5566ccffb3b40ac725b20" PRIMARY KEY ("operational_budget_category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02d85ba5b35930e2e448d77eb3" ON "operational_budget_category" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operational_budget_type_enum" AS ENUM('departmental', 'company-wide', 'recurring')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operational_budget_status_enum" AS ENUM('active', 'closed', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operational_budget" ("operational_budget_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "type" "public"."operational_budget_type_enum" NOT NULL DEFAULT 'company-wide', "budgeted_amount" numeric(19,4) NOT NULL, "actual_spent" numeric(19,4) NOT NULL DEFAULT '0', "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."operational_budget_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" uuid NOT NULL, "department_id" uuid, CONSTRAINT "PK_c6b0943065b23247de33900f849" PRIMARY KEY ("operational_budget_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a1f945f2e8583777beda1f59a" ON "operational_budget" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_id" uuid NOT NULL, "employee_name" character varying(255) NOT NULL, "employee_id" character varying(100), "base_salary" numeric(19,4) NOT NULL, "bonus" numeric(19,4) NOT NULL DEFAULT '0', "overtime" numeric(19,4) NOT NULL DEFAULT '0', "other_allowances" numeric(19,4) NOT NULL DEFAULT '0', "pension_deduction" numeric(19,4) NOT NULL DEFAULT '0', "tax_deduction" numeric(19,4) NOT NULL DEFAULT '0', "net_pay" numeric(19,4) NOT NULL, "pay_period_start" date NOT NULL, "pay_period_end" date NOT NULL, "payment_date" date NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'PAID', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processed_by_user_id" uuid NOT NULL, CONSTRAINT "PK_3329186685dcfe2e5a2c6d5e3e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."budget_category_type_enum" AS ENUM('CAPEX', 'OPEX')`,
    );
    await queryRunner.query(
      `CREATE TABLE "budget_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "name" character varying(255) NOT NULL, "description" text, "type" "public"."budget_category_type_enum" NOT NULL DEFAULT 'OPEX', "is_system_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_af6f95ccfa1f460edca6b488803" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb70ecb18a4e9dd18e5631cc31" ON "budget_category" ("tenant_id", "name") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "max_users" integer NOT NULL DEFAULT '10'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "max_storage_gb" integer NOT NULL DEFAULT '50'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "price" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "auditRetentionDays" integer NOT NULL DEFAULT '90'`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "sessionTimeoutMinutes" integer NOT NULL DEFAULT '60'`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "enableGlobalMfa" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "sendgridApiKey" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "erpProvider" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "erpApiKey" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "erpBaseUrl" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_hash"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_hash" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" ADD CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f" FOREIGN KEY ("wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" ADD CONSTRAINT "FK_000bafb36cabbe367711de78051" FOREIGN KEY ("category_id") REFERENCES "wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1" FOREIGN KEY ("parent_wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f" FOREIGN KEY ("category_id") REFERENCES "wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD CONSTRAINT "FK_d012c91b9b1ee791bcf10783712" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_3a12db4eff19efee3d056a5e665" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_5bb846d8998501d61b4d03102d5" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_ff9a8acc12a306491a2e68ffde9" FOREIGN KEY ("received_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_audit" ADD CONSTRAINT "FK_8621cfa8010257f3cb17f730dff" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_audit" ADD CONSTRAINT "FK_07a101eb62ca0e20269b4eb338f" FOREIGN KEY ("performed_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" ADD CONSTRAINT "FK_8b20d6ab5a308ae969716de9280" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" ADD CONSTRAINT "FK_cd7c77679c19877f77b22d433f3" FOREIGN KEY ("wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" ADD CONSTRAINT "FK_d303c886165202b23a4a55b4eb2" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_expense" ADD CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50" FOREIGN KEY ("operational_budget_category_id") REFERENCES "operational_budget_category"("operational_budget_category_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_period_allocation" ADD CONSTRAINT "FK_cc263ff85608e7b23b07b8679ff" FOREIGN KEY ("operational_budget_category_id") REFERENCES "operational_budget_category"("operational_budget_category_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_category" ADD CONSTRAINT "FK_ac963ad15d212a782b1989f41af" FOREIGN KEY ("operational_budget_id") REFERENCES "operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget" ADD CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_d7fc1d2b36c496da7d2df943e73" FOREIGN KEY ("operational_budget_id") REFERENCES "operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entry" ADD CONSTRAINT "FK_cdf0ff76929b82f8fc1535f2866" FOREIGN KEY ("processed_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payroll_entry" DROP CONSTRAINT "FK_cdf0ff76929b82f8fc1535f2866"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entry" DROP CONSTRAINT "FK_d7fc1d2b36c496da7d2df943e73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget" DROP CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_category" DROP CONSTRAINT "FK_ac963ad15d212a782b1989f41af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_period_allocation" DROP CONSTRAINT "FK_cc263ff85608e7b23b07b8679ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_expense" DROP CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP CONSTRAINT "FK_d303c886165202b23a4a55b4eb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP CONSTRAINT "FK_cd7c77679c19877f77b22d433f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lpo" DROP CONSTRAINT "FK_8b20d6ab5a308ae969716de9280"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_audit" DROP CONSTRAINT "FK_07a101eb62ca0e20269b4eb338f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_audit" DROP CONSTRAINT "FK_8621cfa8010257f3cb17f730dff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_inflow" DROP CONSTRAINT "FK_ff9a8acc12a306491a2e68ffde9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_inflow" DROP CONSTRAINT "FK_5bb846d8998501d61b4d03102d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_3a12db4eff19efee3d056a5e665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP CONSTRAINT "FK_d012c91b9b1ee791bcf10783712"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469"`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" DROP CONSTRAINT "FK_000bafb36cabbe367711de78051"`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" DROP CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_hash"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_hash" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "erpBaseUrl"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "erpApiKey"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "erpProvider"`);
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "sendgridApiKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "enableGlobalMfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "sessionTimeoutMinutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "auditRetentionDays"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "price"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "expires_at"`);
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "max_storage_gb"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "max_users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb70ecb18a4e9dd18e5631cc31"`,
    );
    await queryRunner.query(`DROP TABLE "budget_category"`);
    await queryRunner.query(`DROP TYPE "public"."budget_category_type_enum"`);
    await queryRunner.query(`DROP TABLE "payroll_entry"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a1f945f2e8583777beda1f59a"`,
    );
    await queryRunner.query(`DROP TABLE "operational_budget"`);
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_02d85ba5b35930e2e448d77eb3"`,
    );
    await queryRunner.query(`DROP TABLE "operational_budget_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8db201c90d6b5a4956da53ecac"`,
    );
    await queryRunner.query(
      `DROP TABLE "operational_budget_period_allocation"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_period_allocation_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ec3e4d84a24a5d1902cde3173"`,
    );
    await queryRunner.query(`DROP TABLE "operational_expense"`);
    await queryRunner.query(
      `DROP TYPE "public"."operational_expense_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3510976724f58f0bc7af9b2b63"`,
    );
    await queryRunner.query(`DROP TABLE "lpo"`);
    await queryRunner.query(`DROP TYPE "public"."lpo_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f2daa2ca3c296a84ff0e8ba58e"`,
    );
    await queryRunner.query(`DROP TABLE "project_audit"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c7279644b6ed957453aa8ca33"`,
    );
    await queryRunner.query(`DROP TABLE "project_inflow"`);
    await queryRunner.query(`DROP TABLE "project"`);
    await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
    await queryRunner.query(`DROP TABLE "wbs_budget"`);
    await queryRunner.query(`DROP TYPE "public"."wbs_budget_status_enum"`);
    await queryRunner.query(`DROP TABLE "wbs_category"`);
    await queryRunner.query(`DROP TABLE "live_expense"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_timestamp" ON "audit_log" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_userId_action_tenantId" ON "audit_log" ("action", "tenantId", "userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d79be558ff58a353061c6b1a8" ON "user" ("email", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_tenant_id_is_active" ON "user" ("is_active", "tenant_id") `,
    );
  }
}
