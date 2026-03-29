// shared/types/operational-budget.ts

export enum OperationalBudgetType {
  COMPANY_WIDE = "company_wide",
  DEPARTMENTAL = "departmental",
  PROJECT_SPECIFIC = "project_specific",
}

export enum OperationalBudgetStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface OperationalBudget {
  operational_budget_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: OperationalBudgetType;
  budgeted_amount: number;
  actual_spent: number;
  start_date: Date | string;
  end_date: Date | string;
  status: OperationalBudgetStatus;
  created_at: Date | string;
  updated_at: Date | string | null;
  created_by_user_id: string;
  department_id: string | null;
}
