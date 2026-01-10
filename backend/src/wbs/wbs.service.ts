import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, DataSource } from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { UpdateWbsBudgetDto } from "./dto/update-wbs-budget.dto";
import { LiveExpenseEntity } from "./live-expense.entity";
import { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { UpdateLiveExpenseDto } from "./dto/update-live-expense.dto";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { Inject } from '@nestjs/common';
import { GetWbsBudgetsDto } from './dto/get-wbs-budgets.dto';
import { GetLiveExpensesDto } from './dto/get-live-expenses.dto';
import { WbsBudgetRollupDto } from './dto/wbs-budget-rollup.dto';
import { GetProjectsDto } from '../projects/dto/get-projects.dto';
import { ProjectEntity } from '../projects/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { UserEntity } from '../auth/user.entity'; // NEW: Import UserEntity
import { WbsBudgetStatus } from "@shared/types/wbs-budget-status.enum"; // Import WbsBudgetStatus enum
import { Buffer } from "buffer"; // Needed for export methods

@Injectable()
export class WbsService {
  private readonly logger = new Logger(WbsService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
    @Inject('WBSBUDGET_REPOSITORY')
    private wbsBudgetRepository: Repository<WbsBudgetEntity>,
    @Inject('WBSCATEGORY_REPOSITORY')
    private wbsCategoryRepository: Repository<WbsCategoryEntity>,
    @Inject('LIVEEXPENSE_REPOSITORY')
    private liveExpenseRepository: Repository<LiveExpenseEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  // WBS Budget (Draft) Operations
  async createWbsBudgetDraft(
    createWbsDto: CreateWbsBudgetDto,
    userId: string,
    tenant_id: string
  ): Promise<WbsBudgetEntity> {
    const { parent_wbs_id, wbs_code, description, unit_cost_budgeted, days_budgeted, total_cost_budgeted, category_id, project_id } = createWbsDto;

    // Validate project_id and category_id
    if (project_id) {
      const project = await this.dataSource
        .getRepository(ProjectEntity)
        .findOne({ where: { project_id: project_id, tenant_id: tenant_id } });
      if (!project) {
        throw new NotFoundException(`Project with ID ${project_id} not found in tenant ${tenant_id}`);
      }
    }

    if (category_id) {
      const category = await this.dataSource
        .getRepository(WbsCategoryEntity)
        .findOne({ where: { id: category_id, tenant_id: tenant_id } });
      if (!category) {
        throw new NotFoundException(`Category with ID ${category_id} not found in tenant ${tenant_id}`);
      }
    }


    const wbsBudget = new WbsBudgetEntity();
    wbsBudget.project_id = project_id;
    wbsBudget.parent_wbs_id = parent_wbs_id ?? null; // Added ?? null
    wbsBudget.wbs_code = wbs_code;
    wbsBudget.description = description;
    wbsBudget.unit_cost_budgeted = unit_cost_budgeted;
    wbsBudget.days_budgeted = days_budgeted;
    wbsBudget.total_cost_budgeted = total_cost_budgeted;
    wbsBudget.category_id = category_id ?? null; // Added ?? null
    wbsBudget.status = WbsBudgetStatus.DRAFT;
    wbsBudget.user = { id: userId } as UserEntity; // Assign UserEntity via relation
    wbsBudget.tenant_id = tenant_id;

    return this.wbsBudgetRepository.save(wbsBudget);
  }

  async createWbsBudgetDraftBatch(
    createWbsDtos: CreateWbsBudgetDto[],
    userId: string,
    tenant_id: string
  ): Promise<WbsBudgetEntity[]> {
    if (!Array.isArray(createWbsDtos)) {
      throw new BadRequestException('Input must be an array of WBS budget DTOs.');
    }

    const wbsBudgets = createWbsDtos.map(dto => {
      // Basic validation for each DTO in the batch
      if (!dto.wbs_code || !dto.description) {
        throw new BadRequestException('Each WBS budget item must have a wbs_code and description.');
      }
      const newWbsBudget = new WbsBudgetEntity();
      newWbsBudget.project_id = dto.project_id;
      newWbsBudget.parent_wbs_id = dto.parent_wbs_id ?? null; // Added ?? null
      newWbsBudget.wbs_code = dto.wbs_code;
      newWbsBudget.description = dto.description;
      newWbsBudget.unit_cost_budgeted = dto.unit_cost_budgeted;
      newWbsBudget.days_budgeted = dto.days_budgeted;
      newWbsBudget.total_cost_budgeted = dto.total_cost_budgeted;
      newWbsBudget.category_id = dto.category_id ?? null; // Added ?? null
      newWbsBudget.status = WbsBudgetStatus.DRAFT;
      newWbsBudget.user = { id: userId } as UserEntity; // Assign UserEntity via relation
      newWbsBudget.tenant_id = tenant_id;
      return newWbsBudget;
    });

    const savedWbsBudgets = await this.wbsBudgetRepository.save(wbsBudgets);
    return savedWbsBudgets;
  }

  async updateWbsBudget(
    id: string,
    updateWbsBudgetDto: UpdateWbsBudgetDto,
    tenant_id: string
  ): Promise<WbsBudgetEntity> {
    const wbsBudget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsBudget) {
      throw new NotFoundException(
        `WBS Budget with ID ${id} not found for tenant ${tenant_id}`
      );
    }

    this.wbsBudgetRepository.merge(wbsBudget, updateWbsBudgetDto);
    return this.wbsBudgetRepository.save(wbsBudget);
  }

  async deleteWbsItem(
    id: string, // Keep 'id' as parameter name for controller consistency
    tenant_id: string,
    options: { recursive: boolean } = { recursive: false }
  ): Promise<void> {
    const wbsItem = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsItem) {
      throw new NotFoundException(
        `WBS item with ID ${id} not found for tenant ${tenant_id}`
      );
    }

    if (options.recursive) {
      // Find all children recursively
      const children = await this.findAllChildren(id, tenant_id);
      const childIds = children.map((child) => child.wbs_id); // Changed child.id to child.wbs_id
      if (childIds.length > 0) {
        await this.wbsBudgetRepository.delete({ wbs_id: In(childIds), tenant_id: tenant_id }); // Changed id to wbs_id
      }
    }

    await this.wbsBudgetRepository.delete({ wbs_id: id, tenant_id: tenant_id }); // Changed id to wbs_id
  }

  private async findAllChildren(
    parentId: string,
    tenant_id: string
  ): Promise<WbsBudgetEntity[]> {
    const children: WbsBudgetEntity[] = [];
    const directChildren = await this.wbsBudgetRepository.find({
      where: { parent_wbs_id: parentId, tenant_id: tenant_id },
    });

    for (const child of directChildren) {
      children.push(child);
      const grandChildren = await this.findAllChildren(child.wbs_id, tenant_id); // Changed child.id to child.wbs_id
      children.push(...grandChildren);
    }
    return children;
  }

  // Live Expense Operations
  async logLiveExpenseEntry(
    expenseDto: CreateLiveExpenseDto,
    userId: string,
    tenant_id: string
  ): Promise<LiveExpenseEntity> {
    const { wbs_id, amount, description, project_id } = expenseDto;

    // Validate wbs_id
    if (wbs_id) {
      const wbsItem = await this.wbsBudgetRepository.findOne({
        where: { wbs_id: wbs_id, tenant_id: tenant_id }, // Changed id to wbs_id
      });
      if (!wbsItem) {
        throw new NotFoundException(`WBS item with ID ${wbs_id} not found for tenant ${tenant_id}`);
      }
    }

    // Validate project_id
    if (project_id) {
      const project = await this.dataSource
        .getRepository(ProjectEntity)
        .findOne({ where: { project_id: project_id, tenant_id: tenant_id } }); // Changed id to project_id
      if (!project) {
        throw new NotFoundException(`Project with ID ${project_id} not found in tenant ${tenant_id}`);
      }
    }

    const liveExpense = this.liveExpenseRepository.create({
      ...expenseDto,
      user_id: userId,
      tenant_id: tenant_id,
    });
    return this.liveExpenseRepository.save(liveExpense);
  }

  async updateLiveExpenseEntry(
    id: string,
    updateLiveExpenseDto: UpdateLiveExpenseDto,
    tenant_id: string
  ): Promise<LiveExpenseEntity> {
    const liveExpense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });

    if (!liveExpense) {
      throw new NotFoundException(
        `Live Expense with ID ${id} not found for tenant ${tenant_id}`
      );
    }

    Object.assign(liveExpense, updateLiveExpenseDto);
    return this.liveExpenseRepository.save(liveExpense);
  }

  async deleteLiveExpenseEntry(id: string, tenant_id: string): Promise<void> {
    const liveExpense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });

    if (!liveExpense) {
      throw new NotFoundException(
        `Live Expense with ID ${id} not found for tenant ${tenant_id}`
      );
    }

    await this.liveExpenseRepository.delete({ id, tenant_id: tenant_id });
  }

  // WBS Category Operations
  async createWbsCategory(
    name: string,
    tenant_id: string
  ): Promise<WbsCategoryEntity> {
    const existingCategory = await this.wbsCategoryRepository.findOne({
      where: { name, tenant_id: tenant_id },
    });
    if (existingCategory) {
      throw new ConflictException(
        `WBS Category with name "${name}" already exists for tenant ${tenant_id}`
      );
    }
    const category = this.wbsCategoryRepository.create({ name, tenant_id: tenant_id });
    return this.wbsCategoryRepository.save(category);
  }

  async findAllWbsCategories(tenant_id: string): Promise<WbsCategoryEntity[]> {
    return this.wbsCategoryRepository.find({ where: { tenant_id: tenant_id } });
  }

  async updateWbsCategory(
    id: string,
    name: string,
    tenant_id: string
  ): Promise<WbsCategoryEntity> {
    const category = await this.wbsCategoryRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });
    if (!category) {
      throw new NotFoundException(
        `WBS Category with ID ${id} not found for tenant ${tenant_id}`
      );
    }
    const existingCategoryWithName = await this.wbsCategoryRepository.findOne({
      where: { name, tenant_id: tenant_id },
    });
    if (existingCategoryWithName && existingCategoryWithName.id !== id) {
      throw new ConflictException(
        `WBS Category with name "${name}" already exists for tenant ${tenant_id}`
      );
    }

    category.name = name;
    return this.wbsCategoryRepository.save(category);
  }

  async deleteWbsCategory(id: string, tenant_id: string): Promise<void> {
    const category = await this.wbsCategoryRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });
    if (!category) {
      throw new NotFoundException(
        `WBS Category with ID ${id} not found for tenant ${tenant_id}`
      );
    }
    await this.wbsCategoryRepository.delete({ id, tenant_id: tenant_id });
  }


  // Enhanced WBS Budget Retrieval with Filters and Pagination
  async findAllWbsBudgets(
    getWbsBudgetsDto: GetWbsBudgetsDto,
    tenant_id: string
  ): Promise<{ data: WbsBudgetEntity[]; total: number }> {
    const {
      wbsCode,
      description,
      status,
      categoryId,
      projectId,
      userId,
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
      // Removed parentWbsId,
    } = getWbsBudgetsDto;

    const queryBuilder = this.wbsBudgetRepository
      .createQueryBuilder("wbsBudget")
      .where("wbsBudget.tenant_id = :tenant_id", { tenant_id });

    if (wbsCode) {
      queryBuilder.andWhere("wbsBudget.wbs_code ILIKE :wbsCode", {
        wbsCode: `%${wbsCode}%`,
      });
    }
    if (description) {
      queryBuilder.andWhere("wbsBudget.description ILIKE :description", {
        description: `%${description}%`,
      });
    }
    if (status) {
      queryBuilder.andWhere("wbsBudget.status = :status", { status });
    }
    if (categoryId) {
      queryBuilder.andWhere("wbsBudget.category_id = :categoryId", { categoryId });
    }
    if (projectId) {
      queryBuilder.andWhere("wbsBudget.project_id = :projectId", { projectId });
    }
    if (userId) {
      queryBuilder.andWhere("wbsBudget.user_id = :userId", { userId });
    }
    // Removed parentWbsId logic
    // if (parentWbsId === null) {
    //   // Explicitly search for root-level WBS items (where parent_wbs_id is NULL)
    //   queryBuilder.andWhere("wbsBudget.parent_wbs_id IS NULL");
    // } else if (parentWbsId) {
    //   // Search for children of a specific parent
    //   queryBuilder.andWhere("wbsBudget.parent_wbs_id = :parentWbsId", { parentWbsId });
    // }


    queryBuilder.orderBy(`wbsBudget.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  // Enhanced Live Expense Retrieval with Filters and Pagination
  async findAllLiveExpenses(
    getLiveExpensesDto: GetLiveExpensesDto,
    tenant_id: string
  ): Promise<{ data: LiveExpenseEntity[]; total: number }> {
    const {
      wbsId,
      projectId,
      description,
      minAmount,
      maxAmount,
      userId,
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = getLiveExpensesDto;

    const queryBuilder = this.liveExpenseRepository
      .createQueryBuilder("liveExpense")
      .where("liveExpense.tenant_id = :tenant_id", { tenant_id });

    if (wbsId) {
      queryBuilder.andWhere("liveExpense.wbs_id = :wbsId", { wbsId });
    }
    if (projectId) {
      queryBuilder.andWhere("liveExpense.project_id = :projectId", { projectId });
    }
    if (description) {
      queryBuilder.andWhere("liveExpense.description ILIKE :description", {
        description: `%${description}%`,
      });
    }
    if (minAmount) {
      queryBuilder.andWhere("liveExpense.amount >= :minAmount", { minAmount });
    }
    if (maxAmount) {
      queryBuilder.andWhere("liveExpense.amount <= :maxAmount", { maxAmount });
    }
    if (userId) {
      queryBuilder.andWhere("liveExpense.user_id = :userId", { userId });
    }

    queryBuilder.orderBy(`liveExpense.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }


  // WBS Budget Rollup (placeholder for now)
  async getWbsBudgetRollup(
    projectId: string,
    tenant_id: string
  ): Promise<WbsBudgetRollupDto[]> {
    // This is a complex aggregation. For now, we'll return a simplified structure.
    // A full implementation would involve recursive queries or CTEs to sum up
    // budgeted and actual costs across WBS hierarchies.
    this.logger.warn(
      `WBS Budget Rollup for project ${projectId} in tenant ${tenant_id} is a placeholder implementation.`
    );
    // Dummy data for demonstration
    return [
      {
        wbs_id: "root",
        wbs_code: "P1",
        description: "Project 1 Total",
        total_cost_budgeted: 100000,
        total_paid_rollup: 75000,
        parent_wbs_id: null,
        total_paid_self: 75000,
        total_committed_lpo: 0,
      },
    ];
  }


  async exportWbsBudgetsToCsv(
    getWbsBudgetsDto: GetWbsBudgetsDto,
    tenant_id: string
  ): Promise<Buffer> {
    const { data: wbsBudgets } = await this.findAllWbsBudgets(
      getWbsBudgetsDto,
      tenant_id
    );

    if (wbsBudgets.length === 0) {
      throw new NotFoundException("No WBS budgets found to export.");
    }

    const headers = [
      "ID",
      "WBS Code",
      "Description",
      "Unit Cost Budgeted",
      "Days Budgeted",
      "Total Cost Budgeted",
      "Status",
      "Category",
      "Project",
      "Created At",
      "Updated At",
    ];

    const csvRows = [
      headers.join(","),
      ...wbsBudgets.map((budget) =>
        [
          `"${budget.wbs_id}"`, // Changed id to wbs_id
          `"${budget.wbs_code}"`,
          `"${budget.description.replace(/"/g, '""')}"`,
          budget.unit_cost_budgeted,
          budget.days_budgeted,
          budget.total_cost_budgeted,
          budget.status,
          `"${budget.category?.name || "N/A"}"`,
          `"${budget.project?.project_name || "N/A"}"`, // Changed project?.name to project?.project_name
          budget.created_at.toISOString(),
          budget.updated_at?.toISOString() || "", // Added null check
        ].join(",")
      ),
    ];

    return Buffer.from(csvRows.join("\n"), "utf8");
  }

  async exportLiveExpensesToCsv(
    getLiveExpensesDto: GetLiveExpensesDto,
    tenant_id: string
  ): Promise<Buffer> {
    const { data: liveExpenses } = await this.findAllLiveExpenses(
      getLiveExpensesDto,
      tenant_id
    );

    if (liveExpenses.length === 0) {
      throw new NotFoundException("No live expenses found to export.");
    }

    const headers = [
      "ID",
      "WBS ID",
      "Project ID",
      "Description",
      "Amount",
      "User ID",
      "Created At",
      "Updated At",
    ];

    const csvRows = [
      headers.join(","),
      ...liveExpenses.map((expense) =>
        [
          `"${expense.id}"`,
          `"${expense.wbs_id || "N/A"}"`,
          `"${expense.project_id || "N/A"}"`,
          `"${expense.description.replace(/"/g, '""')}"`,
          expense.amount,
          `"${expense.user_id}"`,
          expense.created_at.toISOString(),
          expense.updated_at?.toISOString() || "", // Added null check
        ].join(",")
      ),
    ];

    return Buffer.from(csvRows.join("\n"), "utf8");
  }

    // New methods from the senior dev report:
    async getWbsBudgetProgress(wbs_id: string, tenant_id: string): Promise<any> { // Changed wbsId to wbs_id
      this.logger.debug(`Fetching WBS Budget Progress for ${wbs_id} in tenant ${tenant_id}`);
      // Implement logic to calculate progress, e.g., based on actual expenses vs. budgeted amounts
      // For now, return dummy data
      return {
        wbs_id, // Changed wbsId to wbs_id
        progressPercentage: Math.floor(Math.random() * 100),
        status: 'on-track',
        lastUpdated: new Date().toISOString(),
      };
    }

    async getWbsBudgetStatusReport(projectId: string, tenant_id: string): Promise<any> {
      this.logger.debug(`Generating WBS Budget Status Report for project ${projectId} in tenant ${tenant_id}`);
      // Implement logic to generate a detailed status report for the project's WBS
      // This might involve aggregating data from findAllWbsBudgets and findAllLiveExpenses
      return {
        projectId,
        reportDate: new Date().toISOString(),
        totalBudget: 150000,
        totalSpent: 80000,
        remainingBudget: 70000,
        overallStatus: 'green',
        issues: [],
      };
    }
}