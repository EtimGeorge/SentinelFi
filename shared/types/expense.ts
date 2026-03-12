import { WbsBudget } from './wbs';

/**
 * Represents a live expense entry.
 * This is a shared type, safe for use in both frontend and backend,
 * excluding any backend-specific decorators or properties.
 */
export interface LiveExpense {
  expense_id?: number; // Legacy, keep for now to avoid breaks
  id?: string;         // UUID from entity
  wbs_id: string;
  user_id: string;
  expense_date: Date;
  description: string;
  unit_cost: number;
  quantity: number;
  days?: number | null;
  commitment_lpo_amount: number;
  amount: number;
  actual_paid_amount: number; // For frontend compatibility with existing code
  document_reference: string | null;
  notes_justification: string | null;
  variance_flag: string;
  created_at: Date;
  wbsBudget?: WbsBudget;
}
