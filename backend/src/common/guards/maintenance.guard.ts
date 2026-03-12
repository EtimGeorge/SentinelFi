import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingsService } from '../../settings/settings.service';
import { Role } from 'shared/types/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly settingsService: SettingsService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Always allow public routes (Login, etc. needs to be checked carefully)
    // Actually, we might want to block Login too if maintenance is deep.
    // But for now, let's allow routes marked with @Public if they are for SuperAdmin.
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Fetch settings (cached in service)
    const settings = await this.settingsService.getSettings();
    if (!settings.maintenanceMode) {
      return true;
    }

    // 3. Maintenance is ON. Check user role.
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. Allow SuperAdmins always
    if (user && user.roles?.includes(Role.SuperAdmin)) {
      return true;
    }

    // 5. Allow SuperAdmin management routes specifically (fallback check)
    if (request.url.startsWith('/api/v1/super')) {
      return true;
    }

    // 6. Block everything else
    throw new ServiceUnavailableException({
      message: 'Platform under maintenance',
      error: 'MAINTENANCE_MODE_ACTIVE',
      statusCode: 503
    });
  }
}
