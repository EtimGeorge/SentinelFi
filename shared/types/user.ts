// shared/types/user.ts
import { Role } from './role.enum'; // Updated path

// Interface for a User - This will be the single source of truth for the User object shape
export interface User {
  id: string;
  email: string;
  first_name?: string; // NEW
  last_name?: string;  // NEW
  role: Role;
  is_active: boolean;
  tenant_id?: string | null; // NEW: User's assigned tenant ID
  tenant_name?: string | null; // NEW: User's assigned tenant name (for display)
  isSuperAdmin?: boolean; // NEW: Added for frontend checks
}

export interface JwtPayload extends User {
  sub: string; // User ID from JWT
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration time (timestamp)
  // clientSchema?: string; // Removed, standardized to tenant_id
}

// Interface for creating a new user (initial registration) - Used by backend, can be referenced by frontend forms
export interface ICreateUserPayload {
  email: string;
  password?: string; // Password can be optional for admin creation
  first_name?: string;
  last_name?: string;
  role: Role;
  is_active?: boolean;
  tenant_id?: string | null;
}

// Interface for updating an existing user (role change, status change) - Used by backend
export interface IUpdateUserPayload {
  role?: Role;
  is_active?: boolean;
  tenant_id?: string | null;
  first_name?: string;
  last_name?: string;
}
