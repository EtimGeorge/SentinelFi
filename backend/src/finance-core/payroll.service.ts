import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  PayrollRunEntity,
  PayrollRunStatus,
} from "./entities/payroll-run.entity";
import {
  PayrollLineItemEntity,
  PayrollLineItemType,
} from "./entities/payroll-line-item.entity";
import { FiscalPeriodEntity } from "./entities/fiscal-period.entity";
import { ClsService } from "nestjs-cls";
import { EntityManager } from "typeorm";

import { TENANT_DATA_SOURCE } from "../database/constants";
import { ChartOfAccountsService } from "./chart-of-accounts.service";
import { GeneralLedgerService } from "../general-ledger/general-ledger.service";
import { SYSTEM_ACCOUNT_CODES } from "./default-chart-of-accounts";
import { JournalSourceType } from "../../../shared/types/general-ledger";

const round4 = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
};

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(PayrollRunEntity, TENANT_DATA_SOURCE)
    private payrollRunRepo: Repository<PayrollRunEntity>,
    @InjectRepository(PayrollLineItemEntity, TENANT_DATA_SOURCE)
    private payrollLineItemRepo: Repository<PayrollLineItemEntity>,
    @InjectRepository(FiscalPeriodEntity, TENANT_DATA_SOURCE)
    private fiscalPeriodRepo: Repository<FiscalPeriodEntity>,
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly generalLedgerService: GeneralLedgerService,
  ) {}

  private getTenantId(): string {
    return this.cls.get("tenant_id");
  }

  async createRun(
    data: {
      runIdentifier: string;
      fiscalPeriodId: string;
      runDate: string;
    },
    createdByUserId?: string,
  ) {
    const tenantId = this.getTenantId();

    // Period-close safeguard: no new payroll activity may be booked into a
    // fiscal period that has been closed for reporting.
    const period = await this.fiscalPeriodRepo.findOne({
      where: { id: data.fiscalPeriodId, tenant_id: tenantId },
    });
    if (!period) {
      throw new NotFoundException("Fiscal period not found");
    }
    if (period.is_closed) {
      throw new ConflictException(
        "Cannot create a payroll run in a closed fiscal period.",
      );
    }

    const run = this.payrollRunRepo.create({
      tenant_id: tenantId,
      run_identifier: data.runIdentifier,
      fiscal_period_id: data.fiscalPeriodId,
      run_date: new Date(data.runDate),
      status: PayrollRunStatus.DRAFT,
      total_gross_pay: 0,
      total_taxes_employer: 0,
      total_benefits_employer: 0,
      created_by_user_id: createdByUserId ?? null,
    });
    return this.payrollRunRepo.save(run);
  }

  async getRuns() {
    return this.payrollRunRepo.find({
      where: { tenant_id: this.getTenantId() },
      order: { run_date: "DESC" },
      relations: ["fiscalPeriod"],
    });
  }

  async getKPIs() {
    const tenantId = this.getTenantId();

    // Aggregate data from all runs for this tenant
    const runs = await this.payrollRunRepo.find({
      where: { tenant_id: tenantId },
    });

    const totalGross = runs.reduce(
      (sum, r) => sum + Number(r.total_gross_pay || 0),
      0,
    );
    const employerTaxes = runs.reduce(
      (sum, r) => sum + Number(r.total_taxes_employer || 0),
      0,
    );
    const employerBenefits = runs.reduce(
      (sum, r) => sum + Number(r.total_benefits_employer || 0),
      0,
    );

    // Pending posted: APPROVED but not yet POSTED
    const pendingPosted = runs
      .filter((r) => r.status === PayrollRunStatus.APPROVED)
      .reduce((sum, r) => sum + Number(r.total_gross_pay || 0), 0);

    return {
      totalGross,
      pendingPosted,
      employerTaxes,
      employerBenefits,
      currency: "NGN", // Should ideally come from tenant settings
    };
  }

  async getRunDetails(id: string) {
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: this.getTenantId() },
      relations: [
        "lineItems",
        "lineItems.employee",
        "lineItems.costCenter",
        "lineItems.glAccount",
        "fiscalPeriod",
      ],
    });
    if (!run) throw new NotFoundException("Payroll run not found");
    return run;
  }

  async addLineItem(
    runId: string,
    data: {
      employeeId: string;
      costCenterId: string;
      glAccountId: string;
      itemType: PayrollLineItemType;
      amount: number;
    },
  ) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRunEntity, {
        where: { id: runId, tenant_id: tenantId },
      });
      if (!run) throw new NotFoundException("Payroll run not found");
      if (run.status !== PayrollRunStatus.DRAFT) {
        throw new ConflictException(
          "Can only add items to a DRAFT payroll run",
        );
      }

      const item = manager.create(PayrollLineItemEntity, {
        tenant_id: tenantId,
        payroll_run_id: runId,
        employee_id: data.employeeId,
        cost_center_id: data.costCenterId,
        gl_account_id: data.glAccountId,
        item_type: data.itemType,
        amount: data.amount,
      });

      const savedItem = await manager.save(item);

      // Update run totals
      if (
        data.itemType === PayrollLineItemType.BASE_SALARY ||
        data.itemType === PayrollLineItemType.BONUS ||
        data.itemType === PayrollLineItemType.COMMISSION
      ) {
        run.total_gross_pay = Number(run.total_gross_pay) + Number(data.amount);
      } else if (data.itemType === PayrollLineItemType.EMPLOYER_TAX) {
        run.total_taxes_employer =
          Number(run.total_taxes_employer) + Number(data.amount);
      } else if (data.itemType === PayrollLineItemType.EMPLOYER_BENEFIT) {
        run.total_benefits_employer =
          Number(run.total_benefits_employer) + Number(data.amount);
      }

      await manager.save(run);
      return savedItem;
    });
  }

  async approveRun(id: string, approverUserId?: string) {
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: this.getTenantId() },
    });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== PayrollRunStatus.DRAFT)
      throw new ConflictException("Only DRAFT runs can be approved");

    if (
      approverUserId &&
      run.created_by_user_id &&
      run.created_by_user_id === approverUserId
    ) {
      throw new ForbiddenException(
        "[FINANCE-CORE] SoD BLOCKED: approver cannot approve own payroll run",
      );
    }

    run.status = PayrollRunStatus.APPROVED;
    return this.payrollRunRepo.save(run);
  }

  async postRun(id: string) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRunEntity, {
        where: { id, tenant_id: tenantId },
      });
      if (!run) throw new NotFoundException("Payroll run not found");
      if (run.status !== PayrollRunStatus.APPROVED)
        throw new ConflictException("Only APPROVED runs can be posted");

      // Period-close safeguard: posting books to the GL, so refuse if the
      // run's fiscal period was closed after the run was created.
      const period = await manager.findOne(FiscalPeriodEntity, {
        where: { id: run.fiscal_period_id, tenant_id: tenantId },
      });
      if (period?.is_closed) {
        throw new ConflictException(
          "Cannot post a payroll run to a closed fiscal period.",
        );
      }

      run.status = PayrollRunStatus.POSTED;
      const savedRun = await manager.save(run);

      // Book the payroll accrual to the General Ledger. Best-effort: a GL
      // failure must be surfaced in logs but must not strand the run between
      // APPROVED and POSTED (the posting is idempotent by run id, so a retry
      // after fixing the chart of accounts will reconcile).
      await this.postPayrollToGeneralLedger(manager, savedRun, tenantId);

      return savedRun;
    });
  }

  /**
   * Build and post a balanced payroll accrual journal entry:
   *   Dr  each line item's expense account (its gl_account_id)
   *   Cr  Payroll Payable / Tax Payable / Benefits Payable (grouped)
   * Idempotent by payroll run id.
   */
  private async postPayrollToGeneralLedger(
    manager: EntityManager,
    run: PayrollRunEntity,
    tenantId: string,
  ): Promise<void> {
    try {
      const lineItems = await manager.find(PayrollLineItemEntity, {
        where: { payroll_run_id: run.id, tenant_id: tenantId },
      });
      if (!lineItems || lineItems.length === 0) return;

      await this.chartOfAccountsService.ensureDefaultChartOfAccounts(
        tenantId,
        manager,
      );

      const creditCodeFor = (type: PayrollLineItemType): string => {
        switch (type) {
          case PayrollLineItemType.EMPLOYER_TAX:
            return SYSTEM_ACCOUNT_CODES.TAX_PAYABLE;
          case PayrollLineItemType.EMPLOYER_BENEFIT:
            return SYSTEM_ACCOUNT_CODES.BENEFITS_PAYABLE;
          default:
            return SYSTEM_ACCOUNT_CODES.PAYROLL_PAYABLE;
        }
      };

      const lines: Array<{
        glAccountId: string;
        costCenterId?: string | null;
        description?: string | null;
        debit?: number;
        credit?: number;
      }> = [];
      const creditTotals = new Map<string, number>();

      for (const item of lineItems) {
        const amount = round4(item.amount);
        if (amount <= 0 || !item.gl_account_id) continue;
        lines.push({
          glAccountId: item.gl_account_id,
          costCenterId: item.cost_center_id ?? null,
          description: `Payroll ${item.item_type}`,
          debit: amount,
        });
        const code = creditCodeFor(item.item_type);
        creditTotals.set(code, round4((creditTotals.get(code) ?? 0) + amount));
      }

      if (lines.length === 0) return;

      for (const [code, total] of creditTotals.entries()) {
        const account = await this.chartOfAccountsService.getAccountByCode(
          code,
          tenantId,
          manager,
        );
        if (!account) {
          throw new Error(
            `Payroll control account ${code} is missing from the chart of accounts.`,
          );
        }
        lines.push({
          glAccountId: account.id,
          description: "Payroll accrual",
          credit: total,
        });
      }

      await this.generalLedgerService.postJournalEntry(
        {
          tenantId,
          entryDate: run.run_date,
          memo: `Payroll accrual for ${run.run_identifier}`,
          currency: "USD",
          sourceType: JournalSourceType.PAYROLL,
          sourceId: run.id,
          sourceReference: run.run_identifier,
          actorUserId: run.created_by_user_id ?? null,
          lines,
        },
        manager,
      );
    } catch (err) {
      this.logger.error(
        `[FINANCE-CORE] Payroll GL posting failed for run ${run.id}: ${(err as Error).message}`,
      );
    }
  }

  async deleteLineItem(runId: string, lineItemId: string, tenantId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRunEntity, {
        where: { id: runId, tenant_id: tenantId },
      });
      if (!run) throw new NotFoundException("Payroll run not found");
      if (run.status === PayrollRunStatus.POSTED) {
        throw new ConflictException(
          "Cannot remove line items from a POSTED payroll run",
        );
      }

      const item = await manager.findOne(PayrollLineItemEntity, {
        where: {
          id: lineItemId,
          payroll_run_id: runId,
          tenant_id: tenantId,
        },
      });
      if (!item) throw new NotFoundException("Payroll line item not found");

      await manager.remove(item);

      // Recompute run totals from the remaining line items
      const remaining = await manager.find(PayrollLineItemEntity, {
        where: { payroll_run_id: runId, tenant_id: tenantId },
      });

      const isGross = (type: PayrollLineItemType) =>
        type === PayrollLineItemType.BASE_SALARY ||
        type === PayrollLineItemType.BONUS ||
        type === PayrollLineItemType.COMMISSION;

      run.total_gross_pay = remaining
        .filter((li) => isGross(li.item_type))
        .reduce((sum, li) => sum + Number(li.amount || 0), 0);
      run.total_taxes_employer = remaining
        .filter((li) => li.item_type === PayrollLineItemType.EMPLOYER_TAX)
        .reduce((sum, li) => sum + Number(li.amount || 0), 0);
      run.total_benefits_employer = remaining
        .filter((li) => li.item_type === PayrollLineItemType.EMPLOYER_BENEFIT)
        .reduce((sum, li) => sum + Number(li.amount || 0), 0);

      await manager.save(run);

      this.logger.log(
        `[FINANCE-CORE] PAYROLL LINE ITEM REMOVED | ${run.run_identifier} | ${item.item_type}`,
      );

      return item;
    });
  }

  async deleteRun(id: string) {
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: this.getTenantId() },
    });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status === PayrollRunStatus.POSTED)
      throw new ConflictException("Cannot delete a POSTED payroll run");

    return await this.payrollRunRepo.remove(run);
  }
}
