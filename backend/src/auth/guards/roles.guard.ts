// backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role as RoleEnum } from '@shared/types/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserPayload, SimpleRole } from '@shared/types/user';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // If no roles are required, allow access
    }
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user || !user.roles || user.roles.length === 0) {
        return false; // No user or roles attached to request
    }

    // Check if any of the user's roles match any of the required roles
    const userRoleNames = user.roles.map((role: SimpleRole) => role.name);
    return requiredRoles.some((requiredRole) => userRoleNames.includes(requiredRole));
  }
}