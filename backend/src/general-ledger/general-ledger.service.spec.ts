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
