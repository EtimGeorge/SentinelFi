import { ClsServiceManager } from "nestjs-cls";
import {
  TenancyAwareDataSource,
  TenantContextMissingError,
} from "./tenancy-aware-data-source";

const TENANT_UUID = "28c5e8aa-7b6d-4a1a-9b3f-1f2e3d4c5b6a";

/**
 * `TenancyAwareDataSource.createQueryRunner()` delegates to
 * `this.driver.createQueryRunner()` and binds that runner's `connect()`. By
 * replacing the driver we get the real override under test without touching a
 * prototype or opening a socket, and we can observe exactly which
 * `search_path` / RLS context the override chose.
 */
function harness() {
  const searchPaths: string[] = [];
  const rlsContexts: string[] = [];

  const baseConnect = jest.fn(async () => undefined);
  const runner = {
    connect: baseConnect,
    query: jest.fn(async () => []),
    isReleased: () => false,
    release: jest.fn(),
  };

  const driver = {
    options: { type: "postgres" },
    createQueryRunner: jest.fn(() => runner),
    query: jest.fn(async (sql: string) => {
      if (/search_path/i.test(sql)) searchPaths.push(sql);
      if (/app\.current_tenant_id/i.test(sql)) rlsContexts.push(sql);
      return [];
    }),
  };

  const dataSource = new TenancyAwareDataSource({
    type: "postgres",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dataSource as any).driver = driver;

  return { dataSource, searchPaths, rlsContexts, baseConnect };
}

function mockCls(active: boolean, values: Record<string, string>) {
  jest.spyOn(ClsServiceManager, "getClsService").mockReturnValue({
    isActive: () => active,
    get: (key: string) => values[key],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("TenancyAwareDataSource schema resolution", () => {
  afterEach(() => jest.restoreAllMocks());

  it("applies the tenant schema and tenant RLS context when CLS provides both", async () => {
    mockCls(true, {
      SCHEMA_NAME: "solution_energy",
      tenant_id: TENANT_UUID,
      correlationId: "cid-ok",
    });

    const { dataSource, searchPaths, rlsContexts } = harness();
    await dataSource.createQueryRunner().connect();

    expect(searchPaths[0]).toContain("solution_energy");
    expect(searchPaths[0]).toContain("public");
    expect(rlsContexts[0]).toContain(TENANT_UUID);
  });

  it("sanitizes a hostile schema value into one bare identifier", async () => {
    mockCls(true, {
      SCHEMA_NAME: 'evil"; DROP SCHEMA public; --',
      correlationId: "cid-evil",
    });

    const { dataSource, searchPaths } = harness();
    await dataSource.createQueryRunner().connect();

    const sql = searchPaths[0];
    // The security property is that the hostile value collapses to a single
    // bare identifier: its quotes, the injected statement and the comment must
    // not survive into the SQL, and the search_path must be exactly one
    // identifier followed by "public". The context is applied as one
    // set_config() statement, so no ";" may appear either.
    expect(sql).not.toContain('"');
    expect(sql).not.toContain(";");
    expect(sql).not.toContain("--");
    expect(sql).toMatch(
      /set_config\('search_path', '[A-Za-z0-9_]+, public', false\)/,
    );
  });

  it("throws TenantContextMissingError when CLS is active but SCHEMA_NAME is unset", async () => {
    mockCls(true, { correlationId: "cid-broken" });

    const { dataSource } = harness();
    await expect(
      dataSource.createQueryRunner().connect(),
    ).rejects.toBeInstanceOf(TenantContextMissingError);
  });

  it("includes the correlation id so the failing request is traceable", async () => {
    mockCls(true, { correlationId: "cid-abc123" });

    const { dataSource } = harness();
    await expect(dataSource.createQueryRunner().connect()).rejects.toThrow(
      /cid-abc123/,
    );
  });

  it("fails before acquiring a connection so no pool slot is leaked", async () => {
    mockCls(true, { correlationId: "cid-leak" });

    const { dataSource, baseConnect, searchPaths } = harness();
    await expect(
      dataSource.createQueryRunner().connect(),
    ).rejects.toBeInstanceOf(TenantContextMissingError);
    expect(baseConnect).not.toHaveBeenCalled();
    expect(searchPaths).toHaveLength(0);
  });

  it("falls back to public for system work that has no CLS context", async () => {
    mockCls(false, {});

    const { dataSource, searchPaths, rlsContexts } = harness();
    await dataSource.createQueryRunner().connect();

    expect(searchPaths[0]).toContain("public");
    expect(rlsContexts[0]).toContain("SYS");
  });

  it("treats a public-route schema as a normal tenant context", async () => {
    mockCls(true, { SCHEMA_NAME: "public", correlationId: "cid-public" });

    const { dataSource, searchPaths } = harness();
    await dataSource.createQueryRunner().connect();

    expect(searchPaths[0]).toContain("public");
  });

  it("uses SYS for a tenant_id that is not a uuid", async () => {
    mockCls(true, {
      SCHEMA_NAME: "solution_energy",
      tenant_id: "not-a-uuid",
      correlationId: "cid-badid",
    });

    const { dataSource, rlsContexts } = harness();
    await dataSource.createQueryRunner().connect();

    expect(rlsContexts[0]).toContain("SYS");
  });
});
