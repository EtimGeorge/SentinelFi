import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly defaultTimeout = 45000; // 45 seconds to accommodate Neon cold starts

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestTimeout = this.getRequestTimeout(request);

    return next.handle().pipe(
      timeout(requestTimeout),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.error(
            `Request timeout after ${requestTimeout}ms for ${request.method} ${request.url}`,
          );
          return throwError(() => new RequestTimeoutException('Request has timed out'));
        }
        return throwError(() => err);
      }),
    );
  }

  /**
   * Provides a dynamic timeout based on the request type.
   * This allows for longer timeouts for operations like file uploads.
   */
  private getRequestTimeout(request: any): number {
    if (request.headers['content-type']?.includes('multipart/form-data')) {
      return 60000; // 60 seconds for file uploads
    }
    if (request.url?.includes('/auth/login')) {
      return 60000; // 60 seconds for login (handling cold DB + bcrypt)
    }
    if (request.method === 'GET') {
      return 20000; // Increased from 8s to 20s for Neon cold starts
    }
    return this.defaultTimeout;
  }
}