import { User } from './user';
import { Project } from './project';
import { WbsBudgetStatus } from './wbs-budget-status.enum';

/**
 * Represents a Work Breakdown Structure (WBS) budget item.
 * Shared type for frontend and backend.
 */
export interface WbsBudget {
  wbs_id: string;
  project_id: string;
  parent_wbs_id: string | null;
  category_id: string | null;
  wbs_code: string;
  description: string;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  days_budgeted: number | null;
  total_cost_budgeted: number;
  total_cost_actual: number;
  uom?: string | null;
  total_cost_budgeted_rollup?: number;
  total_paid_rollup?: number;
  has_children?: boolean;
  status: WbsBudgetStatus;
  created_at: Date;
  updated_at: Date | null;
  tenant_id: string;
  user?: User;
  project?: Project;
  category?: IWbsCategory;
}

/**
 * WBS Category — a tenant-scoped cost-type classification label.
 * No financial fields: categories classify types of cost, not amounts.
 * Categories are reusable across all projects within a tenant.
 */
export interface IWbsCategory {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  tenant_id: string;
  created_at: Date;
}

/**
 * Rollup data for the WBS hierarchy tree.
 * Includes recursive child aggregation via SQL CTE.
 */
export interface WbsBudgetRollup {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_paid_rollup: number;
  total_paid_self: number;
  total_committed_lpo: number;
  category_id?: string | null;
  status?: string;
}
