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
import { Role } from "@shared/types/role.enum";
import { DataSource } from "typeorm";
import { TenantEntity } from "../../tenants/tenant.entity";
import { TenantProvisioningStatus } from "@shared/types/tenant-provisioning-status.enum";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // Tenant status cache to avoid a public-schema DB query on every authenticated request.
  // Entries are invalidated explicitly on write (billing/tenant/superadmin services) so revocation
  // latency is bounded by invalidation, not by the TTL.
  //
  // SCALE NOTE: this is a per-process Map. On N backend nodes, a revocation on
  // node A leaves node B serving the stale entry for up to TTL_MS. Acceptable
  // for subscription gating; NOT acceptable for lockout. Security-critical
  // revocations (deactivation, session kill) must ALSO bump token_version
  // (checked per-request in JwtStrategy) — never rely on this cache alone.
  private static readonly TENANT_STATUS_CACHE = new Map<
    string,
    {
      is_active: boolean;
      expires_at: Date | null;
      grace_period_until: Date | null;
      deleted_at: Date | null;
      provisioning_status: TenantProvisioningStatus; // R1e
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

    // SuperAdmins have no tenant_id — they bypass subscription checks.
    // SECURITY (Flaw H): null tenant scope is only trusted when the JWT was
    // minted for a verified platform role. A tenant user whose tenant relation
    // failed to load must never pass here as a faux-SuperAdmin (the payload
    // builders now always use the authoritative user.tenant_id column, and
    // this assertion seals the guard side).
    if (!user?.tenant_id) {
      const roleNames: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: any) =>
            typeof r === "string" ? r : r?.name,
          )
        : [];
      const isPlatformRole =
        roleNames.includes(Role.SuperAdmin) ||
        // Belt-and-braces: an explicit impersonation claim is minted only by
        // the SuperAdmin impersonation flow, never by tenant login.
        Boolean((user as any)?.impersonator_id);
      if (!isPlatformRole) {
        this.logger.warn(
          `Null tenant scope WITHOUT platform role for user=${user?.id} — denying (possible relation-load failure).`,
        );
        throw new ForbiddenException("TENANT_SCOPE_MISSING");
      }
      return true;
    }

    try {
      const cached = JwtAuthGuard.TENANT_STATUS_CACHE.get(user.tenant_id);
      const isFresh =
        cached && Date.now() - cached.storedAt < JwtAuthGuard.TENANT_STATUS_TTL_MS;

      let tenant: {
        is_active: boolean;
        expires_at: Date | null;
        grace_period_until?: Date | null;
        deleted_at: Date | null;
        provisioning_status: TenantProvisioningStatus; // R1e
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
            "provisioning_status", // R1e: guarded below
          ],
          withDeleted: true, // soft-deleted tenants must be explicitly rejected below
        });

        if (tenant) {
          JwtAuthGuard.TENANT_STATUS_CACHE.set(user.tenant_id, {
            is_active: tenant.is_active,
            expires_at: tenant.expires_at,
            grace_period_until: tenant.grace_period_until ?? null,
            deleted_at: tenant.deleted_at ?? null,
            provisioning_status: tenant.provisioning_status, // R1e
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

      // R1e: enforce provisioning state. A tenant row can exist in PENDING or
      // FAILED states (reservation-first provisioning) while its physical schema
      // is missing or incomplete. Serving traffic against such a tenant is an
      // auth-bypass-class hole (schema queries fail or return cross-tenant noise).
      // Fail closed with a 503 so the request is rejected and the client retries;
      // the SuperAdmin UI must surface provisioning_status explicitly.
      if (tenant.provisioning_status !== TenantProvisioningStatus.ACTIVE) {
        throw new HttpException(
          {
            code: "TENANT_NOT_PROVISIONED",
            // 503 keeps retry traffic off a half-built tenant and signals "transient
            // infra" rather than "you are forbidden" — provisioning is usually fast.
            message:
              "This workspace is not ready yet. Please try again in a few moments.",
            retryAfter: 5,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
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
      // Fail-closed on infrastructure error: log and return 503 so frontend can retry.
      // Previously this was fail-open (silent return true) which let expired tenants through during DB outage.
      this.logger.error(
        `Tenant check failed for user=${user?.id} tenant=${user?.tenant_id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      const response = context.switchToHttp().getResponse();
      try {
        response?.setHeader?.("Retry-After", "5");
      } catch {
        // Best-effort header — some transports may not support it.
      }
      throw new ServiceUnavailableException(
        "Tenant verification temporarily unavailable — please retry.",
      );
    }

    return true;
  }
}
