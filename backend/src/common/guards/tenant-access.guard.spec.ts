import { ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import { TenantAccessGuard } from "./tenant-access.guard";
import { Role } from "@shared/types/role.enum";

describe("TenantAccessGuard (cross-tenant isolation)", () => {
  let guard: TenantAccessGuard;
  let cls: { get: jest.Mock; set: jest.Mock };

  const makeCtx = (overrides: {
    tenantIdParam?: string;
    user?: any;
    isPublic?: boolean;
  }) => {
    const req = {
      path: "/test",
      params: overrides.tenantIdParam ? { tenantId: overrides.tenantIdParam } : {},
      user: overrides.user ?? null,
    };
    const handler = () => {};
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(overrides.isPublic ?? false),
    };
    cls = {
      get: jest.fn((key: string) => (key === "SCHEMA_NAME" ? "tenant_a" : null)),
      set: jest.fn(),
    };
    guard = new TenantAccessGuard(reflector as any, cls as any);
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => handler,
      getClass: () => class {},
    } as unknown as ExecutionContext;
  };

  const tenantUser = {
    id: "u1",
    email: "admin@acme.com",
    tenant_id: "tenant-A",
    roles: [{ name: Role.FinanceManager }],
  };

  const superAdmin = {
    id: "u-sys",
    email: "sys@sentinel.fi",
    tenant_id: null,
    roles: [{ name: Role.SuperAdmin }],
  };

  it("allows SuperAdmin to access any tenant param", async () => {
    const ctx = makeCtx({ user: superAdmin, tenantIdParam: "tenant-B" });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("blocks cross-tenant param access", async () => {
    const ctx = makeCtx({ user: tenantUser, tenantIdParam: "tenant-B" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("allows matching tenant param", async () => {
    const ctx = makeCtx({ user: tenantUser, tenantIdParam: "tenant-A" });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("allows tenant user with no param (no cross-tenant risk)", async () => {
    const ctx = makeCtx({ user: tenantUser });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("blocks tenant user with missing tenant_id in CLS", async () => {
    cls.get.mockReturnValue(null);
    const ctx = makeCtx({ user: { ...tenantUser, tenant_id: null } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it("skips enforcement for @Public() routes", async () => {
    const ctx = makeCtx({ isPublic: true, tenantIdParam: "tenant-X" });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});