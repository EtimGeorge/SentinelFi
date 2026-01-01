import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialClientTemplateSchema1703980800001 implements MigrationInterface { // Unique timestamp

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create client_template schema
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS client_template;`);

        // WBS Budget Status Enum
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wbs_budget_status_enum') THEN
                    CREATE TYPE "client_template"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected');
                END IF;
            END $$;
        `);

        // WbsBudget Table
        await queryRunner.query(`
            CREATE TABLE "client_template"."wbs_budget" (
                "wbs_id" uuid NOT NULL DEFAULT public.gen_random_uuid(),
                "parent_wbs_id" uuid,
                "wbs_code" character varying(50) NOT NULL,
                "description" text NOT NULL,
                "unit_cost_budgeted" numeric(19,4) NOT NULL,
                "quantity_budgeted" numeric(19,4) NOT NULL,
                "duration_days_budgeted" integer,
                "total_cost_budgeted" numeric(19,4) NOT NULL,
                "status" "client_template"."wbs_budget_status_enum" NOT NULL DEFAULT 'pending',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                CONSTRAINT "UQ_wbs_budget_code" UNIQUE ("wbs_code"),
                CONSTRAINT "PK_wbs_budget_id" PRIMARY KEY ("wbs_id"),
                CONSTRAINT "FK_wbs_budget_parent" FOREIGN KEY ("parent_wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_wbs_budget_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // LiveExpense Table
        await queryRunner.query(`
            CREATE TABLE "client_template"."live_expense" (
                "expense_id" SERIAL NOT NULL,
                "wbs_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "expense_date" date NOT NULL DEFAULT CURRENT_DATE,
                "item_description" text NOT NULL,
                "actual_unit_cost" numeric(19,4) NOT NULL,
                "actual_quantity" numeric(19,4) NOT NULL,
                "commitment_lpo_amount" numeric(19,4) NOT NULL DEFAULT '0.00',
                "actual_paid_amount" numeric(19,4) NOT NULL,
                "document_reference" character varying(255),
                "notes_justification" text,
                "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_live_expense_id" PRIMARY KEY ("expense_id"),
                CONSTRAINT "FK_live_expense_wbs" FOREIGN KEY ("wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_live_expense_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT IF EXISTS "FK_live_expense_user"`);
        await queryRunner.query(`ALTER TABLE "client_template"."live_expense" DROP CONSTRAINT IF EXISTS "FK_live_expense_wbs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "client_template"."live_expense"`);

        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT IF EXISTS "FK_wbs_budget_user"`);
        await queryRunner.query(`ALTER TABLE "client_template"."wbs_budget" DROP CONSTRAINT IF EXISTS "FK_wbs_budget_parent"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "client_template"."wbs_budget"`);

        await queryRunner.query(`DROP TYPE IF EXISTS "client_template"."wbs_budget_status_enum"`);
        await queryRunner.query(`DROP SCHEMA IF EXISTS client_template CASCADE;`);
    }
}
