import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import {
  ReportScheduleEntity,
  ReportStatus,
} from "./report-schedule.entity";
import { AiAssistantService } from "./ai-assistant.service";
import { EmailService } from "../email/email.service";
import { TENANT_DATA_SOURCE } from "../database/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_RECIPIENTS = 20;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    @Optional() private readonly emailService?: EmailService,
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

      // Email delivery: send the narrative to validated recipients.
      // Each recipient is attempted independently so one bad address
      // never blocks the rest; outcomes are logged for the audit trail.
      // The AI narrative is HTML-escaped — AI text must never be injected
      // raw into email HTML (XSS in mail clients is a real attack vector).
      if (schedule.deliver_by_email) {
        await this.deliverByEmail(schedule, narrative?.narrative ?? "");
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

  private async deliverByEmail(
    schedule: ReportScheduleEntity,
    narrative: string,
  ): Promise<void> {
    const raw = Array.isArray(schedule.recipients) ? schedule.recipients : [];
    const valid = raw
      .map((r) => String(r).trim().toLowerCase())
      .filter((r) => EMAIL_RE.test(r));
    const invalid = raw.length - valid.length;
    if (invalid > 0) {
      this.logger.warn(
        `Scheduler: schedule ${schedule.id} skipped ${invalid} invalid email address(es)`,
      );
    }
    const capped = valid.slice(0, MAX_EMAIL_RECIPIENTS);
    if (valid.length > MAX_EMAIL_RECIPIENTS) {
      this.logger.warn(
        `Scheduler: schedule ${schedule.id} capped recipients from ${valid.length} to ${MAX_EMAIL_RECIPIENTS}`,
      );
    }
    if (capped.length === 0) {
      this.logger.warn(
        `Scheduler: schedule ${schedule.id} requested email delivery but has no valid recipients`,
      );
      return;
    }
    if (!this.emailService) {
      this.logger.warn(
        `Scheduler: schedule ${schedule.id} email delivery skipped (EmailService not wired)`,
      );
      return;
    }
    const subject = `SentinelFi ${schedule.report_type} report — ${schedule.name ?? schedule.id}`;
    const safeNarrative = escapeHtml(narrative).replace(/\n/g, "<br>");
    const html = `<p>Scheduled ${escapeHtml(schedule.report_type)} report for ${new Date().toISOString().slice(0, 10)}.</p><div>${safeNarrative}</div>`;
    let sent = 0;
    for (const to of capped) {
      try {
        await this.emailService.sendEmail(to, subject, html, {
          template: "ai-scheduled-report",
          tenantId: schedule.tenant_id,
        });
        sent++;
      } catch (e: any) {
        this.logger.error(
          `Scheduler: email to ${to} failed for schedule ${schedule.id}: ${e?.message ?? e}`,
        );
      }
    }
    this.logger.log(
      `Scheduler: schedule ${schedule.id} email delivery ${sent}/${capped.length} sent`,
    );
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
