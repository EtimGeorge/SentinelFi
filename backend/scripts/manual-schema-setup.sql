-- SQL DDL FOR SENTINELFI APPLICATION SCHEMA
-- To be executed manually in your NeonDB editor or psql client.

-- WARNING: This script will DESTROY ALL DATA in the 'public' and 'client_template' schemas.
-- Only run this if you want a clean database slate.

-- 1. DROP AND RECREATE SCHEMAS (Destructive)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

DROP SCHEMA IF EXISTS client_template CASCADE;
CREATE SCHEMA client_template;

-- 2. CREATE NECESSARY EXTENSIONS (in public schema)
-- These are required for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. CREATE ENUM TYPES (in respective schemas)
-- public.user_role_enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User');
    END IF;
END $$;

-- client_template.wbs_budget_status_enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wbs_budget_status_enum') THEN
        CREATE TYPE "client_template"."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected');
    END IF;
END $$;


-- 4. CREATE TABLES

-- public.tenants Table
CREATE TABLE "public"."tenants" (
    "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "project_name" character varying(255) NOT NULL,
    "schema_name" character varying(63) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_tenant_name" UNIQUE ("name"),
    CONSTRAINT "UQ_schema_name" UNIQUE ("schema_name"),
    CONSTRAINT "PK_tenant_id" PRIMARY KEY ("id")
);

-- public.user Table
CREATE TABLE "public"."user" (
    "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
    "email" character varying NOT NULL,
    "password_hash" character varying NOT NULL,
    "role" "public"."user_role_enum" NOT NULL DEFAULT 'Assigned Project User',
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "tenant_id" uuid,
    "reset_password_token" character varying,
    "reset_password_expires" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "UQ_user_email" UNIQUE ("email"),
    CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
);

-- public.wbs_category Table
CREATE TABLE "public"."wbs_category" (
    "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
    "code" character varying(10) NOT NULL,
    "description" character varying(255) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_wbs_category_code" UNIQUE ("code"),
    CONSTRAINT "PK_wbs_category_id" PRIMARY KEY ("id")
);

-- client_template.wbs_budget Table
CREATE TABLE "client_template"."wbs_budget" (
    "wbs_id" uuid NOT NULL DEFAULT public.gen_random_uuid(), -- uses pgcrypto
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
    CONSTRAINT "PK_wbs_budget_id" PRIMARY KEY ("wbs_id")
);

-- client_template.live_expense Table
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
    CONSTRAINT "PK_live_expense_id" PRIMARY KEY ("expense_id")
);

-- 5. CREATE FOREIGN KEY CONSTRAINTS
-- FK for public.user to public.tenants
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_tenant') THEN
        ALTER TABLE "public"."user" ADD CONSTRAINT "FK_user_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- FK for client_template.wbs_budget to public.user
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wbs_budget_user') THEN
        ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_wbs_budget_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- FK for client_template.wbs_budget self-referencing parent_wbs_id
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wbs_budget_parent') THEN
        ALTER TABLE "client_template"."wbs_budget" ADD CONSTRAINT "FK_wbs_budget_parent" FOREIGN KEY ("parent_wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- FK for client_template.live_expense to client_template.wbs_budget
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_live_expense_wbs') THEN
        ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_live_expense_wbs" FOREIGN KEY ("wbs_id") REFERENCES "client_template"."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- FK for client_template.live_expense to public.user
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_live_expense_user') THEN
        ALTER TABLE "client_template"."live_expense" ADD CONSTRAINT "FK_live_expense_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- 6. CREATE INDEXES (for performance)
CREATE INDEX IF NOT EXISTS idx_wbs_parent ON "client_template"."wbs_budget"(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_wbs_code ON "client_template"."wbs_budget"(wbs_code);
CREATE INDEX IF NOT EXISTS idx_expense_wbs ON "client_template"."live_expense"(wbs_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON "client_template"."live_expense"(expense_date);




-- 1. Create the public.migrations table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL,
    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);
-- 2. Insert the record for InitialPasswordResetMigration
INSERT INTO "public"."migrations" ("timestamp", "name") VALUES (1767201635511, 'InitialPasswordResetMigration1767201635511');