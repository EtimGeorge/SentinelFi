// /frontend/lib/navigationUtils.ts
import { Role } from '@shared/types/role.enum';
import { User } from '../components/context/AuthContext';

/**
 * Extract primary role from a user object
 * This is a pure utility function that doesn't depend on React Context
 * @param user User object (can be from localStorage or AuthContext)
 * @returns Primary Role or null
 */
export function getPrimaryRoleFromUser(user: User | null): Role | null {
  if (!user || !user.roles || user.roles.length === 0) return null;
  
  const getRoleName = (r: any): string | undefined => 
    typeof r === 'string' ? r : r?.name;
  
  // SuperAdmin always takes precedence
  if (user.roles.some(r => getRoleName(r) === 'SuperAdmin')) {
    return Role.SuperAdmin;
  }
  
  // Return first role
  const firstRoleName = getRoleName(user.roles[0]);
  return firstRoleName as Role;
}

/**
 * Check if user has a specific role
 * @param user User object
 * @param role Role to check
 * @returns boolean
 */
export function userHasRole(user: User | null, role: Role): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some(r => (typeof r === 'string' ? r : r.name) === role);
}

/**
 * Check if user has any of the specified roles
 * @param user User object
 * @param roles Array of roles to check
 * @returns boolean
 */
export function userHasAnyRole(user: User | null, roles: Role[]): boolean {
  return roles.some(role => userHasRole(user, role));
}

/**
 * Load user session from localStorage
 * This is extracted from SessionStorage class to be reusable
 */
export function loadUserFromStorage(): User | null {
  try {
    const SESSION_KEY = 'sentinelfi_auth_user';
    const TIMESTAMP_KEY = 'sentinelfi_auth_timestamp';
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

    const userStr = localStorage.getItem(SESSION_KEY);
    const timestampStr = localStorage.getItem(TIMESTAMP_KEY);

    if (!userStr || !timestampStr) return null;

    const age = Date.now() - parseInt(timestampStr, 10);
    if (age > MAX_AGE_MS) {
      // Don't clear here, let AuthContext handle it
      return null;
    }

    const user: User = JSON.parse(userStr);
    return user;
  } catch (error) {
    console.warn('Failed to load user from storage:', error);
    return null;
  }
}
