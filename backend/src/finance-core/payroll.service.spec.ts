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
import { FiscalPeriodEntity } from "./entities/fiscal-period.entity";
import { TENANT_DATA_SOURCE } from "../database/constants";

describe("PayrollService — fiscal period close enforcement", () => {
  let service: PayrollService;

  const tenantId = "tenant-1";
  const clsMock = {
    get: jest.fn((key: string) => {
      if (key === "tenant_id") return tenantId;
      if (key === "userId") return "user-1";
      return undefined;
    }),
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
    jest.clearAllMocks();

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
        if (entity === PayrollRunEntity) return Promise.resolve(approvedRun);
        if (entity === FiscalPeriodEntity)
          return Promise.resolve({ id: "period-1", is_closed: false });
        return Promise.resolve(null);
      });
      manager.save.mockImplementation((x: unknown) => Promise.resolve(x));
    });

    it("refuses to post into a closed fiscal period", async () => {
      manager.findOne.mockImplementation((entity: unknown) => {
        if (entity === PayrollRunEntity) return Promise.resolve(approvedRun);
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
  });
});
