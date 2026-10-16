import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Param,
  StreamableFile,
} from "@nestjs/common";
import { ReportingService, ReportOptions } from "./reporting.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import {
  ReportType,
  DocumentControlEntity,
} from "../common/entities/document-control.entity";

/**
 * BE-7: report generation/export previously required only authentication —
 * any authenticated user (including task-scoped operational roles) could
 * generate and download every report type. Financial reports are now gated to
 * officer tier and above. Operational roles (Admin Officer, Assigned Project
 * User) keep their task screens but cannot pull portfolio reports.
 */
const REPORT_VIEWER_ROLES = [
  Role.SuperAdmin,
  Role.CEO,
  Role.CFO,
  Role.AdminDirector,
  Role.OperationalDirector,
  Role.TechnicalDirector,
  Role.FinanceManager,
  Role.AdminManager,
  Role.ProjectManager,
  Role.FinanceOfficer,
];

@Controller("reporting")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post("generate")
  @Roles(...REPORT_VIEWER_ROLES)
  async generateReport(
    @Req() req: any,
    @Body()
    body: {
      type: ReportType;
      format: "pdf" | "xlsx" | "csv" | "docx";
      filters?: any;
      context?: any;
      aiContext?: string;
      pushToDcs?: boolean;
    },
  ): Promise<any> {
    const options: ReportOptions = {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      format: body.format,
      filters: body.filters,
      context: body.context,
      aiContext: body.aiContext,
    };

    const archive = await this.reportingService.generateAndArchiveReport(
      body.type,
      options,
    );

    if (body.pushToDcs) {
      return archive;
    }

    const { buffer, fileName } = await this.reportingService.getReportBuffer(
      body.type,
      options,
    );

    return new StreamableFile(buffer, {
      type: archive.mime_type,
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get("history")
  @Roles(...REPORT_VIEWER_ROLES)
  async getArchiveHistory(@Req() req: any): Promise<DocumentControlEntity[]> {
    return await this.reportingService.getArchiveHistory(req.user.tenant_id);
  }

  @Get("export/:id")
  @Roles(...REPORT_VIEWER_ROLES)
  async exportArchivedReport(
    @Req() req: any,
    @Param("id") id: string,
  ): Promise<StreamableFile> {
    const { buffer, fileName, mimeType } =
      await this.reportingService.getArchivedFile(id, req.user.tenant_id);

    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
