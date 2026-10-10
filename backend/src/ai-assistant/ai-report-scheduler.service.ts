import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import {
  ReportScheduleEntity,
  ReportStatus,
} from "./report-schedule.entity";
import { AiAssistantService } from "./ai-assistant.service";
import { TENANT_DATA_SOURCE } from "../database/constants";

/**
 * Background worker that makes "Scheduled Report Automation" actually run.
 *
 * Runs every 5 minutes, picks due ACTIVE schedules (next_run_at <= now),
 * generates the AI narrative, and advances bookkeeping fields.
 *
 * Production hardening:
 * - Overlap guard (`running` flag) so a slow tick can't double-execute.
 * - Claim-first: next_run_at is bumped BEFORE the LLM call so a crash /
 *   retry doesn't duplicate work; failures are recorded in last_error.
 * - Bounded batch (take 25, ordered oldest-first) for backpressure.
 * - Per-schedule try/catch so one bad schedule never kills the whole batch.
 */
@Injectable()
export class AiReportSchedulerService {
  private readonly logger = new Logger(AiReportSchedulerService.name);
  private running = false;

  constructor(
    @InjectRepository(ReportScheduleEntity, TENANT_DATA_SOURCE)
    private readonly scheduleRepo: Repository<ReportScheduleEntity>,
    private readonly aiService: AiAssistantService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDueSchedules(): Promise<void> {
    if (this.running) {
      this.logger.warn("Scheduler tick skipped: previous run still in progress");
      return;
    }
    this.running = true;
    try {
      const now = new Date();
      const due = await this.scheduleRepo.find({
        where: {
          status: ReportStatus.ACTIVE,
          next_run_at: LessThanOrEqual(now),
        },
        order: { next_run_at: "ASC" },
        take: 25,
      });

      if (due.length === 0) return;

      this.logger.log(`Scheduler tick: ${due.length} due schedule(s)`);

      for (const schedule of due) {
        await this.executeOne(schedule, now);
      }
    } catch (e) {
      this.logger.error("Scheduler tick failed", e as any);
    } finally {
      this.running = false;
    }
  }

  private async executeOne(
    schedule: ReportScheduleEntity,
    now: Date,
  ): Promise<void> {
    // Claim-first: advance next_run_at immediately so a concurrent tick or
    // a crash after the LLM call cannot duplicate this run.
    const claimedNext = this.calculateNextRun(schedule.frequency as any);
    try {
      schedule.next_run_at = claimedNext;
      schedule.last_error = null;
      await this.scheduleRepo.save(schedule);
    } catch (e) {
      this.logger.error(
        `Scheduler: failed to claim schedule ${schedule.id}`,
        e as any,
      );
      return;
    }

    try {
      const narrative = await this.aiService.generateReportNarrative({
        reportType: schedule.report_type as any,
        tenantName: "Scheduled Run",
        tenantId: schedule.tenant_id,
        projectName: undefined,
        periodLabel: now.toISOString().slice(0, 10),
        currency: "NGN",
        financialData: {
          ...(schedule.filters ?? {}),
          ...(schedule.project_id
            ? { projectId: schedule.project_id }
            : {}),
        },
      });

      schedule.last_run_at = now;
      schedule.run_count = (schedule.run_count || 0) + 1;
      schedule.last_error = null;
      if (narrative?.narrative) {
        schedule.last_ai_narrative_preview = narrative.narrative.substring(
          0,
          100,
        );
      }
      await this.scheduleRepo.save(schedule);
      this.logger.log(
        `Scheduler: report ${schedule.id} (${schedule.report_type}) executed run_count=${schedule.run_count}`,
      );

      // Email delivery hook: actual mailer wiring lives outside AI module.
      // We persist the preview + counts so the notification layer can pick
      // it up; we log explicitly when delivery was requested.
      if (schedule.deliver_by_email) {
        this.logger.log(
          `Scheduler: schedule ${schedule.id} requested email delivery to ${(schedule.recipients ?? []).length} recipient(s) — hand off to notification service`,
        );
      }
    } catch (e: any) {
      const msg =
        e?.message ?? (typeof e === "string" ? e : "Unknown scheduler error");
      schedule.last_error = msg.substring(0, 1000);
      try {
        await this.scheduleRepo.save(schedule);
      } catch {
        // persistence of the error itself failed; already logged below
      }
      this.logger.error(
        `Scheduler: failed to execute schedule ${schedule.id}: ${msg}`,
        e as any,
      );
    }
  }

  private calculateNextRun(frequency: any): Date {
    const now = new Date();
    switch (frequency) {
      case "DAILY":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "WEEKLY":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "MONTHLY": {
        const next = new Date(now);
        next.setMonth(now.getMonth() + 1);
        return next;
      }
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
