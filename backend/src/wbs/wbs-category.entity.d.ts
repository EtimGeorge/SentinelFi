import { WbsBudgetEntity } from "./wbs-budget.entity";
import { LiveExpenseEntity } from "./live-expense.entity";
export declare class WbsCategoryEntity {
    id: string;
    name: string;
    tenant_id: string;
    wbsBudgets: WbsBudgetEntity[];
    liveExpenses: LiveExpenseEntity[];
    created_at: Date;
}
