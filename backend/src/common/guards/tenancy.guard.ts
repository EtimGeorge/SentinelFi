import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import { DataSource } from "typeorm";
import { TenantEntity } from "../../tenants/tenant.entity";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class TenancyGuard implements CanActivate {
  private readonly logger = new Logger(TenancyGuard.name);
  
  // Simple in-memory cache for schema names to reduce DB hits
  private static readonly SCHEMA_CACHE = new Map<string, { schema: string, expires: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.cls.set("SCHEMA_NAME", "public");
      this.cls.set("tenant_id", null);
      return true;
    }

    // 2. For non-public routes, expect req.user to be populated by JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // This should theoretically be handled by JwtAuthGuard, but we add a safety check.
      this.logger.warn("No user found on non-public request in TenancyGuard.");
      this.cls.set("SCHEMA_NAME", "public");
      return true; 
    }

    const tenantId = user.tenant_id;

    // 3. Resolve Tenant Schema
    if (!tenantId) {
      // User is authenticated but has no tenant (e.g., initial SuperAdmin or unassigned user)
      this.cls.set("SCHEMA_NAME", "public");
      this.cls.set("tenant_id", null);
      this.cls.set("USER", user);
      return true;
    }

    // 3. Resolve Tenant Schema
    try {
      let schemaName: string;
      const now = Date.now();
      const cached = TenancyGuard.SCHEMA_CACHE.get(tenantId);

      if (cached && cached.expires > now) {
        schemaName = cached.schema;
      } else {
        const tenant = await this.dataSource.getRepository(TenantEntity).findOne({
          where: { tenant_id: tenantId },
          select: ["schema_name"],
        });

        if (!tenant) {
          throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
        }
        
        schemaName = tenant.schema_name;
        TenancyGuard.SCHEMA_CACHE.set(tenantId, {
          schema: schemaName,
          expires: now + TenancyGuard.CACHE_TTL
        });
      }

      this.cls.set("tenant_id", tenantId);
      this.cls.set("SCHEMA_NAME", schemaName);
      this.cls.set("USER", user);

      // Only debug log on cache miss or in dev
      if (!cached) {
        this.logger.debug(
          `[TenancyGuard] Context set for User ${user.id}. Tenant: ${tenantId}, Schema: ${schemaName}`,
        );
      }
      
      return true;
    } catch (error: unknown) {
       const message = error instanceof Error ? error.message : String(error);
       this.logger.error(`[TenancyGuard] ❌ Failed to resolve tenant schema for User ${user.id} (Tenant: ${tenantId}): ${message}`);
       if (error instanceof Error && error.stack) {
         this.logger.error(error.stack);
       }
       throw error;
    }
  }
}
