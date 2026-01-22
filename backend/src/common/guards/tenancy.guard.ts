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
      this.cls.set("TENANT_ID", null);
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
      this.cls.set("TENANT_ID", null);
      this.cls.set("USER", user);
      return true;
    }

    // Use cached/resolved schema name if possible, or lookup in public.tenant table
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const tenant = await queryRunner.manager.getRepository(TenantEntity).findOne({
        where: { tenant_id: tenantId },
        select: ["schema_name"],
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
      }

      this.cls.set("TENANT_ID", tenantId);
      this.cls.set("SCHEMA_NAME", tenant.schema_name);
      this.cls.set("USER", user);

      this.logger.debug(
        `[TenancyGuard] Context set for User ${user.id}. Tenant: ${tenantId}, Schema: ${tenant.schema_name}`,
      );
      
      return true;
    } catch (error: unknown) {
       const message = error instanceof Error ? error.message : String(error);
       this.logger.error(`Failed to resolve tenant schema: ${message}`);
       throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
