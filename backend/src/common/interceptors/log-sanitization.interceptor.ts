import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Global interceptor that masks sensitive keys in logs.
 * Prevents PII and administrative secrets (passwords, tokens, keys)
 * from being leaked into console or persistent audit logs.
 */
@Injectable()
export class LogSanitizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LogSanitizationInterceptor.name);
  private readonly SENSITIVE_KEYS = [
    "password",
    "password_hash",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "key",
    "secret",
    "ssn",
    "bank_account",
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    // Log the incoming request (sanitized)
    const sanitizedBody = this.sanitize(body);
    const sanitizedUrl = this.sanitizeUrl(url);
    this.logger.debug(
      `[REQUEST] ${method} ${sanitizedUrl} - Body: ${JSON.stringify(sanitizedBody)}`,
    );

    return next.handle().pipe(
      map((data) => {
        // Log the outgoing response (sanitized)
        const sanitizedData = this.sanitize(data);
        this.logger.debug(
          `[RESPONSE] ${method} ${sanitizedUrl} - Data: ${JSON.stringify(sanitizedData)}`,
        );
        return data; // Return original data to client, only log the sanitized version
      }),
    );
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (this.SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "[MASKED]";
      } else if (typeof obj[key] === "object") {
        sanitized[key] = this.sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  /**
   * Masks credential-like query parameters (tokens, codes, signatures) in URLs
   * before they reach the logs — magic-link / reset / invite flows often carry
   * a JWT or one-time code in the query string.
   */
  private sanitizeUrl(url: string): string {
    if (!url || !url.includes("?")) return url;
    return url.replace(
      /([?&])(token|code|otp|signature|key|secret|hash)=([^&\s]*)/gi,
      "$1$2=[MASKED]",
    );
  }
}
