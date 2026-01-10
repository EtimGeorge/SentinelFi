import { Role } from "@shared/types/role.enum";
import { TenantEntity } from "../../src/tenants/tenant.entity";
export declare class UserEntity {
    id: string;
    email: string;
    password_hash: string;
    first_name?: string;
    last_name?: string;
    role: Role;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    tenant_id: string | null;
    tenant: TenantEntity;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}
