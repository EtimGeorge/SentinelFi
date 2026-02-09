// backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@shared/types/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserPayload, SimpleRole } from '@shared/types/user'; 
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CorrelatedLogger } from '../../common/logger/correlated-logger'; 

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new CorrelatedLogger(RolesGuard.name); // CHANGED LINE

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);

    if (!requiredRoles) {
      this.logger.debug('No roles required for this route, allowing access.');
      return true; // If no roles are required, allow access
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.roles || user.roles.length === 0) {
        this.logger.warn(`Access denied: No user or roles attached to request for user: ${user?.email}`);
        return false; // No user or roles attached to request
    }

    // Ensure user.roles is always treated as an array of strings for comparison
    // This handles both `string[]` from token payload and `SimpleRole[]` from DB user entity
    const userRoleNames: string[] = user.roles.map((role: string | SimpleRole) => {
        const roleName = typeof role === 'string' ? role : role.name;
        // Safe logging - avoid JSON.stringify on potential entities
        this.logger.debug(`Processing user role: ${roleName}`);
        return roleName;
    });

    this.logger.debug(`User roles from JWT/DB: ${JSON.stringify(userRoleNames)}`);

    const hasPermission = requiredRoles.some((requiredRole) => {
        const found = userRoleNames.includes(requiredRole);
        this.logger.debug(`Checking if user has required role "${requiredRole}". Found: ${found}`);
        return found;
    });

    if (hasPermission) {
        this.logger.log(`Access granted for user ${user.email}. Has required role.`);
    } else {
        this.logger.warn(`Access denied for user ${user.email}. Missing one of required roles: ${JSON.stringify(requiredRoles)}. User has roles: ${JSON.stringify(userRoleNames)}`);
    }
    
    return hasPermission;
  }
}