import "reflect-metadata";
import { OperationalBudgetsService } from "./operational-budgets.service";
import { EncumbranceSourceType, EncumbranceStatus } from "@shared/types";

type Row = Record<string, unknown>;

/**
 * Fluent-ish query-builder double. Every chainable returns itself; the terminal
 * `get*` methods resolve to the canned result for that query, so a service that
 * calls `.select().where().groupBy().getRawMany()` behaves like a real builder.
 */
function makeQb(config: { rawMany?: Row[]; many?: unknown[]; one?: unknown } = {}) {
  const builder: any = {};
  const chainable = [
    "select",
    "addSelect",
    "where",
    "andWhere",
    "groupBy",
    "orderBy",
    "having",
    "leftJoinAndSelect",
    "leftJoin",
    "innerJoin",
    "take",
    "skip",
    "limit",
    "offset",
    "setParameter",
    "distinct",
  ];
  for (const method of chainable) {
    builder[method] = jest.fn(() => builder);
  }
  builder.getRawMany = jest.fn(async () => config.rawMany ?? []);
  builder.getRawOne = jest.fn(async () => config.one ?? null);
  builder.getMany = jest.fn(async () => config.many ?? []);
  builder.getOne = jest.fn(async () => config.one ?? null);
  return builder;
}

/**
 * Per-repository double whose successive `createQueryBuilder` calls hand out a
 * fixed, ordered list of builders — one per query the service issues against
 * that repository, in source order.
 */
function makeRepo(builders: any[], one: unknown = null) {
  let index = 0;
  return {
    createQueryBuilder: jest.fn(() => {
      if (index >= builders.length) {
        throw new Error(
          `createQueryBuilder called ${index + 1} times but only ${builders.length} builder(s) mocked`,
        );
      }
      return builders[index++];
    }),
    findOne: jest.fn(async () => one),
  };
}

const BUDGET = {
  operational_budget_id: "B1",
  name: "Ops Budget",
  type: "OPERATIONAL",
  status: "ACTIVE",
  start_date: new Date("2026-01-01T00:00:00.000Z"),
  end_date: new Date("2026-12-31T00:00:00.000Z"),
  budgeted_amount: 1000,
  actual_spent: 0,
  categories: [
    {
      operational_budget_category_id: "C1",
      name: "Fuel",
      budgeted_amount: 1000,
      actual_spent: 0,
    },
  ],
};

function buildService(overrides: {
  budgets?: any[];
  budgetMeta?: Row[];
  rollupActual?: Row[];
  pendingCommitted?: Row[];
  committedMonthly?: Row[];
  trendActual?: Row[];
  recent?: unknown[];
  payroll?: Row[];
  p2pCommitted?: Row[];
  allocations?: Row[];
  costCenter?: unknown;
}) {
  const encBuilder = makeQb({ rawMany: overrides.p2pCommitted ?? [] });

  const expenseRepo = makeRepo([
    makeQb({ rawMany: overrides.rollupActual ?? [] }),
    makeQb({ rawMany: overrides.pendingCommitted ?? [] }),
    makeQb({ rawMany: overrides.committedMonthly ?? [] }),
    makeQb({ rawMany: overrides.trendActual ?? [] }),
    makeQb({ many: overrides.recent ?? [] }),
  ]);
  const budgetRepo = makeRepo([
    makeQb({ many: overrides.budgets ?? [] }),
    makeQb({ rawMany: overrides.budgetMeta ?? [] }),
  ]);
  const payrollRepo = makeRepo([makeQb({ rawMany: overrides.payroll ?? [] })]);
  const encRepo = makeRepo([encBuilder]);
  const allocationRepo = makeRepo([
    makeQb({ rawMany: overrides.allocations ?? [] }),
  ]);
  const fiscalYearRepo = makeRepo([]);
  const costCenterRepo = makeRepo([], overrides.costCenter ?? null);

  const service = new OperationalBudgetsService(
    {} as any,
    budgetRepo as any,
    payrollRepo as any,
    expenseRepo as any,
    encRepo as any,
    {} as any,
    allocationRepo as any,
    fiscalYearRepo as any,
    costCenterRepo as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, encBuilder };
}

describe("OperationalBudgetsService.getOpexAnalytics — P2P commitments", () => {
  it("rolls active P2P holds into committed and exposes them as committedEncumbrances", async () => {
    const { service } = buildService({
      budgets: [BUDGET],
      budgetMeta: [{ operational_budget_id: "B1", department_id: "D1" }],
      rollupActual: [{ category_id: "C1", actual_in_period: "200" }],
      pendingCommitted: [{ category_id: "C1", committed: "50" }],
      p2pCommitted: [{ budget_id: "B1", committed: "300" }],
    });

    const res = await service.getOpexAnalytics("T1", {});

    expect(res.totals.budgeted).toBe(1000);
    expect(res.totals.actual).toBe(200);
    // 50 category-coded PENDING expense holds + 300 budget-level P2P holds.
    expect(res.totals.committed).toBe(350);
    // The P2P slice is reported separately, as a subset of `committed`.
    expect(res.totals.committedEncumbrances).toBe(300);
    expect(res.totals.remaining).toBe(450);
    expect(res.totals.forecast).toBe(550);

    // P2P never leaks into the category series (holds carry no category).
    expect(res.byCategory).toHaveLength(1);
    expect(res.byCategory[0].committed).toBe(50);

    expect(res.byDepartment).toHaveLength(1);
    expect(res.byDepartment[0].departmentId).toBe("D1");
    expect(res.byDepartment[0].committed).toBe(350);
    expect(res.byDepartment[0].committedEncumbrances).toBe(300);
  });

  it("scopes the P2P query to requisition/PO holds in non-terminal states", async () => {
    const { service, encBuilder } = buildService({
      budgets: [BUDGET],
      budgetMeta: [{ operational_budget_id: "B1", department_id: "D1" }],
      rollupActual: [],
      p2pCommitted: [],
    });

    await service.getOpexAnalytics("T1", {});

    expect(encBuilder.andWhere).toHaveBeenCalledWith(
      "enc.source_type IN (:...p2pSources)",
      {
        p2pSources: [
          EncumbranceSourceType.REQUISITION,
          EncumbranceSourceType.PURCHASE_ORDER,
        ],
      },
    );
    expect(encBuilder.andWhere).toHaveBeenCalledWith(
      "enc.status IN (:...activeStatuses)",
      {
        activeStatuses: [EncumbranceStatus.RESERVED, EncumbranceStatus.FIRM],
      },
    );

    const sourceCall = (encBuilder.andWhere as jest.Mock).mock.calls.find(
      (call) => call[0] === "enc.source_type IN (:...p2pSources)",
    );
    expect(sourceCall?.[1].p2pSources).not.toContain(
      EncumbranceSourceType.EXPENSE,
    );
  });

  it("applies the resolved department scope to the P2P query when a cost center is selected", async () => {
    const { service, encBuilder } = buildService({
      budgets: [BUDGET],
      budgetMeta: [{ operational_budget_id: "B1", department_id: "D1" }],
      rollupActual: [],
      p2pCommitted: [],
      costCenter: { id: "CC1", department_id: "D1" },
    });

    await service.getOpexAnalytics("T1", { costCenterId: "CC1" });

    expect(encBuilder.andWhere).toHaveBeenCalledWith(
      "enc.operational_budget_id IN (:...__scopeIds)",
      { __scopeIds: ["B1"] },
    );
  });
});
