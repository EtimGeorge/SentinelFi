import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
  BadRequestException,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsEmail,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from "class-validator";
import { AiAssistantService } from "./ai-assistant.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../../../shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
import { ReportFrequency } from "./report-schedule.entity";
import { SettingsEntity } from "../settings/settings.entity";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { Inject } from "@nestjs/common";

// --- DTOs ---

class ChatRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  history?: { role: "user" | "assistant"; content: string }[];

  @IsOptional()
  @IsString()
  @MaxLength(36)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentPage?: string;
}

class AnalyzeDashboardDto {
  @IsEnum(["capex", "opex", "full"])
  scope!: "capex" | "opex" | "full";

  @IsOptional()
  @IsString()
  @MaxLength(36)
  projectId?: string;
}

class ExplainSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sectionKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalContext?: string;
}

class CreateScheduleDto {
  @IsString()
  reportType!: string;

  @IsEnum(ReportFrequency)
  frequency!: ReportFrequency;

  @IsArray()
  @ArrayMaxSize(20)
  recipients!: string[];

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsBoolean()
  deliverByEmail!: boolean;
}

class GenerateNarrativeDto {
  @IsEnum(["variance", "capex", "opex", "executive"])
  reportType!: "variance" | "capex" | "opex" | "executive";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  periodLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  financialData?: Record<string, any>;
}

class ForecastDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

/**
 * AI Assistant Controller
 * All endpoints are JWT-protected. Guardrails run on every request.
 */
@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class AiAssistantController {
  constructor(
    private readonly aiService: AiAssistantService,
    @Inject(TENANT_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user?.id || !req.user?.tenant_id) {
      throw new UnauthorizedException(
        "Authentication required for AI features.",
      );
    }
    return req.user;
  }

  private async getTenantName(tenantId: string): Promise<string> {
    try {
      const settings = await this.dataSource
        .getRepository(SettingsEntity)
        .findOne({ where: { tenant_id: tenantId } as any });
      return (settings as any)?.company_name ?? "Your Organization";
    } catch {
      return "Your Organization";
    }
  }

  private getRoleName(user: any): string {
    const r = user.roles?.[0];
    return typeof r === "object" ? r?.name : (r ?? "User");
  }

  // ─── ENDPOINTS ──────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/ai/chat
   * Conversational financial Q&A with live context injection and full guardrail protection.
   */
  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.AssignedProjectUser,
    Role.FinanceOfficer,
    Role.SuperAdmin,
  )
  async chat(@Body() dto: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    const tenantName = await this.getTenantName(user.tenant_id!);

    return this.aiService.chat({
      message: dto.message,
      sessionId: dto.sessionId,
      history: dto.history ?? [],
      projectId: dto.projectId,
      currentPage: dto.currentPage,
      userRole: this.getRoleName(user),
      userId: user.id!,
      tenantName,
      tenantId: user.tenant_id!,
    });
  }

  /**
   * POST /api/v1/ai/analyze
   * Generates AI narrative analysis of the current CAPEX or OPEX dashboard.
   */
  @Post("analyze")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async analyzeDashboard(
    @Body() dto: AnalyzeDashboardDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = this.requireUser(req);
    const tenantName = await this.getTenantName(user.tenant_id!);
    return this.aiService.analyzeDashboard({
      scope: dto.scope,
      projectId: dto.projectId,
      userRole: this.getRoleName(user),
      tenantName,
      tenantId: user.tenant_id!,
    });
  }

  /**
   * POST /api/v1/ai/forecast
   * Provides budget exhaustion forecast with AI narrative.
   */
  @Post("forecast")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.FinanceManager,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  async forecast(@Body() dto: ForecastDto, @Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    const tenantName = await this.getTenantName(user.tenant_id!);
    return this.aiService.forecast(dto.projectId, tenantName, user.tenant_id!);
  }

  /**
   * POST /api/v1/ai/fill-form
   * Uploads a document (PDF/Image) and extracts structured data for specific forms.
   */
  @Post("fill-form")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  @Roles(
    Role.FinanceOfficer,
    Role.FinanceManager,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  async fillForm(
    @UploadedFile() file: Express.Multer.File,
    @Body("targetForm") targetForm: string,
    @Body("projectName") projectName: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.requireUser(req);
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!targetForm)
      throw new BadRequestException("Target form type is required.");

    return this.aiService.fillForm(file, targetForm, projectName);
  }

  /**
   * POST /api/v1/ai/explain
   * Returns a plain-language explanation of any SentinelFi section.
   */
  @Post("explain")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.AdminManager,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.AssignedProjectUser,
    Role.FinanceOfficer,
    Role.SuperAdmin,
  )
  async explainSection(
    @Body() dto: ExplainSectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = this.requireUser(req);
    const explanation = await this.aiService.explainSection(
      dto.sectionKey,
      this.getRoleName(user),
      dto.additionalContext,
    );
    return { sectionKey: dto.sectionKey, explanation };
  }

  /**
   * POST /api/v1/ai/generate-narrative
   * Generates a branded AI executive summary for reports.
   */
  @Post("generate-narrative")
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.FinanceManager,
    Role.AdminManager,
    Role.SuperAdmin,
  )
  async generateNarrative(
    @Body() dto: GenerateNarrativeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = this.requireUser(req);
    const tenantName = await this.getTenantName(user.tenant_id!);
    return this.aiService.generateReportNarrative({
      reportType: dto.reportType,
      tenantName,
      tenantId: user.tenant_id!,
      projectName: dto.projectName,
      periodLabel: dto.periodLabel,
      currency: dto.currency ?? "NGN",
      financialData: dto.financialData,
    });
  }

  // ─── REPORT SCHEDULING ──────────────────────────────────────────────────────

  @Post("schedules")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = this.requireUser(req);
    return this.aiService.createReportSchedule({
      tenantId: user.tenant_id!,
      userId: user.id!,
      reportType: dto.reportType,
      frequency: dto.frequency,
      recipients: dto.recipients,
      projectId: dto.projectId,
      deliverByEmail: dto.deliverByEmail,
    });
  }

  @Get("schedules")
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async getSchedules(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    return this.aiService.getReportSchedules(user.tenant_id!);
  }

  @Delete("schedules/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    Role.CEO,
    Role.CFO,
    Role.AdminDirector,
    Role.FinanceManager,
    Role.SuperAdmin,
  )
  async deleteSchedule(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = this.requireUser(req);
    await this.aiService.deleteReportSchedule(id, user.tenant_id!);
  }
}
