import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Repository, Like, Between, DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { CreateOperationalBudgetDto } from "./dto/create-operational-budget.dto";
import { UpdateOperationalBudgetDto } from "./dto/update-operational-budget.dto";
import { GetOperationalBudgetsDto } from "./dto/get-operational-budgets.dto";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import { OperationalExpenseEntity } from "./operational-expense.entity";
import { PayrollEntryEntity } from "./payroll-entry.entity";
import { BudgetCategoryEntity } from "./budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity, PeriodType } from "./operational-budget-period-allocation.entity";
import { BudgetControlService } from "../common/budget-control.service";
import { PdfUtility } from "../common/pdf.utility";
import { ExcelUtility } from "../common/excel.utility";
import { WordUtility } from "../common/word.utility";
import { Buffer } from "buffer";

@Injectable()
export class OperationalBudgetsService {
  private readonly logger = new Logger(OperationalBudgetsService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE) private dataSource: DataSource,
    @Inject("OPERATIONALBUDGET_REPOSITORY")
    private operationalBudgetRepository: Repository<OperationalBudgetEntity>,
    @Inject("PAYROLLENTRY_REPOSITORY")
    private payrollEntryRepository: Repository<PayrollEntryEntity>,
    @Inject("OPERATIONALEXPENSE_REPOSITORY")
    private operationalExpenseRepository: Repository<OperationalExpenseEntity>,
    @Inject("BUDGETCATEGORY_REPOSITORY")
    private budgetCategoryRepository: Repository<BudgetCategoryEntity>,
    @Inject("OPERATIONALBUDGETPERIODALLOCATION_REPOSITORY")
    private allocationRepository: Repository<OperationalBudgetPeriodAllocationEntity>,
    private readonly budgetControlService: BudgetControlService,
  ) {}

  async logExpense(
    expenseData: Partial<OperationalExpenseEntity>,
    userId: string,
    tenantId: string,
  ): Promise<OperationalExpenseEntity> {
    const expense = this.operationalExpenseRepository.create({
      ...expenseData,
      logged_by_user_id: userId,
      tenant_id: tenantId,
    });

    // Automatically deduct from associated operational budget category if specified
    if (expenseData.operational_budget_category_id) {
        // Find category to get the budget relationship
        const category = await this.dataSource.getRepository(OperationalBudgetCategoryEntity).findOne({
            where: { operational_budget_category_id: expenseData.operational_budget_category_id, tenant_id: tenantId },
            relations: ['operationalBudget']
        });

        if (category && category.operationalBudget) {
            // Validate budget constraint
            await this.budgetControlService.validateAndAlertOperationalExpense(
                category.operationalBudget,
                Number(expenseData.amount || 0)
            );

            // Update category actual spent
            category.actual_spent = Number(category.actual_spent) + Number(expenseData.amount || 0);
            await this.dataSource.getRepository(OperationalBudgetCategoryEntity).save(category);

            // Update parent budget actual spent
            const budget = category.operationalBudget;
            budget.actual_spent = Number(budget.actual_spent) + Number(expenseData.amount || 0);
            await this.operationalBudgetRepository.save(budget);
        }
    }

    return this.operationalExpenseRepository.save(expense);
  }

  async logPayrollEntry(
    payrollData: Partial<PayrollEntryEntity>,
    userId: string,
    tenantId: string,
  ): Promise<PayrollEntryEntity> {
    const entry = this.payrollEntryRepository.create({
      ...payrollData,
      processed_by_user_id: userId,
      tenant_id: tenantId,
    });

    // Automatically deduct from associated operational budget if specified
    if (payrollData.operational_budget_id) {
        const budget = await this.operationalBudgetRepository.findOne({
            where: { operational_budget_id: payrollData.operational_budget_id, tenant_id: tenantId }
        });
        if (budget) {
            // Validate budget constraint
            await this.budgetControlService.validateAndAlertOperationalExpense(
                budget,
                Number(payrollData.net_pay || 0)
            );

            budget.actual_spent = Number(budget.actual_spent) + Number(payrollData.net_pay || 0);
            await this.operationalBudgetRepository.save(budget);
        }
    }

    return this.payrollEntryRepository.save(entry);
  }

  async create(
    createOperationalBudgetDto: CreateOperationalBudgetDto,
    userId: string,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = this.operationalBudgetRepository.create({
      ...createOperationalBudgetDto,
      created_by_user_id: userId,
      tenant_id: tenantId, // Set tenantId
    });
    return this.operationalBudgetRepository.save(operationalBudget);
  }

  async findAll(
    options: GetOperationalBudgetsDto,
    tenantId: string,
  ): Promise<{ operationalBudgets: OperationalBudgetEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      name,
      type,
      status,
      startDate,
      endDate,
      created_by_user_id,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.operationalBudgetRepository
      .createQueryBuilder("operationalBudget")
      .where("operationalBudget.tenant_id = :tenantId", { tenantId });

    if (name) {
      queryBuilder.andWhere("operationalBudget.name ILIKE :name", {
        name: `%${name}%`,
      });
    }
    if (type) {
      queryBuilder.andWhere("operationalBudget.type = :type", { type });
    }
    if (status) {
      queryBuilder.andWhere("operationalBudget.status = :status", { status });
    }
    if (created_by_user_id) {
      queryBuilder.andWhere(
        "operationalBudget.created_by_user_id = :created_by_user_id",
        { created_by_user_id },
      );
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere(
          "operationalBudget.start_date BETWEEN :startDate AND :endDate",
          { startDate, endDate },
        );
      } else if (startDate) {
        queryBuilder.andWhere("operationalBudget.start_date >= :startDate", {
          startDate,
        });
      } else if (endDate) {
        queryBuilder.andWhere("operationalBudget.end_date <= :endDate", {
          endDate,
        });
      }
    }

    const [operationalBudgets, total] = await queryBuilder
      .leftJoinAndSelect("operationalBudget.createdBy", "user") // Join createdBy user
      .skip(skip)
      .take(limit)
      .orderBy("operationalBudget.name", "ASC")
      .getManyAndCount();

    return { operationalBudgets, total };
  }

  async findOne(
    operational_budget_id: string,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = await this.operationalBudgetRepository.findOne({
      where: { operational_budget_id, tenant_id: tenantId },
      relations: ["createdBy"], // Include createdBy user
    });
    if (!operationalBudget) {
      throw new NotFoundException(
        `Operational Budget with ID "${operational_budget_id}" not found.`,
      );
    }
    return operationalBudget;
  }

  async update(
    operational_budget_id: string,
    updateOperationalBudgetDto: UpdateOperationalBudgetDto,
    tenantId: string,
  ): Promise<OperationalBudgetEntity> {
    const operationalBudget = await this.findOne(
      operational_budget_id,
      tenantId,
    );
    Object.assign(operationalBudget, updateOperationalBudgetDto);
    operationalBudget.updated_at = new Date();
    return this.operationalBudgetRepository.save(operationalBudget);
  }

  async remove(operational_budget_id: string, tenantId: string): Promise<void> {
    const result = await this.operationalBudgetRepository.delete({
      operational_budget_id,
      tenant_id: tenantId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Operational Budget with ID "${operational_budget_id}" not found.`,
      );
    }
  }

  async exportOperationalBudgetsToFormat(
    options: GetOperationalBudgetsDto,
    format: "csv" | "pdf" | "xlsx" | "docx",
    tenantId: string,
  ): Promise<Buffer> {
    const { name, type, status, startDate, endDate, created_by_user_id } =
      options;

    const queryBuilder = this.operationalBudgetRepository
      .createQueryBuilder("operationalBudget")
      .where("operationalBudget.tenant_id = :tenantId", { tenantId });

    if (name) {
      queryBuilder.andWhere("operationalBudget.name ILIKE :name", {
        name: `%${name}%`,
      });
    }
    if (type) {
      queryBuilder.andWhere("operationalBudget.type = :type", { type });
    }
    if (status) {
      queryBuilder.andWhere("operationalBudget.status = :status", { status });
    }
    if (created_by_user_id) {
      queryBuilder.andWhere(
        "operationalBudget.created_by_user_id = :created_by_user_id",
        { created_by_user_id },
      );
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere(
          "operationalBudget.start_date BETWEEN :startDate AND :endDate",
          { startDate, endDate },
        );
      } else if (startDate) {
        queryBuilder.andWhere("operationalBudget.start_date >= :startDate", {
          startDate,
        });
      } else if (endDate) {
        queryBuilder.andWhere("operationalBudget.end_date <= :endDate", {
          endDate,
        });
      }
    }

    const operationalBudgets = await queryBuilder
      .leftJoinAndSelect("operationalBudget.createdBy", "user") // Join createdBy user for export
      .orderBy("operationalBudget.name", "ASC")
      .getMany();

    const emptyReportMessage =
      "No operational budget data found for the given criteria.";

    if (operationalBudgets.length === 0) {
      if (format === "pdf") {
        return Buffer.from(
          await PdfUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      } else if (format === "xlsx") {
        return Buffer.from(
          await ExcelUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      } else if (format === "docx") {
        return Buffer.from(
          await WordUtility.generateOperationalBudgetReport(
            [],
            emptyReportMessage,
          ),
        );
      }
      return Buffer.from(emptyReportMessage, "utf-8");
    }

    if (format === "pdf") {
      const pdfUint8Array = await PdfUtility.generateOperationalBudgetReport(
        operationalBudgets,
        "Operational Budget Report",
      );
      return Buffer.from(pdfUint8Array);
    } else if (format === "xlsx") {
      return Buffer.from(
        await ExcelUtility.generateOperationalBudgetReport(
          operationalBudgets,
          "Operational Budget Report",
        ),
      );
    } else if (format === "docx") {
      return Buffer.from(
        await WordUtility.generateOperationalBudgetReport(
          operationalBudgets,
          "Operational Budget Report",
        ),
      );
    }

    // CSV Export Logic
    const headers = [
      "ID",
      "Name",
      "Description",
      "Type",
      "Budgeted Amount",
      "Actual Spent",
      "Start Date",
      "End Date",
      "Status",
      "Created By", // Changed from User ID to User Name/Email
      "Created At",
      "Updated At",
    ].join(",");

    const rows = operationalBudgets.map((budget) => {
      return [
        `"${budget.operational_budget_id}"`,
        `"${budget.name.replace(/"/g, '""')}"`,
        `"${budget.description ? budget.description.replace(/"/g, '""') : ""}"`,
        budget.type,
        budget.budgeted_amount,
        budget.actual_spent,
        budget.start_date.toISOString().split("T")[0],
        budget.end_date.toISOString().split("T")[0],
        budget.status,
        `"${budget.createdBy?.email || budget.created_by_user_id}"`, // Use user email if available
        budget.created_at.toISOString(),
        budget.updated_at ? budget.updated_at.toISOString() : "",
      ].join(",");
    });

    const csvString = [headers, ...rows].join("\n");
    return Buffer.from(csvString, "utf-8");
  }

  // --- Category Management ---

  async getAvailableCategories(tenantId: string): Promise<BudgetCategoryEntity[]> {
    // Fetch system defaults (tenant_id is null) AND tenant specific categories
    return this.budgetCategoryRepository.find({
      where: [
        { is_system_default: true, is_active: true },
        { tenant_id: tenantId, is_active: true },
      ],
      order: { name: "ASC" },
    });
  }

  async createCustomCategory(
    name: string,
    type: string, // Cast to enum in implementation if needed
    tenantId: string,
    description?: string
  ): Promise<BudgetCategoryEntity> {
    const category = this.budgetCategoryRepository.create({
      name,
      type: type as any,
      tenant_id: tenantId,
      description,
      is_system_default: false,
    });
    return this.budgetCategoryRepository.save(category);
  }

  // --- Grid & Allocation Management ---

  async getBudgetGrid(
    operational_budget_id: string,
    tenantId: string
  ): Promise<OperationalBudgetCategoryEntity[]> {
    // Fetch budget categories with their allocations
    return this.dataSource.getRepository(OperationalBudgetCategoryEntity).find({
      where: { operational_budget_id, tenant_id: tenantId },
      relations: ["allocations"],
      order: { name: "ASC" },
    });
  }

  async upsertAllocation(
    operational_budget_category_id: string,
    period_date: string, // YYYY-MM-DD
    amount: number,
    period_type: PeriodType,
    tenantId: string
  ): Promise<OperationalBudgetPeriodAllocationEntity> {
    // Verify ownership via category
    const category = await this.dataSource.getRepository(OperationalBudgetCategoryEntity).findOne({
      where: { operational_budget_category_id, tenant_id: tenantId },
    });

    if (!category) {
      throw new NotFoundException("Budget Category not found or access denied.");
    }

    const date = new Date(period_date);
    
    let allocation = await this.allocationRepository.findOne({
      where: {
        operational_budget_category_id,
        period_date: date, // TypeORM handles date string/object comparison well usually
      },
    });

    if (allocation) {
      allocation.planned_amount = amount;
      // We might update period_type here if it changes, but usually it's fixed for the view
      allocation.period_type = period_type; 
    } else {
      allocation = this.allocationRepository.create({
        operational_budget_category_id,
        period_date: date,
        planned_amount: amount,
        period_type,
      });
    }

    const saved = await this.allocationRepository.save(allocation);
    
    // Recalculate Total Budgeted for the Category
    await this.recalculateCategoryTotal(operational_budget_category_id);
    
    return saved;
  }

  private async recalculateCategoryTotal(categoryId: string) {
    const { sum } = await this.allocationRepository
      .createQueryBuilder("allocation")
      .select("SUM(allocation.planned_amount)", "sum")
      .where("allocation.operational_budget_category_id = :categoryId", { categoryId })
      .getRawOne();
      
    await this.dataSource.getRepository(OperationalBudgetCategoryEntity).update(
      categoryId, 
      { budgeted_amount: sum || 0 }
    );
     
    // We should also roll up to the Parent Budget, but ensuring consistency in a distributed update requires locking or careful steps.
    // For now, we update the category. The Parent Budget update can be triggered or handled separately.
  }

  /**
   * ADVANCED: Operational Payroll Bot
   * Batch generates payroll entries based on a provided template mapping.
   */
  async runPayrollBot(
    payrollTemplate: { employee_name: string; base_salary: number; operational_budget_id: string; employee_id?: string }[],
    userId: string,
    tenantId: string,
  ): Promise<PayrollEntryEntity[]> {
      const results: PayrollEntryEntity[] = [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      this.logger.log(`Running Payroll Bot for ${payrollTemplate.length} employees on tenant ${tenantId}`);

      for (const item of payrollTemplate) {
          // Calculate simple net pay (ignoring tax/pension for bot simplicity unless specified)
          const entry = await this.logPayrollEntry({
              ...item,
              pay_period_start: startOfMonth,
              pay_period_end: endOfMonth,
              payment_date: now,
              net_pay: Number(item.base_salary),
              status: 'PAID'
          }, userId, tenantId);
          results.push(entry);
      }
      return results;
  }
}
