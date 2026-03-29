// backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { Role } from "@shared/types/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: (Role | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
