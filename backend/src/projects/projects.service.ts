import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Repository, SelectQueryBuilder, DataSource } from "typeorm";
import { ProjectEntity } from "./project.entity";
import { CreateProjectDto } from "./dto/create-project.dto";
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
    @Inject('PROJECT_REPOSITORY')
    private projectRepository: Repository<ProjectEntity>,
    @Inject('WBSBUDGET_REPOSITORY')
    private wbsBudgetRepository: Repository<WbsBudgetEntity>,
    @Inject('LIVEEXPENSE_REPOSITORY')
    private liveExpenseRepository: Repository<LiveExpenseEntity>,
  ) {}

  private _addRollupSubqueries(queryBuilder: SelectQueryBuilder<ProjectEntity>): SelectQueryBuilder<ProjectEntity> {
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
          .innerJoin(WbsBudgetEntity, "wbs_for_expense", "wbs_for_expense.wbs_id = expense.wbs_id")
          .where("wbs_for_expense.project_id = project.project_id");
      }, "total_paid_rollup");
  }

  async create(createProjectDto: CreateProjectDto, userId: string, tenantId: string): Promise<ProjectEntity> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      created_by_user_id: userId,
      tenant_id: tenantId, // Ensure tenant_id is set on creation
    });
    return this.projectRepository.save(project);
  }

  async findAll(options: GetProjectsDto, tenantId: string): Promise<{ projects: (ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number })[]; total: number }> {
    const { page = 1, limit = 10, project_name, status } = options;
    const skip = (page - 1) * limit;

    let queryBuilder = this.projectRepository.createQueryBuilder("project")
      .leftJoinAndSelect("project.createdBy", "user")
      .where("project.tenant_id = :tenantId", { tenantId });

    queryBuilder = this._addRollupSubqueries(queryBuilder);

    if (project_name) {
      queryBuilder.andWhere("project.project_name ILIKE :project_name", { project_name: `%${project_name}%` });
    }
    if (status) {
      queryBuilder.andWhere("project.status = :status", { status });
    }

    // Group by all selected non-aggregate columns from ProjectEntity and joined UserEntity
    queryBuilder.groupBy("project.project_id, user.id");

    const [projects, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("project.project_name", "ASC")
      .getManyAndCount();

    return { projects: projects as (ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number })[], total };
  }

  async findOne(project_id: string, tenantId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({ where: { project_id, tenant_id: tenantId } });
    if (!project) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }
    return project;
  }

  async findOneWithRollup(project_id: string, tenantId: string): Promise<ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number }> {
    let queryBuilder = this.projectRepository.createQueryBuilder("project")
      .leftJoinAndSelect("project.createdBy", "user")
      .where("project.project_id = :project_id", { project_id })
      .andWhere("project.tenant_id = :tenantId", { tenantId });

    queryBuilder = this._addRollupSubqueries(queryBuilder);
    
    queryBuilder.groupBy("project.project_id, user.id");

    const projectWithRollup = await queryBuilder.getOne();

    if (!projectWithRollup) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }

    return projectWithRollup as ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number };
  }

  async update(project_id: string, updateProjectDto: UpdateProjectDto, tenantId: string): Promise<ProjectEntity> {
    const project = await this.findOne(project_id, tenantId);
    Object.assign(project, updateProjectDto);
    project.updated_at = new Date();
    return this.projectRepository.save(project);
  }

  async remove(project_id: string, tenantId: string): Promise<void> {
    const result = await this.projectRepository.delete({ project_id, tenant_id: tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID "${project_id}" not found.`);
    }
  }

  async exportProjectsToFormat(options: GetProjectsDto, format: "csv" | "pdf" | "xlsx" | "docx", tenantId: string): Promise<Buffer> {
    const projectsWithRollups = await this.findAll({ ...options, page: 1, limit: undefined }, tenantId);

    const emptyReportMessage = "No project data found for the given criteria.";

    if (projectsWithRollups.projects.length === 0) {
        if (format === 'pdf') {
            return Buffer.from(await PdfUtility.generateProjectReport([], emptyReportMessage));
        } else if (format === 'xlsx') {
            return Buffer.from(await ExcelUtility.generateProjectReport([], emptyReportMessage));
        } else if (format === 'docx') {
            return Buffer.from(await WordUtility.generateProjectReport([], emptyReportMessage));
        }
        return Buffer.from(emptyReportMessage, 'utf-8');
    }

    if (format === "pdf") {
        const pdfUint8Array = await PdfUtility.generateProjectReport(projectsWithRollups.projects, "Project Portfolio Report");
        return Buffer.from(pdfUint8Array);
    } 
    if (format === "xlsx") {
        return Buffer.from(await ExcelUtility.generateProjectReport(projectsWithRollups.projects, "Project Portfolio Report"));
    }
    if (format === "docx") {
        return Buffer.from(await WordUtility.generateProjectReport(projectsWithRollups.projects, "Project Portfolio Report"));
    }
  
    // CSV Export Logic
    const headers = [
      "Project ID", "Project Name", "RFQ Number", "Total Budgeted", "Total Spent", "Variance (%)",
      "Status", "Created By", "Created At"
    ].join(",");
  
    const rows = projectsWithRollups.projects.map(p => {
      const variance = p.total_budgeted_rollup > 0 ? ((p.total_paid_rollup - p.total_budgeted_rollup) / p.total_budgeted_rollup) * 100 : 0;
      return [
        `"${p.project_id}"`,
        `"${p.project_name.replace(/"/g, '""')}"`,
        `"${p.rfq_number ? p.rfq_number.replace(/"/g, '""') : ''}"`,
        p.total_budgeted_rollup,
        p.total_paid_rollup,
        `"${variance.toFixed(2)}%"`,
        p.status,
        `"${p.createdBy?.email || 'N/A'}"`,
        p.created_at.toISOString()
      ].join(",");
    });
  
    const csvString = [headers, ...rows].join("\n");
    return Buffer.from(csvString, 'utf-8');
  }
}