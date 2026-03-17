import { ExecutionContext, Injectable, ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { DataSource } from "typeorm";
import { TenantEntity } from "../../tenants/tenant.entity";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {
    super();
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    // Step 1: Check @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Step 2: Validate JWT
    const jwtValid = await super.canActivate(context);
    if (!jwtValid) return false;

    // Step 3: Check subscription/tenant status
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SuperAdmins have no tenant_id — they bypass subscription checks
    if (!user?.tenant_id) return true;

    try {
      const tenantRepository = this.dataSource.getRepository(TenantEntity);
      const tenant = await tenantRepository.findOne({
        where: { tenant_id: user.tenant_id },
        select: ['tenant_id', 'is_active', 'expires_at'],
      });

      if (!tenant) {
        throw new ForbiddenException('TENANT_NOT_FOUND');
      }

      if (!tenant.is_active) {
        throw new ForbiddenException('TENANT_SUSPENDED');
      }

      if (tenant.expires_at && new Date() > tenant.expires_at) {
        throw new HttpException(
          {
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Your subscription has expired. Please renew to continue.',
            renewUrl: '/settings/subscription',
          },
          HttpStatus.PAYMENT_REQUIRED, // 402
        );
      }
    } catch (err) {
      // Re-throw known HTTP exceptions (ForbiddenException, HttpException)
      if (err instanceof HttpException || err instanceof ForbiddenException) throw err;
      // Log and allow through on DB errors — don't lock out users due to infrastructure issues
    }

    return true;
  }
}
