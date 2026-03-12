import { User } from './user';
import { WbsBudget } from './wbs';

export enum ProjectStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    COMPLETED = "completed",
    ARCHIVED = "archived",
    ON_HOLD = "on_hold",
}
  
export interface Project {
  project_id: string;
  project_name: string;
  rfq_number: string | null;
  sow_details: string | null;
  notes: string | null;
  status: ProjectStatus;
  currency: string;
  contract_value: number;
  contingency_percent: number;
  vat_rate: number;
  wht_rate: number;
  created_at: Date;
  updated_at: Date | null;
  client_id: string | null;
  client?: {
    id: string;
    name: string;
    industry?: string;
  };
  created_by_user_id: string;
  createdBy?: User;
  wbsBudgets?: WbsBudget[];
}
