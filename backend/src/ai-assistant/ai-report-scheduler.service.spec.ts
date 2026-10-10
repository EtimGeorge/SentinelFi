import { AiReportSchedulerService } from "./ai-report-scheduler.service";
import { ReportStatus } from "./report-schedule.entity";

describe("AiReportSchedulerService", () => {
  const make = (schedules: any[] = []) => {
    const saved: any[] = [];
    const scheduleRepo = {
      find: jest.fn().mockResolvedValue(schedules),
      save: jest.fn().mockImplementation(async (s: any) => {
        saved.push({ ...s });
        return s;
      }),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({ narrative: "x".repeat(200), generatedAt: new Date().toISOString() }),
    } as any;
    const svc = new AiReportSchedulerService(scheduleRepo, aiService);
    return { svc, scheduleRepo, aiService, saved };
  };

  it("does nothing when no schedules are due", async () => {
    const { svc, aiService } = make([]);
    await svc.processDueSchedules();
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
        .mockResolvedValueOnce({ narrative: "ok narrative", generatedAt: new Date().toISOString() }),
    } as any;
    const svc = new AiReportSchedulerService(scheduleRepo, aiService);
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
      find: jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([schedule]), 50)),
      ),
      save: jest.fn().mockImplementation(async (s: any) => s),
    } as any;
    const aiService = {
      generateReportNarrative: jest.fn().mockResolvedValue({ narrative: "n", generatedAt: new Date().toISOString() }),
    } as any;
    const svc = new AiReportSchedulerService(scheduleRepo, aiService);

    await Promise.all([svc.processDueSchedules(), svc.processDueSchedules()]);
    // second tick should have been skipped while first was running
    expect(scheduleRepo.find).toHaveBeenCalledTimes(1);
  });
});
