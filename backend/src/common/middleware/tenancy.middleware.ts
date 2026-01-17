import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { DataSource } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload, UserPayload } from "@shared/types/user";
import { TenantEntity } from "../../tenants/tenant.entity";
import { ClsService } from "nestjs-cls";

export interface AuthenticatedRequest extends Request {
  user?: UserPayload; // The request object should hold the full UserPayload after JwtStrategy runs
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name);

  constructor(
    private dataSource: DataSource,
    private auditService: AuditService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly cls: ClsService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    let accessToken: string | undefined;
    if (req.cookies && req.cookies["access_token"]) {
      accessToken = req.cookies["access_token"];
    }

    let tenantId: string | null = null;
    let userEmail: string | undefined;
    let userId: string | undefined;
    let userRoles: string[] | undefined;
    let rawJwtPayload: JwtPayload | undefined;

    if (accessToken) {
      try {
        const decoded = this.jwtService.verify<JwtPayload>(accessToken, {
          secret: this.configService.get<string>("JWT_SECRET_KEY"),
        });
        
        // Don't attach the raw payload to req.user yet, as it will be replaced by the hydrated UserPayload in JwtStrategy
        rawJwtPayload = decoded; 
        tenantId = decoded.tenant_id || null;
        userEmail = decoded.email;
        userId = decoded.sub; // The 'sub' claim holds the user ID
        userRoles = decoded.roles;

      } catch (error) {
        this.logger.debug("Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.");
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let schemaName: string = "public";
      if (tenantId) {
        const tenant = await queryRunner.manager.getRepository(TenantEntity).findOne({
          where: { tenant_id: tenantId },
          select: ["schema_name"],
        });

        if (tenant) {
          schemaName = tenant.schema_name;
        } else {
          this.logger.warn(`Tenant not found for tenantId: ${tenantId}. Falling back to 'public' schema.`);
        }
      }

      // Store context in CLS. We store the raw JWT payload here for now.
      // The full UserPayload will be available on req.user after JwtAuthGuard.
      this.cls.set("TENANT_ID", tenantId);
      this.cls.set("SCHEMA_NAME", schemaName);
      this.cls.set("USER", rawJwtPayload); // Store raw JWT payload for early access if needed

      this.logger.debug(`[TenancyMiddleware] Context set. Tenant: ${tenantId || "None"}, Schema: ${schemaName}`);

      if (schemaName !== "public") {
        await this.auditService.logEvent({
          action: "SCHEMA_CONTEXT_SET",
          userId: userId,
          userEmail: userEmail,
          targetType: "TENANT_SCHEMA",
          targetId: tenantId || undefined,
          details: { schemaName: schemaName, userRoles: userRoles },
          tenantId: tenantId || undefined,
        });
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      this.logger.error(`Error in TenancyMiddleware: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      next(error);
    } finally {
      await queryRunner.release();
    }
  }
}