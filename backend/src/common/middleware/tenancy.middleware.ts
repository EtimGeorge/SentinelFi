import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'shared/types/user';
import { TenantEntity } from '../../tenants/tenant.entity';
import { ClsService } from 'nestjs-cls';

// Augment the Request object type for controllers that still rely on it
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
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
    if (req.cookies && req.cookies['access_token']) {
        accessToken = req.cookies['access_token'];
    }

    let tenantId: string | null = null;
    let userEmail: string | undefined;
    let userId: string | undefined;
    let userRole: string | undefined;

    // 1. Extract tenant_id from JWT
    if (accessToken) {
      try {
        const decoded = this.jwtService.verify(accessToken, {
          secret: this.configService.get<string>('JWT_SECRET_KEY'),
        }) as JwtPayload;
        req.user = decoded; // Keep this for legacy controller compatibility
        tenantId = decoded.tenant_id || null;
        userEmail = decoded.email;
        userId = decoded.id;
        userRole = decoded.role;
      } catch (error) {
        this.logger.debug('Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.');
      }
    }

    // 2. Determine Schema Name
    let schemaName: string = 'public'; // Default

    // We can use a separate query runner here just to look up the tenant schema name,
    // avoiding polluting the main connection logic.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (tenantId) {
        const tenant = await queryRunner.manager.getRepository(TenantEntity).findOne({
          where: { tenant_id: tenantId },
          select: ['schema_name'],
        });

        if (tenant) {
          schemaName = tenant.schema_name;
        } else {
          this.logger.warn(`Tenant not found for tenantId: ${tenantId}. Falling back to 'public' schema.`);
        }
      }

      // 3. Store Context in CLS
      // This is the critical architectural fix. We store the values in the CLS context
      // so they can be retrieved by the TenancyAwareDataSource later.
      this.cls.set('TENANT_ID', tenantId);
      this.cls.set('SCHEMA_NAME', schemaName);
      this.cls.set('USER', req.user); // Store full user object for easy access

      this.logger.debug(`[TenancyMiddleware] Context set. Tenant: ${tenantId || 'None'}, Schema: ${schemaName}`);

      // Log the context set event (Audit)
      if (schemaName !== 'public') {
         await this.auditService.logEvent({
            action: 'SCHEMA_CONTEXT_SET',
            userId: userId,
            userEmail: userEmail,
            targetType: 'TENANT_SCHEMA',
            targetId: tenantId || undefined,
            details: { schemaName: schemaName, userRole: userRole },
            tenantId: tenantId || undefined,
        });
      }

      next();
    } catch (error) {
       if (error instanceof Error) {
        this.logger.error(`Error in TenancyMiddleware: ${error.message}`, error.stack);
      } else {
        this.logger.error('An unknown error occurred in TenancyMiddleware', error);
      }
      next(error);
    } finally {
      await queryRunner.release();
    }
  }
}

