import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { DataSource, QueryRunner } from 'typeorm';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(private dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.tenantId; // tenantId is now attached by TenancyMiddleware

    if (!tenantId) {
      // This should ideally be caught by TenancyMiddleware, but as a safeguard
      return throwError(() => new InternalServerErrorException('Tenant ID not found on request. Ensure TenancyMiddleware is applied correctly.'));
    }

    // Acquire a new QueryRunner for this request
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Set the search_path for the current transaction/session
      // The tenantId *is* the schema name.
      await queryRunner.query(`SET search_path TO "${tenantId}", public;`);
      request.tenantQueryRunner = queryRunner; // Attach to request for services to use
      this.logger.debug(`Set search_path to "${tenantId}" for request to ${request.url}`);
    } catch (error) {
      this.logger.error(`Failed to set tenant schema "${tenantId}": ${(error as any).message}`, (error as any).stack);
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      return throwError(() => new InternalServerErrorException(`Failed to set tenant schema: ${(error as any).message}`));
    }

    return next.handle().pipe(
      tap(async () => {
        // Commit transaction and release query runner on success
        await queryRunner.commitTransaction();
        await queryRunner.release();
        this.logger.debug(`Transaction committed and QueryRunner released for "${tenantId}" for request to ${request.url}`);
      }),
      catchError(async (err) => {
        // Rollback transaction and release query runner on error
        this.logger.error(`Transaction rolled back due to error for "${tenantId}" for request to ${request.url}: ${(err as any).message}`, (err as any).stack);
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        return throwError(() => err);
      }),
    );
  }
}
