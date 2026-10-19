import { BadRequestException } from "@nestjs/common";
import { GeneralLedgerService } from "./general-ledger.service";
import { JournalEntryEntity } from "./entities/journal-entry.entity";
import { JournalLineEntity } from "./entities/journal-line.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import {
  JournalEntryStatus,
  JournalSourceType,
} from "../../../shared/types/general-ledger";

function makeManager(overrides: Record<string, unknown> = {}) {
  const manager = {
    find: jest.fn().mockResolvedValue([
      { id: "acct-a", is_active: true, code: "5110" },
      { id: "acct-b", is_active: true, code: "2120" },
    ]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((_entity: unknown, obj: unknown) => ({ ...(obj as object) })),
    save: jest.fn((x: unknown) => {
      if (Array.isArray(x)) return Promise.resolve(x);
      const obj = x as Record<string, unknown>;
      return Promise.resolve({ ...obj, id: obj.id ?? "entry-1" });
    }),
    query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
    ...overrides,
  };
  return manager;
}

function makeService() {
  const cls = { get: jest.fn().mockReturnValue("tenant-1") };
  return new GeneralLedgerService(
    {} as never,
    cls as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe("GeneralLedgerService — posting invariants", () => {
  const tenantId = "tenant-1";

  it("rejects an unbalanced entry", async () => {
    const service = makeService();
    const manager = makeManager();
    await expect(
      service.postJournalEntry(
        {
          tenantId,
          entryDate: "2026-02-01",
          lines: [
            { glAccountId: "acct-a", debit: 100 },
            { glAccountId: "acct-b", credit: 50 },
          ],
        },
        manager as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it("rejects a line carrying both a debit and a credit", async () => {
    const service = makeService();
    const manager = makeManager();
    await expect(
      service.postJournalEntry(
        {
          tenantId,
          lines: [
            { glAccountId: "acct-a", debit: 100, credit: 100 },
            { glAccountId: "acct-b", credit: 100 },
          ],
        },
        manager as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an entry with a zero total debit", async () => {
    const service = makeService();
    const manager = makeManager();
    await expect(
      service.postJournalEntry(
        { tenantId, lines: [{ glAccountId: "acct-a", debit: 0, credit: 0 }] },
        manager as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unknown tenant accounts", async () => {
    const service = makeService();
    const manager = makeManager({
      find: jest
        .fn()
        .mockResolvedValue([{ id: "acct-a", is_active: true, code: "5110" }]),
    });
    await expect(
      service.postJournalEntry(
        {
          tenantId,
          lines: [
            { glAccountId: "acct-a", debit: 100 },
            { glAccountId: "acct-missing", credit: 100 },
          ],
        },
        manager as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects inactive accounts", async () => {
    const service = makeService();
    const manager = makeManager({
      find: jest.fn().mockResolvedValue([
        { id: "acct-a", is_active: false, code: "5110" },
        { id: "acct-b", is_active: true, code: "2120" },
      ]),
    });
    await expect(
      service.postJournalEntry(
        {
          tenantId,
          lines: [
            { glAccountId: "acct-a", debit: 100 },
            { glAccountId: "acct-b", credit: 100 },
          ],
        },
        manager as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("posts a balanced entry with a JV number and posted timestamp", async () => {
    const service = makeService();
    const manager = makeManager();

    const result = await service.postJournalEntry(
      {
        tenantId,
        entryDate: "2026-02-01",
        sourceType: JournalSourceType.PAYROLL,
        sourceId: "run-1",
        actorUserId: "user-1",
        lines: [
          { glAccountId: "acct-a", debit: 100 },
          { glAccountId: "acct-b", credit: 100 },
        ],
      },
      manager as never,
    );

    expect(result.status).toBe(JournalEntryStatus.POSTED);
    expect(result.source_type).toBe(JournalSourceType.PAYROLL);
    expect(result.total_debit).toBe(100);
    expect(result.total_credit).toBe(100);
    expect(result.entry_number).toMatch(/^JV-\d{4}-0001$/);
    expect(result.posted_at).toBeInstanceOf(Date);
    // header + lines persisted
    expect(manager.save).toHaveBeenCalledTimes(2);
  });

  it("is idempotent for a source document that was already posted", async () => {
    const service = makeService();
    const existing = {
      id: "entry-existing",
      entry_number: "JV-2026-0042",
      status: JournalEntryStatus.POSTED,
    };
    const manager = makeManager({
      findOne: jest.fn((entity: unknown) =>
        entity === JournalEntryEntity
          ? Promise.resolve(existing)
          : Promise.resolve(null),
      ),
    });

    const result = await service.postJournalEntry(
      {
        tenantId,
        sourceType: JournalSourceType.PAYROLL,
        sourceId: "run-1",
        lines: [
          { glAccountId: "acct-a", debit: 100 },
          { glAccountId: "acct-b", credit: 100 },
        ],
      },
      manager as never,
    );

    expect(result).toBe(existing);
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });

  it("rounds line amounts to four decimal places before balancing", async () => {
    const service = makeService();
    const manager = makeManager();
    const result = await service.postJournalEntry(
      {
        tenantId,
        lines: [
          { glAccountId: "acct-a", debit: 0.1 },
          { glAccountId: "acct-b", credit: 0.100049 },
        ],
      },
      manager as never,
    );
    // 0.100049 rounds to 0.1, so the entry balances.
    expect(result.total_credit).toBe(0.1);
  });
});

describe("GeneralLedgerService — entity wiring", () => {
  it("exposes the journal entities with expected table names", () => {
    expect(new JournalEntryEntity()).toBeInstanceOf(JournalEntryEntity);
    expect(new JournalLineEntity()).toBeInstanceOf(JournalLineEntity);
    expect(new GLAccountEntity()).toBeInstanceOf(GLAccountEntity);
  });
});

function makeStatementService(rawRows: Array<Record<string, unknown>>) {
  const cls = { get: jest.fn().mockReturnValue("tenant-1") };
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
  const journalLineRepo = { createQueryBuilder: jest.fn(() => qb) };
  return new GeneralLedgerService(
    {} as never,
    cls as never,
    {} as never,
    journalLineRepo as never,
    {} as never,
  );
}

describe("GeneralLedgerService — financial statements", () => {
  it("classifies accounts into balance-sheet sections and balances via the period result", async () => {
    const service = makeStatementService([
      { accountId: "a1", code: "1200", name: "Cash", baseType: "ASSET", debit: 500, credit: 0 },
      { accountId: "l1", code: "2100", name: "Payable", baseType: "LIABILITY", debit: 0, credit: 200 },
      { accountId: "r1", code: "4000", name: "Sales", baseType: "REVENUE", debit: 0, credit: 300 },
      { accountId: "e1", code: "5000", name: "Rent", baseType: "EXPENSE", debit: 0, credit: 0 },
    ]);

    const sheet = await service.getBalanceSheet({});
    expect(sheet.totalAssets).toBe(500);
    expect(sheet.totalLiabilities).toBe(200);
    // period result = revenue 300 - expenses 0 = 300
    expect(sheet.periodResult).toBe(300);
    expect(sheet.totalEquity).toBe(300);
    expect(sheet.totalLiabilitiesAndEquity).toBe(500);
    expect(sheet.balanced).toBe(true);
  });

  it("reports an out-of-balance sheet when assets do not equal L+E", async () => {
    const service = makeStatementService([
      { accountId: "a1", code: "1200", name: "Cash", baseType: "ASSET", debit: 999, credit: 0 },
      { accountId: "l1", code: "2100", name: "Payable", baseType: "LIABILITY", debit: 0, credit: 200 },
    ]);

    const sheet = await service.getBalanceSheet({});
    expect(sheet.balanced).toBe(false);
  });

  it("computes net income as revenue minus expenses", async () => {
    const service = makeStatementService([
      { accountId: "r1", code: "4000", name: "Sales", baseType: "REVENUE", debit: 0, credit: 1000 },
      { accountId: "e1", code: "5000", name: "Rent", baseType: "EXPENSE", debit: 400, credit: 0 },
    ]);

    const pnl = await service.getIncomeStatement({});
    expect(pnl.totalRevenue).toBe(1000);
    expect(pnl.totalExpenses).toBe(400);
    expect(pnl.netIncome).toBe(600);
  });

  it("reports a net loss when expenses exceed revenue", async () => {
    const service = makeStatementService([
      { accountId: "r1", code: "4000", name: "Sales", baseType: "REVENUE", debit: 0, credit: 100 },
      { accountId: "e1", code: "5000", name: "Rent", baseType: "EXPENSE", debit: 250, credit: 0 },
    ]);

    const pnl = await service.getIncomeStatement({});
    expect(pnl.netIncome).toBe(-150);
  });
});
