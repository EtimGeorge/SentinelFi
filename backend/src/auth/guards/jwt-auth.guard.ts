import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { DataSource } from "typeorm";
import { TenantEntity } from "../../tenants/tenant.entity";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // Tenant status cache to avoid a public-schema DB query on every authenticated request.
  // Entries are invalidated explicitly on write (billing/tenant/superadmin services) so revocation
  // latency is bounded by invalidation, not by the TTL.
  private static readonly TENANT_STATUS_CACHE = new Map<
    string,
    {
      is_active: boolean;
      expires_at: Date | null;
      grace_period_until: Date | null;
      deleted_at: Date | null;
      storedAt: number;
    }
  >();
  private static readonly TENANT_STATUS_TTL_MS = 60 * 1000;

  static invalidateTenantStatus(tenantId: string): void {
    JwtAuthGuard.TENANT_STATUS_CACHE.delete(tenantId);
  }

  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      const cached = JwtAuthGuard.TENANT_STATUS_CACHE.get(user.tenant_id);
      const isFresh =
        cached && Date.now() - cached.storedAt < JwtAuthGuard.TENANT_STATUS_TTL_MS;

      let tenant: {
        is_active: boolean;
        expires_at: Date | null;
        grace_period_until?: Date | null;
        deleted_at: Date | null;
      } | null;
      if (isFresh && cached) {
        tenant = cached;
      } else {
        const tenantRepository = this.dataSource.getRepository(TenantEntity);
        tenant = await tenantRepository.findOne({
          where: { tenant_id: user.tenant_id },
          select: [
            "tenant_id",
            "is_active",
            "expires_at",
            "grace_period_until",
            "deleted_at",
          ],
          withDeleted: true, // soft-deleted tenants must be explicitly rejected below
        });

        if (tenant) {
          JwtAuthGuard.TENANT_STATUS_CACHE.set(user.tenant_id, {
            is_active: tenant.is_active,
            expires_at: tenant.expires_at,
            grace_period_until: tenant.grace_period_until ?? null,
            deleted_at: tenant.deleted_at ?? null,
            storedAt: Date.now(),
          });
        }
      }

      if (!tenant) {
        throw new ForbiddenException("TENANT_NOT_FOUND");
      }

      // Soft-deleted (archived) tenants are blocked immediately — the cache hit
      // path is sealed because deletion invalidates the cache entry on write.
      if (tenant.deleted_at) {
        throw new ForbiddenException("TENANT_DELETED");
      }

      if (!tenant.is_active) {
        throw new ForbiddenException("TENANT_SUSPENDED");
      }

      if (tenant.expires_at && new Date() > tenant.expires_at) {
        const now = new Date();
        // Payment grace: expired-but-in-grace tenants stay online so their admin
        // can reach billing and renew, instead of being hard-locked at 402.
        const inGrace =
          tenant.grace_period_until && now <= tenant.grace_period_until;
        if (!inGrace) {
          throw new HttpException(
            {
              code: "SUBSCRIPTION_EXPIRED",
              message: "Your subscription has expired. Please renew to continue.",
              renewUrl: "/settings/subscription",
            },
            HttpStatus.PAYMENT_REQUIRED, // 402
          );
        }
      }
    } catch (err) {
      // Re-throw known HTTP exceptions (ForbiddenException, HttpException)
      if (err instanceof HttpException || err instanceof ForbiddenException)
        throw err;
      // Fail-closed on infrastructure error: log and return 503 so frontend can retry
      // Previously this was fail-open (silent return true) which let expired tenants through during DB outage.
      this.logger.error(
        `Tenant check failed for user=${user?.id} tenant=${user?.tenant_id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new ServiceUnavailableException(
        "Tenant verification temporarily unavailable — please retry.",
      );
    }

    return true;
  }
}
