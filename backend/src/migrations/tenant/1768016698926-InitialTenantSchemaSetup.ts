import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialTenantSchemaSetup1768016698926 implements MigrationInterface {
  name = "InitialTenantSchemaSetup1768016698926";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "client_template"."live_expense" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "project_id" uuid, "wbs_id" uuid NOT NULL, "category_id" uuid, "updated_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "expense_date" date NOT NULL DEFAULT ('now'::text)::date, "description" text NOT NULL, "unit_cost" numeric(19,4) NOT NULL, "quantity" numeric(19,4) NOT NULL, "commitment_lpo_amount" numeric(19,4) NOT NULL DEFAULT '0', "amount" numeric(19,4) NOT NULL, "document_reference" character varying(255), "notes_justification" text, "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_63ca1ecf90dfa34da4087e9fcd4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."wbs_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_73c7c495009c60748399c9cf90a" UNIQUE ("name", "tenant_id"), CONSTRAINT "PK_5df28f7dc4baaa36d9db6cca9da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "client_template"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected', 'draft')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."wbs_budget" ("wbs_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "parent_wbs_id" uuid, "category_id" uuid, "wbs_code" character varying(50) NOT NULL, "description" text NOT NULL, "unit_cost_budgeted" numeric(19,4) NOT NULL, "quantity_budgeted" numeric(19,4) NOT NULL, "days_budgeted" integer, "total_cost_budgeted" numeric(19,4) NOT NULL, "total_cost_actual" numeric(19,4) NOT NULL DEFAULT '0', "status" "client_template"."wbs_budget_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "user_id" uuid, CONSTRAINT "UQ_a2a63a701294cc192e78fb2d023" UNIQUE ("wbs_code"), CONSTRAINT "PK_5b0a844da38bcd3e566b601bf43" PRIMARY KEY ("wbs_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "client_template"."project_status_enum" AS ENUM('active', 'archived', 'completed', 'on_hold')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."project" ("project_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_name" character varying(255) NOT NULL, "rfq_number" text, "sow_details" text, "notes" text, "status" "client_template"."project_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by_user_id" uuid NOT NULL, CONSTRAINT "UQ_4ace5911e3c08b15b7034dd89b4" UNIQUE ("project_name"), CONSTRAINT "PK_1a480c5734c5aacb9cef7b1499d" PRIMARY KEY ("project_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "client_template"."operational_expense_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."operational_expense" ("operational_expense_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_category_id" uuid NOT NULL, "item_description" character varying(255) NOT NULL, "amount" numeric(10,2) NOT NULL, "expense_date" TIMESTAMP NOT NULL, "vendor" character varying(255), "receipt_url" character varying(255), "status" "client_template"."operational_expense_status_enum" NOT NULL DEFAULT 'PENDING', "logged_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dffb1a026b254442c6d74273a1f" PRIMARY KEY ("operational_expense_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ec3e4d84a24a5d1902cde3173" ON "client_template"."operational_expense" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."operational_budget_category" ("operational_budget_category_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "budgeted_amount" numeric(10,2) NOT NULL DEFAULT '0', "actual_spent" numeric(10,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3e38ea5566ccffb3b40ac725b20" PRIMARY KEY ("operational_budget_category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02d85ba5b35930e2e448d77eb3" ON "client_template"."operational_budget_category" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "client_template"."operational_budget_type_enum" AS ENUM('departmental', 'company-wide', 'recurring')`,
    );
    await queryRunner.query(
      `CREATE TYPE "client_template"."operational_budget_status_enum" AS ENUM('active', 'closed', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_template"."operational_budget" ("operational_budget_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "type" "client_template"."operational_budget_type_enum" NOT NULL DEFAULT 'company-wide', "budgeted_amount" numeric(19,4) NOT NULL, "actual_spent" numeric(19,4) NOT NULL DEFAULT '0', "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "client_template"."operational_budget_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" uuid NOT NULL, "department_id" uuid, CONSTRAINT "PK_c6b0943065b23247de33900f849" PRIMARY KEY ("operational_budget_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a1f945f2e8583777beda1f59a" ON "client_template"."operational_budget" ("tenant_id") `,
    );

    await queryRunner.query(
      `ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f" FOREIGN KEY ("wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_000bafb36cabbe367711de78051" FOREIGN KEY ("category_id") REFERENCES "client_template"."wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469" FOREIGN KEY ("project_id") REFERENCES "client_template"."project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1" FOREIGN KEY ("parent_wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f" FOREIGN KEY ("category_id") REFERENCES "client_template"."wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_d012c91b9b1ee791bcf10783712" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."project" ADD CONSTRAINT "FK_3a12db4eff19efee3d056a5e665" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_expense" ADD CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50" FOREIGN KEY ("operational_budget_category_id") REFERENCES "client_template"."operational_budget_category"("operational_budget_category_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_budget_category" ADD CONSTRAINT "FK_ac963ad15d212a782b1989f41af" FOREIGN KEY ("operational_budget_id") REFERENCES "client_template"."operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_budget" ADD CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_budget" DROP CONSTRAINT "FK_61fdf2278ad28f4509d6064c0a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_budget_category" DROP CONSTRAINT "FK_ac963ad15d212a782b1989f41af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."operational_expense" DROP CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."project" DROP CONSTRAINT "FK_3a12db4eff19efee3d056a5e665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_d012c91b9b1ee791bcf10783712"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_9ee635d5455ae8d76ff250a91e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_f0d1d068032b7cba4c31f4cc469"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "FK_000bafb36cabbe367711de78051"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "FK_042e8c47b849de4fe13e5f3a34f"`,
    );

    await queryRunner.query(
      `DROP INDEX "client_template"."IDX_1a1f945f2e8583777beda1f59a"`,
    );
    await queryRunner.query(
      `DROP TABLE "client_template"."operational_budget"`,
    );
    await queryRunner.query(
      `DROP TYPE "client_template"."operational_budget_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "client_template"."operational_budget_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "client_template"."IDX_02d85ba5b35930e2e448d77eb3"`,
    );
    await queryRunner.query(
      `DROP TABLE "client_template"."operational_budget_category"`,
    );
    await queryRunner.query(
      `DROP INDEX "client_template"."IDX_0ec3e4d84a24a5d1902cde3173"`,
    );
    await queryRunner.query(
      `DROP TABLE "client_template"."operational_expense"`,
    );
    await queryRunner.query(
      `DROP TYPE "client_template"."operational_expense_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "client_template"."project"`);
    await queryRunner.query(
      `DROP TYPE "client_template"."project_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "client_template"."wbs_budget"`);
    await queryRunner.query(
      `DROP TYPE "client_template"."wbs_budget_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "client_template"."wbs_category"`);
    await queryRunner.query(`DROP TABLE "client_template"."live_expense"`);
  }
}
