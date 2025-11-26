export declare class CreateLiveExpenseDto {
    wbs_id: string;
    expense_date?: Date;
    item_description: string;
    actual_unit_cost: number;
    actual_quantity: number;
    commitment_lpo_amount?: number;
    actual_paid_amount: number;
    document_reference?: string;
    notes_justification?: string;
}
