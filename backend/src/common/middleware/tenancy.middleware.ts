import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'shared/types/user';
import { TenantEntity } from '../../tenants/tenant.entity';

// Augment the Request object with our custom properties
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  schema_name?: string; // Attached by TenancyMiddleware for convenience
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name);

  constructor(
    private dataSource: DataSource,
    private auditService: AuditService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
        req.user = decoded; // Attach user to request for guards/controllers
        tenantId = decoded.tenant_id || null;
        userEmail = decoded.email;
        userId = decoded.id; // FIX: Use 'id' instead of 'sub'
        userRole = decoded.role;
      } catch (error) {
        this.logger.debug('Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.');
      }
    }

    let schemaName: string | null = null;
    let queryRunner = this.dataSource.createQueryRunner(); // Get a query runner
    await queryRunner.connect(); // Connect it

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
          schemaName = 'public'; // Fallback to public for safety
        }
      } else {
        // No tenantId (e.g., SuperAdmin, or unauthenticated, or system user)
        schemaName = 'public';
      }

      req.schema_name = schemaName; // Attach schema_name to the request

      if (schemaName) {
        await queryRunner.query(`SET search_path TO "${schemaName}", public;`);
        this.logger.debug(`search_path set to "${schemaName}", public for user: ${userEmail || 'N/A'}`);
        
        await this.auditService.logEvent({
            action: 'SCHEMA_CONTEXT_SET',
            userId: userId,
            userEmail: userEmail,
            targetType: 'TENANT_SCHEMA',
            targetId: tenantId || undefined, // FIX: Ensure null becomes undefined
            details: { schemaName: schemaName, userRole: userRole },
            tenantId: tenantId || undefined, // FIX: Ensure null becomes undefined
        });
      } else {
        // Default to public if no schemaName derived
        await queryRunner.query(`SET search_path TO public;`);
        this.logger.debug(`search_path set to public for user: ${userEmail || 'N/A'}`);
      }

      next(); // Proceed to the next middleware/guard/controller
    } catch (error) {
      // FIX: Add type guard for error handling
      if (error instanceof Error) {
        this.logger.error(`Error in TenancyMiddleware: ${error.message}`, error.stack);
      } else {
        this.logger.error('An unknown error occurred in TenancyMiddleware', error);
      }
      // Pass the error to NestJS exception filters
      next(error); 
    } finally {
      // ALWAYS release the query runner in the middleware.
      if (queryRunner && !queryRunner.isReleased) { // Check if queryRunner was successfully created and not yet released
        await queryRunner.release();
      }
    }
  }
}
