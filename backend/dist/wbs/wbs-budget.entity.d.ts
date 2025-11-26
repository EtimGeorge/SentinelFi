export declare class WbsBudgetEntity {
    wbs_id: string;
    parent_wbs_id: string | null;
    parent: WbsBudgetEntity;
    children: WbsBudgetEntity[];
    wbs_code: string;
    description: string;
    unit_cost_budgeted: number;
    quantity_budgeted: number;
    duration_days_budgeted: number | null;
    total_cost_budgeted: number;
    is_approved: boolean;
    created_at: Date;
}
