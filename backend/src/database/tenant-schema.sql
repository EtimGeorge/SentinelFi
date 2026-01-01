-- DDL for tenant-specific tables within a new schema (e.g., alpha_client_schema)

CREATE TABLE IF NOT EXISTS wbs_budget (
    wbs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_wbs_id UUID REFERENCES wbs_budget(wbs_id) ON DELETE CASCADE,
    wbs_code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    unit_cost_budgeted NUMERIC(19, 4) NOT NULL,
    quantity_budgeted NUMERIC(19, 4) NOT NULL,
    total_cost_budgeted NUMERIC(19, 4) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    duration_days_budgeted INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wbs_id UUID NOT NULL REFERENCES wbs_budget(wbs_id) ON DELETE RESTRICT,
    item_description VARCHAR(255) NOT NULL,
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_unit_cost NUMERIC(19, 4) NOT NULL,
    actual_quantity NUMERIC(19, 4) NOT NULL,
    commitment_lpo_amount NUMERIC(19, 4) DEFAULT 0.00,
    actual_paid_amount NUMERIC(19, 4) NOT NULL,
    variance_flag VARCHAR(50) NOT NULL DEFAULT 'NO_VARIANCE',
    document_reference VARCHAR(255),
    notes_justification TEXT,
    user_id UUID NOT NULL, -- References a user in the public schema (UserEntity)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wbs_budget_parent_wbs_id ON wbs_budget (parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_live_expense_wbs_id ON live_expense (wbs_id);
CREATE INDEX IF NOT EXISTS idx_live_expense_variance_flag ON live_expense (variance_flag);
