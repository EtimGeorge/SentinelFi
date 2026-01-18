import { Role } from './role.enum';
export interface User {
    id: string;
    email: string;
    roles: Role[]; // Corrected to plural 'roles'
    is_active: boolean;
    tenant_id?: string | null;
}
export interface JwtPayload extends User {
    iat: number;
    exp: number;
    clientSchema?: string;
}
export declare class CreateUserDto {
    email: string;
    password: string;
    role: Role;
    tenant_id?: string;
}
export declare class UpdateUserDto {
    role?: Role;
    is_active?: boolean;
}
