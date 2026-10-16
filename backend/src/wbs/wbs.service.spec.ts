import { BadRequestException, NotFoundException } from "@nestjs/common";
import { WbsService } from "./wbs.service";
import { WbsBudgetStatus } from "@shared/types/wbs-budget-status.enum";
import { ApprovalStatus } from "@shared/types/approval-status.enum";

describe("WbsService baseline lock (BE-1)", () => {
  let service: WbsService;

  const wbsBudgetRepository: any = {
    findOne: jest.fn(),
    merge: jest.fn((entity: any, dto: any) => Object.assign(entity, dto)),
    save: jest.fn(async (x: any) => x),
  };
  const liveExpenseRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(async (x: any) => x),
  };
  const queryRunner: any = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(async (_e: any, x: any) => x),
      increment: jest.fn(),
    },
  };
  const dataSource: any = {
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(),
    getRepository: jest.fn(() => ({ count: jest.fn(async () => 0) })),
  };
  const projectsService: any = { logAudit: jest.fn() };
  const notificationsService: any = {
    sendVarianceAlert: jest.fn(),
    sendOverrideApprovedAlert: jest.fn(),
  };
  const approvalLogRepo: any = {
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => x),
  };
  const doaService: any = { validateAuthority: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WbsService(
      dataSource,
      wbsBudgetRepository,
      {} as any,
      {} as any,
      liveExpenseRepository,
      projectsService,
      notificationsService,
      {} as any,
      {} as any,
      doaService,
      approvalLogRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("throws NotFound when the line does not exist", async () => {
    wbsBudgetRepository.findOne.mockResolvedValue(null);
    await expect(
      service.updateWbsBudget("missing", { description: "x" } as any, "t1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([WbsBudgetStatus.APPROVED, WbsBudgetStatus.PENDING])(
    "blocks direct edits to %s lines (baseline lock)",
    async (status) => {
      wbsBudgetRepository.findOne.mockResolvedValue({
        wbs_id: "w1",
        wbs_code: "1.2",
        status,
      });
      await expect(
        service.updateWbsBudget("w1", { description: "sneaky" } as any, "t1"),
      ).rejects.toThrow(/BASELINE_LOCKED/);
      expect(wbsBudgetRepository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    WbsBudgetStatus.DRAFT,
    WbsBudgetStatus.REJECTED,
    WbsBudgetStatus.RECALLED,
  ])("allows edits to %s lines", async (status) => {
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "1.2",
      status,
      description: "old",
    });
    const saved = await service.updateWbsBudget(
      "w1",
      { description: "new" } as any,
      "t1",
    );
    expect(saved.description).toBe("new");
    expect(wbsBudgetRepository.save).toHaveBeenCalledTimes(1);
  });

  it("mentions the recall route in the lock error", async () => {
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "1.2",
      status: WbsBudgetStatus.APPROVED,
    });
    try {
      await service.updateWbsBudget("w1", {} as any, "t1");
      fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as Error).message).toContain("/wbs/budget/:id/recall");
    }
  });
});

describe("WbsService project audit trail (BE-2)", () => {
  let service: WbsService;

  const wbsBudgetRepository: any = {
    findOne: jest.fn(),
    merge: jest.fn((entity: any, dto: any) => Object.assign(entity, dto)),
    save: jest.fn(async (x: any) => (Array.isArray(x) ? x : x)),
  };
  const liveExpenseRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(async (x: any) => x),
  };
  const queryRunner: any = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(async (_e: any, x: any) => x),
      increment: jest.fn(),
      decrement: jest.fn(),
      delete: jest.fn(),
    },
  };
  const dataSource: any = {
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(),
    getRepository: jest.fn(() => ({ count: jest.fn(async () => 0) })),
  };
  const projectsService: any = { logAudit: jest.fn(async () => ({})) };
  const notificationsService: any = {
    sendVarianceAlert: jest.fn(),
    sendOverrideApprovedAlert: jest.fn(),
  };
  const approvalLogRepo: any = {
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => x),
  };
  const doaService: any = { validateAuthority: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WbsService(
      dataSource,
      wbsBudgetRepository,
      {} as any,
      {} as any,
      liveExpenseRepository,
      projectsService,
      notificationsService,
      {} as any,
      {} as any,
      doaService,
      approvalLogRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("writes WBS_UPDATED with old/new totals when an edit lands", async () => {
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "1.2",
      status: WbsBudgetStatus.DRAFT,
      project_id: "p1",
      total_cost_budgeted: 1000,
      description: "old",
    });
    await service.updateWbsBudget(
      "w1",
      { total_cost_budgeted: 1500 } as any,
      "t1",
      "u1",
    );
    expect(projectsService.logAudit).toHaveBeenCalledTimes(1);
    const [pid, tid, uid, type, oldV, newV, desc] =
      projectsService.logAudit.mock.calls[0];
    expect([pid, tid, uid, type]).toEqual(["p1", "t1", "u1", "WBS_UPDATED"]);
    expect([oldV, newV]).toEqual([1000, 1500]);
    expect(desc).toContain("1.2");
  });

  it("skips the journal row when no actor is available", async () => {
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "1.2",
      status: WbsBudgetStatus.DRAFT,
      project_id: "p1",
      total_cost_budgeted: 1000,
    });
    await service.updateWbsBudget("w1", { description: "x" } as any, "t1");
    expect(projectsService.logAudit).not.toHaveBeenCalled();
  });

  it("never breaks the money path when the journal write fails", async () => {
    projectsService.logAudit.mockRejectedValueOnce(new Error("db down"));
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "1.2",
      status: WbsBudgetStatus.DRAFT,
      project_id: "p1",
      total_cost_budgeted: 1000,
    });
    const saved = await service.updateWbsBudget(
      "w1",
      { description: "ok" } as any,
      "t1",
      "u1",
    );
    expect(saved.description).toBe("ok");
  });

  it("writes WBS_STATUS_CHANGE on submit for approval", async () => {
    wbsBudgetRepository.findOne.mockResolvedValue({
      wbs_id: "w1",
      wbs_code: "3.1",
      status: WbsBudgetStatus.DRAFT,
      project_id: "p9",
      total_cost_budgeted: 5000,
    });
    const actor = { id: "u2", first_name: "Ada", last_name: "L" } as any;
    const saved = await service.changeWbsBudgetStatus(
      "w1",
      WbsBudgetStatus.PENDING,
      "t1",
      actor,
    );
    expect(saved.status).toBe(WbsBudgetStatus.PENDING);
    expect(projectsService.logAudit).toHaveBeenCalledTimes(1);
    expect(projectsService.logAudit.mock.calls[0][3]).toBe(
      "WBS_STATUS_CHANGE",
    );
  });

  it("writes EXPENSE_OVERRUN_APPROVED with the authorizer named", async () => {
    liveExpenseRepository.findOne.mockResolvedValue({
      id: "e1",
      amount: 250,
      approval_status: ApprovalStatus.PENDING_APPROVAL,
      override_reason: "client escalation",
      wbsBudget: { wbs_id: "w1", wbs_code: "2.2", project_id: "p5" },
    });
    await service.approveOverrun("e1", "t1", "CFO", "u7");
    expect(projectsService.logAudit).toHaveBeenCalledTimes(1);
    const [pid, , uid, type, , newV, desc] =
      projectsService.logAudit.mock.calls[0];
    expect(pid).toBe("p5");
    expect(uid).toBe("u7");
    expect(type).toBe("EXPENSE_OVERRUN_APPROVED");
    expect(newV).toBe(250);
    expect(desc).toContain("CFO");
  });

  it("writes EXPENSE_DELETED and still unwinds actuals", async () => {
    liveExpenseRepository.findOne.mockResolvedValue({
      id: "e9",
      amount: 400,
      quantity: 2,
      days: null,
      approval_status: ApprovalStatus.APPROVED,
      wbs_id: "w1",
      project_id: "p3",
    });
    await service.deleteLiveExpenseEntry("e9", "t1", "u4");
    expect(queryRunner.manager.decrement).toHaveBeenCalled();
    expect(projectsService.logAudit).toHaveBeenCalledTimes(1);
    const [, , uid, type, oldV] = projectsService.logAudit.mock.calls[0];
    expect(uid).toBe("u4");
    expect(type).toBe("EXPENSE_DELETED");
    expect(oldV).toBe(400);
  });
});

describe("WbsService overrun rejection (BE-3)", () => {
  let service: WbsService;

  const liveExpenseRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(async (x: any) => x),
  };
  const projectsService: any = { logAudit: jest.fn(async () => ({})) };
  const notificationsService: any = {
    sendVarianceAlert: jest.fn(),
    sendOverrideApprovedAlert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WbsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      liveExpenseRepository,
      projectsService,
      notificationsService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("rejects a pending overrun without touching actuals", async () => {
    liveExpenseRepository.findOne.mockResolvedValue({
      id: "e2",
      amount: 900,
      approval_status: ApprovalStatus.PENDING_APPROVAL,
      override_reason: "rush order",
      wbsBudget: { wbs_id: "w1", wbs_code: "4.1", project_id: "p2" },
    });
    const saved = await service.rejectOverrun(
      "e2",
      "t1",
      "CFO",
      "u9",
      "not justified",
    );
    expect(saved.approval_status).toBe(ApprovalStatus.REJECTED);
    expect(projectsService.logAudit).toHaveBeenCalledTimes(1);
    const [pid, , uid, type, oldV, newV, desc] =
      projectsService.logAudit.mock.calls[0];
    expect([pid, uid, type, oldV, newV]).toEqual([
      "p2",
      "u9",
      "EXPENSE_OVERRUN_REJECTED",
      900,
      null,
    ]);
    expect(desc).toContain("not justified");
    expect(notificationsService.sendVarianceAlert).toHaveBeenCalledTimes(1);
  });

  it("refuses to reject a non-pending expense", async () => {
    liveExpenseRepository.findOne.mockResolvedValue({
      id: "e3",
      amount: 100,
      approval_status: ApprovalStatus.APPROVED,
      wbsBudget: { wbs_id: "w1", project_id: "p2" },
    });
    await expect(service.rejectOverrun("e3", "t1", "CFO", "u9")).rejects.toThrow(
      /not in a pending state/,
    );
    expect(liveExpenseRepository.save).not.toHaveBeenCalled();
    expect(projectsService.logAudit).not.toHaveBeenCalled();
  });

  it("throws NotFound for an unknown expense", async () => {
    liveExpenseRepository.findOne.mockResolvedValue(null);
    await expect(
      service.rejectOverrun("nope", "t1", "CFO", "u9"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
