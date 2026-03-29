import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express"; // Import Request from express
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator"; // Assuming you'll create this decorator
import { UserPayload } from "@shared/types/user"; // UserPayload from your shared types

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required, allow access
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user: UserPayload | undefined = (request as any).user; // Cast to access user, which is added by JwtAuthGuard

    if (!user || !user.permissions || user.permissions.length === 0) {
      throw new ForbiddenException(
        "Insufficient permissions: User has no assigned permissions.",
      );
    }

    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      user.permissions!.includes(permission),
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException(
        "Insufficient permissions: Missing one or more required permissions.",
      );
    }

    return true;
  }
}
