// shared/types/operational-budget.ts

export enum OperationalBudgetType {
  COMPANY_WIDE = "company_wide",
  DEPARTMENTAL = "departmental",
  PROJECT_SPECIFIC = "project_specific",
  RECURRING = "recurring",
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

// Canonical unified OPEX analytics envelope — returned by
// GET /api/v1/operational-budgets/analytics (single source of truth for the
// analytics page; legacy three-shape endpoints remain untouched).
export interface OpexAnalyticsTotals {
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
  variancePct: number;
}

export interface OpexAnalyticsSeries {
  categoryId: string;
  name: string;
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
}

export interface OpexAnalyticsSeriesDepartment {
  departmentId: string;
  name: string;
  budgeted: number;
  actual: number;
  committed: number;
  variance: number;
}

export interface OpexAnalyticsPeriodRow {
  period: string;
  budgeted: number;
  actual: number;
  committed: number;
}

export interface OpexAnalyticsRecentExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  status: string;
}

export interface OpexAnalyticsMonthlyTrend {
  month: string;
  budgeted: number;
  actual: number;
}

export interface OpexAnalytics {
  totals: OpexAnalyticsTotals;
  byCategory: OpexAnalyticsSeries[];
  byDepartment: OpexAnalyticsSeriesDepartment[];
  byPeriod: OpexAnalyticsPeriodRow[];
  recentExpenses: OpexAnalyticsRecentExpense[];
  monthlyTrend: OpexAnalyticsMonthlyTrend[];
}
