import { User } from './user';
import { ProjectEntity } from '../../backend/src/projects/project.entity';

/**
 * Represents a Work Breakdown Structure (WBS) budget item.
 * This is a shared type, safe for use in both frontend and backend,
 * excluding any backend-specific decorators or properties.
 */
export interface WbsBudget {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  duration_days_budgeted: number | null;
  total_cost_budgeted: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  user_id: string;
  // The full user object might not always be populated depending on the query.
  // Making it optional is safer for a shared type.
  user?: User; 
  project?: ProjectEntity;
}

// NEW: Interface for WbsCategoryEntity (for frontend consumption)
export interface IWbsCategoryEntity {
  id: string;
  code: string;
  description: string;
  created_at: Date;
}
