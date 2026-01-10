import { UserEntity } from "../auth/user.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { ProjectStatus } from "./enums/project.enum";
export declare class ProjectEntity {
    project_id: string;
    project_name: string;
    rfq_number: string | null;
    sow_details: string | null;
    notes: string | null;
    status: ProjectStatus;
    created_at: Date;
    updated_at: Date | null;
    tenant_id: string;
    created_by_user_id: string;
    createdBy: UserEntity;
    wbsBudgets: WbsBudgetEntity[];
}
