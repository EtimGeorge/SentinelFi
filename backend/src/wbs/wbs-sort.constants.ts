export const WBS_BUDGET_SORT_COLUMNS: readonly string[] = [
  "wbs_code",
  "description",
  "status",
  "sort_order",
  "created_at",
  "updated_at",
  "total_cost_budgeted",
  "total_cost_actual",
  "unit_cost_budgeted",
  "quantity_budgeted",
  "project_id",
  "category_id",
];

export const LIVE_EXPENSE_SORT_COLUMNS: readonly string[] = [
  "created_at",
  "updated_at",
  "amount",
  "description",
  "expense_date",
];

export type WbsBudgetSortColumn = (typeof WBS_BUDGET_SORT_COLUMNS)[number];
export type LiveExpenseSortColumn = (typeof LIVE_EXPENSE_SORT_COLUMNS)[number];