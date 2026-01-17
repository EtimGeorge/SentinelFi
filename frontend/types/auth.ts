// frontend/types/auth.ts
import { Role as RoleEnum } from '@shared/types/role.enum';

/**
 * Represents a user role within the application's frontend context.
 * This is an idealized structure inspired by the senior dev's feedback.
 */
export interface AppRole {
  id: string;
  name: RoleEnum;
  description?: string;
  permissions?: string[]; // Permissions are nested under roles
}

/**
 * Represents the frontend's ideal user object.
 * This provides a cleaner structure than the raw backend payload.
 * An adapter function will be used to map the backend's UserPayload to this type.
 */
export interface AppUser {
  id: string;
  email: string;
  name: string; // A single, combined name field for simplicity
  firstName?: string;
  lastName?: string;
  roles: AppRole[];
  isActive: boolean;
  tenantId?: string | null;
  tenantName?: string | null;
  permissions: string[]; // A flattened list of all permissions for easy checking
  impersonatorId?: string;
}

/**
 * Represents the data returned from a successful login API call.
 * This is based on the current backend implementation.
 */
export interface LoginApiResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    roles: Array<{ id: string; name: RoleEnum; description?: string }>;
    is_active: boolean;
    tenant_id?: string | null;
    tenant_name?: string | null;
    permissions?: string[];
  };
  access_token: string;
}
