-- SQL DDL FOR NEW TENANT SCHEMA PROVISIONING
-- This script contains the DDL for tables and types to be created in each new tenant's schema.
-- Placeholders: {schema_name} (full schema name), {schema_name_short} (for unique constraint names)

-- ENUM TYPES
CREATE TYPE {schema_name}."wbs_budget_status_enum" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE {schema_name}."project_status_enum" AS ENUM('active', 'archived', 'completed', 'on_hold');
CREATE TYPE {schema_name}."operational_budget_type_enum" AS ENUM('departmental', 'company-wide', 'recurring');
CREATE TYPE {schema_name}."operational_budget_status_enum" AS ENUM('active', 'closed', 'archived');


-- TABLES

-- {schema_name}.project
CREATE TABLE {schema_name}."project" (
    "project_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "project_name" character varying(255) NOT NULL,
    "rfq_number" text,
    "sow_details" text,
    "notes" text,
    "status" {schema_name}."project_status_enum" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE,
    "created_by_user_id" uuid NOT NULL,
    CONSTRAINT "UQ_project_name_{schema_name_short}" UNIQUE ("project_name"),
    CONSTRAINT "PK_project_id_{schema_name_short}" PRIMARY KEY ("project_id")
);

-- {schema_name}.wbs_budget
CREATE TABLE {schema_name}."wbs_budget" (
    "wbs_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" uuid NOT NULL,
    "parent_wbs_id" uuid,
    "wbs_code" character varying(50) NOT NULL,
    "description" text NOT NULL,
    "unit_cost_budgeted" numeric(19,4) NOT NULL,
    "quantity_budgeted" numeric(19,4) NOT NULL,
    "duration_days_budgeted" integer,
    "total_cost_budgeted" numeric(19,4) NOT NULL,
    "total_cost_actual" numeric(19,4) NOT NULL DEFAULT '0',
    "status" {schema_name}."wbs_budget_status_enum" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL,
    CONSTRAINT "UQ_wbs_code_{schema_name_short}" UNIQUE ("wbs_code"),
    CONSTRAINT "PK_wbs_id_{schema_name_short}" PRIMARY KEY ("wbs_id")
);

-- {schema_name}.operational_budget
CREATE TABLE {schema_name}."operational_budget" (
    "operational_budget_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "description" text,
    "type" {schema_name}."operational_budget_type_enum" NOT NULL DEFAULT 'company-wide',
    "budgeted_amount" numeric(19,4) NOT NULL,
    "actual_spent" numeric(19,4) NOT NULL DEFAULT '0',
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "status" {schema_name}."operational_budget_status_enum" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE,
    "created_by_user_id" uuid NOT NULL,
    "department_id" uuid,
    CONSTRAINT "PK_operational_budget_id_{schema_name_short}" PRIMARY KEY ("operational_budget_id")
);

-- {schema_name}.live_expense
CREATE TABLE {schema_name}."live_expense" (
    "expense_id" SERIAL NOT NULL,
    "wbs_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "expense_date" date NOT NULL DEFAULT ('now'::text)::date,
    "item_description" text NOT NULL,
    "actual_unit_cost" numeric(19,4) NOT NULL,
    "actual_quantity" numeric(19,4) NOT NULL,
    "commitment_lpo_amount" numeric(19,4) NOT NULL DEFAULT '0',
    "actual_paid_amount" numeric(19,4) NOT NULL,
    "document_reference" character varying(255),
    "notes_justification" text,
    "variance_flag" character varying(50) NOT NULL DEFAULT 'NO_VARIANCE',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_live_expense_id_{schema_name_short}" PRIMARY KEY ("expense_id")
);


-- FOREIGN KEY CONSTRAINTS

ALTER TABLE {schema_name}."project" ADD CONSTRAINT "FK_project_created_by_user_id_{schema_name_short}" FOREIGN KEY ("created_by_user_id") REFERENCES public."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE {schema_name}."wbs_budget" ADD CONSTRAINT "FK_wbs_budget_project_id_{schema_name_short}" FOREIGN KEY ("project_id") REFERENCES {schema_name}."project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE {schema_name}."wbs_budget" ADD CONSTRAINT "FK_wbs_budget_parent_wbs_id_{schema_name_short}" FOREIGN KEY ("parent_wbs_id") REFERENCES {schema_name}."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE {schema_name}."wbs_budget" ADD CONSTRAINT "FK_wbs_budget_user_id_{schema_name_short}" FOREIGN KEY ("user_id") REFERENCES public."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE {schema_name}."operational_budget" ADD CONSTRAINT "FK_operational_budget_created_by_user_id_{schema_name_short}" FOREIGN KEY ("created_by_user_id") REFERENCES public."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE {schema_name}."live_expense" ADD CONSTRAINT "FK_live_expense_wbs_id_{schema_name_short}" FOREIGN KEY ("wbs_id") REFERENCES {schema_name}."wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
