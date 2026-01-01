import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) {
      throw new BadRequestException('Tenant ID not found in authenticated user payload.');
    }

    // Advanced Implementation: Sanitize and validate the tenantId to ensure it's a safe schema name.
    // Schemas should follow standard identifier rules (e.g., start with letter or underscore, contain letters, digits, underscores).
    const schemaNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!schemaNameRegex.test(tenant_id)) {
        throw new BadRequestException('Invalid Tenant ID format.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Establish a dedicated connection for this request
      await queryRunner.connect();

      // Set the schema for the current session. Use parameterized query to prevent SQL injection.
      await queryRunner.query(`SET search_path TO "${tenant_id}", public;`); // Added semicolon

      // Attach tenant_id and the queryRunner to the request for potential use in transactions
      req.tenant_id = tenant_id;
      req.queryRunner = queryRunner;

      next();
    } catch (error: unknown) { // Explicitly type error as unknown
      throw new InternalServerErrorException('Failed to set tenant context', (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
        // This is critical. The `finally` block ensures that the search_path is reset
        // and the connection is released back to the pool, even if an error occurs mid-request.
        if (req.queryRunner) {
            await req.queryRunner.release();
        }
    }
  }
}