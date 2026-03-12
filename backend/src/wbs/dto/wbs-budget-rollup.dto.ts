export interface WbsBudgetRollupDto {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_paid_rollup: number;
  total_paid_self: number;
  total_committed_lpo: number;
  status: string;
  category_id: string | null;
  project_id: string;
  sort_order: number;
  uom: string | null;
  quantity_budgeted: number | null;
  days_budgeted: number | null;
  unit_cost_budgeted: number | null;
  custom_metadata: any;
}
