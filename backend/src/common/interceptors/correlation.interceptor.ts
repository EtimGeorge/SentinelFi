import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// ============================================================================
// ASYNC LOCAL STORAGE - Thread-local correlation context
// ============================================================================
export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  startTime: number;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

// Helper to get current correlation context
export const getCorrelationContext = (): CorrelationContext | undefined => {
  return correlationStorage.getStore();
};

// Helper to get correlation ID
export const getCorrelationId = (): string | undefined => {
  return getCorrelationContext()?.correlationId;
};

// ============================================================================
// CORRELATION INTERCEPTOR
// ============================================================================
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  // Make logger static to avoid creating new instance per request
  private static readonly logger = new Logger(CorrelationInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract or generate correlation ID
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `backend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create correlation context
    const correlationContext: CorrelationContext = {
      correlationId,
      requestId,
      startTime: Date.now(),
    };

    // Add correlation ID to response headers
    response.setHeader('X-Correlation-ID', correlationId);
    response.setHeader('X-Request-ID', requestId);

    // Reduced logging verbosity - only log on start for important requests
    if (request.method !== 'GET' || request.url.includes('/auth/')) {
      CorrelationInterceptor.logger.log(
        `[CID:${correlationId}] → ${request.method} ${request.url}`,
      );
    }

    // Run the request handler within the correlation context
    return correlationStorage.run(correlationContext, () => {
      return next.handle().pipe(
        tap({
          next: () => {
            const duration = Date.now() - correlationContext.startTime;
            // Only log slow requests or errors
            if (duration > 1000) {
              CorrelationInterceptor.logger.warn(
                `[CID:${correlationId}] ← SLOW ${response.statusCode} ${request.method} ${request.url} (${duration}ms)`,
              );
            }
          },
          error: (error) => {
            const duration = Date.now() - correlationContext.startTime;
            CorrelationInterceptor.logger.error(
              `[CID:${correlationId}] ← ERROR ${request.method} ${request.url} (${duration}ms): ${error.message}`,
            );
          },
        }),
      );
    });
  }
}
