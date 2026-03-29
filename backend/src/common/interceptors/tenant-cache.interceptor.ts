import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

/**
 * Custom Cache Interceptor that includes the tenant_id in the cache key.
 * This ensures that cached dashboard data is isolated per tenant.
 */
@Injectable()
export class TenantCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
    const isHttpApp = !!httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get("cacheKey", context.getHandler());

    if (!isHttpApp || cacheMetadata) {
      return cacheMetadata;
    }

    const requestMethod = httpAdapter.getRequestMethod(request);
    if (requestMethod !== "GET") {
      return undefined;
    }

    // Capture the tenant_id from the authenticated request
    const tenantId = request.user?.tenant_id;
    const url = httpAdapter.getRequestUrl(request);

    if (tenantId) {
      // Create a composite key: [tenantId]:[url]
      return `${tenantId}:${url}`;
    }

    return url;
  }
}
