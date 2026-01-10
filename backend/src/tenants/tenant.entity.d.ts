import { UserEntity } from "../../src/auth/user.entity";
export declare class TenantEntity {
    tenant_id: string;
    name: string;
    schema_name: string;
    is_active: boolean;
    created_at: Date;
    users: UserEntity[];
}
