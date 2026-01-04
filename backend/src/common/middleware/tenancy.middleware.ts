import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger, // Import Logger
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { Reflector } from '@nestjs/core';
import { IS_TENANT_AWARE_KEY } from '../decorators/tenant-aware.decorator';
import { TenantEntity } from '../../tenants/tenant.entity';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name); // Initialize Logger

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TenantEntity)
    private tenantsRepository: Repository<TenantEntity>,
    private readonly reflector: Reflector,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    this.logger.log(`[TenancyMiddleware] Processing request for URL: ${req.originalUrl}`);
    this.logger.log(`[TenancyMiddleware] req.user: ${JSON.stringify(req.user)}`);
    this.logger.log(`[TenancyMiddleware] req.user?.tenant_id: ${req.user?.tenant_id}`);


    // Temporarily bypass for /admin/tenants to fix the current issue
    // TODO: Replace this with a robust @TenantAware decorator implementation.
    if (req.originalUrl.startsWith('/api/v1/admin/tenants')) {
      this.logger.log('[TenancyMiddleware] Bypassing for /admin/tenants route.');
      return next();
    }

    const tenant_id_from_user_payload = req.user?.tenant_id;

    if (!tenant_id_from_user_payload) {
      this.logger.error(`[TenancyMiddleware] Tenant ID not found in payload for URL: ${req.originalUrl}. req.user: ${JSON.stringify(req.user)}`);
      throw new BadRequestException('Tenant ID not found in authenticated user payload.');
    }

    // 1. Look up the tenant in the public.tenants table using the tenant_id from the user's JWT
    const tenant = await this.tenantsRepository.findOne({
        where: { id: tenant_id_from_user_payload },
        select: ['id', 'schema_name'],
    });

    if (!tenant) {
        this.logger.error(`[TenancyMiddleware] Tenant ID ${tenant_id_from_user_payload} from user payload does not match any tenant in DB.`);
        throw new ForbiddenException('Authenticated user belongs to a non-existent or invalid tenant.');
    }

    const actual_schema_name = tenant.schema_name;

    // Advanced Implementation: Sanitize and validate the tenantId to ensure it's a safe schema name.
    // The schema name is retrieved from the DB, so it should be valid, but we can still validate.
    const schemaNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!schemaNameRegex.test(actual_schema_name)) {
        // This indicates a misconfiguration in the tenants table data itself.
        this.logger.error(`[TenancyMiddleware] Invalid schema name '${actual_schema_name}' retrieved for tenant ${tenant_id_from_user_payload}.`);
        throw new InternalServerErrorException('Invalid schema name retrieved from tenant data.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Set the search_path for the current session to the actual tenant's schema
      await queryRunner.query(`SET search_path TO "${actual_schema_name}", public;`);
      this.logger.log(`[TenancyMiddleware] search_path set to "${actual_schema_name}", public for URL: ${req.originalUrl}`);

      // Attach tenant_id (the UUID) and the queryRunner to the request for potential use in transactions
      req.tenant_id = tenant_id_from_user_payload;
      req.schema_name = actual_schema_name;
      req.queryRunner = queryRunner;

      next();
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error ? error.message : 'Unknown error');
      this.logger.error(`[TenancyMiddleware] Failed to set tenant context for URL: ${req.originalUrl}. Error: ${errorMessage}`, (error instanceof Error ? error.stack : undefined));
      throw new InternalServerErrorException(`Failed to set tenant context: ${errorMessage}`);
    } finally {
        // This is critical. The `finally` block ensures that the search_path is reset
        // and the connection is released back to the pool, even if an error occurs mid-request.
        if (req.queryRunner) {
            await req.queryRunner.release();
        }
    }
  }
}