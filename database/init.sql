-- SQL DDL FOR SentinelFi INITIAL SCHEMA SETUP
-- This script provides the foundational schema for public tables,
-- aligning with current TypeORM entity definitions.

-- 1. CREATE NECESSARY EXTENSIONS (in public schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE ENUM TYPES (in public schema)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User', 'SuperAdmin');
    END IF;
END $$;

-- 3. CREATE TABLES

-- public.tenants Table (aligned with TenantEntity)
CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "tenant_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "schema_name" character varying(63) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_tenant_name" UNIQUE ("name"),
    CONSTRAINT "UQ_schema_name" UNIQUE ("schema_name"),
    CONSTRAINT "PK_tenants_tenant_id" PRIMARY KEY ("tenant_id")
);

-- public.user Table (aligned with UserEntity)
CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "email" character varying NOT NULL,
    "password_hash" character varying NOT NULL,
    "first_name" character varying(255), -- Nullable as per entity
    "last_name" character varying(255),  -- Nullable as per entity
    "role" "public"."user_role_enum" NOT NULL DEFAULT 'Assigned Project User',
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "tenant_id" uuid, -- Nullable as per entity
    "reset_password_token" character varying,
    "reset_password_expires" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "UQ_user_email" UNIQUE ("email"),
    CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
);

-- public.wbs_category Table (aligned with WbsCategoryEntity)
CREATE TABLE IF NOT EXISTS "public"."wbs_category" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "code" character varying(10) NOT NULL,
    "description" character varying(255) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_wbs_category_code" UNIQUE ("code"),
    CONSTRAINT "PK_wbs_category_id" PRIMARY KEY ("id")
);

-- 4. CREATE FOREIGN KEY CONSTRAINTS

-- FK for public.user to public.tenants
ALTER TABLE "public"."user" ADD CONSTRAINT "FK_user_tenant_id_tenants_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Ensure audit_log table is also created if it's considered part of the initial public schema setup
-- This is based on AuditLogEntity. If it should be created by migration, remove from here.
-- For now, including it as a foundational public table.
-- public.audit_log Table (aligned with AuditLogEntity)
CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "userId" uuid,
    "userEmail" character varying(255),
    "action" character varying(50) NOT NULL,
    "targetType" character varying(50),
    "targetId" uuid,
    "details" jsonb,
    "ipAddress" character varying(45),
    "tenantId" uuid,
    "actionType" character varying(50) NOT NULL,
    CONSTRAINT "PK_audit_log_id" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_audit_log_tenantId" ON "public"."audit_log" ("tenantId");
CREATE INDEX IF NOT EXISTS "IDX_audit_log_actionType" ON "public"."audit_log" ("actionType");