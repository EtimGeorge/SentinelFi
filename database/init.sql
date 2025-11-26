-- Phase 1 Deliverable: Finalized PostgreSQL Schema with Template for Multi-Tenancy

-- 1. TENANT MASTER MANAGEMENT (Public/Master Schema)
-- This table tracks all clients (tenants) and their dedicated schemas.
CREATE TABLE IF NOT EXISTS tenant_master (
    id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(255) UNIQUE NOT NULL,
    schema_name VARCHAR(63) UNIQUE NOT NULL, -- The physical schema name for isolation (Schema-per-Tenant)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEMPLATE SCHEMA CREATION
-- This schema defines the structure that will be COPIED for every new tenant (US-004).
-- This ensures a consistent, auditable financial model across the entire SaaS platform.
CREATE SCHEMA IF NOT EXISTS client_template;

-- 3. WBS & BUDGET STRUCTURE (Within the client_template schema)
-- Crucial for hierarchy (CTE) and financial planning (ACID).
CREATE TABLE client_template.wbs_budget (
    wbs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_wbs_id UUID REFERENCES client_template.wbs_budget(wbs_id), -- For Recursive CTEs (Hierarchy)
    wbs_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., '1.6.1'
    description TEXT NOT NULL,
    unit_cost_budgeted NUMERIC(19, 4) NOT NULL,
    quantity_budgeted NUMERIC(19, 4) NOT NULL,
    duration_days_budgeted INTEGER,
    total_cost_budgeted NUMERIC(19, 4) GENERATED ALWAYS AS (unit_cost_budgeted * quantity_budgeted) STORED, -- Computed column for auditability
    is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- Requires Finance approval
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast hierarchy traversal and lookups
CREATE INDEX IF NOT EXISTS idx_wbs_parent ON client_template.wbs_budget(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_wbs_code ON client_template.wbs_budget(wbs_code);

-- 4. LIVE EXPENSE TRACKING STRUCTURE (Within the client_template schema)
-- Designed for high-integrity write operations by the Assigned Project User (US-001).
CREATE TABLE client_template.live_expense (
    expense_id BIGSERIAL PRIMARY KEY,
    wbs_id UUID NOT NULL REFERENCES client_template.wbs_budget(wbs_id),
    user_id UUID NOT NULL, -- Will link to the Assigned Project User (ID from Auth service)
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    item_description TEXT NOT NULL,
    actual_unit_cost NUMERIC(19, 4) NOT NULL,
    actual_quantity NUMERIC(19, 4) NOT NULL,
    commitment_lpo_amount NUMERIC(19, 4) DEFAULT 0.00,
    actual_paid_amount NUMERIC(19, 4) NOT NULL,
    document_reference VARCHAR(255), -- Invoice/PV number
    notes_justification TEXT,
    variance_flag VARCHAR(50) DEFAULT 'NO_VARIANCE', -- Flagged by the live Rule Engine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast financial lookups by WBS and date (for US-002 reporting)
CREATE INDEX IF NOT EXISTS idx_expense_wbs ON client_template.live_expense(wbs_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON client_template.live_expense(expense_date);