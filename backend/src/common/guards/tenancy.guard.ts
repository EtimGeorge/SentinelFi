import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from 'nestjs-cls';
import * as crypto from "crypto";
import { AuthenticatedRequest } from "../middleware/tenancy.middleware";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { Role } from 'shared/types/role.enum';

@Injectable()
export class TenancyGuard implements CanActivate {
  private readonly logger = new Logger(TenancyGuard.name);

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
      return true; // Don"t run tenancy logic for public routes
    }

    const req: AuthenticatedRequest = context.switchToHttp().getRequest();
    const reqId = crypto.randomBytes(6).toString("hex");
    this.logger.log(`[${reqId}] ========== TENANCY GUARD START (Simplified) ==========`);

    // TenancyMiddleware should have already populated CLS context with user and schema
    const user = req.user;
    const schemaName = this.cls.get('SCHEMA_NAME');

    // SuperAdmins can always proceed, they operate across tenants.
    if (user && user.role === Role.SuperAdmin) {
      this.logger.log(`[${reqId}] SuperAdmin detected. Bypassing granular tenant checks.`);
      return true;
    }

    // For non-SuperAdmin users, ensure tenant context is established.
    if (!user || !user.tenant_id || !schemaName) {
        this.logger.error(`[${reqId}] ABORT: User is not authenticated with a tenant, or schema_name is missing. User: ${user?.email}`);
        throw new BadRequestException("Tenant context not established. Please contact your administrator.");
    }
    
    this.logger.log(`[${reqId}] Tenant user ${user.email} accessing with schema: ${schemaName}`);
    // Further checks: You could add logic here to ensure the tenant (from user.tenant_id) is active, etc.
    // This guard's primary role is to ensure a valid tenant context has been established by the middleware.

    this.logger.log(`[${reqId}] ========== TENANCY GUARD SUCCESS (Simplified) ==========`);
    return true; // Allow the request to proceed
  }
}
