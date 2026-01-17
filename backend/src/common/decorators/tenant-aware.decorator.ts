import { SetMetadata } from "@nestjs/common";

export const IS_TENANT_AWARE_KEY = "isTenantAware";
export const TenantAware = () => SetMetadata(IS_TENANT_AWARE_KEY, true);
