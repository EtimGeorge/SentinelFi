-- SentinelFi Tenant Schema - Single Source of Truth
-- Version: 1.1
-- Last Updated: 2026-01-05
-- DDL for tables created within a new tenant's schema.

-- WBS Budget Table
-- This table stores the planned budget items in a hierarchical structure.
CREATE TABLE IF NOT EXISTS wbs_budget (
    wbs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_wbs_id UUID REFERENCES wbs_budget(wbs_id) ON DELETE SET NULL,
    user_id UUID NOT NULL, -- Who created/owns this budget item
    wbs_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    unit_cost_budgeted NUMERIC(19, 4) NOT NULL DEFAULT 0.00,
    quantity_budgeted NUMERIC(19, 4) NOT NULL DEFAULT 0.00,
    total_cost_budgeted NUMERIC(19, 4) NOT NULL DEFAULT 0.00,
    duration_days_budgeted INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Live Expense Table
-- This table stores actual expenses logged against WBS budget items.
CREATE TABLE IF NOT EXISTS live_expense (
    expense_id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for auto-incrementing number, matching the entity
    wbs_id UUID NOT NULL REFERENCES wbs_budget(wbs_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL, -- Who logged the expense
    item_description TEXT NOT NULL,
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_unit_cost NUMERIC(19, 4) NOT NULL,
    actual_quantity NUMERIC(19, 4) NOT NULL,
    commitment_lpo_amount NUMERIC(19, 4) DEFAULT 0.00,
    actual_paid_amount NUMERIC(19, 4) NOT NULL,
    variance_flag VARCHAR(50) NOT NULL DEFAULT 'NO_VARIANCE',
    document_reference VARCHAR(255),
    notes_justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
-- These help speed up common queries.
CREATE INDEX IF NOT EXISTS idx_wbs_budget_parent_wbs_id ON wbs_budget (parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_wbs_budget_wbs_code ON wbs_budget (wbs_code); -- NEW
CREATE INDEX IF NOT EXISTS idx_live_expense_wbs_id ON live_expense (wbs_id);
CREATE INDEX IF NOT EXISTS idx_live_expense_variance_flag ON live_expense (variance_flag);
CREATE INDEX IF NOT EXISTS idx_live_expense_expense_date ON live_expense (expense_date); -- NEW for date range queries

-- Automated Timestamp Updates
-- Create a function to update the 'updated_at' column automatically.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to both tables.
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wbs_budget_updated_at') THEN
      CREATE TRIGGER update_wbs_budget_updated_at
      BEFORE UPDATE ON wbs_budget
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
   END IF;
END;
$$;

DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_live_expense_updated_at') THEN
      CREATE TRIGGER update_live_expense_updated_at
      BEFORE UPDATE ON live_expense
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
   END IF;
END;
$$;