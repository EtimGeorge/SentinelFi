import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { ClsService } from "nestjs-cls";
import { firstValueFrom } from "rxjs";
import { timeout, catchError } from "rxjs/operators";
import { of } from "rxjs";
import {
  FinancialContextService,
  FinancialContextSnapshot,
} from "./financial-context.service";
import { GuardrailsService } from "./guardrails.service";
import { DataSource, Repository } from "typeorm";
import { Inject } from "@nestjs/common";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { InjectRepository } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AiAuditLogEntity, AiInteractionType } from "./ai-audit-log.entity";
import {
  ReportScheduleEntity,
  ReportFrequency,
  ReportStatus,
} from "./report-schedule.entity";

export interface AiChatOptions {
  message: string;
  sessionId: string;
  history?: { role: "user" | "assistant"; content: string }[];
  projectId?: string;
  currentPage?: string;
  userRole?: string;
  userId?: string;
  tenantName?: string;
  tenantId: string;
}

export interface AiAnalysisOptions {
  scope: "capex" | "opex" | "full";
  projectId?: string;
  userRole?: string;
  tenantName?: string;
  tenantId: string;
}

/**
 * Core AI orchestration service. Acts as the secure NestJS proxy to the Python AI agent.
 * Responsibilities:
 * - Injects live financial context into every AI request
 * - Enforces security guardrails before forwarding to Python agent
 * - Handles scheduling, session management, and fallbacks
 */
@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly AI_AGENT_BASE_URL: string;
  private readonly REQUEST_TIMEOUT_MS = 60000;

  // Enterprise Resilience: Simple Circuit Breaker state
  private circuitBreakerFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private circuitBreakerLastFailureTime = 0;
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly financialContextService: FinancialContextService,
    private readonly guardrailsService: GuardrailsService,
    private readonly cls: ClsService,
    @Inject(TENANT_DATA_SOURCE)
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(AiAuditLogEntity)
    private readonly auditLogRepo: Repository<AiAuditLogEntity>,
  ) {
    this.AI_AGENT_BASE_URL = this.configService.get<string>(
      "AI_AGENT_URL",
      "http://localhost:8000",
    );
  }

  /**
   * Sends a chat message to the AI with live financial context injected.
   * All guardrail checks run BEFORE hitting the Python agent.
   */
  async chat(options: AiChatOptions): Promise<{
    response: string;
    suggestions: string[];
    actionHints: { label: string; action: string }[];
    blocked: boolean;
    blockReason?: string;
    sessionId: string;
  }> {
    // Layer 1: NestJS guardrail scan (redundant with Python — defense in depth)
    const scanResult = this.guardrailsService.scan(options.message, {
      sessionId: options.sessionId,
      userId: options.userId,
    });

    if (!scanResult.safe) {
      this.logger.warn(
        `AI chat blocked [${scanResult.type}] for user ${options.userId ?? "unknown"}`,
      );
      return {
        response: scanResult.reason!,
        suggestions: [],
        actionHints: [],
        blocked: true,
        blockReason: scanResult.type,
        sessionId: options.sessionId,
      };
    }

    // Layer 2: Build financial context snapshot (tenant-scoped)
    let financialContext: FinancialContextSnapshot;
    try {
      financialContext = await this.financialContextService.buildSnapshot({
        projectId: options.projectId,
        tenantName: options.tenantName,
        tenantId: options.tenantId,
      });
    } catch (e) {
      this.logger.error(
        "Failed to build financial context, proceeding without it",
      );
      financialContext = null!;
    }

    // Layer 3: Sanitize context before sending to Python
    const safeContext = financialContext
      ? this.guardrailsService.sanitizeContext(financialContext as any)
      : null;

    // Layer 4: Forward to Python AI agent
    const startTime = Date.now();
    try {
      const responseBody = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/chat`, {
            message: options.message,
            session_id: options.sessionId,
            history: options.history?.slice(-20) ?? [],
            financial_context: safeContext,
            user_role: options.userRole,
            current_page_context: options.currentPage,
          })
          .pipe(
            timeout(this.REQUEST_TIMEOUT_MS),
            catchError((err) => {
              this.logger.error(`AI agent error: ${err.message}`);
              return of({ data: this.getFallbackResponse(options.message) });
            }),
          ),
      );
      const latency = Date.now() - startTime;
      const data = responseBody.data as any;

      this.logInteraction({
        tenantId: options.tenantId,
        userId: options.userId,
        type: AiInteractionType.CHAT,
        message: options.message,
        response: data.response,
        blocked: data.blocked,
        blockReason: data.block_reason,
        latency,
      });

      return {
        response: data.response ?? "No response generated.",
        suggestions: data.suggestions ?? [],
        actionHints: data.action_hints ?? [],
        blocked: data.blocked ?? false,
        blockReason: data.block_reason,
        sessionId: options.sessionId,
      };
    } catch (error: any) {
      this.logger.error(`AI chat request failed: ${error.message}`);
      const fallback = {
        response:
          "I am temporarily unavailable. Please try again in a moment, or contact your SuperAdmin if the issue persists.",
        suggestions: [],
        actionHints: [],
        blocked: false,
        sessionId: options.sessionId,
      };

      this.logInteraction({
        tenantId: options.tenantId,
        userId: options.userId,
        type: AiInteractionType.CHAT,
        message: options.message,
        response: fallback.response,
        circuitTripped: true,
      });

      return fallback;
    }
  }

  private async logInteraction(params: {
    tenantId: string;
    userId?: string;
    type: AiInteractionType;
    message: string;
    response?: string;
    blocked?: boolean;
    blockReason?: string;
    circuitTripped?: boolean;
    latency?: number;
  }) {
    try {
      await this.auditLogRepo.save({
        tenant_id: params.tenantId,
        user_id: params.userId,
        interaction_type: params.type,
        user_message_sanitized: this.guardrailsService.scan(params.message).safe
          ? params.message
          : "[MASKED BY GUARDRAIL]",
        ai_response_sanitized: params.response,
        was_blocked: params.blocked,
        block_reason: params.blockReason,
        circuit_tripped: params.circuitTripped,
        latency_ms: params.latency,
      });
    } catch (error: any) {
      this.logger.error(`Failed to save AI audit log: ${error.message}`);
    }
  }

  /**
   * Generates AI narrative analysis of the current dashboard state.
   */
  async analyzeDashboard(options: AiAnalysisOptions): Promise<{
    narrative: string;
    sections: Record<string, string>;
    scope: string;
    generatedAt: string;
  }> {
    const cacheKey = `ai:analysis:${options.tenantId}:${options.scope}:${options.projectId || "all"}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    if (this.isCircuitOpen()) {
      throw new HttpException(
        "AI analysis temporarily unavailable (Circuit Open).",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let financialContext: FinancialContextSnapshot;
    try {
      financialContext = await this.financialContextService.buildSnapshot({
        projectId: options.projectId,
        tenantName: options.tenantName,
        tenantId: options.tenantId,
      });
    } catch (e) {
      throw new HttpException(
        "Could not load financial data for analysis.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const safeContext = this.guardrailsService.sanitizeContext(
      financialContext as any,
    );

    try {
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/analyze-dashboard`, {
            financial_context: safeContext,
            scope: options.scope,
            user_role: options.userRole,
          })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS)),
      );
      const latency = Date.now() - startTime;

      const result = {
        narrative: response.data.narrative,
        sections: response.data.sections,
        scope: options.scope,
        generatedAt: new Date().toISOString(),
      };

      this.logInteraction({
        tenantId: options.tenantId,
        type: AiInteractionType.ANALYSIS,
        message: `Dashboard Analysis [${options.scope}]`,
        response: result.narrative,
        latency,
      });

      await this.cacheManager.set(cacheKey, result, 3600); // 1-hour cache
      this.resetCircuit();
      return result;
    } catch (error: any) {
      this.handleFailure();
      this.logger.error(`Dashboard analysis failed: ${error.message}`);
      throw new HttpException(
        "AI analysis temporarily unavailable.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const now = Date.now();
      if (
        now - this.circuitBreakerLastFailureTime >
        this.CIRCUIT_BREAKER_RESET_TIMEOUT
      ) {
        this.resetCircuit(); // Half-open attempt
        return false;
      }
      return true;
    }
    return false;
  }

  private handleFailure() {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailureTime = Date.now();
  }

  private resetCircuit() {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerLastFailureTime = 0;
  }

  public getCircuitStatus() {
    return {
      failures: this.circuitBreakerFailures,
      isOpen: this.isCircuitOpen(),
      lastFailureTime: this.circuitBreakerLastFailureTime,
    };
  }

  /**
   * Returns AI-powered budget forecast using the tenant's burn rate history.
   */
  async forecast(
    projectId: string | undefined,
    tenantName: string | undefined,
    tenantId: string,
  ): Promise<any> {
    const cacheKey = `ai:forecast:${tenantId}:${projectId || "portfolio"}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    if (this.isCircuitOpen()) {
      throw new HttpException(
        "Forecasting service temporarily unavailable (Circuit Open).",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const snapshot = await this.financialContextService.buildSnapshot({
      projectId,
      tenantName,
      tenantId,
    });
    const target = projectId ? snapshot.currentProject : null;

    try {
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/forecast`, {
            total_budgeted: target?.budgeted ?? snapshot.totalBudgeted,
            total_actual: target?.actual ?? snapshot.totalActualPaid,
            burn_history_30_days: snapshot.burnHistory30Days,
            project_name: target?.name ?? tenantName ?? "Portfolio",
            currency: target?.currency ?? "NGN",
          })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS)),
      );
      const latency = Date.now() - startTime;
      const data = response.data;

      this.logInteraction({
        tenantId,
        type: AiInteractionType.FORECAST,
        message: `Forecast Audit: ${target?.name || tenantName}`,
        response: JSON.stringify(data),
        latency,
      });

      await this.cacheManager.set(cacheKey, data, 1800); // 30-min cache for forecasts
      this.resetCircuit();
      return data;
    } catch (error: any) {
      this.handleFailure();
      this.logger.error(`Forecast failed: ${error.message}`);

      this.logInteraction({
        tenantId,
        type: AiInteractionType.FORECAST,
        message: `Forecast Failure: ${target?.name || tenantName}`,
        circuitTripped: true,
      });

      throw new HttpException(
        "Forecasting service temporarily unavailable.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generates an AI narrative for a report, branded with tenant and project info.
   */
  async generateReportNarrative(params: {
    reportType: "variance" | "capex" | "opex" | "executive";
    tenantName: string;
    tenantId: string;
    projectName?: string;
    periodLabel?: string;
    currency?: string;
    financialData?: Record<string, any>;
  }): Promise<{ narrative: string; generatedAt: string }> {
    const cacheKey = `ai:report:${params.tenantId}:${params.reportType}:${params.projectName || "all"}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    if (this.isCircuitOpen()) {
      throw new HttpException(
        "Report generation temporarily unavailable (Circuit Open).",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const snapshot = await this.financialContextService.buildSnapshot({
      tenantName: params.tenantName,
      tenantId: params.tenantId,
    });
    const baseData = this.guardrailsService.sanitizeContext({
      ...snapshot,
      ...params.financialData,
    });

    try {
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/generate-report`, {
            report_title: `${params.tenantName} - ${params.reportType.toUpperCase()} Report`,
            data_context: baseData,
            tone: "professional",
            focus_areas: [params.reportType],
            currency: params.currency ?? "NGN",
            session_id: `report-${params.tenantId}-${Date.now()}`,
          })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS)),
      );
      const latency = Date.now() - startTime;
      const result = {
        narrative: response.data.content,
        generatedAt: new Date().toISOString(),
      };

      this.logInteraction({
        tenantId: params.tenantId,
        type: AiInteractionType.REPORT,
        message: `Report Generation: ${params.reportType}`,
        response: result.narrative,
        latency,
      });

      await this.cacheManager.set(cacheKey, result, 7200); // 2-hour cache for reports
      this.resetCircuit();
      return result;
    } catch (error: any) {
      this.handleFailure();
      this.logger.error(`Report generation failed: ${error.message}`);

      this.logInteraction({
        tenantId: params.tenantId,
        type: AiInteractionType.REPORT,
        message: `Report Generation Failure: ${params.reportType}`,
        circuitTripped: true,
      });

      throw new HttpException(
        "Report narrative generation failed.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Processes a document and extracts financial form data (Requisition, Invoice, etc).
   */
  async fillForm(
    file: Express.Multer.File,
    targetForm: string,
    projectName: string,
  ): Promise<any> {
    const formData = new (require("form-data"))();
    formData.append("file", file.buffer, { filename: file.originalname });
    formData.append("target_form", targetForm);
    formData.append("project_name", projectName);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/fill-form`, formData, {
            headers: formData.getHeaders(),
          })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS)),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Form extraction failed: ${error.message}`);
      throw new HttpException(
        "AI form extraction failed. Please try again.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Explains any SentinelFi section in plain language for the given user role.
   */
  async explainSection(
    sectionKey: string,
    userRole?: string,
    additionalContext?: string,
  ): Promise<string> {
    const scanResult = this.guardrailsService.scan(
      sectionKey + (additionalContext ?? ""),
    );
    if (!scanResult.safe) return scanResult.reason!;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/explain-section`, {
            section_key: sectionKey,
            user_role: userRole,
            additional_context: additionalContext,
          })
          .pipe(timeout(15000)),
      );
      return response.data.explanation ?? "Explanation unavailable.";
    } catch (error: any) {
      return "This feature explanation is temporarily unavailable. Please refer to the user guide or contact your administrator.";
    }
  }

  /**
   * Explains variance specifically for reporting via Python AI Agent.
   */
  async explainVariance(data: any, context?: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.AI_AGENT_BASE_URL}/api/v1/ai/explain-variance`, {
            data_context: data,
            additional_insight: context,
          })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS)),
      );
      return response.data.explanation ?? "Variance explanation unavailable.";
    } catch (error: any) {
      this.logger.error(`Variance explanation failed: ${error.message}`);
      return "The AI engine is currently unable to provide a deep variance explanation due to availability constraints.";
    }
  }

  /**
   * Creates a report schedule for automated AI report generation.
   */
  async createReportSchedule(params: {
    tenantId: string;
    userId: string;
    reportType: string;
    frequency: ReportFrequency;
    recipients: string[];
    projectId?: string;
    deliverByEmail: boolean;
  }): Promise<ReportScheduleEntity> {
    const repo = this.dataSource.getRepository(ReportScheduleEntity);
    const schedule = repo.create({
      tenant_id: params.tenantId,
      created_by_id: params.userId,
      report_type: params.reportType,
      frequency: params.frequency,
      recipients: params.recipients,
      project_id: params.projectId ?? null,
      deliver_by_email: params.deliverByEmail,
      status: ReportStatus.ACTIVE,
      next_run_at: this.calculateNextRun(params.frequency),
    });
    return repo.save(schedule);
  }

  async getReportSchedules(tenantId: string): Promise<ReportScheduleEntity[]> {
    return this.dataSource.getRepository(ReportScheduleEntity).find({
      where: { tenant_id: tenantId },
      order: { created_at: "DESC" },
    });
  }

  async deleteReportSchedule(id: string, tenantId: string): Promise<void> {
    await this.dataSource
      .getRepository(ReportScheduleEntity)
      .delete({ id, tenant_id: tenantId });
  }

  private calculateNextRun(frequency: ReportFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case ReportFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case ReportFrequency.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case ReportFrequency.MONTHLY:
        const next = new Date(now);
        next.setMonth(now.getMonth() + 1);
        return next;
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private getFallbackResponse(message: string): any {
    return {
      response:
        "I am having difficulty connecting to my AI service right now. " +
        "For immediate assistance, please review your dashboard data directly or contact your financial team.",
      suggestions: [
        "View Financial Intelligence Dashboard",
        "Check Budget Reports",
        "Contact SuperAdmin if issue persists",
      ],
      action_hints: [],
      blocked: false,
    };
  }
}
