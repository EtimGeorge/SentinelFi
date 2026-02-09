// backend/src/common/logger/correlated-logger.ts
import { Logger } from '@nestjs/common';
import { getCorrelationId } from '../interceptors/correlation.interceptor'; // Import the helper

export class CorrelatedLogger extends Logger {
  // Override log methods to prepend correlation ID
  log(message: any, context?: string) {
    super.log(this.addCorrelationId(message), context);
  }

  error(message: any, trace?: string, context?: string) {
    // NestJS error method has an optional 'trace' argument
    super.error(this.addCorrelationId(message), trace, context);
  }

  warn(message: any, context?: string) {
    super.warn(this.addCorrelationId(message), context);
  }

  debug(message: any, context?: string) {
    super.debug(this.addCorrelationId(message), context);
  }

  verbose(message: any, context?: string) {
    super.verbose(this.addCorrelationId(message), context);
  }

  private addCorrelationId(message: any): string {
    const correlationId = getCorrelationId();
    let stringMessage: string;

    try {
        stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
    } catch (error) {
        stringMessage = '[Circular/Error in JSON.stringify]';
    }

    if (correlationId) {
      return `[CID:${correlationId}] ${stringMessage}`;
    }
    return stringMessage;
  }
}
