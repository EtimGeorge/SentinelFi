import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ClsService } from "nestjs-cls";

import { PayrollService } from "./payroll.service";
import {
  PayrollRunEntity,
  PayrollRunStatus,
} from "./entities/payroll-run.entity";
import { PayrollLineItemEntity } from "./entities/payroll-line-item.entity";
import { PayrollLineItemType } from "./entities/payroll-line-item.entity";
import { FiscalPeriodEntity } from "./entities/fiscal-period.entity";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { ChartOfAccountsService } from "./chart-of-accounts.service";
import { GeneralLedgerService } from "../general-ledger/general-ledger.service";
import { JournalSourceType } from "../../../shared/types/general-ledger";

describe("PayrollService — fiscal period close enforcement", () => {
  let service: PayrollService;

  const tenantId = "tenant-1";
  const clsMock = { get: jest.fn() };

  const installCls = () => {
    clsMock.get.mockImplementation((key: string) => {
      if (key === "tenant_id") return tenantId;
      if (key === "userId") return "user-1";
      return undefined;
    });
  };

  const payrollRunRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
  const payrollLineItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const fiscalPeriodRepo = { findOne: jest.fn() };

  const chartOfAccountsService = {
    ensureDefaultChartOfAccounts: jest.fn(),
    getAccountByCode: jest.fn(),
  };
  const generalLedgerService = { postJournalEntry: jest.fn() };

  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };
  const dataSourceMock = {
    transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
      cb(manager),
    ),
  };

  beforeEach(async () => {
    // resetAllMocks (not clearAllMocks) so implementations from a previous test
    // cannot leak into this one; re-install the CLS getter each time.
    jest.resetAllMocks();
    installCls();
    dataSourceMock.transaction.mockImplementation(
      async (cb: (m: typeof manager) => unknown) => cb(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ClsService, useValue: clsMock },
        {
          provide: getRepositoryToken(PayrollRunEntity, TENANT_DATA_SOURCE),
          useValue: payrollRunRepo,
        },
        {
          provide: getRepositoryToken(
            PayrollLineItemEntity,
            TENANT_DATA_SOURCE,
          ),
          useValue: payrollLineItemRepo,
        },
        {
          provide: getRepositoryToken(FiscalPeriodEntity, TENANT_DATA_SOURCE),
          useValue: fiscalPeriodRepo,
        },
        { provide: ChartOfAccountsService, useValue: chartOfAccountsService },
        { provide: GeneralLedgerService, useValue: generalLedgerService },
      ],
    }).compile();

    service = module.get(PayrollService);
  });

  describe("createRun", () => {
    it("refuses to create a run in a closed fiscal period", async () => {
      fiscalPeriodRepo.findOne.mockResolvedValue({
        id: "period-1",
        tenant_id: tenantId,
        is_closed: true,
      });

      await expect(
        service.createRun({
          runIdentifier: "Jan 2026",
          fiscalPeriodId: "period-1",
          runDate: "2026-01-31",
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(payrollRunRepo.create).not.toHaveBeenCalled();
    });

    it("rejects an unknown fiscal period", async () => {
      fiscalPeriodRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRun({
          runIdentifier: "Jan 2026",
          fiscalPeriodId: "missing",
          runDate: "2026-01-31",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates a DRAFT run in an open period", async () => {
      fiscalPeriodRepo.findOne.mockResolvedValue({
        id: "period-1",
        tenant_id: tenantId,
        is_closed: false,
      });
      payrollRunRepo.create.mockImplementation((x: unknown) => x);
      payrollRunRepo.save.mockResolvedValue({
        id: "run-1",
        status: PayrollRunStatus.DRAFT,
      });

      const run = await service.createRun({
        runIdentifier: "Jan 2026",
        fiscalPeriodId: "period-1",
        runDate: "2026-01-31",
      });

      expect(run.status).toBe(PayrollRunStatus.DRAFT);
      expect(payrollRunRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("postRun", () => {
    const approvedRun = {
      id: "run-1",
      tenant_id: tenantId,
      fiscal_period_id: "period-1",
      status: PayrollRunStatus.APPROVED,
    };

    beforeEach(() => {
      // manager.findOne(PayrollRunEntity) vs manager.findOne(FiscalPeriodEntity)
      manager.findOne.mockImplementation((entity: unknown) => {
        if (entity === PayrollRunEntity)
          return Promise.resolve({ ...approvedRun });
        if (entity === FiscalPeriodEntity)
          return Promise.resolve({ id: "period-1", is_closed: false });
        return Promise.resolve(null);
      });
      manager.save.mockImplementation((x: unknown) => Promise.resolve(x));
      manager.find.mockResolvedValue([]);
    });

    it("refuses to post into a closed fiscal period", async () => {
      manager.findOne.mockImplementation((entity: unknown) => {
        if (entity === PayrollRunEntity)
          return Promise.resolve({ ...approvedRun });
        if (entity === FiscalPeriodEntity)
          return Promise.resolve({ id: "period-1", is_closed: true });
        return Promise.resolve(null);
      });

      await expect(service.postRun("run-1")).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("posts an approved run into an open period", async () => {
      const posted = await service.postRun("run-1");
      expect(posted.status).toBe(PayrollRunStatus.POSTED);
      expect(manager.save).toHaveBeenCalledTimes(1);
    });

    it("books a balanced payroll accrual to the GL", async () => {
      manager.find.mockImplementation((entity: unknown) => {
        if (entity === PayrollLineItemEntity) {
          return Promise.resolve([
            {
              gl_account_id: "acct-salaries",
              cost_center_id: "cc-1",
              item_type: PayrollLineItemType.BASE_SALARY,
              amount: 1000,
            },
            {
              gl_account_id: "acct-salaries",
              cost_center_id: "cc-1",
              item_type: PayrollLineItemType.BONUS,
              amount: 200,
            },
            {
              gl_account_id: "acct-tax",
              cost_center_id: null,
              item_type: PayrollLineItemType.EMPLOYER_TAX,
              amount: 150,
            },
            {
              gl_account_id: "acct-benefits",
              cost_center_id: null,
              item_type: PayrollLineItemType.EMPLOYER_BENEFIT,
              amount: 50,
            },
          ]);
        }
        return Promise.resolve([]);
      });
      chartOfAccountsService.ensureDefaultChartOfAccounts.mockResolvedValue(
        undefined,
      );
      chartOfAccountsService.getAccountByCode.mockImplementation(
        (code: string) => Promise.resolve({ id: `acct-${code}`, code }),
      );
      generalLedgerService.postJournalEntry.mockResolvedValue({ id: "je-1" });

      await service.postRun("run-1");

      expect(
        chartOfAccountsService.ensureDefaultChartOfAccounts,
      ).toHaveBeenCalledWith(tenantId, expect.anything());
      expect(generalLedgerService.postJournalEntry).toHaveBeenCalledTimes(1);

      const arg = generalLedgerService.postJournalEntry.mock.calls[0][0];
      expect(arg.sourceType).toBe(JournalSourceType.PAYROLL);
      expect(arg.sourceId).toBe("run-1");

      const totalDebit = arg.lines
        .filter((l: { debit?: number }) => l.debit)
        .reduce((s: number, l: { debit: number }) => s + l.debit, 0);
      const totalCredit = arg.lines
        .filter((l: { credit?: number }) => l.credit)
        .reduce((s: number, l: { credit: number }) => s + l.credit, 0);
      expect(totalDebit).toBe(1400);
      expect(totalCredit).toBe(1400);
    });
  });
});
