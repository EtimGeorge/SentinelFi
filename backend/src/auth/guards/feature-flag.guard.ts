import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantSettingsService } from "../../tenants/tenant-settings.service";

/**
 * Metadata key used to annotate which feature flag must be enabled.
 *
 * Usage on a controller or handler:
 *   @SetMetadata('requiresFeature', 'isDcsEnabled')
 *   or
 *   @SetMetadata('requiresFeature', 'isApiEnabled')
 */
export const FEATURE_FLAG_KEY = "requiresFeature";

/**
 * FeatureFlagGuard
 *
 * Guards any route decorated with @SetMetadata(FEATURE_FLAG_KEY, '<flagName>').
 * If the flag is disabled in the tenant's TenantSettings, the request is rejected
 * with a clear 403 message before any business logic executes.
 *
 * This enforces the DCS toggle and API Integration toggle at the network level,
 * not just the UI level, preventing API-bypassed access.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantSettingsService: TenantSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Read which feature flag this endpoint requires
    const requiredFlag = this.reflector.getAllAndOverride<string>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No flag required — pass through
    if (!requiredFlag) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.user?.tenant_id;

    // If there's no tenant context (SuperAdmin calling directly), allow
    if (!tenantId) return true;

    const settings =
      await this.tenantSettingsService.getOrCreateSettings(tenantId);

    const isEnabled = (settings as any)[requiredFlag];

    if (!isEnabled) {
      const friendlyName =
        requiredFlag === "isDcsEnabled"
          ? "Document Control System (DCS)"
          : requiredFlag === "isApiEnabled"
            ? "ERP / External API integration"
            : requiredFlag;

      throw new ForbiddenException(
        `${friendlyName} is not enabled for your organisation. ` +
          `An Admin can enable it from Settings → DCS & API.`,
      );
    }

    return true;
  }
}
