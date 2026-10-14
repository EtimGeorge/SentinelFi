import { AiReportSchedulerService } from "./ai-report-scheduler.service";
import { ReportStatus } from "./report-schedule.entity";

describe("AiReportSchedulerService", () => {
  const tenantRow = (schema_name = "solution_energy", tenant_id = "t1") => ({
    schema_name,
    tenant_id,
  });

  const makeRootDataSource = (tenants: any[] = [tenantRow()]) =>
    ({
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue(tenants),
      }),
    }) as any;

  const makeCls = () =>
    ({
      run: jest.fn((fn: any) => fn()),
      set: jest.fn(),
    }) as any;

  const make = (schedules: any[] = [], tenants: any[] = [tenantRow()]) => {
    const saved: any[] = [];
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue(schedules),
      save: jest.fn().mockImplementation(async (s: any) => {
        saved.push({ ...s });
        return s;
      }),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({
        narrative: "x".repeat(200),
        generatedAt: new Date().toISOString(),
      }),
    } as any;
    const rootDataSource = makeRootDataSource(tenants);
    const cls = makeCls();
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      rootDataSource,
      cls,
    );
    return { svc, scheduleRepo, aiService, saved, rootDataSource, cls };
  };

  it("does nothing when no schedules are due", async () => {
    const { svc, aiService } = make([]);
    await svc.processDueSchedules();
    expect(aiService.generateReportNarrative).not.toHaveBeenCalled();
  });

  it("does nothing when there are no active tenants", async () => {
    const { svc, scheduleRepo } = make([], []);
    await svc.processDueSchedules();
    expect(scheduleRepo.find).not.toHaveBeenCalled();
  });

  it("fans out across active tenants, scoping each to its own schema", async () => {
    const tenants = [
      tenantRow("solution_energy", "t1"),
      tenantRow("acme_inc", "t2"),
    ];
    const { svc, scheduleRepo, cls } = make([], tenants);
    await svc.processDueSchedules();

    expect(cls.run).toHaveBeenCalledTimes(2);
    expect(cls.set).toHaveBeenCalledWith("SCHEMA_NAME", "solution_energy");
    expect(cls.set).toHaveBeenCalledWith("tenant_id", "t1");
    expect(cls.set).toHaveBeenCalledWith("SCHEMA_NAME", "acme_inc");
    expect(cls.set).toHaveBeenCalledWith("tenant_id", "t2");
    // one query per tenant schema, never a single global query
    expect(scheduleRepo.find).toHaveBeenCalledTimes(2);
  });

  it("skips a tenant whose schema has no ai_report_schedule table (42P01) and keeps going", async () => {
    const undefinedTable: any = new Error(
      'relation "ai_report_schedule" does not exist',
    );
    undefinedTable.code = "42P01";
    const tenants = [
      tenantRow("legacy_schema", "t1"),
      tenantRow("solution_energy", "t2"),
    ];
    const scheduleRepo = {
      find: jest
        .fn()
        .mockRejectedValueOnce(undefinedTable)
        .mockResolvedValueOnce([]),
      save: jest.fn(),
    } as any;
    const aiService = { generateReportNarrative: jest.fn() } as any;
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(tenants),
      makeCls(),
    );

    await expect(svc.processDueSchedules()).resolves.not.toThrow();
    expect(scheduleRepo.find).toHaveBeenCalledTimes(2);
    expect(aiService.generateReportNarrative).not.toHaveBeenCalled();
  });

  it("claims the schedule first (bumps next_run_at) then records run bookkeeping", async () => {
    const schedule = {
      id: "sched-1",
      tenant_id: "t1",
      report_type: "executive",
      frequency: "WEEKLY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 0,
      recipients: [],
      deliver_by_email: false,
      filters: {},
      project_id: null,
    };
    const { svc, scheduleRepo, saved } = make([schedule]);
    await svc.processDueSchedules();

    // claim + completion = at least 2 saves
    expect(scheduleRepo.save).toHaveBeenCalledTimes(2);
    const last = saved[saved.length - 1];
    expect(last.run_count).toBe(1);
    expect(last.last_run_at).toBeInstanceOf(Date);
    expect(last.next_run_at.getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(last.last_ai_narrative_preview.length).toBeLessThanOrEqual(100);
    expect(last.last_error).toBeNull();
  });

  it("records last_error instead of crashing the batch on LLM failure", async () => {
    const bad = {
      id: "bad-1",
      tenant_id: "t1",
      report_type: "variance",
      frequency: "DAILY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 2,
      recipients: [],
      deliver_by_email: false,
      filters: {},
      project_id: null,
    };
    const good = { ...bad, id: "good-1" };
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue([bad, good]),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest
        .fn()
        .mockRejectedValueOnce(new Error("llm down"))
        .mockResolvedValueOnce({
          narrative: "ok narrative",
          generatedAt: new Date().toISOString(),
        }),
    } as any;
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(),
      makeCls(),
    );
    await svc.processDueSchedules();

    expect(aiService.generateReportNarrative).toHaveBeenCalledTimes(2);
    // bad schedule got last_error persisted
    const errorSave = scheduleRepo.save.mock.calls.find(
      ([s]: any[]) => s.id === "bad-1" && s.last_error,
    );
    expect(errorSave).toBeDefined();
  });

  it("skips overlapping ticks (no double execution)", async () => {
    const schedule = {
      id: "s1",
      tenant_id: "t1",
      report_type: "opex",
      frequency: "DAILY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 0,
      recipients: [],
      deliver_by_email: false,
      filters: {},
      project_id: null,
    };
    const scheduleRepo = {
      find: jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve([schedule]), 50)),
        ),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({
        narrative: "n",
        generatedAt: new Date().toISOString(),
      }),
    } as any;
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(),
      makeCls(),
    );

    await Promise.all([svc.processDueSchedules(), svc.processDueSchedules()]);
    // second tick should have been skipped while first was running
    expect(scheduleRepo.find).toHaveBeenCalledTimes(1);
  });

  it("emails the narrative to valid recipients with escaped HTML", async () => {
    const schedule = {
      id: "mail-1",
      tenant_id: "t1",
      report_type: "executive",
      frequency: "WEEKLY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 0,
      recipients: ["CFO@Example.com ", "not-an-email"],
      deliver_by_email: true,
      filters: {},
      project_id: null,
    };
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue([schedule]),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({
        narrative: "<script>alert(1)</script> Profit up.",
        generatedAt: new Date().toISOString(),
      }),
    } as any;
    const sendEmail = jest.fn().mockResolvedValue(undefined);
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(),
      makeCls(),
      { sendEmail } as any,
    );

    await svc.processDueSchedules();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = sendEmail.mock.calls[0];
    expect(to).toBe("cfo@example.com");
    expect(subject).toContain("executive");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("caps recipients at 20 and continues when one send fails", async () => {
    const recipients = Array.from(
      { length: 25 },
      (_, i) => `user${i}@example.com`,
    );
    const schedule = {
      id: "mail-2",
      tenant_id: "t1",
      report_type: "opex",
      frequency: "DAILY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 0,
      recipients,
      deliver_by_email: true,
      filters: {},
      project_id: null,
    };
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue([schedule]),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({
        narrative: "ok",
        generatedAt: new Date().toISOString(),
      }),
    } as any;
    const sendEmail = jest
      .fn()
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValue(undefined);
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(),
      makeCls(),
      { sendEmail } as any,
    );

    await svc.processDueSchedules();

    expect(sendEmail).toHaveBeenCalledTimes(20);
  });

  it("skips email gracefully when EmailService is not wired", async () => {
    const schedule = {
      id: "mail-3",
      tenant_id: "t1",
      report_type: "variance",
      frequency: "DAILY",
      status: ReportStatus.ACTIVE,
      next_run_at: new Date(Date.now() - 1000),
      run_count: 0,
      recipients: ["a@example.com"],
      deliver_by_email: true,
      filters: {},
      project_id: null,
    };
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue([schedule]),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({
        narrative: "ok",
        generatedAt: new Date().toISOString(),
      }),
    } as any;
    const svc = new AiReportSchedulerService(
      scheduleRepo,
      aiService,
      makeRootDataSource(),
      makeCls(),
    );

    await expect(svc.processDueSchedules()).resolves.not.toThrow();
  });
});
