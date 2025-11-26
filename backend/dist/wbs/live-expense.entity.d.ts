import { WbsBudgetEntity } from './wbs-budget.entity';
export declare class LiveExpenseEntity {
    expense_id: number;
    wbs_id: string;
    wbsBudget: WbsBudgetEntity;
    user_id: string;
    expense_date: Date;
    item_description: string;
    actual_unit_cost: number;
    actual_quantity: number;
    commitment_lpo_amount: number;
    actual_paid_amount: number;
    document_reference: string | null;
    notes_justification: string | null;
    variance_flag: string;
    created_at: Date;
}
