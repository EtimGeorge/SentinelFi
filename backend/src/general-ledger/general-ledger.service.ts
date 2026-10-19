import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager, In, Not } from "typeorm";
import { ClsService } from "nestjs-cls";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { JournalEntryEntity } from "./entities/journal-entry.entity";
import { JournalLineEntity } from "./entities/journal-line.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import {
  JournalEntryStatus,
  JournalSourceType,
  ACCOUNT_CLASS_NORMAL_BALANCE,
  AccountClassType,
  NormalBalance,
} from "../../../shared/types/general-ledger";
import { QueryJournalEntriesDto } from "./dto/journal-entry.dto";

export interface JournalLineInput {
  glAccountId: string;
  costCenterId?: string | null;
  description?: string | null;
  debit?: number;
  credit?: number;
}

export interface PostJournalEntryInput {
  tenantId?: string;
  entryDate?: string | Date;
  memo?: string | null;
  currency?: string;
  sourceType?: JournalSourceType;
  sourceId?: string | null;
  sourceReference?: string | null;
  actorUserId?: string | null;
  status?: JournalEntryStatus;
  lines: JournalLineInput[];
}

export interface StatementRow {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  signed: number;
}

const round4 = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
};

const toDateString = (value?: string | Date): string => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException("Invalid journal entry date.");
  }
  return d.toISOString().slice(0, 10);
};

/**
 * General Ledger posting engine.
 *
 * Guarantees:
 *  - every POSTED entry balances (sum debit == sum credit) and has at least
 *    one debit and one credit leg;
 *  - all referenced accounts belong to the tenant and are active;
 *  - idempotent by (tenant, source_type, source_id): a replayed posting for a
 *    business document returns the existing entry instead of double-booking.
 */
@Injectable()
export class GeneralLedgerService {
  private readonly logger = new Logger(GeneralLedgerService.name);
  private static readonly BALANCE_EPSILON = 1e-6;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(JournalEntryEntity, TENANT_DATA_SOURCE)
    private journalEntryRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalLineEntity, TENANT_DATA_SOURCE)
    private journalLineRepo: Repository<JournalLineEntity>,
    @InjectRepository(GLAccountEntity, TENANT_DATA_SOURCE)
    private glAccountRepo: Repository<GLAccountEntity>,
  ) {}

  private getTenantId(): string {
    return this.cls.get("tenant_id");
  }

  // ─── Posting ─────────────────────────────────────────────────────────────

  async postJournalEntry(
    input: PostJournalEntryInput,
    manager?: EntityManager,
  ): Promise<JournalEntryEntity> {
    if (manager) {
      return this.postWithManager(manager, input);
    }
    return this.dataSource.transaction((m) => this.postWithManager(m, input));
  }

  private async postWithManager(
    manager: EntityManager,
    input: PostJournalEntryInput,
  ): Promise<JournalEntryEntity> {
    const tenantId = input.tenantId ?? this.getTenantId();
    const sourceType = input.sourceType ?? JournalSourceType.MANUAL;
    const status = input.status ?? JournalEntryStatus.POSTED;

    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException("A journal entry requires at least one line.");
    }

    // Normalise + validate each leg; compute totals.
    const lines = input.lines.map((line, index) => {
      const debit = round4(line.debit);
      const credit = round4(line.credit);
      if (debit < 0 || credit < 0) {
        throw new BadRequestException(
          "Journal line amounts cannot be negative.",
        );
      }
      const hasDebit = debit > 0;
      const hasCredit = credit > 0;
      if (hasDebit === hasCredit) {
        throw new BadRequestException(
          `Journal line ${index + 1} must have either a debit or a credit, but not both.`,
        );
      }
      return {
        glAccountId: line.glAccountId,
        costCenterId: line.costCenterId ?? null,
        description: line.description ?? null,
        debit,
        credit,
        lineNumber: index + 1,
      };
    });

    const totalDebit = round4(lines.reduce((sum, l) => sum + l.debit, 0));
    const totalCredit = round4(lines.reduce((sum, l) => sum + l.credit, 0));

    if (totalDebit <= 0) {
      throw new BadRequestException(
        "Journal entry must have a positive total debit.",
      );
    }
    if (
      Math.abs(totalDebit - totalCredit) >
      GeneralLedgerService.BALANCE_EPSILON
    ) {
      throw new BadRequestException(
        `Journal entry is not balanced: debits ${totalDebit} vs credits ${totalCredit}.`,
      );
    }

    // Validate accounts (tenant-scoped, active).
    const accountIds = [...new Set(lines.map((l) => l.glAccountId))];
    const accounts = await manager.find(GLAccountEntity, {
      where: { tenant_id: tenantId, id: In(accountIds) },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException(
        "One or more GL accounts were not found for this tenant.",
      );
    }
    const inactive = accounts.filter((a) => !a.is_active);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `GL account(s) ${inactive.map((a) => a.code).join(", ")} are inactive.`,
      );
    }

    // Idempotency: at most one non-VOID entry per source document.
    if (input.sourceId) {
      const existing = await manager.findOne(JournalEntryEntity, {
        where: {
          tenant_id: tenantId,
          source_type: sourceType,
          source_id: input.sourceId,
          status: Not(JournalEntryStatus.VOID),
        },
        relations: ["lines"],
      });
      if (existing) {
        this.logger.log(
          `[GL] Idempotent skip for ${sourceType}:${input.sourceId} (existing ${existing.entry_number})`,
        );
        return existing;
      }
    }

    const entryNumber = await this.allocateEntryNumber(manager, tenantId);
    const isPosted = status === JournalEntryStatus.POSTED;

    const entry = manager.create(JournalEntryEntity, {
      tenant_id: tenantId,
      entry_number: entryNumber,
      entry_date: toDateString(input.entryDate),
      memo: input.memo ?? null,
      source_type: sourceType,
      source_id: input.sourceId ?? null,
      source_reference: input.sourceReference ?? null,
      status,
      currency: (input.currency ?? "USD").toUpperCase(),
      total_debit: totalDebit,
      total_credit: totalCredit,
      posted_at: isPosted ? new Date() : null,
      posted_by_user_id: isPosted ? (input.actorUserId ?? null) : null,
      created_by_user_id: input.actorUserId ?? null,
    } as Partial<JournalEntryEntity>);
    const savedEntry = await manager.save(entry);

    await manager.save(
      lines.map((line) =>
        manager.create(JournalLineEntity, {
          tenant_id: tenantId,
          journal_entry_id: savedEntry.id,
          gl_account_id: line.glAccountId,
          cost_center_id: line.costCenterId,
          description: line.description,
          line_number: line.lineNumber,
          debit: line.debit,
          credit: line.credit,
        } as Partial<JournalLineEntity>),
      ),
    );

    savedEntry.lines = lines.map((line) =>
      manager.create(JournalLineEntity, {
        tenant_id: tenantId,
        journal_entry_id: savedEntry.id,
        gl_account_id: line.glAccountId,
        cost_center_id: line.costCenterId,
        description: line.description,
        line_number: line.lineNumber,
        debit: line.debit,
        credit: line.credit,
      } as Partial<JournalLineEntity>),
    );

    this.logger.log(
      `[GL] ${isPosted ? "POSTED" : "DRAFT"} ${entryNumber} | ${sourceType} | Dr ${totalDebit} / Cr ${totalCredit}`,
    );

    return savedEntry;
  }

  /**
   * Finalise a DRAFT entry (make it immutable + balance-affecting).
   */
  async postDraft(entryId: string, actorUserId?: string | null) {
    const tenantId = this.getTenantId();
    const entry = await this.journalEntryRepo.findOne({
      where: { id: entryId, tenant_id: tenantId },
      relations: ["lines"],
    });
    if (!entry) throw new NotFoundException("Journal entry not found.");
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new ConflictException("Only DRAFT entries can be posted.");
    }
    entry.status = JournalEntryStatus.POSTED;
    entry.posted_at = new Date();
    entry.posted_by_user_id = actorUserId ?? null;
    return this.journalEntryRepo.save(entry);
  }

  /**
   * Void a POSTED entry by creating a mirror-image reversing entry, then
   * marking the original VOID. Returns the reversal.
   */
  async voidJournalEntry(
    entryId: string,
    actorUserId?: string | null,
    reason?: string,
  ) {
    const tenantId = this.getTenantId();
    const original = await this.journalEntryRepo.findOne({
      where: { id: entryId, tenant_id: tenantId },
      relations: ["lines"],
    });
    if (!original) throw new NotFoundException("Journal entry not found.");
    if (original.status === JournalEntryStatus.VOID) {
      throw new ConflictException("Journal entry is already void.");
    }
    if (original.status === JournalEntryStatus.DRAFT) {
      original.status = JournalEntryStatus.VOID;
      await this.journalEntryRepo.save(original);
      return original;
    }

    const reversal = await this.postJournalEntry({
      tenantId,
      entryDate: toDateString(),
      memo:
        `Reversal of ${original.entry_number}` +
        (reason ? `: ${reason}` : ""),
      currency: original.currency,
      sourceType: JournalSourceType.REVERSAL,
      sourceId: original.id,
      sourceReference: original.entry_number,
      actorUserId,
      status: JournalEntryStatus.POSTED,
      lines: original.lines.map((line) => ({
        glAccountId: line.gl_account_id,
        costCenterId: line.cost_center_id,
        description: `Reversal of ${original.entry_number}`,
        debit: round4(line.credit),
        credit: round4(line.debit),
      })),
    });

    original.status = JournalEntryStatus.VOID;
    original.reversed_by_entry_id = reversal.id;
    await this.journalEntryRepo.save(original);

    this.logger.log(
      `[GL] VOID ${original.entry_number} -> reversal ${reversal.entry_number}`,
    );
    return reversal;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async listEntries(query: QueryJournalEntriesDto = {}) {
    const tenantId = this.getTenantId();
    const qb = this.journalEntryRepo
      .createQueryBuilder("entry")
      .leftJoinAndSelect("entry.lines", "line")
      .leftJoinAndSelect("line.glAccount", "account")
      .where("entry.tenant_id = :tenantId", { tenantId });

    if (query.status) {
      qb.andWhere("entry.status = :status", { status: query.status });
    }
    if (query.sourceType) {
      qb.andWhere("entry.source_type = :sourceType", {
        sourceType: query.sourceType,
      });
    }
    if (query.from) {
      qb.andWhere("entry.entry_date >= :from", { from: query.from });
    }
    if (query.to) {
      qb.andWhere("entry.entry_date <= :to", { to: query.to });
    }

    qb.orderBy("entry.entry_date", "DESC")
      .addOrderBy("entry.created_at", "DESC")
      .take(Math.min(Math.max(query.limit ?? 100, 1), 500));

    return qb.getMany();
  }

  async getEntry(entryId: string) {
    const tenantId = this.getTenantId();
    const entry = await this.journalEntryRepo.findOne({
      where: { id: entryId, tenant_id: tenantId },
      relations: ["lines", "lines.glAccount"],
    });
    if (!entry) throw new NotFoundException("Journal entry not found.");
    return entry;
  }

  /**
   * Trial balance: summed debits/credits per GL account across POSTED entries,
   * with the natural-balance figure. `totalDebit` should equal `totalCredit`.
   */
  async getTrialBalance(range: { from?: string; to?: string } = {}) {
    const tenantId = this.getTenantId();
    const qb = this.journalLineRepo
      .createQueryBuilder("line")
      .innerJoin(
        JournalEntryEntity,
        "entry",
        "entry.id = line.journal_entry_id AND entry.status = :posted",
        { posted: JournalEntryStatus.POSTED },
      )
      .innerJoin(GLAccountEntity, "acc", "acc.id = line.gl_account_id")
      .innerJoin(
        "account_group",
        "grp",
        "grp.id = acc.account_group_id",
      )
      .innerJoin(
        "account_class",
        "cls",
        "cls.id = grp.account_class_id",
      )
      .select("line.gl_account_id", "accountId")
      .addSelect("acc.code", "code")
      .addSelect("acc.name", "name")
      .addSelect("cls.base_type", "baseType")
      .addSelect("COALESCE(SUM(line.debit), 0)", "debit")
      .addSelect("COALESCE(SUM(line.credit), 0)", "credit")
      .where("line.tenant_id = :tenantId", { tenantId })
      .groupBy("line.gl_account_id")
      .addGroupBy("acc.code")
      .addGroupBy("acc.name")
      .addGroupBy("cls.base_type")
      .orderBy("acc.code", "ASC");

    if (range.from) {
      qb.andWhere("entry.entry_date >= :from", { from: range.from });
    }
    if (range.to) {
      qb.andWhere("entry.entry_date <= :to", { to: range.to });
    }

    const raw = await qb.getRawMany();
    const rows = raw.map((r) => {
      const debit = round4(r.debit);
      const credit = round4(r.credit);
      const baseType = r.baseType as AccountClassType;
      return {
        accountId: r.accountId as string,
        code: r.code as string,
        name: r.name as string,
        baseType,
        normalBalance: ACCOUNT_CLASS_NORMAL_BALANCE[baseType],
        debit,
        credit,
        balance: round4(debit - credit),
      };
    });

    const totalDebit = round4(rows.reduce((s, r) => s + r.debit, 0));
    const totalCredit = round4(rows.reduce((s, r) => s + r.credit, 0));

    return {
      rows,
      totalDebit,
      totalCredit,
      balanced:
        Math.abs(totalDebit - totalCredit) <=
        GeneralLedgerService.BALANCE_EPSILON,
    };
  }

  /**
   * Account ledger: every posting line for a GL account with a running
   * debit-credit balance, ordered chronologically.
   */
  async getAccountLedger(
    accountId: string,
    range: { from?: string; to?: string } = {},
  ) {
    const tenantId = this.getTenantId();
    const account = await this.glAccountRepo.findOne({
      where: { id: accountId, tenant_id: tenantId },
    });
    if (!account) throw new NotFoundException("GL account not found.");

    const qb = this.journalLineRepo
      .createQueryBuilder("line")
      .innerJoinAndSelect("line.entry", "entry")
      .where("line.tenant_id = :tenantId", { tenantId })
      .andWhere("line.gl_account_id = :accountId", { accountId })
      .andWhere("entry.status = :posted", {
        posted: JournalEntryStatus.POSTED,
      });

    if (range.from) {
      qb.andWhere("entry.entry_date >= :from", { from: range.from });
    }
    if (range.to) {
      qb.andWhere("entry.entry_date <= :to", { to: range.to });
    }

    const lines = await qb
      .orderBy("entry.entry_date", "ASC")
      .addOrderBy("entry.created_at", "ASC")
      .getMany();

    let running = 0;
    const entries = lines.map((line) => {
      const debit = round4(line.debit);
      const credit = round4(line.credit);
      running = round4(running + debit - credit);
      return {
        id: line.id,
        entryId: line.journal_entry_id,
        entryNumber: line.entry?.entry_number,
        entryDate: line.entry?.entry_date,
        memo: line.entry?.memo ?? null,
        description: line.description,
        debit,
        credit,
        balance: running,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        isActive: account.is_active,
      },
      openingBalance: 0,
      closingBalance: running,
      entries,
    };
  }

  // ─── Financial Statements ────────────────────────────────────────────────

  /**
   * Shared per-account rollup of POSTED journal lines within a date range,
   * grouped by account class base type. Debit/credit are summed as positive
   * figures; `balance` is the debit-minus-credit (natural-side interpretation
   * is left to the caller).
   */
  private async rollupByAccount(range: {
    from?: string;
    to?: string;
  }): Promise<
    Array<{
      accountId: string;
      code: string;
      name: string;
      baseType: AccountClassType;
      debit: number;
      credit: number;
      balance: number;
    }>
  > {
    const tenantId = this.getTenantId();
    const qb = this.journalLineRepo
      .createQueryBuilder("line")
      .innerJoin(
        JournalEntryEntity,
        "entry",
        "entry.id = line.journal_entry_id AND entry.status = :posted",
        { posted: JournalEntryStatus.POSTED },
      )
      .innerJoin(GLAccountEntity, "acc", "acc.id = line.gl_account_id")
      .innerJoin("account_group", "grp", "grp.id = acc.account_group_id")
      .innerJoin("account_class", "cls", "cls.id = grp.account_class_id")
      .select("line.gl_account_id", "accountId")
      .addSelect("acc.code", "code")
      .addSelect("acc.name", "name")
      .addSelect("cls.base_type", "baseType")
      .addSelect("COALESCE(SUM(line.debit), 0)", "debit")
      .addSelect("COALESCE(SUM(line.credit), 0)", "credit")
      .where("line.tenant_id = :tenantId", { tenantId })
      .groupBy("line.gl_account_id")
      .addGroupBy("acc.code")
      .addGroupBy("acc.name")
      .addGroupBy("cls.base_type")
      .orderBy("acc.code", "ASC");

    if (range.from) {
      qb.andWhere("entry.entry_date >= :from", { from: range.from });
    }
    if (range.to) {
      qb.andWhere("entry.entry_date <= :to", { to: range.to });
    }

    const raw = await qb.getRawMany();
    return raw.map((r) => {
      const debit = round4(r.debit);
      const credit = round4(r.credit);
      return {
        accountId: r.accountId as string,
        code: r.code as string,
        name: r.name as string,
        baseType: r.baseType as AccountClassType,
        debit,
        credit,
        balance: round4(debit - credit),
      };
    });
  }

  private static emptySections() {
    return {
      ASSET: [] as StatementRow[],
      LIABILITY: [] as StatementRow[],
      EQUITY: [] as StatementRow[],
      REVENUE: [] as StatementRow[],
      EXPENSE: [] as StatementRow[],
    };
  }

  private toStatementRow(r: {
    accountId: string;
    code: string;
    name: string;
    baseType: AccountClassType;
    balance: number;
  }): StatementRow {
    const normal = ACCOUNT_CLASS_NORMAL_BALANCE[r.baseType];
    const signed =
      normal === NormalBalance.DEBIT ? r.balance : round4(-r.balance);
    return {
      accountId: r.accountId,
      code: r.code,
      name: r.name,
      amount: round4(Math.abs(signed)),
      signed,
    };
  }

  /**
   * Balance Sheet (Statement of Financial Position) as of a date.
   *
   * Assets are debit-normal; liabilities and equity are credit-normal. Equities
   * include the P&L-derived result for the period so the sheet balances:
   *   Assets = Liabilities + Equity + (Revenue - Expenses)
   *
   * `balanced` reports whether that identity holds within epsilon (accumulated
   * retained earnings from prior periods must have been booked as an equity
   * entry for it to hold across periods).
   */
  async getBalanceSheet(range: { asOf?: string } = {}) {
    const rows = await this.rollupByAccount({ to: range.asOf });

    const sections = GeneralLedgerService.emptySections();
    for (const row of rows) {
      sections[row.baseType].push(this.toStatementRow(row));
    }

    const sum = (list: Array<{ amount: number }>) =>
      round4(list.reduce((s, r) => s + r.amount, 0));

    const totalAssets = sum(sections.ASSET);
    const totalLiabilities = sum(sections.LIABILITY);
    const totalEquityAccounts = sum(sections.EQUITY);
    const totalRevenue = sum(sections.REVENUE);
    const totalExpenses = sum(sections.EXPENSE);
    const periodResult = round4(totalRevenue - totalExpenses);
    const totalEquity = round4(totalEquityAccounts + periodResult);

    const totalLiabilitiesAndEquity = round4(totalLiabilities + totalEquity);

    return {
      asOf: range.asOf ?? null,
      assets: sections.ASSET,
      liabilities: sections.LIABILITY,
      equity: sections.EQUITY,
      totalAssets,
      totalLiabilities,
      totalEquity,
      periodResult,
      totalLiabilitiesAndEquity,
      balanced:
        Math.abs(totalAssets - totalLiabilitiesAndEquity) <=
        GeneralLedgerService.BALANCE_EPSILON,
    };
  }

  /**
   * Income Statement (P&L) for a period: revenue minus expenses.
   */
  async getIncomeStatement(range: { from?: string; to?: string } = {}) {
    const rows = await this.rollupByAccount(range);

    const revenue = rows
      .filter((r) => r.baseType === AccountClassType.REVENUE)
      .map((r) => this.toStatementRow(r));
    const expenses = rows
      .filter((r) => r.baseType === AccountClassType.EXPENSE)
      .map((r) => this.toStatementRow(r));

    const sum = (list: Array<{ amount: number }>) =>
      round4(list.reduce((s, r) => s + r.amount, 0));

    const totalRevenue = sum(revenue);
    const totalExpenses = sum(expenses);
    const netIncome = round4(totalRevenue - totalExpenses);

    return {
      from: range.from ?? null,
      to: range.to ?? null,
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async allocateEntryNumber(
    manager: EntityManager,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const rows: Array<{ last_value: number | string }> = await manager.query(
      `INSERT INTO "document_sequence" ("tenant_id", "doc_type", "period_year", "last_value")
       VALUES ($1, $2, $3, 1)
       ON CONFLICT ("tenant_id", "doc_type", "period_year")
       DO UPDATE SET "last_value" = "document_sequence"."last_value" + 1,
                     "updated_at" = now()
       RETURNING "last_value"`,
      [tenantId, "JOURNAL_VOUCHER", year],
    );
    const seq = Number(rows?.[0]?.last_value ?? 0);
    return `JV-${year}-${seq.toString().padStart(4, "0")}`;
  }
}
