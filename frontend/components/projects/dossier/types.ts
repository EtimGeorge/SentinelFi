import { Project } from '@shared/types/project';

export type DossierTab = 'overview' | 'budget' | 'expenses' | 'lpos' | 'inflows' | 'history';

// Interface for Project details (from /projects/:id/rollup)
export interface ProjectDetail extends Project {
  total_budgeted_rollup: number;
  total_paid_rollup: number;
  total_inflow_rollup: number;
}

export interface CashFlowPoint {
  month: number;
  inflow: number;
  outflow: number;
}

export interface LpoData {
  id: string;
  lpo_number: string;
  project_id: string;
  wbs_id: string;
  vendor_name: string;
  description: string;
  amount_committed: number;
  amount_paid: number;
  status: string;
  approval_status?: string;
  variance_flag?: string;
  override_reason?: string | null;
  expected_delivery_date?: string | null;
  created_at: string;
  updated_at?: string;
  wbsItem?: { wbs_code: string; description: string; project_id?: string };
  createdBy?: { email: string };
}

export interface InflowData {
  id: string;
  project_id: string;
  milestone_name: string;
  amount_received: number;
  receipt_date: string;
  description: string;
  bank_reference?: string | null;
  receivedBy?: { email: string };
}

export interface AuditLog {
  id: string;
  change_type: string;
  old_value: number;
  new_value: number;
  description: string;
  created_at: string;
  performedBy?: { email: string };
}

/**
 * Rollup shape returned by GET /wbs/budget/rollup?projectId=...
 * Used by the LPO composer to surface remaining capacity hints.
 */
export interface WbsRollupNode {
  wbs_id: string;
  parent_wbs_id?: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted?: number;
  total_cost_budgeted_rollup?: number;
  total_committed_lpo?: number;
  total_paid_rollup?: number;
  status?: string;
}