import { ProjectsService } from "./projects.service";
import { LpoStatus } from "./lpo.entity";

describe("ProjectsService atomic LPO numbering (BE-4)", () => {
  let service: ProjectsService;
  const manager: any = { query: jest.fn() };
  const doaService: any = { validateAuthority: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      doaService,
    );
  });

  const project = { project_id: "proj-1", tenant_id: "t1" } as any;

  it("allocates via a single atomic INSERT ... ON CONFLICT statement", async () => {
    manager.query.mockResolvedValue([{ last_value: 7 }]);
    const number = await (service as any).generateLpoNumber(manager, project);
    const [sql, params] = manager.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO "document_sequence"');
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("RETURNING");
    expect(params[0]).toBe("t1");
    expect(number).toMatch(/^LPO-\d{4}-0007$/);
  });

  it("keeps per-project sequences isolated through doc_type", async () => {
    manager.query.mockResolvedValue([{ last_value: 1 }]);
    await (service as any).generateLpoNumber(manager, project);
    expect(manager.query.mock.calls[0][1][1]).toBe("LPO:proj-1");
    await (service as any).generateLpoNumber(manager, {
      ...project,
      project_id: "proj-2",
    });
    expect(manager.query.mock.calls[1][1][1]).toBe("LPO:proj-2");
  });

  it("zero-pads the sequence to 4 digits", async () => {
    manager.query.mockResolvedValue([{ last_value: 42 }]);
    const number = await (service as any).generateLpoNumber(manager, project);
    expect(number).toMatch(/^LPO-\d{4}-0042$/);
  });
});

describe("ProjectsService LPO approval + payment lifecycle (BE-6)", () => {
  const lpoRepository: any = { findOne: jest.fn(), save: jest.fn(async (x: any) => x) };
  const projectRepository: any = { findOne: jest.fn() };
  const auditRepository: any = {
    create: jest.fn((x: any) => x),
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
  const dataSource: any = { createQueryRunner: jest.fn(() => queryRunner) };
  const doaService: any = { validateAuthority: jest.fn() };

  let service: ProjectsService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(
      dataSource,
      projectRepository,
      {} as any,
      {} as any,
      lpoRepository,
      {} as any,
      auditRepository,
      {} as any,
      doaService,
    );
  });

  const actor = { id: "u1", roles: [{ name: "CFO" }] } as any;

  it("enforces Delegation of Authority before booking the commitment", async () => {
    lpoRepository.findOne.mockResolvedValue({
      id: "lpo1",
      project_id: "p1",
      wbs_id: "w1",
      lpo_number: "LPO-2026-0001",
      vendor_name: "Acme",
      amount_committed: 250000,
      approval_status: "PENDING_APPROVAL",
      status: "OPEN",
      wbsItem: { wbs_id: "w1", wbs_code: "1.1" },
    });
    projectRepository.findOne.mockResolvedValue({ currency: "USD" });
    doaService.validateAuthority.mockRejectedValueOnce(
      new Error("Insufficient authority"),
    );
    await expect(
      service.approveLpo("lpo1", "t1", "u1", "Finance Officer", actor),
    ).rejects.toThrow("Insufficient authority");
    expect(doaService.validateAuthority).toHaveBeenCalledWith(
      actor,
      250000,
      "USD",
    );
    expect(queryRunner.manager.increment).not.toHaveBeenCalled();
  });

  it("books the commitment when authority checks pass", async () => {
    lpoRepository.findOne.mockResolvedValue({
      id: "lpo1",
      project_id: "p1",
      wbs_id: "w1",
      lpo_number: "LPO-2026-0001",
      vendor_name: "Acme",
      amount_committed: 5000,
      approval_status: "PENDING_APPROVAL",
      status: "OPEN",
      wbsItem: { wbs_id: "w1", wbs_code: "1.1" },
    });
    projectRepository.findOne.mockResolvedValue({ currency: "NGN" });
    const saved = await service.approveLpo("lpo1", "t1", "u1", "CFO", actor);
    expect(doaService.validateAuthority).toHaveBeenCalledWith(actor, 5000, "NGN");
    expect(saved.approval_status).toBe("APPROVED");
    expect(queryRunner.manager.increment).toHaveBeenCalledTimes(1);
  });

  it("moves partial payments to PARTIALLY_PAID instead of leaving them OPEN", async () => {
    lpoRepository.findOne.mockResolvedValue({
      id: "lpo2",
      project_id: "p1",
      lpo_number: "LPO-2026-0002",
      amount_committed: 1000,
      amount_paid: 200,
      approval_status: "APPROVED",
      status: LpoStatus.OPEN,
    });
    const saved = await service.recordLpoPayment(
      "lpo2",
      { amount: 300 } as any,
      "t1",
      "u1",
      "CFO",
    );
    expect(saved.amount_paid).toBe(500);
    expect(saved.status).toBe(LpoStatus.PARTIALLY_PAID);
  });

  it("closes fully-paid LPOs as CLOSED", async () => {
    lpoRepository.findOne.mockResolvedValue({
      id: "lpo3",
      project_id: "p1",
      lpo_number: "LPO-2026-0003",
      amount_committed: 1000,
      amount_paid: 200,
      approval_status: "APPROVED",
      status: LpoStatus.PARTIALLY_PAID,
    });
    const saved = await service.recordLpoPayment(
      "lpo3",
      { amount: 800 } as any,
      "t1",
      "u1",
      "CFO",
    );
    expect(saved.status).toBe(LpoStatus.CLOSED);
  });
});
