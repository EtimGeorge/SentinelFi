import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Global interceptor that masks sensitive keys in logs.
 * Prevents PII and administrative secrets (passwords, tokens, keys)
 * from being leaked into console or persistent audit logs.
 */
@Injectable()
export class LogSanitizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LogSanitizationInterceptor.name);
  private readonly SENSITIVE_KEYS = [
    'password',
    'password_hash',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'key',
    'secret',
    'ssn',
    'bank_account',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    // Log the incoming request (sanitized)
    const sanitizedBody = this.sanitize(body);
    this.logger.debug(`[REQUEST] ${method} ${url} - Body: ${JSON.stringify(sanitizedBody)}`);

    return next.handle().pipe(
      map((data) => {
        // Log the outgoing response (sanitized)
        const sanitizedData = this.sanitize(data);
        this.logger.debug(`[RESPONSE] ${method} ${url} - Data: ${JSON.stringify(sanitizedData)}`);
        return data; // Return original data to client, only log the sanitized version
      }),
    );
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (this.SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[MASKED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = this.sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }
}
