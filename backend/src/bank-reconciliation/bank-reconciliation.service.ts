import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, DeepPartial } from "typeorm";
import { ClsService } from "nestjs-cls";

import { TENANT_DATA_SOURCE } from "../database/constants";
import {
  BankAccountEntity,
  BankStatementLineEntity,
  BankReconciliationEntity,
  BankReconciliationLineEntity,
  ReconciliationStatus,
  ReconciliationMatchType,
  BankAccountStatus,
} from "./entities/index";
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateBankStatementLineDto,
  CreateReconciliationDto,
  MatchReconciliationLineDto,
  ApproveReconciliationDto,
  PostReconciliationDto,
} from "./dto/index";
import {
  ApprovalLogEntity,
  ApprovalDocumentType,
  ApprovalStatus,
} from "../common/entities/approval-log.entity";
import { DOAService } from "../common/doa.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ChartOfAccountsService } from "../finance-core/chart-of-accounts.service";
import { GeneralLedgerService } from "../general-ledger/general-ledger.service";
import { SYSTEM_ACCOUNT_CODES } from "../finance-core/default-chart-of-accounts";
import { JournalSourceType } from "@shared/types/general-ledger";
import { UserPayload } from "@shared/types/user";

const round4 = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
};

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(BankAccountEntity, TENANT_DATA_SOURCE)
    private readonly bankAccountRepo: Repository<BankAccountEntity>,
    @InjectRepository(BankStatementLineEntity, TENANT_DATA_SOURCE)
    private readonly bankStatementLineRepo: Repository<BankStatementLineEntity>,
    @InjectRepository(BankReconciliationEntity, TENANT_DATA_SOURCE)
    private readonly bankReconciliationRepo: Repository<BankReconciliationEntity>,
    @InjectRepository(BankReconciliationLineEntity, TENANT_DATA_SOURCE)
    private readonly bankReconciliationLineRepo: Repository<BankReconciliationLineEntity>,
    @InjectRepository(ApprovalLogEntity, TENANT_DATA_SOURCE)
    private readonly approvalLogRepo: Repository<ApprovalLogEntity>,
    private readonly doaService: DOAService,
    private readonly notificationsService: NotificationsService,
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly generalLedgerService: GeneralLedgerService,
  ) {}

  private getTenantId(): string {
    const tenantId = this.cls.get("tenant_id");
    if (!tenantId) {
      throw new InternalServerErrorException(
        "Tenant context missing. Request must include a valid tenant.",
      );
    }
    return tenantId;
  }

  private async getAccountCurrency(
    bankAccountId: string,
    tenantId: string,
  ): Promise<string> {
    const account = await this.getBankAccount(bankAccountId, tenantId);
    return account.currency_code;
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────

  async createBankAccount(
    dto: CreateBankAccountDto,
    createdByUserId: string,
    tenantId: string,
  ) {
    const currencyCode = dto.currency_code || "USD";
    const accountData: DeepPartial<BankAccountEntity> = {
      tenant_id: tenantId,
      account_name: dto.account_name,
      account_number_masked: dto.account_number_masked,
      bank_name: dto.bank_name,
      currency_code: currencyCode,
      opening_balance: round4(dto.opening_balance ?? 0),
      current_balance: round4(dto.opening_balance ?? 0),
      status: (dto.status || "ACTIVE") as BankAccountStatus,
      created_by_user_id: createdByUserId,
    };
    const account = this.bankAccountRepo.create(accountData);
    return this.bankAccountRepo.save(account);
  }

  async listBankAccounts(tenantId: string) {
    return this.bankAccountRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: "DESC" },
    });
  }

  async getBankAccount(id: string, tenantId: string) {
    const account = await this.bankAccountRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!account) throw new NotFoundException("Bank account not found");
    return account;
  }

  async updateBankAccount(
    id: string,
    dto: UpdateBankAccountDto,
    tenantId: string,
  ) {
    const account = await this.getBankAccount(id, tenantId);
    if (dto.account_name !== undefined) account.account_name = dto.account_name;
    if (dto.bank_name !== undefined) account.bank_name = dto.bank_name;
    if (dto.status !== undefined)
      account.status = dto.status as BankAccountStatus;
    return this.bankAccountRepo.save(account);
  }

  // ── Bank Statement Lines ───────────────────────────────────────────────

  async createBankStatementLine(
    dto: CreateBankStatementLineDto,
    tenantId: string,
  ) {
    await this.getBankAccount(dto.bank_account_id, tenantId);
    const lineData: DeepPartial<BankStatementLineEntity> = {
      tenant_id: tenantId,
      bank_account_id: dto.bank_account_id,
      statement_reference: dto.statement_reference,
      transaction_date: dto.transaction_date,
      description: dto.description,
      amount: round4(dto.amount),
      balance_after: dto.balance_after ? round4(dto.balance_after) : null,
      reference_number: dto.reference_number || null,
      is_matched: false,
    };
    const line = this.bankStatementLineRepo.create(lineData);
    return this.bankStatementLineRepo.save(line);
  }

  async listBankStatementLines(
    tenantId: string,
    bankAccountId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const where: any = { tenant_id: tenantId };
    if (bankAccountId) where.bank_account_id = bankAccountId;
    if (fromDate || toDate) {
      where.transaction_date = {};
      if (fromDate)
        where.transaction_date = { ...where.transaction_date, $gte: fromDate };
      if (toDate)
        where.transaction_date = { ...where.transaction_date, $lte: toDate };
    }
    return this.bankStatementLineRepo.find({
      where,
      order: { transaction_date: "DESC", created_at: "DESC" },
    });
  }

  // ── Reconciliations ────────────────────────────────────────────────────

  async createReconciliation(
    dto: CreateReconciliationDto,
    createdByUserId: string,
    tenantId: string,
  ) {
    await this.getBankAccount(dto.bank_account_id, tenantId);

    const existing = await this.bankReconciliationRepo.findOne({
      where: {
        tenant_id: tenantId,
        bank_account_id: dto.bank_account_id,
        reconciliation_date: dto.reconciliation_date,
        status: ReconciliationStatus.OPEN,
      },
    });
    if (existing) {
      throw new ConflictException(
        "An OPEN reconciliation already exists for this account and date.",
      );
    }

    const bookBalance = dto.book_balance ?? 0;
    const difference = round4(dto.statement_balance - bookBalance);

    const reconciliation = this.bankReconciliationRepo.create({
      tenant_id: tenantId,
      bank_account_id: dto.bank_account_id,
      reconciliation_date: dto.reconciliation_date,
      statement_balance: round4(dto.statement_balance),
      book_balance: round4(bookBalance),
      difference,
      status: ReconciliationStatus.OPEN,
      created_by_user_id: createdByUserId,
    });
    const saved = await this.bankReconciliationRepo.save(reconciliation);

    return saved;
  }

  async listReconciliations(
    tenantId: string,
    bankAccountId?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const where: any = { tenant_id: tenantId };
    if (bankAccountId) where.bank_account_id = bankAccountId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.reconciliation_date = {};
      if (fromDate)
        where.reconciliation_date = {
          ...where.reconciliation_date,
          $gte: fromDate,
        };
      if (toDate)
        where.reconciliation_date = {
          ...where.reconciliation_date,
          $lte: toDate,
        };
    }
    return this.bankReconciliationRepo.find({
      where,
      order: { reconciliation_date: "DESC", created_at: "DESC" },
    });
  }

  async getReconciliation(id: string, tenantId: string) {
    const reconciliation = await this.bankReconciliationRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!reconciliation)
      throw new NotFoundException("Reconciliation not found");
    return reconciliation;
  }

  async getReconciliationLines(id: string, tenantId: string) {
    await this.getReconciliation(id, tenantId);
    return this.bankReconciliationLineRepo.find({
      where: { tenant_id: tenantId, reconciliation_id: id },
      order: { created_at: "ASC" },
    });
  }

  async matchReconciliationLine(
    dto: MatchReconciliationLineDto,
    actorUserId: string,
    tenantId: string,
  ) {
    const reconciliation = await this.getReconciliation(
      dto.reconciliation_id,
      tenantId,
    );
    if (reconciliation.status !== ReconciliationStatus.OPEN) {
      throw new ConflictException("Only OPEN reconciliations can be matched.");
    }

    const statementLine = await this.bankStatementLineRepo.findOne({
      where: { id: dto.bank_statement_line_id, tenant_id: tenantId },
    });
    if (!statementLine)
      throw new NotFoundException("Bank statement line not found");
    if (statementLine.is_matched) {
      throw new ConflictException("Bank statement line is already matched.");
    }

    const line = this.bankReconciliationLineRepo.create({
      tenant_id: tenantId,
      reconciliation_id: dto.reconciliation_id,
      bank_statement_line_id: dto.bank_statement_line_id,
      amount: round4(dto.amount),
      match_type: (dto.match_type || "MANUAL") as ReconciliationMatchType,
    });
    const saved = await this.bankReconciliationLineRepo.save(line);

    statementLine.is_matched = true;
    statementLine.matched_reconciliation_id = dto.reconciliation_id;
    await this.bankStatementLineRepo.save(statementLine);

    await this.recomputeBookBalance(dto.reconciliation_id, tenantId);

    return saved;
  }

  private async recomputeBookBalance(
    reconciliationId: string,
    tenantId: string,
  ) {
    const lines = await this.bankReconciliationLineRepo.find({
      where: { tenant_id: tenantId, reconciliation_id: reconciliationId },
    });
    const bookBalance = lines.reduce(
      (sum, l) => sum + Number(l.amount || 0),
      0,
    );
    await this.bankReconciliationRepo.update(
      { id: reconciliationId, tenant_id: tenantId },
      { book_balance: round4(bookBalance) },
    );
    // Refresh difference
    const rec = await this.bankReconciliationRepo.findOne({
      where: { id: reconciliationId, tenant_id: tenantId },
    });
    if (rec) {
      rec.difference = round4(Number(rec.statement_balance) - bookBalance);
      await this.bankReconciliationRepo.save(rec);
    }
  }

  // ── Approval workflow (DOA + SoD + audit) ─────────────────────────────

  async approveReconciliation(
    dto: ApproveReconciliationDto,
    actor: UserPayload,
    actorRole: string,
    tenantId: string,
  ) {
    const reconciliation = await this.getReconciliation(
      dto.reconciliation_id,
      tenantId,
    );
    if (reconciliation.status !== ReconciliationStatus.OPEN) {
      throw new ConflictException("Only OPEN reconciliations can be approved.");
    }

    const account = await this.getBankAccount(
      reconciliation.bank_account_id,
      tenantId,
    );
    const currencyCode = account.currency_code || "USD";
    const amount = Number(reconciliation.statement_balance);

    // SoD: creator cannot approve own reconciliation when over dual-control threshold
    if (
      (await this.doaService.requiresDualControl(amount, currencyCode)) &&
      reconciliation.created_by_user_id === actor.id
    ) {
      throw new ForbiddenException(
        "Segregation of duties: you cannot approve a reconciliation you created that exceeds the dual-control threshold.",
      );
    }

    // DOA authority check
    await this.doaService.validateAuthority(actor, amount, currencyCode);

    reconciliation.status = ReconciliationStatus.APPROVED;
    reconciliation.approved_by_user_id = actor.id;
    reconciliation.approved_at = new Date();
    const saved = await this.bankReconciliationRepo.save(reconciliation);

    // PERSIST APPROVAL LOG — bank reconciliation approval
    await this.approvalLogRepo.save(
      this.approvalLogRepo.create({
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.BANK_RECONCILIATION,
        document_id: reconciliation.id,
        status: ApprovalStatus.APPROVED,
        actor_id: actor.id,
        amount: amount,
        comments:
          dto.comments || `Bank reconciliation approved by ${actorRole}`,
      } as any),
    );

    await this.notificationsService.sendVarianceAlert(
      "Bank Reconciliation Approved",
      `Reconciliation for account ${account.account_name} approved (difference: ${reconciliation.difference}).`,
      reconciliation.difference !== 0 ? "warning" : "info",
    );

    return saved;
  }

  async postReconciliation(
    dto: PostReconciliationDto,
    actor: UserPayload,
    tenantId: string,
  ) {
    const reconciliation = await this.getReconciliation(
      dto.reconciliation_id,
      tenantId,
    );
    if (reconciliation.status !== ReconciliationStatus.APPROVED) {
      throw new ConflictException(
        "Only APPROVED reconciliations can be posted.",
      );
    }

    const account = await this.getBankAccount(
      reconciliation.bank_account_id,
      tenantId,
    );
    const currencyCode = account.currency_code || "USD";

    // Posting to GL requires CFO+ authority (highest tier for financial posting)
    await this.doaService.validateAuthority(
      actor,
      Number(reconciliation.statement_balance),
      currencyCode,
    );

    const cashAccount = await this.chartOfAccountsService.getAccountByCode(
      SYSTEM_ACCOUNT_CODES.CASH_AND_BANK,
      tenantId,
    );
    if (!cashAccount) {
      throw new NotFoundException(
        "Cash & Bank control account (1110) not found in chart of accounts.",
      );
    }

    const difference = round4(
      Number(reconciliation.statement_balance) -
        Number(reconciliation.book_balance),
    );
    const lines = [
      {
        glAccountId: cashAccount.id,
        costCenterId: null,
        description: `Bank reconciliation ${reconciliation.id}`,
        debit: difference > 0 ? difference : 0,
        credit: difference < 0 ? Math.abs(difference) : 0,
      },
    ];

    await this.generalLedgerService.postJournalEntry({
      tenantId,
      entryDate: reconciliation.reconciliation_date,
      memo: `Bank reconciliation posted: ${account.account_name}`,
      currency: currencyCode,
      sourceType: JournalSourceType.MANUAL,
      sourceId: reconciliation.id,
      sourceReference: `REC-${reconciliation.id}`,
      actorUserId: actor.id,
      lines,
    });

    reconciliation.status = ReconciliationStatus.POSTED;
    const saved = await this.bankReconciliationRepo.save(reconciliation);

    await this.approvalLogRepo.save(
      this.approvalLogRepo.create({
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.BANK_RECONCILIATION,
        document_id: reconciliation.id,
        status: ApprovalStatus.APPROVED,
        actor_id: actor.id,
        amount: Math.abs(Number(reconciliation.statement_balance)),
        comments: dto.comments || `Bank reconciliation posted to GL`,
      } as any),
    );

    return saved;
  }

  async cancelReconciliation(id: string, actor: UserPayload, tenantId: string) {
    const reconciliation = await this.getReconciliation(id, tenantId);
    if (reconciliation.status === ReconciliationStatus.POSTED) {
      throw new ConflictException("Cannot cancel a POSTED reconciliation.");
    }

    await this.bankStatementLineRepo.update(
      { tenant_id: tenantId, matched_reconciliation_id: id },
      { is_matched: false, matched_reconciliation_id: null },
    );
    await this.bankReconciliationLineRepo.delete({
      tenant_id: tenantId,
      reconciliation_id: id,
    });

    reconciliation.status = ReconciliationStatus.CANCELLED;
    const saved = await this.bankReconciliationRepo.save(reconciliation);

    return saved;
  }
}
