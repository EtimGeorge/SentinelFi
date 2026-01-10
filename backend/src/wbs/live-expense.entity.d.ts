import { WbsBudgetEntity } from "./wbs-budget.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
export declare class LiveExpenseEntity {
    id: string;
    tenant_id: string;
    project_id: string | null;
    wbs_id: string;
    wbsBudget: WbsBudgetEntity;
    category_id: string | null;
    category: WbsCategoryEntity;
    updated_at: Date | null;
    user_id: string;
    expense_date: Date;
    description: string;
    unit_cost: number;
    quantity: number;
    commitment_lpo_amount: number;
    amount: number;
    document_reference: string | null;
    notes_justification: string | null;
    variance_flag: string;
    created_at: Date;
}
