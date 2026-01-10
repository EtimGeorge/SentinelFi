import { UserEntity } from "../auth/user.entity";
import { ProjectEntity } from "../projects/project.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { WbsBudgetStatus } from "../../../shared/types/wbs-budget-status.enum";
export declare class WbsBudgetEntity {
    wbs_id: string;
    project_id: string;
    project: ProjectEntity;
    parent_wbs_id: string | null;
    parent: WbsBudgetEntity;
    children: WbsBudgetEntity[];
    category_id: string | null;
    category: WbsCategoryEntity;
    wbs_code: string;
    description: string;
    unit_cost_budgeted: number;
    quantity_budgeted: number;
    days_budgeted: number | null;
    total_cost_budgeted: number;
    total_cost_actual: number;
    status: WbsBudgetStatus;
    created_at: Date;
    updated_at: Date | null;
    tenant_id: string;
    user: UserEntity;
}
