import { User } from './user';
import { WbsBudget } from './wbs';

export enum ProjectStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    COMPLETED = "completed",
  }
  
export interface Project {
  project_id: string;
  project_name: string;
  rfq_number: string | null;
  sow_details: string | null;
  notes: string | null;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date | null;
  created_by_user_id: string;
  createdBy?: User;
  wbsBudgets?: WbsBudget[];
}
