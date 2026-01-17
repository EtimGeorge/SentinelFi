// shared/types/user.ts
import { Role as RoleEnum } from './role.enum';

// A simple representation of a role, suitable for shared DTOs
export interface SimpleRole {
    id: string;
    name: RoleEnum;
    description?: string;
}

// This represents the raw payload of the JWT token itself.
export interface JwtPayload {
  id: string; // User ID
  sub: string; // User ID (standard JWT subject)
  email: string;
  roles: RoleEnum[]; // User's roles (by name)
  permissions: string[]; // All permissions flattened from roles
  tenant_id: string | null;
  iat?: number;
  exp?: number;
  impersonator_id?: string; // ID of the SuperAdmin who is impersonating
}

// This is the application-facing User object.
export interface UserPayload {
  id: string; 
  email: string;
  first_name?: string;
  last_name?: string;
  roles: SimpleRole[];
  is_active: boolean;
  tenant_id?: string | null;
  tenant_name?: string | null;
  permissions?: string[];
}

// This is the shape of the User object for DTOs.
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: SimpleRole[];
  is_active: boolean;
  tenant_id?: string | null;
  tenant_name?: string | null;
}

// Interface for creating a new user.
export interface ICreateUserPayload {
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role: RoleEnum;
  is_active?: boolean;
  tenant_id?: string | null;
}

// Interface for updating an existing user.
export interface IUpdateUserPayload {
  role?: RoleEnum;
  is_active?: boolean;
  tenant_id?: string | null;
  first_name?: string;
  last_name?: string;
}