import { FinancialContextService } from "./financial-context.service";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";

const query = (result: unknown, terminal: "getRawOne" | "getRawMany" | "getCount") => {
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    "select",
    "addSelect",
    "where",
    "andWhere",
    "groupBy",
    "orderBy",
    "limit",
    "leftJoin",
  ]) {
    builder[method] = jest.fn(() => builder);
  }
  builder[terminal] = jest.fn().mockResolvedValue(result);
  return builder;
};

describe("FinancialContextService", () => {
  it("refuses an explicit tenant that conflicts with the authenticated CLS tenant", async () => {
    const service = new FinancialContextService(
      {} as any,
      { get: jest.fn().mockReturnValue("tenant-a") } as any,
    );

    await expect(service.buildSnapshot({ tenantId: "tenant-b" })).rejects.toThrow(
      "Tenant context mismatch",
    );
  });

  it("builds a numeric, tenant-scoped snapshot without child-WBS double counting", async () => {
    const budgetRepository = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(query({ total: "1000.50" }, "getRawOne"))
        .mockReturnValueOnce(query(3, "getCount")),
    };
    const expenseRepository = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(query({ total: "250.25" }, "getRawOne"))
        .mockReturnValueOnce(query([{ date: "2026-01-01", amount: "250.25" }], "getRawMany")),
    };
    const projectRepository = {
      count: jest.fn().mockResolvedValue(2),
      createQueryBuilder: jest.fn().mockReturnValue(
        query(
          [{ name: "Overrun project", total_budgeted: "100", total_actual: "150" }],
          "getRawMany",
        ),
      ),
    };
    const dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === WbsBudgetEntity) return budgetRepository;
        if (entity === LiveExpenseEntity) return expenseRepository;
        if (entity === ProjectEntity) return projectRepository;
        throw new Error("Unexpected repository");
      }),
    };
    const service = new FinancialContextService(
      dataSource as any,
      { get: jest.fn().mockReturnValue("tenant-a") } as any,
    );

    const snapshot = await service.buildSnapshot();

    expect(snapshot).toEqual(
      expect.objectContaining({
        tenantId: "tenant-a",
        totalBudgeted: 1000.5,
        totalActualPaid: 250.25,
        remainingBudget: 750.25,
        pendingApprovals: 3,
        activeProjects: 2,
        burnHistory30Days: [{ date: "2026-01-01", amount: 250.25 }],
        topOverruns: [
          { name: "Overrun project", variance_pct: "50.0", variance: 50 },
        ],
      }),
    );
    expect(budgetRepository.createQueryBuilder.mock.calls[0][0]).toBe("wbs");
  });
});
