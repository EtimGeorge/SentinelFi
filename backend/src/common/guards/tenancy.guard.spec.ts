import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { TenancyGuard } from "./tenancy.guard";

const ACTIVE_TENANT = "28c5e8aa-5270-4299-b062-2414575019b9";
const DEAD_TENANT = "e5b8e754-396c-48ed-b6f0-65578a32deea";

function makeGuard(rows: any[]) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as any;
  const store: Record<string, any> = {};
  const cls = {
    set: jest.fn((k: string, v: any) => {
      store[k] = v;
    }),
    get: jest.fn((k: string) => store[k]),
    run: jest.fn((fn: any) => fn()),
  } as any;
  const dataSource = { query: jest.fn().mockResolvedValue(rows) } as any;
  const guard = new TenancyGuard(reflector, cls, dataSource);
  return { guard, cls, dataSource };
}

function ctxFor(tenantId: string | null) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: "u1", tenant_id: tenantId } }),
    }),
  } as any;
}

const activeRow = {
  tenant_id: ACTIVE_TENANT,
  schema_name: "solution_energy",
  provisioning_status: "ACTIVE",
  schema_exists: true,
  is_active: true,
  deleted_at: null,
};

describe("TenancyGuard deactivated workspaces", () => {
  it("lets an active workspace through", async () => {
    const { guard } = makeGuard([activeRow]);
    await expect(guard.canActivate(ctxFor(ACTIVE_TENANT))).resolves.toBe(true);
  });

  it("blocks is_active=false with 403 TENANT_DEACTIVATED", async () => {
    const { guard, dataSource } = makeGuard([
      { ...activeRow, tenant_id: DEAD_TENANT, is_active: false },
    ]);
    const err = await guard
      .canActivate(ctxFor(DEAD_TENANT))
      .then(
        () => null,
        (e: any) => e,
      );
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getStatus()).toBe(403);
    expect((err as ForbiddenException).getResponse()).toEqual(
      expect.objectContaining({ code: "TENANT_DEACTIVATED" }),
    );
    // must not touch the tenant schema at all
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it("blocks soft-deleted (deleted_at set) workspaces even when is_active is true", async () => {
    const { guard } = makeGuard([
      { ...activeRow, deleted_at: new Date("2026-10-08T13:05:19Z") },
    ]);
    await expect(guard.canActivate(ctxFor(ACTIVE_TENANT))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("still returns 404 for unknown tenants", async () => {
    const { guard } = makeGuard([]);
    await expect(
      guard.canActivate(ctxFor("11111111-2222-4333-8444-555555555555")),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("asks the database for is_active/deleted_at in the same round trip", async () => {
    const { guard, dataSource } = makeGuard([activeRow]);
    await guard.canActivate(ctxFor(ACTIVE_TENANT));
    const sql: string = dataSource.query.mock.calls[0][0];
    expect(sql).toContain("is_active");
    expect(sql).toContain("deleted_at");
  });
});
