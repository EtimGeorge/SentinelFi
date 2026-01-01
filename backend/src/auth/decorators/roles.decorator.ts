import { SetMetadata } from "@nestjs/common";
import { Role } from "shared/types/role.enum";

export const ROLES_KEY = "roles";

/**
 * Custom Decorator for applying RBAC roles to a controller handler.
 * Example: @Roles(Role.Admin, Role.Finance)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
