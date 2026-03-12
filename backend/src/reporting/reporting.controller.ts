import { Controller, Get, Post, Body, Query, UseGuards, Req, Param, StreamableFile } from "@nestjs/common";
import { ReportingService, ReportOptions } from "./reporting.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportType, DocumentControlEntity } from "../common/entities/document-control.entity";

@Controller("reporting")
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post("generate")
  async generateReport(
    @Req() req: any,
    @Body() body: { type: ReportType, format: "pdf" | "xlsx" | "csv" | "docx", filters?: any, context?: any, aiContext?: string, pushToDcs?: boolean }
  ): Promise<any> {
    const options: ReportOptions = {
        tenantId: req.user.tenant_id,
        userId: req.user.id,
        format: body.format,
        filters: body.filters,
        context: body.context,
        aiContext: body.aiContext,
    };

    const archive = await this.reportingService.generateAndArchiveReport(body.type, options);
    
    if (body.pushToDcs) {
        return archive;
    }

    const { buffer, fileName } = await this.reportingService.getReportBuffer(body.type, options);
    
    return new StreamableFile(buffer, {
        type: archive.mime_type,
        disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get("history")
  async getArchiveHistory(@Req() req: any): Promise<DocumentControlEntity[]> {
      return await this.reportingService.getArchiveHistory(req.user.tenant_id);
  }

  @Get("export/:id")
  async exportArchivedReport(@Req() req: any, @Param("id") id: string): Promise<StreamableFile> {
      const { buffer, fileName, mimeType } = await this.reportingService.getArchivedFile(id, req.user.tenant_id);
      
      return new StreamableFile(buffer, {
          type: mimeType,
          disposition: `attachment; filename="${fileName}"`,
      });
  }
}
