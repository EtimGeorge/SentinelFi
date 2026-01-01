import { Role } from './role.enum';
export interface User {
    id: string;
    email: string;
    role: Role;
    is_active: boolean;
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
