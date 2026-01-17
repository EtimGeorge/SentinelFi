import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface"; // Corrected import path
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { Role as RoleEnum } from "@shared/types/role.enum";
import { UserPayload } from "@shared/types/user";

@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly logger = new Logger(TenantAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Don't enforce tenancy on public routes
    }

    const req: AuthenticatedRequest = context.switchToHttp().getRequest();
    const user: UserPayload = req.user; // We can be confident this is a UserPayload because JwtAuthGuard runs first
    const schemaName = this.cls.get("SCHEMA_NAME");
    const requestPath = req.path;

    if (!user) {
      this.logger.error(`[TenantAccessGuard] Unauthenticated access to protected route: ${requestPath}`);
      throw new UnauthorizedException("Authentication required.");
    }

    const isSuperAdmin = user.roles.some(role => role.name === RoleEnum.SuperAdmin);

    if (isSuperAdmin) {
      this.logger.verbose(`[TenantAccessGuard] SuperAdmin '${user.email}' granted full access to: ${requestPath}`);
      return true;
    }

    if (!user.tenant_id || !schemaName) {
      this.logger.warn(`[TenantAccessGuard] Access DENIED for '${user.email}': Tenant context not fully established for: ${requestPath}. Tenant ID: ${user.tenant_id}, Schema Name: ${schemaName}`);
      throw new BadRequestException("Tenant context not established. Please ensure you are logged in correctly.");
    }

    const paramTenantId = req.params?.tenantId;

    if (paramTenantId) {
      if (paramTenantId !== user.tenant_id) {
        this.logger.warn(`[TenantAccessGuard] Access DENIED for '${user.email}': Attempted cross-tenant access. User Tenant ID: '${user.tenant_id}', Requested Tenant ID: '${paramTenantId}' for: ${requestPath}`);
        throw new ForbiddenException("You do not have permission to access resources for the requested tenant.");
      }
      this.logger.verbose(`[TenantAccessGuard] Tenant param '${paramTenantId}' matches user tenant '${user.tenant_id}' for: ${requestPath}`);
    }

    const userRoleNames = user.roles.map(r => r.name).join(', ');
    this.logger.log(`[TenantAccessGuard] Access GRANTED for tenant user '${user.email}' (Roles: ${userRoleNames}, Tenant: '${user.tenant_id}') to: ${requestPath}`);
    return true;
  }
}
