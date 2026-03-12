import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId = uuidv4();
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the full error internally, including the correlation ID
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
       this.logger.error(
        `[${correlationId}] ${(exception as Error).message}`,
        (exception as Error).stack,
        `${request.method} ${request.url}`
      );
    } else {
       this.logger.warn(`[${correlationId}] ${JSON.stringify(message)} at ${request.method} ${request.url}`);
    }

    // Standardized response format
    const errorResponse = {
      statusCode: status,
      message: typeof message === 'object' && (message as any).message ? (message as any).message : message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    response.status(status).json(errorResponse);
  }
}
