import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedAtToUserEntity1767939107008 implements MigrationInterface {
    name = 'UpdatedAtToUserEntity1767939107008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "client_template"."wbs_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_73c7c495009c60748399c9cf90a" UNIQUE ("name", "tenant_id"), CONSTRAINT "PK_5df28f7dc4baaa36d9db6cca9da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "operational_budget_category" ("operational_budget_category_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "budgeted_amount" numeric(10,2) NOT NULL DEFAULT '0', "actual_spent" numeric(10,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3e38ea5566ccffb3b40ac725b20" PRIMARY KEY ("operational_budget_category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_02d85ba5b35930e2e448d77eb3" ON "operational_budget_category" ("tenant_id") `);
        await queryRunner.query(`CREATE TYPE "public"."operational_expense_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "operational_expense" ("operational_expense_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "operational_budget_category_id" uuid NOT NULL, "item_description" character varying(255) NOT NULL, "amount" numeric(10,2) NOT NULL, "expense_date" TIMESTAMP NOT NULL, "vendor" character varying(255), "receipt_url" character varying(255), "status" "public"."operational_expense_status_enum" NOT NULL DEFAULT 'PENDING', "logged_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dffb1a026b254442c6d74273a1f" PRIMARY KEY ("operational_expense_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ec3e4d84a24a5d1902cde3173" ON "operational_expense" ("tenant_id") `);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP COLUMN "duration_days_budgeted"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "PK_aadc2708e95703f6c2e2fe93975"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "expense_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "item_description"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "actual_unit_cost"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "actual_quantity"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "actual_paid_amount"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "client_template"."project" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD "category_id" uuid`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD "days_budgeted" integer`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD "updated_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "PK_63ca1ecf90dfa34da4087e9fcd4" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "project_id" uuid`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "category_id" uuid`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "updated_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "description" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "unit_cost" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "quantity" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "amount" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."operational_budget" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Assigned Project User'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_d012c91b9b1ee791bcf10783712"`);
        await queryRunner.query(`ALTER TYPE "client_template"."wbs_budget_status_enum" RENAME TO "wbs_budget_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "client_template"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected', 'draft')`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" TYPE "client_template"."wbs_budget_status_enum" USING "status"::"text"::"client_template"."wbs_budget_status_enum"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "client_template"."wbs_budget_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_1a1f945f2e8583777beda1f59a" ON "client_template"."operational_budget" ("tenant_id") `);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f" FOREIGN KEY ("category_id") REFERENCES "client_template"."wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_d012c91b9b1ee791bcf10783712" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_000bafb36cabbe367711de78051" FOREIGN KEY ("category_id") REFERENCES "client_template"."wbs_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational_budget_category" ADD CONSTRAINT "FK_ac963ad15d212a782b1989f41af" FOREIGN KEY ("operational_budget_id") REFERENCES "client_template"."operational_budget"("operational_budget_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational_expense" ADD CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50" FOREIGN KEY ("operational_budget_category_id") REFERENCES "operational_budget_category"("operational_budget_category_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operational_expense" DROP CONSTRAINT "FK_824e9f75611b5c39b7eba8c1a50"`);
        await queryRunner.query(`ALTER TABLE "operational_budget_category" DROP CONSTRAINT "FK_ac963ad15d212a782b1989f41af"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "FK_000bafb36cabbe367711de78051"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_d012c91b9b1ee791bcf10783712"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT "FK_49d6f917dacfd0b762dfac5117f"`);
        await queryRunner.query(`DROP INDEX "client_template"."IDX_1a1f945f2e8583777beda1f59a"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "client_template"."wbs_budget_status_enum_old" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" TYPE "client_template"."wbs_budget_status_enum_old" USING "status"::"text"::"client_template"."wbs_budget_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "client_template"."wbs_budget_status_enum"`);
        await queryRunner.query(`ALTER TYPE "client_template"."wbs_budget_status_enum_old" RENAME TO "wbs_budget_status_enum"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_d012c91b9b1ee791bcf10783712" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User', 'SuperAdmin')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Assigned Project User'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "client_template"."operational_budget" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "unit_cost"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "project_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT "PK_63ca1ecf90dfa34da4087e9fcd4"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP COLUMN "days_budgeted"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "client_template"."project" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "actual_paid_amount" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "actual_quantity" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "actual_unit_cost" numeric(19,4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "item_description" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD "expense_id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "PK_aadc2708e95703f6c2e2fe93975" PRIMARY KEY ("expense_id")`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" ADD "duration_days_budgeted" integer`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ec3e4d84a24a5d1902cde3173"`);
        await queryRunner.query(`DROP TABLE "operational_expense"`);
        await queryRunner.query(`DROP TYPE "public"."operational_expense_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02d85ba5b35930e2e448d77eb3"`);
        await queryRunner.query(`DROP TABLE "operational_budget_category"`);
        await queryRunner.query(`DROP TABLE "client_template"."wbs_category"`);
    }

}
