import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialTenantSetupAndClientTemplate1767773720553 implements MigrationInterface {
    name = 'InitialTenantSetupAndClientTemplate1767773720553'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "client_template";`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_tenant_id_tenants_tenant_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_tenantId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_actionType"`);
        await queryRunner.query(`CREATE TYPE "client_template"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "client_template"."wbs_budget" ("wbs_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "parent_wbs_id" uuid, "wbs_code" character varying(50) NOT NULL, "description" text NOT NULL, "unit_cost_budgeted" numeric(19,4) NOT NULL, "quantity_budgeted" numeric(19,4) NOT NULL, "duration_days_budgeted" integer, "total_cost_budgeted" numeric(19,4) NOT NULL, "total_cost_actual" numeric(19,4) NOT NULL DEFAULT '0', "status" "client_template"."wbs_budget_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "UQ_a2a63a701294cc192e78fb2d023" UNIQUE ("wbs_code"), CONSTRAINT "PK_5b0a844da38bcd3e566b601bf43" PRIMARY KEY ("wbs_id"))`);
        await queryRunner.query(`CREATE TYPE "client_template"."project_status_enum" AS ENUM('active', 'archived', 'completed', 'on_hold')`);
        await queryRunner.query(`CREATE TABLE "client_template"."project" ("project_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_name" character varying(255) NOT NULL, "rfq_number" text, "sow_details" text, "notes" text, "status" "client_template"."project_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" uuid NOT NULL, CONSTRAINT "UQ_4ace5911e3c08b15b7034dd89b4" UNIQUE ("project_name"), CONSTRAINT "PK_1a480c5734c5aacb9cef7b1499d" PRIMARY KEY ("project_id"))`);
        await queryRunner.query(`CREATE TYPE "client_template"."operational_budget_type_enum" AS ENUM('departmental', 'company-wide', 'recurring')`);
        await queryRunner.query(`CREATE TYPE "client_template"."operational_budget_status_enum" AS ENUM('active', 'closed', 'archived')`);
        await queryRunner.query(`CREATE TABLE "client_template"."operational_budget" ("operational_budget_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "type" "client_template"."operational_budget_type_enum" NOT NULL DEFAULT 'company-wide', "budgeted_amount" numeric(19,4) NOT NULL, "actual_spent" numeric(19,4) NOT NULL DEFAULT '0', "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "client_template"."operational_budget_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" uuid NOT NULL, "department_id" uuid, CONSTRAINT "PK_c6b0943065b23247de33900f849" PRIMARY KEY ("operational_budget_id"))`);
        await queryRunner.query(`CREATE TABLE "client_template"."live_expense" ("expense_id" SERIAL NOT NULL, "wbs_id" uuid NOT NULL, "user_id" uuid NOT NULL, "expense_date" date NOT NULL DEFAULT ('now'::text)::date, "item_description" text NOT NULL, "actual_unit_cost" numeric(19,4) NOT NULL, "actual_quantity" numeric(19,4) NOT NULL, "commitment_lpo_amount" numeric(19,4) NOT NULL DEFAULT '0', "actual_paid_amount" numeric(19,4) NOT NULL, "document_reference" character varying(255), "notes_justification" text, "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aadc2708e95703f6c2e2fe93975" PRIMARY KEY ("expense_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4167b21288ab6e16239cb1d501" ON "audit_log" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4c104b4699450ad5bb095033e1" ON "audit_log" ("actionType") `);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_ae07d48a61ca20ab3586d397a71" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469" FOREIGN KEY ("project_id") REFERENCES "client_template"."project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1" FOREIGN KEY ("parent_wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_d012c91b9b1ee791bcf10783712" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."project" ADD CONSTRAINT "FK_3a12db4eff19efee3d056a5e665" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."operational_budget" ADD CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f" FOREIGN KEY ("wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f"`);
        await queryRunner.query(`ALTER TABLE "client_template"."operational_budget" DROP CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7"`);
        await queryRunner.query(`ALTER TABLE "client_template"."project" DROP CONSTRAINT "FK_3a12db4eff19efee3d056a5e665"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_d012c91b9b1ee791bcf10783712"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_ae07d48a61ca20ab3586d397a71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c104b4699450ad5bb095033e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4167b21288ab6e16239cb1d501"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User', 'SuperAdmin')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Assigned Project User'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`DROP TABLE "client_template"."live_expense"`);
        await queryRunner.query(`DROP TABLE "client_template"."operational_budget"`);
        await queryRunner.query(`DROP TYPE "client_template"."operational_budget_status_enum"`);
        await queryRunner.query(`DROP TYPE "client_template"."operational_budget_type_enum"`);
        await queryRunner.query(`DROP TABLE "client_template"."project"`);
        await queryRunner.query(`DROP TYPE "client_template"."project_status_enum"`);
        await queryRunner.query(`DROP TABLE "client_template"."wbs_budget"`);
        await queryRunner.query(`DROP TYPE "client_template"."wbs_budget_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_actionType" ON "audit_log" ("actionType") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_tenantId" ON "audit_log" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_user_tenant_id_tenants_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
