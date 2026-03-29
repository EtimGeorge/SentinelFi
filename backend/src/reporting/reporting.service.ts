import { Injectable, Logger, Inject } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import {
  ReportType,
  DocumentControlEntity,
} from "../common/entities/document-control.entity";
import { WbsService } from "../wbs/wbs.service";
import { OperationalBudgetsService } from "../operational-budgets/operational-budgets.service";
import { ProjectsService } from "../projects/projects.service";
import { PdfUtility } from "../common/pdf.utility";
import { ExcelUtility } from "../common/excel.utility";
import { Buffer } from "buffer";
import { InjectRepository } from "@nestjs/typeorm";
import { WbsUtils } from "../common/utils/wbs.utils";
import { WordUtility } from "../common/word.utility";
import * as fs from "fs";
import * as path from "path";
import { AiAssistantService } from "../ai-assistant/ai-assistant.service";

export interface ReportOptions {
  tenantId: string;
  userId: string;
  format: "pdf" | "xlsx" | "csv" | "docx";
  filters?: {
    projectId?: string;
    project_id?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  aiContext?: string;
  currencyCode?: string;
  context?: {
    currencyRate: number;
    currencySymbol: string;
    tenantName: string;
    projectName: string;
    projectMap: Record<string, string>;
  };
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE) private dataSource: DataSource,
    @InjectRepository(DocumentControlEntity, TENANT_DATA_SOURCE)
    private readonly docRepo: Repository<DocumentControlEntity>,
    private readonly wbsService: WbsService,
    private readonly opexService: OperationalBudgetsService,
    private readonly projectsService: ProjectsService,
    private readonly aiService: AiAssistantService,
  ) {}

  async getReportBuffer(
    type: ReportType,
    options: ReportOptions,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (type) {
      case ReportType.VARIANCE_ANALYSIS:
        buffer = await this.generateVarianceReport(options);
        fileName = `variance_report_${Date.now()}.${options.format}`;
        break;
      case ReportType.CAPEX_SUMMARY:
        buffer = await this.generateCapexReport(options);
        fileName = `capex_summary_${Date.now()}.${options.format}`;
        break;
      case ReportType.OPEX_EFFICIENCY:
        buffer = await this.generateOpexReport(options);
        fileName = `opex_efficiency_${Date.now()}.${options.format}`;
        break;
      default:
        throw new Error(
          `Report type ${type} not yet implemented for automated generation.`,
        );
    }

    switch (options.format) {
      case "pdf":
        mimeType = "application/pdf";
        break;
      case "xlsx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "docx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "csv":
        mimeType = "text/csv";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    return { buffer, fileName, mimeType };
  }

  async generateAndArchiveReport(
    type: ReportType,
    options: ReportOptions,
  ): Promise<DocumentControlEntity> {
    this.logger.log(`Generating ${type} report for tenant ${options.tenantId}`);

    const { buffer, fileName, mimeType } = await this.getReportBuffer(
      type,
      options,
    );

    const uploadDir = path.join(
      process.cwd(),
      `uploads/reports/${options.tenantId}`,
    );
    const filePath = `uploads/reports/${options.tenantId}/${fileName}`;
    const absoluteFilePath = path.join(uploadDir, fileName);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      await fs.promises.writeFile(absoluteFilePath, buffer);
      this.logger.log(`Successfully persisted report to ${absoluteFilePath}`);
    } catch (err: any) {
      this.logger.error(`Failed to persist report to disk: ${err.message}`);
      throw err;
    }

    const doc = this.docRepo.create({
      tenant_id: options.tenantId,
      report_type: type,
      file_name: fileName,
      file_path: filePath,
      mime_type: mimeType,
      created_by_id: options.userId,
      metadata: {
        filters: options.filters,
        ai_summary: options.aiContext,
        ai_generated: !!options.aiContext,
        context: options.context,
      },
    }) as any as DocumentControlEntity;

    return await this.docRepo.save(doc);
  }

  async getArchiveHistory(tenantId: string): Promise<DocumentControlEntity[]> {
    return await this.docRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: "DESC" },
    });
  }

  async getArchivedFile(
    id: string,
    tenantId: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const doc = await this.docRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!doc) throw new Error("Document not found");

    const extMatch = doc.file_name.match(/\.([a-z]+)$/i);
    const format = extMatch ? extMatch[1] : "pdf";

    const metadata = doc.metadata as any;

    const options: ReportOptions = {
      tenantId,
      userId: doc.created_by_id,
      format: format as any,
      filters: metadata?.filters,
      context: metadata?.context,
    };

    return await this.getReportBuffer(doc.report_type, options);
  }

  private async generateVarianceReport(
    options: ReportOptions,
  ): Promise<Buffer> {
    let data: any = await this.wbsService.getWbsBudgetRollup(options.tenantId, {
      projectId: options.filters?.projectId || options.filters?.project_id,
      startDate: options.filters?.startDate,
      endDate: options.filters?.endDate,
    });

    // Professional Requirement: Hierarchical Sorting
    data = WbsUtils.sortHierarchically(data);

    if (options.format === "pdf") {
      return Buffer.from(
        await PdfUtility.generateWbsBudgetReport(
          data,
          "WBS Variance Analysis",
          options.context,
        ),
      );
    }
    if (options.format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateWbsBudgetReport(
          data,
          "WBS Variance Analysis",
          options.context,
        ),
      );
    }
    if (options.format === "docx") {
      return await WordUtility.generateWbsBudgetReport(
        data,
        "WBS Variance Analysis",
        options.context,
      );
    }

    return Buffer.from("Variance Report Data Placeholder");
  }

  private async generateCapexReport(options: ReportOptions): Promise<Buffer> {
    const { projects } = await this.projectsService.findAll(
      {
        project_id: options.filters?.projectId || options.filters?.project_id,
        startDate: options.filters?.startDate,
        endDate: options.filters?.endDate,
        status: options.filters?.status,
      } as any,
      options.tenantId,
    );

    if (options.format === "pdf") {
      return Buffer.from(
        await PdfUtility.generateProjectReport(
          projects as any,
          "CAPEX Project Portfolio",
          options.context,
        ),
      );
    }
    if (options.format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateProjectReport(
          projects as any,
          "CAPEX Project Portfolio",
          options.context,
        ),
      );
    }
    if (options.format === "docx") {
      return await WordUtility.generateProjectReport(
        projects as any,
        "CAPEX Project Portfolio",
        options.context,
      );
    }

    return Buffer.from("CAPEX Report Data Placeholder");
  }

  private async generateOpexReport(options: ReportOptions): Promise<Buffer> {
    // Fetch the full OPEX rollup (budget → category → actual) for accurate export
    const rollupData = await this.opexService.getOpexRollup(options.tenantId, {
      startDate: options.filters?.startDate,
      endDate: options.filters?.endDate,
      budget_id: options.filters?.budget_id,
      type: options.filters?.type,
    });

    const reportTitle = "OPEX Efficiency Intelligence Report";

    if (options.format === "pdf") {
      return Buffer.from(
        await PdfUtility.generateOpexRollupReport(
          rollupData,
          reportTitle,
          options.context,
        ),
      );
    }
    if (options.format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateOpexRollupReport(
          rollupData,
          reportTitle,
          options.context,
        ),
      );
    }
    if (options.format === "docx") {
      return await WordUtility.generateOpexRollupReport(
        rollupData,
        reportTitle,
        options.context,
      );
    }

    // CSV fallback: flat category-level rows
    const headers = [
      "Budget Name",
      "Budget Type",
      "Category",
      "Budgeted",
      "Actual Burn",
      "Variance",
      "Burn Rate %",
      "Health Status",
    ].join(",");
    const rows = (rollupData.budgets ?? []).flatMap((b) =>
      (b.categories ?? []).map((c) =>
        [
          `"${b.name}"`,
          `"${b.type}"`,
          `"${c.name}"`,
          c.budgeted,
          c.actual,
          c.variance,
          `${c.burnRate?.toFixed(2)}%`,
          c.status,
        ].join(","),
      ),
    );
    return Buffer.from([headers, ...rows].join("\n"), "utf-8");
  }

  /**
   * AI-AGENT HOOK: Natural Language Financial Explainer
   * This method is designed to be called by an AI agent to generate human-readable
   * insights from raw variance data.
   */
  async explainVariance(data: any, context?: string): Promise<string> {
    this.logger.log(
      "Delegating AI natural language variance explanation to the Python Agent...",
    );
    return await this.aiService.explainVariance(data, context);
  }
}
