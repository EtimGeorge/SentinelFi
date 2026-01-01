import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "shared/types/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Main function to determine if the user has permission to access the route.
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. Get required roles from the @Roles() decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No @Roles decorator means the route is public (or only protected by AuthGuard)
    }

    // 2. Get the user object (attached by the JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // CRITICAL CONSTRAINT: If the user object is missing, AuthGuard failed, or the user is not logged in.
    if (!user || !user.role) {
      // This should ideally be caught by AuthGuard, but serves as a final check
      throw new ForbiddenException(
        "User authentication failed or role is missing.",
      );
    }

    // 3. Enforce RBAC: Check if the user's role is in the list of required roles
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      // Enforce forbidden access for unauthorized role
      throw new ForbiddenException(
        `Access denied. Role '${user.role}' is not authorized for this action.`,
      );
    }

    return true;
  }
}
