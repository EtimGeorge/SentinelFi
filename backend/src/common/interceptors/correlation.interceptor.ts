import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { ClsService, ClsServiceManager } from "nestjs-cls";

// Helper to get correlation ID outside of injection (e.g. in loggers)
export const getCorrelationId = (): string | undefined => {
  try {
    const cls = ClsServiceManager.getClsService();
    return cls.get("correlationId");
  } catch {
    return undefined;
  }
};

// ============================================================================
// CORRELATION INTERCEPTOR
// ============================================================================
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  private static readonly logger = new Logger(CorrelationInterceptor.name);

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract or generate correlation ID
    const correlationId =
      (request.headers["x-correlation-id"] as string) ||
      `backend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Generate unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Store in CLS context (mounted by ClsModule middleware)
    this.cls.set("correlationId", correlationId);
    this.cls.set("requestId", requestId);
    this.cls.set("startTime", Date.now());

    // Add correlation ID to response headers
    response.setHeader("X-Correlation-ID", correlationId);
    response.setHeader("X-Request-ID", requestId);

    // Reduced logging verbosity - only log on start for important requests
    if (request.method !== "GET" || request.url.includes("/auth/")) {
      CorrelationInterceptor.logger.log(
        `[CID:${correlationId}] → ${request.method} ${request.url}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const startTime = this.cls.get("startTime");
          const duration = Date.now() - startTime;
          // Only log slow requests (> 1s)
          if (duration > 1000) {
            CorrelationInterceptor.logger.warn(
              `[CID:${correlationId}] ← SLOW ${response.statusCode} ${request.method} ${request.url} (${duration}ms)`,
            );
          }
        },
        error: (error) => {
          const startTime = this.cls.get("startTime");
          const duration = Date.now() - startTime;
          CorrelationInterceptor.logger.error(
            `[CID:${correlationId}] ← ERROR ${request.method} ${request.url} (${duration}ms): ${error.message}`,
          );
        },
      }),
    );
  }
}
