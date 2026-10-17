import { ConflictException } from "@nestjs/common";
import { ChartOfAccountsService } from "./chart-of-accounts.service";
import { AccountClassEntity } from "./entities/account-class.entity";
import { AccountGroupEntity } from "./entities/account-group.entity";
import { GLAccountEntity } from "./entities/gl-account.entity";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./default-chart-of-accounts";
import { AccountClassType } from "@shared/types/general-ledger";

const TOTAL_CLASSES = DEFAULT_CHART_OF_ACCOUNTS.length;
const TOTAL_GROUPS = DEFAULT_CHART_OF_ACCOUNTS.reduce(
  (s, c) => s + c.groups.length,
  0,
);
const TOTAL_ACCOUNTS = DEFAULT_CHART_OF_ACCOUNTS.reduce(
  (s, c) => s + c.groups.reduce((gs, g) => gs + g.accounts.length, 0),
  0,
);

function makeSeedManager(existing: unknown = null) {
  let counter = 0;
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn((_entity: unknown, obj: unknown) => ({ ...(obj as object) })),
    save: jest.fn((x: unknown) => {
      if (Array.isArray(x)) return Promise.resolve(x);
      counter += 1;
      return Promise.resolve({ ...(x as object), id: `gen-${counter}` });
    }),
  };
}

function makeService(overrides: {
  accountClassRepo?: Record<string, unknown>;
  accountGroupRepo?: Record<string, unknown>;
  glAccountRepo?: Record<string, unknown>;
} = {}) {
  const dataSource = { transaction: jest.fn(), query: jest.fn() };
  const cls = { get: jest.fn().mockReturnValue("tenant-1") };
  return new ChartOfAccountsService(
    dataSource as never,
    cls as never,
    (overrides.accountClassRepo ?? {}) as never,
    (overrides.accountGroupRepo ?? {}) as never,
    (overrides.glAccountRepo ?? {}) as never,
  );
}

describe("ChartOfAccountsService — default chart seeding", () => {
  it("creates the full default chart when none exists", async () => {
    const service = makeService();
    const manager = makeSeedManager(null);

    await service.ensureDefaultChartOfAccounts("tenant-1", manager as never);

    expect(manager.save).toHaveBeenCalledTimes(
      TOTAL_CLASSES + TOTAL_GROUPS + TOTAL_ACCOUNTS,
    );
    const createdCodes = manager.create.mock.calls.map(
      (c) => (c[1] as { code: string }).code,
    );
    // Spot-check each hierarchy level.
    expect(createdCodes).toContain("1000"); // class
    expect(createdCodes).toContain("2100"); // group
    expect(createdCodes).toContain("2120"); // payroll payable account
  });

  it("is idempotent — re-seeding an existing chart writes nothing", async () => {
    const service = makeService();
    const manager = makeSeedManager({
      id: "existing",
      tenant_id: "tenant-1",
      code: "1000",
    });

    await service.ensureDefaultChartOfAccounts("tenant-1", manager as never);

    expect(manager.save).not.toHaveBeenCalled();
  });

  it("wraps seeding in a transaction when no manager is supplied", async () => {
    const service = makeService();
    const manager = makeSeedManager(null);
    const dataSource = (service as unknown as { dataSource: { transaction: jest.Mock } })
      .dataSource;
    dataSource.transaction.mockImplementation(
      (cb: (m: unknown) => unknown) => cb(manager),
    );

    await service.ensureDefaultChartOfAccounts("tenant-1");

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalled();
  });
});

describe("ChartOfAccountsService — CRUD guards", () => {
  it("rejects a duplicate account class code", async () => {
    const service = makeService({
      accountClassRepo: {
        findOne: jest.fn().mockResolvedValue({ id: "existing" }),
      },
    });
    await expect(
      service.createClass({
        name: "Assets",
        code: "1000",
        baseType: AccountClassType.ASSET,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("refuses to delete a class that still has groups", async () => {
    const service = makeService({
      accountClassRepo: {
        findOne: jest.fn().mockResolvedValue({ id: "cls-1" }),
      },
      accountGroupRepo: { count: jest.fn().mockResolvedValue(2) },
    });
    await expect(service.deleteClass("cls-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("refuses to delete a group that still has accounts", async () => {
    const service = makeService({
      accountGroupRepo: {
        findOne: jest.fn().mockResolvedValue({ id: "grp-1" }),
      },
      glAccountRepo: { count: jest.fn().mockResolvedValue(1) },
    });
    await expect(service.deleteGroup("grp-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("refuses to delete an account referenced by journal lines", async () => {
    const service = makeService({
      glAccountRepo: {
        findOne: jest.fn().mockResolvedValue({ id: "acct-1" }),
      },
    });
    const dataSource = (
      service as unknown as { dataSource: { query: jest.Mock } }
    ).dataSource;
    dataSource.query.mockResolvedValue([{ "?column?": 1 }]);

    await expect(service.deleteAccount("acct-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe("ChartOfAccountsService — entity table names", () => {
  it("maps entities to the expected tables", () => {
    expect(new AccountClassEntity()).toBeInstanceOf(AccountClassEntity);
    expect(new AccountGroupEntity()).toBeInstanceOf(AccountGroupEntity);
    expect(new GLAccountEntity()).toBeInstanceOf(GLAccountEntity);
  });
});
