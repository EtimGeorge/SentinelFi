import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SearchService } from "./search.service";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";

describe("SearchService (cross-tenant isolation)", () => {
  let service: SearchService;
  // Valid UUID tenant scope — the service is fail-closed and rejects
  // non-UUID scopes with ForbiddenException ("rejects non-UUID" test below).
  const TENANT_ID = "11111111-1111-4111-8111-111111111111";
  const wbsFind = jest.fn().mockResolvedValue([]);
  const userFind = jest.fn().mockResolvedValue([]);
  const expenseFind = jest.fn().mockResolvedValue([]);

  beforeEach(async () => {
    jest.clearAllMocks();
    wbsFind.mockResolvedValue([]);
    userFind.mockResolvedValue([]);
    expenseFind.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(WbsBudgetEntity),
          useValue: { find: wbsFind },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: { find: userFind },
        },
        {
          provide: getRepositoryToken(LiveExpenseEntity),
          useValue: { find: expenseFind },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("scopes ALL queries to the requesting tenant", async () => {
    await service.search("pipeline", TENANT_ID);

    expect(wbsFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { tenant_id: TENANT_ID, wbs_code: expect.anything() },
          { tenant_id: TENANT_ID, description: expect.anything() },
        ],
      }),
    );
    expect(userFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: TENANT_ID, email: expect.anything() },
      }),
    );
    expect(expenseFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ tenant_id: TENANT_ID, description: expect.anything() }],
      }),
    );
  });

  it("NEVER drops the tenant scoping on public.user lookups (shared schema leak)", async () => {
    await service.search("ceo@other-company.com", TENANT_ID);

    // UserEntity lives in public schema shared across tenants; tenant filter is mandatory.
    expect(userFind.mock.calls[0][0].where.tenant_id).toBe(TENANT_ID);
  });

  it("lets platform SuperAdmins (no tenant_id) search globally", async () => {
    await service.search("pipeline", null);

    expect(wbsFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { wbs_code: expect.anything() },
          { description: expect.anything() },
        ],
      }),
    );
    expect(userFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: expect.anything() },
      }),
    );
  });

  it("rejects non-UUID tenant scopes instead of searching globally", async () => {
    await expect(service.search("pipeline", "" as any)).rejects.toThrow(
      "Invalid tenant scope",
    );
    expect(wbsFind).not.toHaveBeenCalled();
    expect(userFind).not.toHaveBeenCalled();
  });

  it("escapes LIKE wildcards so % cannot match everything", async () => {
    await service.search("%", TENANT_ID);

    const where = wbsFind.mock.calls[0][0].where as Array<
      Record<string, unknown>
    >;
    // Each clause = { tenant_id, wbs_code | description: FindOperator(Like) }.
    // FindOperator wraps the raw pattern in `.value`; String(operator) would
    // render "[object Object]".
    const patterns = where.map(
      (clause) =>
        (Object.values(clause)[1] as { value: string }).value,
    );
    // Every pattern must contain an escaped \% — a bare % would dump the table.
    for (const pattern of patterns) {
      expect(pattern).toContain("\\%");
    }
  });

  it("returns empty sets for blank queries without hitting the database", async () => {
    const result = await service.search("   ", TENANT_ID);
    expect(result).toEqual({
      wbsItems: [],
      users: [],
      expenses: [],
    });
    expect(wbsFind).not.toHaveBeenCalled();
  });

  it("caps every entity result set (autocomplete, not bulk export)", async () => {
    await service.search("pipeline", TENANT_ID);

    for (const mock of [wbsFind, userFind, expenseFind]) {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    }
  });
});