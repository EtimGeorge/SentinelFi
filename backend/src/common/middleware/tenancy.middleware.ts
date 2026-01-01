import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // tenantId should already be available on req.user after JwtAuthGuard
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      // This case should ideally not happen for authenticated routes protected by JwtAuthGuard,
      // as the tenantId is now explicitly added to req.user by JwtStrategy.
      // However, it's a good safeguard for clarity.
      throw new BadRequestException('Tenant ID not found in authenticated user payload.');
    }

    // Attach tenantId directly to the request object for easier access by interceptors/controllers
    req.tenantId = tenantId;
    next();
  }
}
