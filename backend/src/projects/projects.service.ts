import { Injectable, NotFoundException, Logger, Inject, ConflictException } from "@nestjs/common";
import { Repository, SelectQueryBuilder, DataSource } from "typeorm";
import { ProjectEntity } from "./project.entity";
import { LpoEntity } from "./lpo.entity";
import { ProjectInflowEntity } from "./project-inflow.entity";
import { ProjectAuditEntity } from "./project-audit.entity";
import { CreateProjectDto } from "./dto/create-project.dto";
import { CreateLpoDto } from "./dto/create-lpo.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { GetProjectsDto } from "./dto/get-projects.dto";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { PdfUtility } from "../common/pdf.utility";
import { ExcelUtility } from "../common/excel.utility";
import { WordUtility } from "../common/word.utility";
import { Buffer } from "buffer";
import { TENANT_DATA_SOURCE } from "../database/constants";

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
    @Inject("PROJECT_REPOSITORY")
    private projectRepository: Repository<ProjectEntity>,
    @Inject("WBSBUDGET_REPOSITORY")
    private wbsBudgetRepository: Repository<WbsBudgetEntity>,
    @Inject("LIVEEXPENSE_REPOSITORY")
    private liveExpenseRepository: Repository<LiveExpenseEntity>,
    @Inject("LPO_REPOSITORY")
    private lpoRepository: Repository<LpoEntity>,
    @Inject("PROJECTINFLOW_REPOSITORY")
    private inflowRepository: Repository<ProjectInflowEntity>,
    @Inject("PROJECTAUDIT_REPOSITORY")
    private auditRepository: Repository<ProjectAuditEntity>,
  ) {}

  async logAudit(
      project_id: string,
      tenantId: string,
      userId: string,
      changeType: string,
      oldValue: number | null,
      newValue: number | null,
      description: string
  ) {
      const audit = this.auditRepository.create({
          project_id,
          tenant_id: tenantId,
          performed_by_user_id: userId,
          change_type: changeType,
          old_value: oldValue,
          new_value: newValue,
          description
      });
      return this.auditRepository.save(audit);
  }

  async findAudits(project_id: string, tenantId: string) {
      return this.auditRepository.find({
          where: { project_id, tenant_id: tenantId },
          order: { created_at: 'DESC' },
          relations: ['performedBy']
      });
  }

  async findLpos(project_id: string, tenantId: string) {
      return this.lpoRepository.find({
          where: { project_id, tenant_id: tenantId },
          order: { created_at: 'DESC' },
          relations: ['wbsItem', 'createdBy']
      });
  }

  async findInflows(project_id: string, tenantId: string) {
      return this.inflowRepository.find({
          where: { project_id, tenant_id: tenantId },
          order: { receipt_date: 'DESC' },
          relations: ['receivedBy']
      });
  }

  async createInflow(
    inflowData: Partial<ProjectInflowEntity>,
    userId: string,
    tenantId: string,
  ): Promise<ProjectInflowEntity> {
    const inflow = this.inflowRepository.create({
      ...inflowData,
      tenant_id: tenantId,
      received_by_user_id: userId,
    });
    return this.inflowRepository.save(inflow);
  }

  async createLpo(
    createLpoDto: CreateLpoDto,
    userId: string,
    tenantId: string,
  ): Promise<LpoEntity> {
    const lpo = this.lpoRepository.create({
      ...createLpoDto,
      tenant_id: tenantId,
      created_by_user_id: userId,
    });
    return this.lpoRepository.save(lpo);
  }

  private _addRollupSubqueries(
    queryBuilder: SelectQueryBuilder<ProjectEntity>,
  ): SelectQueryBuilder<ProjectEntity> {
    // Ensure subqueries use the tenant-specific connection
    return queryBuilder
      .addSelect((subQuery) => {
        return subQuery
          .select("COALESCE(SUM(wbs.total_cost_budgeted), 0)")
          .from(WbsBudgetEntity, "wbs")
          .where("wbs.project_id = project.project_id");
      }, "total_budgeted_rollup")
      .addSelect((subQuery) => {
        return subQuery
          .select("COALESCE(SUM(expense.actual_paid_amount), 0)")
          .from(LiveExpenseEntity, "expense")
          .innerJoin(
            WbsBudgetEntity,
            "wbs_for_expense",
            "wbs_for_expense.wbs_id = expense.wbs_id",
          )
          .where("wbs_for_expense.project_id = project.project_id");
      }, "total_paid_rollup")
      .addSelect((subQuery) => {
        return subQuery
          .select("COALESCE(SUM(inflow.amount_received), 0)")
          .from(ProjectInflowEntity, "inflow")
          .where("inflow.project_id = project.project_id");
      }, "total_inflow_rollup");
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
    tenantId: string,
  ): Promise<ProjectEntity> {
    // Check for duplicate project name within the same tenant
    const existing = await this.projectRepository.findOne({
      where: { project_name: createProjectDto.project_name, tenant_id: tenantId }
    });

    if (existing) {
      throw new ConflictException(`A project with the name "${createProjectDto.project_name}" already exists.`);
    }

    const project = this.projectRepository.create({
      ...createProjectDto,
      // Fallback defaults to prevent "Not Null" constraints if payload has nulls
      contract_value: createProjectDto.contract_value ?? 0,
      contingency_percent: createProjectDto.contingency_percent ?? 0,
      vat_rate: createProjectDto.vat_rate ?? 7.5,
      wht_rate: createProjectDto.wht_rate ?? 5.0,
      created_by_user_id: userId,
      tenant_id: tenantId, // Ensure tenant_id is set on creation
      client_id: createProjectDto.client_id || null, // Handle client_id
    });

    const savedProject = await this.projectRepository.save(project);

    // Initial Audit Log
    await this.logAudit(
      savedProject.project_id,
      tenantId,
      userId,
      'PROJECT_INITIALIZED',
      null,
      savedProject.contract_value,
      `Project "${savedProject.project_name}" initialized with contract value ${savedProject.contract_value}`
    );

    return savedProject;
  }

  async findAll(
    options: GetProjectsDto,
    tenantId: string,
  ): Promise<{
    projects: (ProjectEntity & {
      total_budgeted_rollup: number;
      total_paid_rollup: number;
      total_inflow_rollup: number;
    })[];
    total: number;
  }> {
    const { page = 1, limit = 10, project_name, status } = options;
    const skip = (page - 1) * limit;

    let queryBuilder = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.createdBy", "user")
      .leftJoinAndSelect("project.client", "client")
      .where("project.tenant_id = :tenantId", { tenantId });

    queryBuilder = this._addRollupSubqueries(queryBuilder);

    if (project_name) {
      queryBuilder.andWhere("project.project_name ILIKE :project_name", {
        project_name: `%${project_name}%`,
      });
    }
    if (status) {
      queryBuilder.andWhere("project.status = :status", { status });
    }

    // Group by all selected non-aggregate columns from ProjectEntity and joined entities
    queryBuilder.groupBy("project.project_id, user.id, client.id");

    const { entities, raw } = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("project.project_name", "ASC")
      .getRawAndEntities();

    const mappedProjects = entities.map((project, index) => {
      // Find the corresponding raw result by project_id
      const rawData = raw.find(r => r.project_project_id === project.project_id);
      return {
        ...project,
        total_budgeted_rollup: parseFloat(rawData?.total_budgeted_rollup || '0'),
        total_paid_rollup: parseFloat(rawData?.total_paid_rollup || '0'),
        total_inflow_rollup: parseFloat(rawData?.total_inflow_rollup || '0'),
      };
    });

    // For total count, we need a separate count query because getRawAndEntities count is tricky with skip/take
    const total = await queryBuilder.getCount();

    return {
      projects: mappedProjects as any,
      total,
    };
  }

  async findOne(project_id: string, tenantId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: { project_id, tenant_id: tenantId },
      relations: ['createdBy', 'client']
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }
    return project;
  }

  async findOneWithRollup(
    project_id: string,
    tenantId: string,
  ): Promise<
    ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number; total_inflow_rollup: number }
  > {
    let queryBuilder = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.createdBy", "user")
      .where("project.project_id = :project_id", { project_id })
      .andWhere("project.tenant_id = :tenantId", { tenantId });

    queryBuilder = this._addRollupSubqueries(queryBuilder);
    queryBuilder.leftJoinAndSelect("project.client", "client"); // Join Client relation
    queryBuilder.groupBy("project.project_id, user.id, client.id");

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    if (entities.length === 0) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }

    const project = entities[0];
    const rawData = raw[0];

    return {
      ...project,
      total_budgeted_rollup: parseFloat(rawData.total_budgeted_rollup || '0'),
      total_paid_rollup: parseFloat(rawData.total_paid_rollup || '0'),
      total_inflow_rollup: parseFloat(rawData.total_inflow_rollup || '0'),
    } as any;
  }

  async getCashFlowHeatmap(
    project_id: string,
    tenantId: string,
    year: number = new Date().getFullYear()
  ): Promise<{ month: number; inflow: number; outflow: number }[]> {
      const heatmap: { [key: number]: { inflow: number; outflow: number } } = {};
      
      // Initialize months 1-12
      for (let i = 1; i <= 12; i++) {
          heatmap[i] = { inflow: 0, outflow: 0 };
      }

      // 1. Get Inflows grouped by month
      const inflows = await this.inflowRepository.createQueryBuilder("inflow")
          .select("EXTRACT(MONTH FROM inflow.receipt_date)", "month")
          .addSelect("SUM(inflow.amount_received)", "total")
          .where("inflow.project_id = :project_id", { project_id })
          .andWhere("inflow.tenant_id = :tenantId", { tenantId })
          .andWhere("EXTRACT(YEAR FROM inflow.receipt_date) = :year", { year })
          .groupBy("month")
          .getRawMany();

      inflows.forEach(inf => {
          heatmap[parseInt(inf.month)] .inflow = parseFloat(inf.total);
      });

      // 2. Get Outflows (Live Expenses) grouped by month
      const outflows = await this.dataSource.getRepository(LiveExpenseEntity).createQueryBuilder("expense")
          .select("EXTRACT(MONTH FROM expense.expense_date)", "month")
          .addSelect("SUM(expense.actual_paid_amount)", "total")
          .innerJoin(WbsBudgetEntity, "wbs", "wbs.wbs_id = expense.wbs_id")
          .where("wbs.project_id = :project_id", { project_id })
          .andWhere("expense.tenant_id = :tenantId", { tenantId })
          .andWhere("EXTRACT(YEAR FROM expense.expense_date) = :year", { year })
          .groupBy("month")
          .getRawMany();

      outflows.forEach(out => {
          heatmap[parseInt(out.month)].outflow = parseFloat(out.total);
      });

      return Object.keys(heatmap).map(month => ({
          month: parseInt(month),
          inflow: heatmap[parseInt(month)].inflow,
          outflow: heatmap[parseInt(month)].outflow
      }));
  }

  async update(
    project_id: string,
    updateProjectDto: UpdateProjectDto,
    tenantId: string,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.findOne(project_id, tenantId);
    
    // Log Audit for Contract Value changes (Scope Creep tracking)
    if (updateProjectDto.contract_value !== undefined && Number(updateProjectDto.contract_value) !== Number(project.contract_value)) {
        await this.logAudit(
            project_id,
            tenantId,
            userId,
            'CONTRACT_VALUE_CHANGE',
            project.contract_value,
            updateProjectDto.contract_value,
            `Contract value adjusted from ${project.contract_value} to ${updateProjectDto.contract_value}`
        );
    }

    Object.assign(project, updateProjectDto);
    project.updated_at = new Date();
    return this.projectRepository.save(project);
  }

  async remove(project_id: string, tenantId: string, userId?: string): Promise<void> {
    const project = await this.findOne(project_id, tenantId);
    
    const result = await this.projectRepository.delete({
      project_id,
      tenant_id: tenantId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }

    if (userId) {
       // Log deletion (this will stay in the audit log even if project is gone, depending on FK constraints)
       // Actually, project_audit has a FK to project. If we delete project, audit might be deleted too
       // unless CASCADE is NOT set or it's handled differently.
       // For now, simple log.
       this.logger.log(`Project ${project_id} deleted by user ${userId}`);
    }
  }

  async exportProjectsToFormat(
    options: GetProjectsDto,
    format: "csv" | "pdf" | "xlsx" | "docx",
    tenantId: string,
  ): Promise<Buffer> {
    const projectsWithRollups = await this.findAll(
      { ...options, page: 1, limit: undefined },
      tenantId,
    );

    const emptyReportMessage = "No project data found for the given criteria.";

    if (projectsWithRollups.projects.length === 0) {
      if (format === "pdf") {
        return Buffer.from(
          await PdfUtility.generateProjectReport([], emptyReportMessage),
        );
      } else if (format === "xlsx") {
        return Buffer.from(
          await ExcelUtility.generateProjectReport([], emptyReportMessage),
        );
      } else if (format === "docx") {
        return Buffer.from(
          await WordUtility.generateProjectReport([], emptyReportMessage),
        );
      }
      return Buffer.from(emptyReportMessage, "utf-8");
    }

    if (format === "pdf") {
      const pdfUint8Array = await PdfUtility.generateProjectReport(
        projectsWithRollups.projects,
        "Project Portfolio Report",
      );
      return Buffer.from(pdfUint8Array);
    }
    if (format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateProjectReport(
          projectsWithRollups.projects,
          "Project Portfolio Report",
        ),
      );
    }
    if (format === "docx") {
      return Buffer.from(
        await WordUtility.generateProjectReport(
          projectsWithRollups.projects,
          "Project Portfolio Report",
        ),
      );
    }

    // CSV Export Logic
    const headers = [
      "Project ID",
      "Project Name",
      "RFQ Number",
      "Total Budgeted",
      "Total Spent",
      "Variance (%)",
      "Status",
      "Created By",
      "Created At",
    ].join(",");

    const rows = projectsWithRollups.projects.map((p) => {
      const variance =
        p.total_budgeted_rollup > 0
          ? ((p.total_paid_rollup - p.total_budgeted_rollup) /
              p.total_budgeted_rollup) *
            100
          : 0;
      return [
        `"${p.project_id}"`,
        `"${p.project_name.replace(/"/g, '""')}"`,
        `"${p.rfq_number ? p.rfq_number.replace(/"/g, '""') : ""}"`,
        p.total_budgeted_rollup,
        p.total_paid_rollup,
        `"${variance.toFixed(2)}%"`,
        p.status,
        `"${p.createdBy?.email || "N/A"}"`,
        p.created_at.toISOString(),
      ].join(",");
    });

    const csvString = [headers, ...rows].join("\n");
    return Buffer.from(csvString, "utf-8");
  }
}
