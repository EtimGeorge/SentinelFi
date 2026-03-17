import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import * as ExcelJS from 'exceljs';
import { ClsService } from "nestjs-cls";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  SelectQueryBuilder,
  DataSource,
  In,
  IsNull,
} from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { UpdateWbsBudgetDto } from "./dto/update-wbs-budget.dto";
import { LiveExpenseEntity } from "./live-expense.entity";
import type { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { UpdateLiveExpenseDto } from "./dto/update-live-expense.dto";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { Inject } from "@nestjs/common";
import { GetWbsBudgetsDto } from "./dto/get-wbs-budgets.dto";
import { GetLiveExpensesDto } from "./dto/get-live-expenses.dto";
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";
import { CreateWbsCategoryDto } from "./dto/create-wbs-category.dto";
import { WbsTemplateEntity } from "./wbs-template.entity";
import { IndustryType, UserPayload, WbsBudgetStatus, VarianceFlag, ApprovalStatus } from "@shared/types";
import { CreateWbsTemplateDto } from "./dto/create-wbs-template.dto";
import { ApplyWbsTemplateDto } from "./dto/apply-wbs-template.dto";
import { GetProjectsDto } from "../projects/dto/get-projects.dto";
import { ProjectEntity } from "../projects/project.entity";
import { ProjectsService } from "../projects/projects.service";
import { UserEntity } from "../auth/user.entity"; // NEW: Import UserEntity
import { Buffer } from "buffer"; // Needed for export methods
import { NotificationsService } from "../notifications/notifications.service"; // NEW: Import NotificationsService
import { BudgetControlService } from "../common/budget-control.service";
import { DOAService } from "../common/doa.service";
import { ApprovalLogEntity, ApprovalDocumentType } from "../common/entities/approval-log.entity";
import { AuditService } from "../audit/audit.service";
import { BudgetImpactAnalysisDto } from "./dto/budget-impact-analysis.dto";
import { WbsValidationResultDto } from "./dto/wbs-validation-result.dto";

interface WbsBudgetRollupQueryResult {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
  total_paid_rollup: number;
  total_paid_self: number;
  total_committed_lpo: number;
  status: string;
  category_id: string | null;
  project_id: string;
  sort_order: number;
  uom: string | null;
  custom_metadata: Record<string, any> | null;
}

@Injectable()
export class WbsService {
  private readonly logger = new Logger(WbsService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private dataSource: DataSource,
    @Inject("WBSBUDGET_REPOSITORY")
    private wbsBudgetRepository: Repository<WbsBudgetEntity>,
    @Inject("WBSCATEGORY_REPOSITORY")
    private wbsCategoryRepository: Repository<WbsCategoryEntity>,
    @Inject("WBSTEMPLATE_REPOSITORY")
    private wbsTemplateRepository: Repository<WbsTemplateEntity>,
    @Inject("LIVEEXPENSE_REPOSITORY")
    private liveExpenseRepository: Repository<LiveExpenseEntity>,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService, 
    private readonly budgetControlService: BudgetControlService,
    private readonly auditService: AuditService,
    private readonly doaService: DOAService,
    @InjectRepository(ApprovalLogEntity, TENANT_DATA_SOURCE)
    private approvalLogRepo: Repository<ApprovalLogEntity>,
  ) {}

  // Centralized Governance Constants for "Bulletproof" Verification
  private readonly CRITICAL_OVERRIDE_ROLES = ['CFO', 'CEO', 'Admin Director', 'SuperAdmin'];
  private readonly MAJOR_OVERRIDE_ROLES = ['Finance Manager', 'CFO', 'CEO', 'Admin Director', 'SuperAdmin', 'Finance Officer'];

  // WBS Budget (Draft) Operations
  async createWbsBudgetDraft(
    createWbsDto: CreateWbsBudgetDto,
    userId: string,
    tenant_id: string,
  ): Promise<WbsBudgetEntity> {
    const {
      parent_wbs_id,
      wbs_code,
      description,
      unit_cost_budgeted,
      quantity_budgeted,
      days_budgeted,
      total_cost_budgeted,
      category_id,
      project_id,
    } = createWbsDto;

    // Validate project exists
    let project: ProjectEntity | null = null;
    if (project_id) {
      project = await this.dataSource
        .getRepository(ProjectEntity)
        .findOne({ where: { project_id: project_id, tenant_id: tenant_id } });
      if (!project) {
        throw new NotFoundException(
          `Project with ID ${project_id} not found in tenant ${tenant_id}`,
        );
      }
    }

    // Validate category exists
    if (category_id) {
      const category = await this.dataSource
        .getRepository(WbsCategoryEntity)
        .findOne({ where: { id: category_id, tenant_id: tenant_id } });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${category_id} not found in tenant ${tenant_id}`,
        );
      }
    }

    // Auto-compute total_cost_budgeted if not explicitly provided
    const unitCost = unit_cost_budgeted || 0;
    const qty = quantity_budgeted || 1;
    const days = days_budgeted || 1;
    const computedTotal = unitCost * qty * days;
    const finalTotal = total_cost_budgeted && total_cost_budgeted > 0
      ? total_cost_budgeted
      : computedTotal;

    // Get max sort_order for siblings
    const maxSortItem = await this.wbsBudgetRepository.findOne({
      where: { 
        parent_wbs_id: parent_wbs_id ?? IsNull(), 
        tenant_id: tenant_id,
        project_id: project_id 
      },
      order: { sort_order: 'DESC' }
    });

    const wbsBudget = new WbsBudgetEntity();
    wbsBudget.project_id = project_id;
    wbsBudget.parent_wbs_id = parent_wbs_id ?? null;
    wbsBudget.wbs_code = wbs_code;
    wbsBudget.description = description;
    wbsBudget.unit_cost_budgeted = unitCost;
    wbsBudget.quantity_budgeted = qty;
    wbsBudget.days_budgeted = days_budgeted ?? null;
    wbsBudget.total_cost_budgeted = finalTotal;
    wbsBudget.category_id = category_id ?? null;
    wbsBudget.status = WbsBudgetStatus.DRAFT;
    wbsBudget.user = { id: userId } as UserEntity;
    wbsBudget.tenant_id = tenant_id;
    wbsBudget.sort_order = maxSortItem ? maxSortItem.sort_order + 1 : 0;
    const saved = await this.wbsBudgetRepository.save(wbsBudget);

    // Validate total WBS budgets against contract value (warn, don't block)
    if (project) {
      await this.validateBudgetAgainstContractValue(project_id, tenant_id, project);
    }

    return saved;
  }

  async createWbsBudgetDraftBatch(
    createWbsDtos: CreateWbsBudgetDto[],
    userId: string,
    tenant_id: string,
  ): Promise<WbsBudgetEntity[]> {
    if (!Array.isArray(createWbsDtos)) {
      throw new BadRequestException(
        "Input must be an array of WBS budget DTOs.",
      );
    }

    const wbsBudgets = createWbsDtos.map((dto) => {
      if (!dto.wbs_code || !dto.description) {
        throw new BadRequestException(
          "Each WBS budget item must have a wbs_code and description.",
        );
      }

      // Auto-compute total
      const unitCost = dto.unit_cost_budgeted || 0;
      const qty = dto.quantity_budgeted || 1;
      const days = dto.days_budgeted || 1;
      const computedTotal = unitCost * qty * days;
      const finalTotal = dto.total_cost_budgeted && dto.total_cost_budgeted > 0
        ? dto.total_cost_budgeted
        : computedTotal;

      const newWbsBudget = new WbsBudgetEntity();
      newWbsBudget.project_id = dto.project_id;
      newWbsBudget.parent_wbs_id = dto.parent_wbs_id ?? null;
      newWbsBudget.wbs_code = dto.wbs_code;
      newWbsBudget.description = dto.description;
      newWbsBudget.unit_cost_budgeted = unitCost;
      newWbsBudget.quantity_budgeted = qty;
      newWbsBudget.days_budgeted = dto.days_budgeted ?? null;
      newWbsBudget.total_cost_budgeted = finalTotal;
      newWbsBudget.category_id = dto.category_id ?? null;
      newWbsBudget.status = WbsBudgetStatus.DRAFT;
      newWbsBudget.user = { id: userId } as UserEntity;
      newWbsBudget.tenant_id = tenant_id;
      return newWbsBudget;
    });

    return this.wbsBudgetRepository.save(wbsBudgets);
  }

  async updateWbsBudget(
    id: string,
    updateWbsBudgetDto: UpdateWbsBudgetDto,
    tenant_id: string,
  ): Promise<WbsBudgetEntity> {
    const wbsBudget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsBudget) {
      throw new NotFoundException(
        `WBS Budget with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    this.wbsBudgetRepository.merge(wbsBudget, updateWbsBudgetDto);
    return this.wbsBudgetRepository.save(wbsBudget);
  }

  async deleteWbsItem(
    id: string, // Keep 'id' as parameter name for controller consistency
    tenant_id: string,
    options: { recursive: boolean } = { recursive: false },
  ): Promise<void> {
    const wbsItem = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsItem) {
      throw new NotFoundException(
        `WBS item with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    if (options.recursive) {
      // Find all children recursively
      const children = await this.findAllChildren(id, tenant_id);
      const childIds = children.map((child) => child.wbs_id); // Changed child.id to child.wbs_id
      if (childIds.length > 0) {
        await this.wbsBudgetRepository.delete({
          wbs_id: In(childIds),
          tenant_id: tenant_id,
        }); // Changed id to wbs_id
      }
    }

    await this.wbsBudgetRepository.delete({ wbs_id: id, tenant_id: tenant_id }); // Changed id to wbs_id
  }

  private async findAllChildren(
    parentId: string,
    tenant_id: string,
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
    tenant_id: string,
    actorRole?: string, // Role of the authenticated user, passed from controller
  ): Promise<LiveExpenseEntity> {
    const { wbs_id, project_id, override_reason } = expenseDto;

    // --- 1. Validate existence of WBS item ---
    const wbsItem = wbs_id
      ? await this.wbsBudgetRepository.findOne({ where: { wbs_id, tenant_id }, relations: ['project'] })
      : null;

    if (wbs_id && !wbsItem) {
      throw new NotFoundException(`WBS Budget line with ID "${wbs_id}" not found for this tenant.`);
    }

    // --- [GUARD] Budget State Check ---
    if (wbsItem && wbsItem.status !== WbsBudgetStatus.APPROVED && wbsItem.status !== WbsBudgetStatus.RECALLED) {
       throw new BadRequestException(`"${wbsItem.wbs_code}" cannot be used for expenses because it is in ${wbsItem.status} status. It must be APPROVED or RECALLED first.`);
    }

    // --- 2. Variance & Override Check ---
    let approvalStatus = ApprovalStatus.APPROVED;
    let finalFlag = VarianceFlag.NO_VARIANCE;

    if (wbsItem) {
      const committedResults = await this.dataSource.query(
        `SELECT COALESCE(SUM(amount_committed - amount_paid), 0) as total FROM lpo WHERE wbs_id = $1 AND tenant_id = $2`,
        [wbsItem.wbs_id, tenant_id],
      );
      const committedAmount = parseFloat(committedResults[0]?.total || 0);

      const varianceResult = await this.budgetControlService.validateWbsExpense(
        wbsItem,
        expenseDto.amount,
        tenant_id,
        committedAmount,
      );

      finalFlag = varianceResult.flag;

      // 2. [ADVANCED] Quantity/Duration Variance Check
      if (expenseDto.quantity > 0 && wbsItem.quantity_budgeted > 0) {
          const remainingQty = wbsItem.quantity_budgeted - (wbsItem.quantity_actual || 0);
          if (expenseDto.quantity > remainingQty * 1.05) {
              finalFlag = VarianceFlag.MAJOR_VARIANCE;
          }
      }
      if (expenseDto.days && wbsItem.days_budgeted! > 0) {
          const remainingDays = wbsItem.days_budgeted! - (wbsItem.days_actual || 0);
          if (expenseDto.days > remainingDays * 1.05) {
              finalFlag = VarianceFlag.MAJOR_VARIANCE;
          }
      }

      // --- Enforce Governance Decisions (Asynchronous Flow) ---
      if (varianceResult.action === 'BLOCK' || varianceResult.action === 'REQUIRE_OVERRIDE') {
        const isCritical = varianceResult.action === 'BLOCK';
        const isAuthorizedAtAll = isCritical
          ? actorRole && this.CRITICAL_OVERRIDE_ROLES.includes(actorRole)
          : actorRole && this.MAJOR_OVERRIDE_ROLES.includes(actorRole);

        if (!override_reason) {
            // Still hard-block if they didn't even provide a reason.
             throw new BadRequestException({
                statusCode: 403,
                errorCode: varianceResult.flag,
                message: varianceResult.message,
                requiredRoles: varianceResult.requiredRoles,
                hint: 'Provide an override_reason justification before submitting.',
              });
        }

        if (isAuthorizedAtAll) {
          // User HAS authority to force it through immediately.
          this.logger.warn(`[WBS] AUTHORIZED OVERRIDE by ${actorRole} | WBS: ${wbsItem.wbs_code} | Reason: ${override_reason}`);
          finalFlag = VarianceFlag.OVERRIDE_APPLIED;
          approvalStatus = ApprovalStatus.APPROVED;
        } else {
          // User lacks authority, route to pending queue.
          this.logger.log(`[WBS] PENDING APPROVAL routed for ${actorRole} | WBS: ${wbsItem.wbs_code}`);
          approvalStatus = ApprovalStatus.PENDING_APPROVAL;
        }
      }
    }

    // --- 3. Atomic Transaction: Save expense and update WBS actuals ---
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Calculate tax if project is available
      let vatAmount = 0;
      let whtAmount = 0;
      const projectData = wbsItem?.project
        ?? (project_id ? await this.projectsService.findOne(project_id, tenant_id).catch(() => null) : null);

      if (projectData) {
        vatAmount = expenseDto.amount * (Number(projectData.vat_rate || 0) / 100);
        whtAmount = expenseDto.amount * (Number(projectData.wht_rate || 0) / 100);
      }

      const liveExpense = queryRunner.manager.create(LiveExpenseEntity, {
        ...expenseDto,
        user_id: userId,
        tenant_id,
        vat_amount: vatAmount,
        wht_amount: whtAmount,
        variance_flag: finalFlag,
        approval_status: approvalStatus, // Set the routed status
        expense_date: expenseDto.expense_date || new Date(),
      });

      const savedExpense = await queryRunner.manager.save(LiveExpenseEntity, liveExpense);

      // ONLY increment denormalized actual spend if APPROVED
      if (wbsItem && approvalStatus === ApprovalStatus.APPROVED) {
        await queryRunner.manager.increment(
          WbsBudgetEntity,
          { wbs_id: wbsItem.wbs_id, tenant_id },
          'total_cost_actual',
          expenseDto.amount,
        );
        
        // Granular Fulfillment Tracking
        if (expenseDto.quantity) {
          await queryRunner.manager.increment(
            WbsBudgetEntity,
            { wbs_id: wbsItem.wbs_id, tenant_id },
            'quantity_actual',
            expenseDto.quantity,
          );
        }
        
        if (expenseDto.days) {
          await queryRunner.manager.increment(
            WbsBudgetEntity,
            { wbs_id: wbsItem.wbs_id, tenant_id },
            'days_actual',
            expenseDto.days,
          );
        }

        // If it was an override that was instantly approved, notify the team
        if (finalFlag === VarianceFlag.OVERRIDE_APPLIED && override_reason) {
            this.notificationsService.sendOverrideApprovedAlert({
                authorizer: actorRole || 'System',
                wbsCode: wbsItem.wbs_code,
                projectName: projectData?.project_name || 'Unknown Project',
                amount: expenseDto.amount,
                varianceFlag: finalFlag || 'UNKNOWN',
                overrideReason: override_reason,
                expenseId: savedExpense.id,
            });
        }
      }

      await queryRunner.commitTransaction();
      return savedExpense;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[WBS] logLiveExpenseEntry transaction failed: ${(err as Error).message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }


  /**
   * ADVANCED: Batch version of logLiveExpenseEntry — support partial success.
   * Instead of rolling back the entire batch if one item fails, we process all items
   * and return a report of saved items vs errors. This is "bulletproof" for usability.
   */
  async logLiveExpenseBatch(
    entries: CreateLiveExpenseDto[],
    userId: string,
    tenant_id: string,
    actorRole?: string,
  ): Promise<{ 
    saved: LiveExpenseEntity[]; 
    errors: { index: number; wbs_code?: string; message: string; errorCode?: string }[];
    totalCount: number;
    successCount: number;
  }> {
    const results: { saved: LiveExpenseEntity[]; errors: any[] } = { saved: [], errors: [] };

    for (let i = 0; i < entries.length; i++) {
        const expenseDto = entries[i];
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { wbs_id, override_reason } = expenseDto;
            const wbsItem = wbs_id
                ? await queryRunner.manager.findOne(WbsBudgetEntity, { where: { wbs_id, tenant_id }, relations: ['project'] })
                : null;

            if (wbs_id && !wbsItem) {
                throw new Error(`WBS Budget line "${wbs_id}" not found.`);
            }

            // --- [GUARD] Budget State Check ---
            if (wbsItem && wbsItem.status !== WbsBudgetStatus.APPROVED && wbsItem.status !== WbsBudgetStatus.RECALLED) {
                 throw new Error(`"${wbsItem.wbs_code}" is in ${wbsItem.status} status. Expenses can only be logged against APPROVED or RECALLED budget lines.`);
            }

            let approvalStatus = ApprovalStatus.APPROVED;
            let finalFlag = VarianceFlag.NO_VARIANCE;

            if (wbsItem) {
                // 1. Financial Variance Check
                const committedResults = await queryRunner.manager.query(
                    `SELECT COALESCE(SUM(amount_committed - amount_paid), 0) as total FROM lpo WHERE wbs_id = $1 AND tenant_id = $2`,
                    [wbsItem.wbs_id, tenant_id],
                );
                const committedAmount = parseFloat(committedResults[0]?.total || 0);
                const varianceResult = await this.budgetControlService.validateWbsExpense(wbsItem, expenseDto.amount, tenant_id, committedAmount);
                finalFlag = varianceResult.flag;

                // 2. [ADVANCED] Quantity/Duration Variance Check
                // Challenging the logic: Price might be OK, but quantity leak is a risk.
                if (expenseDto.quantity > 0 && wbsItem.quantity_budgeted > 0) {
                    const remainingQty = wbsItem.quantity_budgeted - (wbsItem.quantity_actual || 0);
                    if (expenseDto.quantity > remainingQty * 1.05) { // 5% buffer on quantity too
                        finalFlag = VarianceFlag.MAJOR_VARIANCE; // Force review if quantity is excessive
                    }
                }

                if (varianceResult.action === 'BLOCK' || varianceResult.action === 'REQUIRE_OVERRIDE') {
                    const isCritical = varianceResult.action === 'BLOCK';
                    const isAuthorizedAtAll = isCritical
                        ? actorRole && this.CRITICAL_OVERRIDE_ROLES.includes(actorRole)
                        : actorRole && this.MAJOR_OVERRIDE_ROLES.includes(actorRole);

                    if (!override_reason) {
                        throw new BadRequestException({
                            errorCode: varianceResult.flag,
                            message: `Provisionally blocked (${wbsItem.wbs_code}): Justification required for budget overrun.`,
                            requiredRoles: varianceResult.requiredRoles,
                        });
                    }

                    if (isAuthorizedAtAll) {
                        finalFlag = VarianceFlag.OVERRIDE_APPLIED;
                        approvalStatus = ApprovalStatus.APPROVED;
                    } else {
                        approvalStatus = ApprovalStatus.PENDING_APPROVAL;
                    }
                }

                if (approvalStatus === ApprovalStatus.APPROVED) {
                    await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: wbsItem.wbs_id, tenant_id }, 'total_cost_actual', expenseDto.amount);
                    if (expenseDto.quantity) await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: wbsItem.wbs_id, tenant_id }, 'quantity_actual', expenseDto.quantity);
                    if (expenseDto.days) await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: wbsItem.wbs_id, tenant_id }, 'days_actual', expenseDto.days);

                    if (finalFlag === VarianceFlag.OVERRIDE_APPLIED && override_reason) {
                        this.notificationsService.sendOverrideApprovedAlert({
                            authorizer: actorRole || 'System',
                            wbsCode: wbsItem.wbs_code,
                            projectName: wbsItem.project?.project_name || 'Unknown Project',
                            amount: expenseDto.amount,
                            varianceFlag: finalFlag,
                            overrideReason: override_reason,
                        });
                    }
                }
            }

            // Calculate tax
            let vatAmount = 0;
            let whtAmount = 0;
            const projectData = wbsItem?.project ?? (expenseDto.project_id ? await this.projectsService.findOne(expenseDto.project_id, tenant_id).catch(() => null) : null);
            if (projectData) {
                vatAmount = expenseDto.amount * (Number(projectData.vat_rate || 0) / 100);
                whtAmount = expenseDto.amount * (Number(projectData.wht_rate || 0) / 100);
            }

            const liveExpense = queryRunner.manager.create(LiveExpenseEntity, {
                ...expenseDto,
                user_id: userId,
                tenant_id,
                vat_amount: vatAmount,
                wht_amount: whtAmount,
                variance_flag: finalFlag,
                approval_status: approvalStatus,
                expense_date: expenseDto.expense_date || new Date(),
            });

            const saved = await queryRunner.manager.save(LiveExpenseEntity, liveExpense);
            results.saved.push(saved);
            await queryRunner.commitTransaction();
        } catch (err: any) {
            await queryRunner.rollbackTransaction();
            results.errors.push({
                index: i,
                wbs_code: entries[i].wbs_id, // we might not have the code yet if lookup failed
                message: err.message,
                errorCode: err.response?.errorCode || 'VALIDATION_ERROR',
            });
            this.logger.warn(`[WBS] Batch item ${i} failed: ${err.message}`);
        } finally {
            await queryRunner.release();
        }
    }

    return {
        saved: results.saved,
        errors: results.errors,
        totalCount: entries.length,
        successCount: results.saved.length,
    };
  }

  async findMajorExceptions(tenant_id: string): Promise<LiveExpenseEntity[]> {
    return this.liveExpenseRepository.find({
      where: {
        tenant_id,
        variance_flag: In([VarianceFlag.MAJOR_VARIANCE, VarianceFlag.UNAPPROVED_BUDGET_USAGE])
      },
      relations: ['wbsBudget'],
      order: { created_at: 'DESC' }
    });
  }

  // --- NEW: Asynchronous Override Flow ---

  /**
   * Retrieves all expenses currently in the PENDING_APPROVAL queue.
   */
  async findPendingOverruns(tenant_id: string): Promise<LiveExpenseEntity[]> {
    return this.liveExpenseRepository.find({
      where: {
        tenant_id,
        approval_status: ApprovalStatus.PENDING_APPROVAL,
      },
      relations: ['wbsBudget', 'wbsBudget.project'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Approves a pending overrun, increments the budget actuals,
   * updates the status to APPROVED, and fires a WebSocket alert.
   */
  async approveOverrun(
    expenseId: string,
    tenant_id: string,
    authorizerRole: string,
  ): Promise<LiveExpenseEntity> {
    const expense = await this.liveExpenseRepository.findOne({
      where: { id: expenseId, tenant_id },
      relations: ['wbsBudget', 'wbsBudget.project'],
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.approval_status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Expense is not in a pending state (Current: ${expense.approval_status}).`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update the expense status
      expense.approval_status = ApprovalStatus.APPROVED;
      expense.variance_flag = VarianceFlag.OVERRIDE_APPLIED;
      const savedExpense = await queryRunner.manager.save(LiveExpenseEntity, expense);

      // 2. Increment the actual budget spending (since it was deferred earlier)
      if (expense.wbsBudget) {
        await queryRunner.manager.increment(
          WbsBudgetEntity,
          { wbs_id: expense.wbsBudget.wbs_id, tenant_id },
          'total_cost_actual',
          expense.amount,
        );
      }

      await queryRunner.commitTransaction();

      // 3. Notify the enterprise that an override was authorized
      this.notificationsService.sendOverrideApprovedAlert({
        authorizer: authorizerRole,
        wbsCode: expense.wbsBudget?.wbs_code || 'Unknown',
        projectName: expense.wbsBudget?.project?.project_name || 'Unknown Project',
        amount: expense.amount,
        varianceFlag: 'OVERRIDE_APPLIED',
        overrideReason: expense.override_reason || 'Approved via Governance Hub',
        expenseId: expense.id,
      });

      this.logger.log(`[WBS] Overrun approved by ${authorizerRole} for Expense: ${expense.id}`);
      return savedExpense;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[WBS] Failed to approve overrun ${expenseId}: ${(err as Error).message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateLiveExpenseEntry(
    id: string,
    updateDto: UpdateLiveExpenseDto,
    tenant_id: string,
  ): Promise<LiveExpenseEntity> {
    const liveExpense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id },
    });

    if (!liveExpense) {
      throw new NotFoundException(`Expense ${id} not found.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Handle metric recalibration if already APPROVED
      if (liveExpense.approval_status === ApprovalStatus.APPROVED) {
        const oldWbsId = liveExpense.wbs_id;
        const newWbsId = updateDto.wbs_id ?? liveExpense.wbs_id;

        if (oldWbsId === newWbsId && oldWbsId) {
          // Normal Delta Update on the same budget line
          const amountDelta = (updateDto.amount ?? liveExpense.amount) - (liveExpense.amount || 0);
          const quantityDelta = (updateDto.quantity ?? liveExpense.quantity ?? 0) - (liveExpense.quantity || 0);
          const daysDelta = (updateDto.days ?? liveExpense.days ?? 0) - (liveExpense.days || 0);

          if (amountDelta !== 0) {
            await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'total_cost_actual', amountDelta);
          }
          if (quantityDelta !== 0) {
            await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'quantity_actual', quantityDelta);
          }
          if (daysDelta !== 0) {
            await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'days_actual', daysDelta);
          }
        } else if (oldWbsId !== newWbsId) {
          // WBS SWITCH: Revert old, Apply new
          if (oldWbsId) {
            await queryRunner.manager.decrement(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'total_cost_actual', liveExpense.amount);
            if (liveExpense.quantity) await queryRunner.manager.decrement(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'quantity_actual', liveExpense.quantity);
            if (liveExpense.days) await queryRunner.manager.decrement(WbsBudgetEntity, { wbs_id: oldWbsId, tenant_id }, 'days_actual', liveExpense.days);
          }
          
          if (newWbsId) {
            const finalAmount = updateDto.amount ?? liveExpense.amount;
            const finalQuantity = updateDto.quantity ?? liveExpense.quantity;
            const finalDays = updateDto.days ?? liveExpense.days;
            
            await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: newWbsId, tenant_id }, 'total_cost_actual', finalAmount);
            if (finalQuantity) await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: newWbsId, tenant_id }, 'quantity_actual', finalQuantity);
            if (finalDays) await queryRunner.manager.increment(WbsBudgetEntity, { wbs_id: newWbsId, tenant_id }, 'days_actual', finalDays);
          }
        }
      }

      Object.assign(liveExpense, updateDto);
      const saved = await queryRunner.manager.save(LiveExpenseEntity, liveExpense);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLiveExpenseEntry(id: string, tenant_id: string): Promise<void> {
    const liveExpense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });

    if (!liveExpense) {
      throw new NotFoundException(
        `Live Expense with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Rollback metrics if it was APPROVED
      if (liveExpense.approval_status === ApprovalStatus.APPROVED && liveExpense.wbs_id) {
        await queryRunner.manager.decrement(
          WbsBudgetEntity,
          { wbs_id: liveExpense.wbs_id, tenant_id },
          'total_cost_actual',
          liveExpense.amount,
        );
        
        if (liveExpense.quantity) {
          await queryRunner.manager.decrement(
            WbsBudgetEntity,
            { wbs_id: liveExpense.wbs_id, tenant_id },
            'quantity_actual',
            liveExpense.quantity,
          );
        }
        
        if (liveExpense.days) {
          await queryRunner.manager.decrement(
            WbsBudgetEntity,
            { wbs_id: liveExpense.wbs_id, tenant_id },
            'days_actual',
            liveExpense.days,
          );
        }
      }

      // 2. Delete the record
      await queryRunner.manager.delete(LiveExpenseEntity, { id, tenant_id });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLiveExpenseBatch(ids: string[], tenant_id: string): Promise<{ successCount: number; errors: any[] }> {
    const results: { successCount: number; errors: { id: string; message: string }[] } = { successCount: 0, errors: [] };
    for (const id of ids) {
      try {
        await this.deleteLiveExpenseEntry(id, tenant_id);
        results.successCount++;
      } catch (err: any) {
        results.errors.push({ id, message: err.message });
      }
    }
    return results;
  }

  // WBS Category Operations
  async createWbsCategory(
    dto: CreateWbsCategoryDto,
    tenant_id: string,
  ): Promise<WbsCategoryEntity> {
    const existingCategory = await this.wbsCategoryRepository.findOne({
      where: { name: dto.name, tenant_id: tenant_id, parent_id: dto.parent_id ?? IsNull() },
    });
    if (existingCategory) {
      throw new ConflictException(
        `WBS Category with name "${dto.name}" already exists for this level in tenant ${tenant_id}`,
      );
    }

    if (dto.parent_id) {
      const parent = await this.wbsCategoryRepository.findOne({
        where: { id: dto.parent_id, tenant_id: tenant_id },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${dto.parent_id} not found in tenant ${tenant_id}`);
      }
    }

    const category = this.wbsCategoryRepository.create({
      name: dto.name,
      code: dto.code || null,
      description: dto.description || null,
      color: dto.color || null,
      tenant_id: tenant_id,
      parent_id: dto.parent_id || null,
    });
    return this.wbsCategoryRepository.save(category);
  }

  async findAllWbsCategories(tenant_id: string, includeInactive: boolean = false): Promise<WbsCategoryEntity[]> {
    return this.wbsCategoryRepository.find({
      where: includeInactive ? { tenant_id: tenant_id } : { tenant_id: tenant_id, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async updateWbsCategory(
    id: string,
    updateWbsCategoryDto: UpdateWbsCategoryDto,
    tenant_id: string,
  ): Promise<WbsCategoryEntity> {
    const category = await this.wbsCategoryRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });
    if (!category) {
      throw new NotFoundException(
        `WBS Category with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    // Check for name uniqueness if name or parent is being changed
    const newName = updateWbsCategoryDto.name ?? category.name;
    const newParentId = updateWbsCategoryDto.parent_id === undefined ? category.parent_id : updateWbsCategoryDto.parent_id;

    if (updateWbsCategoryDto.name !== undefined || updateWbsCategoryDto.parent_id !== undefined) {
      const existingCategoryWithName = await this.wbsCategoryRepository.findOne({
        where: { name: newName, tenant_id: tenant_id, parent_id: newParentId ?? IsNull() },
      });
      if (existingCategoryWithName && existingCategoryWithName.id !== id) {
        throw new ConflictException(
          `WBS Category with name "${newName}" already exists for this level in tenant ${tenant_id}`,
        );
      }
    }

    if (updateWbsCategoryDto.parent_id) {
        if (updateWbsCategoryDto.parent_id === id) {
            throw new BadRequestException("A category cannot be its own parent.");
        }
        const parent = await this.wbsCategoryRepository.findOne({
          where: { id: updateWbsCategoryDto.parent_id, tenant_id: tenant_id },
        });
        if (!parent) {
          throw new NotFoundException(`Parent category with ID ${updateWbsCategoryDto.parent_id} not found in tenant ${tenant_id}`);
        }
    }

    // Merge all provided fields
    this.wbsCategoryRepository.merge(category, updateWbsCategoryDto);
    return this.wbsCategoryRepository.save(category);
  }

  async deleteWbsCategory(id: string, tenant_id: string, forceSoftDelete: boolean = false): Promise<{ softDeleted: boolean; usageCount: number }> {
    const category = await this.wbsCategoryRepository.findOne({
      where: { id, tenant_id: tenant_id },
    });
    if (!category) {
      throw new NotFoundException(
        `WBS Category with ID ${id} not found for tenant ${tenant_id}`,
      );
    }
    
    // Count distinct budgets (across projects) using this category
    const usageCount = await this.wbsBudgetRepository.count({
        where: { category_id: id, tenant_id: tenant_id }
    });

    if (usageCount > 0 && !forceSoftDelete) {
        // Return without deleting, signaling the controller to prompt user
        return { softDeleted: false, usageCount };
    }

    if (usageCount > 0 || forceSoftDelete) {
        category.is_active = false;
        await this.wbsCategoryRepository.save(category);
        return { softDeleted: true, usageCount };
    }

    await this.wbsCategoryRepository.delete({ id, tenant_id: tenant_id });
    return { softDeleted: false, usageCount: 0 };
  }

  // ===== NEW: Budget Status Workflow =====
  async changeWbsBudgetStatus(
    id: string,
    newStatus: WbsBudgetStatus,
    tenant_id: string,
    actor: UserPayload | UserEntity, // New: Accept Payload or Entity
  ): Promise<WbsBudgetEntity> {
    const wbsBudget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id },
      relations: ['project'], // Need project for currency
    });
    if (!wbsBudget) {
      throw new NotFoundException(`WBS Budget ${id} not found`);
    }

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      [WbsBudgetStatus.DRAFT]: [WbsBudgetStatus.PENDING],
      [WbsBudgetStatus.PENDING]: [WbsBudgetStatus.APPROVED, WbsBudgetStatus.REJECTED],
      [WbsBudgetStatus.REJECTED]: [WbsBudgetStatus.DRAFT], // Can revert to draft for editing
      [WbsBudgetStatus.APPROVED]: [], // Final state — no transitions
    };

    const allowed = validTransitions[wbsBudget.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${wbsBudget.status} to ${newStatus}. Valid transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    // IF APPROVED: Check DOA Authority
    if (newStatus === WbsBudgetStatus.APPROVED) {
      await this.doaService.validateAuthority(
        actor, 
        Number(wbsBudget.total_cost_budgeted),
        wbsBudget.project?.currency || 'USD'
      );
    }

    const oldStatus = wbsBudget.status;
    wbsBudget.status = newStatus;
    wbsBudget.updated_at = new Date();

    const saved = await this.wbsBudgetRepository.save(wbsBudget);

    // PERSIST APPROVAL LOG
    const log = this.approvalLogRepo.create({
      tenant_id,
      document_type: ApprovalDocumentType.WBS_BUDGET,
      document_id: id,
      status: this.mapToApprovalStatus(newStatus),
      actor_id: actor.id,
      amount: Number(wbsBudget.total_cost_budgeted),
      comments: `Status changed from ${oldStatus} to ${newStatus}`,
    } as any);
    await this.approvalLogRepo.save(log);

    // Send notification on status change
    const actionLabel = newStatus === WbsBudgetStatus.APPROVED ? 'Budget Approved'
      : newStatus === WbsBudgetStatus.REJECTED ? 'Budget Rejected'
      : newStatus === WbsBudgetStatus.PENDING ? 'Budget Submitted for Approval'
      : 'Budget Status Changed';

    this.notificationsService.sendVarianceAlert(
      actionLabel,
      `WBS ${wbsBudget.wbs_code} (${wbsBudget.description}) status changed to ${newStatus} by ${actor.first_name} ${actor.last_name}.`,
      newStatus === WbsBudgetStatus.REJECTED ? 'warning' : 'info',
    );

    return saved;
  }

  private mapToApprovalStatus(wbsStatus: WbsBudgetStatus): ApprovalStatus {
    switch (wbsStatus) {
      case WbsBudgetStatus.PENDING: return ApprovalStatus.PENDING_APPROVAL;
      case WbsBudgetStatus.APPROVED: return ApprovalStatus.APPROVED;
      case WbsBudgetStatus.REJECTED: return ApprovalStatus.REJECTED;
      default: return ApprovalStatus.PENDING_APPROVAL;
    }
  }

  // ===== NEW: Bulk Project Budget Submission =====
  async submitProjectBudgetDrafts(projectId: string, tenant_id: string): Promise<{ count: number }> {
    const result = await this.wbsBudgetRepository.update(
      { 
        project_id: projectId,
        tenant_id,
        status: In([WbsBudgetStatus.DRAFT, WbsBudgetStatus.REJECTED]),
      },
      { 
        status: WbsBudgetStatus.PENDING,
        updated_at: new Date()
      }
    );

    if (result.affected && result.affected > 0) {
       // Since we don't have the project details directly here easily without another query, 
       // we just use the ID for the notification.
       this.notificationsService.sendVarianceAlert(
         'Project Budget Submitted',
         `${result.affected} line items for project ${projectId} have been submitted for approval.`,
         'info',
       );
    }

    return { count: result.affected || 0 };
  }

  // ===== NEW: Budget vs. Contract Value Validation =====
  async validateBudgetAgainstContractValue(
    projectId: string,
    tenant_id: string,
    project?: ProjectEntity,
  ): Promise<{ totalBudgeted: number; contractValue: number; overBudget: boolean }> {
    if (!project) {
      project = await this.dataSource
        .getRepository(ProjectEntity)
        .findOne({ where: { project_id: projectId, tenant_id } }) || undefined;
    }
    if (!project) return { totalBudgeted: 0, contractValue: 0, overBudget: false };

    const contractValue = Number(project.contract_value || 0);
    if (contractValue <= 0) return { totalBudgeted: 0, contractValue: 0, overBudget: false };

    // Sum all root-level WBS budgets for this project
    const result = await this.wbsBudgetRepository
      .createQueryBuilder('wbs')
      .select('COALESCE(SUM(wbs.total_cost_budgeted), 0)', 'total')
      .where('wbs.project_id = :projectId', { projectId })
      .andWhere('wbs.tenant_id = :tenant_id', { tenant_id })
      .andWhere('wbs.parent_wbs_id IS NULL') // Only root-level to avoid double-counting
      .getRawOne();

    const totalBudgeted = parseFloat(result?.total || '0');
    const overBudget = totalBudgeted > contractValue;

    if (overBudget) {
      const overage = totalBudgeted - contractValue;
      this.logger.warn(
        `[validateBudgetAgainstContractValue] Project ${projectId}: Total WBS budgets (${totalBudgeted}) exceed contract value (${contractValue}) by ${overage}`,
      );
      this.notificationsService.sendVarianceAlert(
        'Budget Exceeds Contract Value',
        `Total WBS budgets (${totalBudgeted.toFixed(2)}) exceed the contract value (${contractValue.toFixed(2)}) by ${overage.toFixed(2)}.`,
        'warning',
      );
    }

    return { totalBudgeted, contractValue, overBudget };
  }

  // ===== NEW: Seed Default Categories for Tenant =====
  async seedDefaultCategories(tenant_id: string): Promise<WbsCategoryEntity[]> {
    const defaults = [
      { code: 'LAB', name: 'Labor', color: '#3B82F6', description: 'Workforce costs — wages, salaries, benefits', sort_order: 1 },
      { code: 'MAT', name: 'Materials', color: '#10B981', description: 'Raw materials, supplies, consumables', sort_order: 2 },
      { code: 'EQP', name: 'Equipment', color: '#F59E0B', description: 'Machinery, tools, rentals', sort_order: 3 },
      { code: 'SUB', name: 'Subcontractor', color: '#8B5CF6', description: 'Third-party contracted services', sort_order: 4 },
      { code: 'PRO', name: 'Professional Services', color: '#EC4899', description: 'Consultancy, legal, engineering', sort_order: 5 },
      { code: 'TRV', name: 'Travel & Logistics', color: '#06B6D4', description: 'Transportation, accommodation, per diem', sort_order: 6 },
      { code: 'OVH', name: 'Overhead', color: '#6B7280', description: 'Administrative, insurance, utilities', sort_order: 7 },
      { code: 'CON', name: 'Contingency', color: '#EF4444', description: 'Risk reserves, unforeseen costs', sort_order: 8 },
    ];

    const categories: WbsCategoryEntity[] = [];
    for (const def of defaults) {
      // Skip if already exists (idempotent)
      const existing = await this.wbsCategoryRepository.findOne({
        where: { name: def.name, tenant_id },
      });
      if (!existing) {
        const cat = this.wbsCategoryRepository.create({ ...def, tenant_id });
        categories.push(await this.wbsCategoryRepository.save(cat));
      }
    }
    this.logger.log(`Seeded ${categories.length} default WBS categories for tenant ${tenant_id}`);
    return categories;
  }

  // ===== NEW: WBS Templates Operations =====
  async findAllTemplates(tenant_id?: string): Promise<WbsTemplateEntity[]> {
    return this.wbsTemplateRepository.find({
      where: [
        { tenant_id: IsNull() }, // System templates
        { tenant_id: tenant_id }, // Tenant-specific templates
      ],
      order: { name: 'ASC' }
    });
  }

  async createWbsTemplate(
    dto: CreateWbsTemplateDto,
    tenant_id: string
  ): Promise<WbsTemplateEntity> {
    const template = this.wbsTemplateRepository.create({
      ...dto,
      tenant_id: tenant_id,
    });
    return this.wbsTemplateRepository.save(template);
  }

  async applyTemplateToProject(
    projectId: string,
    templateId: string,
    userId: string,
    tenant_id: string
  ): Promise<void> {
    const template = await this.wbsTemplateRepository.findOne({
      where: { id: templateId }
    });
    
    if (!template) {
      throw new NotFoundException(`WBS Template ${templateId} not found`);
    }

    const structure = Array.isArray(template.structure) ? template.structure : [];
    const codeToId: Record<string, string> = {};

    // Sort items to ensure parents are created before children if codes are hierarchical
    const sortedItems = [...structure].sort((a, b) => a.code.length - b.code.length);

    for (const item of sortedItems) {
      const parentId = item.parent_code ? codeToId[item.parent_code] : null;

      const createdItem = await this.createWbsBudgetDraft({
        project_id: projectId,
        parent_wbs_id: parentId,
        wbs_code: item.code,
        description: item.description,
        unit_cost_budgeted: 0,
        quantity_budgeted: 1,
        days_budgeted: 1,
        total_cost_budgeted: 0,
        category_id: undefined,
      }, userId, tenant_id);

      codeToId[item.code] = createdItem.wbs_id;
    }
    
    this.logger.log(`Applied template "${template.name}" to project ${projectId} (${sortedItems.length} items)`);
  }

  async seedDefaultTemplates(): Promise<void> {
    const templates = [
      {
        name: 'Standard IT Project',
        industry: IndustryType.IT,
        structure: [
          { code: '1.0', description: 'Initiation & Planning' },
          { code: '1.1', description: 'Requirements Gathering', parent_code: '1.0' },
          { code: '2.0', description: 'Design & Architecture' },
          { code: '3.0', description: 'Development' },
          { code: '3.1', description: 'Frontend Development', parent_code: '3.0' },
          { code: '3.2', description: 'Backend API Development', parent_code: '3.0' },
          { code: '4.0', description: 'Testing & QA' },
          { code: '5.0', description: 'Deployment & Launch' },
        ]
      },
      {
        name: 'Building Construction',
        industry: IndustryType.CONSTRUCTION,
        structure: [
          { code: '1.0', description: 'Pre-Construction & Permitting' },
          { code: '2.0', description: 'Foundation & Earthworks' },
          { code: '3.0', description: 'Structural Framing' },
          { code: '4.0', description: 'Enclosure & Roofing' },
          { code: '5.0', description: 'Mechanical, Electrical, Plumbing (MEP)' },
          { code: '6.0', description: 'Interior Finishing' },
          { code: '7.0', description: 'Site Work & Landscaping' },
          { code: '8.0', description: 'Closeout & Handover' },
        ]
      },
      {
        name: 'Oil & Gas Facility Maintenance',
        industry: IndustryType.OIL_GAS,
        structure: [
          { code: '1.0', description: 'Mobilization & Site Prep' },
          { code: '2.0', description: 'Equipment Inspection (NDT)' },
          { code: '3.0', description: 'Mechanical Overhaul' },
          { code: '4.0', description: 'Instrumentation & Controls' },
          { code: '5.0', description: 'Painting & Insulation' },
          { code: '6.0', description: 'Testing & Re-commissioning' },
          { code: '7.0', description: 'Demobilization' },
        ]
      }
    ];

    for (const t of templates) {
      const existing = await this.wbsTemplateRepository.findOne({
        where: { name: t.name, tenant_id: IsNull() }
      });
      if (!existing) {
        await this.wbsTemplateRepository.save(this.wbsTemplateRepository.create({
          ...t,
          tenant_id: null
        }));
      }
    }
    this.logger.log(`Default WBS templates verified/seeded.`);
  }

  // Enhanced WBS Budget Retrieval with Filters and Pagination
  async findAllWbsBudgets(
    getWbsBudgetsDto: GetWbsBudgetsDto,
    tenant_id: string,
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
      sortBy = "sort_order",
      sortOrder = "ASC",
      // Removed parentWbsId,
    } = getWbsBudgetsDto;

    const queryBuilder = this.wbsBudgetRepository
      .createQueryBuilder("wbs")
      .leftJoinAndSelect("wbs.project", "project")
      .leftJoinAndSelect("wbs.category", "category")
      .where("wbs.tenant_id = :tenant_id", { tenant_id });

    if (wbsCode) {
      queryBuilder.andWhere("wbs.wbs_code ILIKE :wbsCode", {
        wbsCode: `%${wbsCode}%`,
      });
    }
    if (description) {
      queryBuilder.andWhere("wbs.description ILIKE :description", {
        description: `%${description}%`,
      });
    }
    if (status) {
      queryBuilder.andWhere("wbs.status = :status", { status });
    }
    if (categoryId) {
      queryBuilder.andWhere("wbs.category_id = :categoryId", {
        categoryId,
      });
    }
    if (projectId) {
      queryBuilder.andWhere("wbs.project_id = :projectId", { projectId });
    }
    if (userId) {
      queryBuilder.andWhere("wbs.user_id = :userId", { userId });
    }

    if (sortBy === 'wbs_code') {
      // Advanced Logic: Numerical sorting for WBS strings (1.9 before 1.10)
      queryBuilder.orderBy(`string_to_array(wbs.wbs_code, '.')::int[]`, sortOrder);
    } else {
      queryBuilder.orderBy(`wbs.${sortBy}`, sortOrder);
    }
    queryBuilder.skip((page - 1) * limit).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      return { data, total };
    } catch (err: any) {
      this.logger.error(`[WBS] Database query failed with sortBy='${sortBy}'. Error: ${err.message}`);
      
      // Safety Fallback: Use basic Alphanumeric sorting on wbs_code
      this.logger.warn(`[WBS] Falling back to standard string-based WBS sorting.`);
      const fallbackQuery = this.wbsBudgetRepository.createQueryBuilder("wbs")
        .leftJoinAndSelect("wbs.project", "project")
        .leftJoinAndSelect("wbs.category", "category")
        .where("wbs.tenant_id = :tenant_id", { tenant_id });

      if (projectId) fallbackQuery.andWhere("wbs.project_id = :projectId", { projectId });
      if (status) fallbackQuery.andWhere("wbs.status = :status", { status });
      if (wbsCode) fallbackQuery.andWhere("wbs.wbs_code ILIKE :wbsCode", { wbsCode: `%${wbsCode}%` });
      if (description) fallbackQuery.andWhere("wbs.description ILIKE :description", { description: `%${description}%` });
      if (categoryId) fallbackQuery.andWhere("wbs.category_id = :categoryId", { categoryId });
      if (userId) fallbackQuery.andWhere("wbs.user_id = :userId", { userId });
      
      const [data, total] = await fallbackQuery
        .orderBy("wbs.wbs_code", "ASC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
        
      return { data, total };
    }
  }

  // Enhanced Live Expense Retrieval with Filters and Pagination
  async findAllLiveExpenses(
    getLiveExpensesDto: GetLiveExpensesDto,
    tenant_id: string,
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
      queryBuilder.andWhere("liveExpense.project_id = :projectId", {
        projectId,
      });
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

  async getWbsBudgetRollup(
    tenant_id: string,
    filters: { startDate?: string; endDate?: string; projectId?: string } = {},
  ): Promise<WbsBudgetRollupDto[]> {
    const { startDate, endDate, projectId } = filters;
    
    const queryParams: any[] = [tenant_id];
    let paramIdx = 2;
    
    let projectIdClause = '';
    if (projectId) {
      projectIdClause = `AND w.project_id = $${paramIdx++}`;
      queryParams.push(projectId);
    }

    let dateFiltersLive = '';
    let startDateIdx = -1;
    let endDateIdx = -1;

    if (startDate) {
      startDateIdx = paramIdx++;
      queryParams.push(startDate);
      dateFiltersLive += ` AND e.created_at >= $${startDateIdx}`;
    }
    if (endDate) {
      endDateIdx = paramIdx++;
      queryParams.push(endDate);
      dateFiltersLive += ` AND e.created_at <= $${endDateIdx}`;
    }

    let dateFiltersLpo = '';
    if (startDate) dateFiltersLpo += ` AND l.created_at >= $${startDateIdx}`;
    if (endDate) dateFiltersLpo += ` AND l.created_at <= $${endDateIdx}`;

    const query = `
      SELECT 
          w.wbs_id,
          w.parent_wbs_id,
          w.wbs_code,
          w.description,
          w.total_cost_budgeted,
          w.status,
          w.category_id,
        w.project_id,
        w.sort_order,
        w.uom,
        w.quantity_budgeted,
        w.days_budgeted,
        w.unit_cost_budgeted,
        w.custom_metadata,
          (
              SELECT COALESCE(SUM(b.total_cost_budgeted), 0)
              FROM wbs_budget b
              WHERE b.wbs_id IN (
                  WITH RECURSIVE descendants AS (
                      SELECT wbs_id FROM wbs_budget WHERE wbs_id = w.wbs_id
                      UNION ALL
                      SELECT c.wbs_id FROM wbs_budget c INNER JOIN descendants d ON c.parent_wbs_id = d.wbs_id
                  )
                  SELECT wbs_id FROM descendants
              )
          ) as total_cost_budgeted_rollup,
          (
              SELECT COUNT(*) > 0 FROM wbs_budget ch WHERE ch.parent_wbs_id = w.wbs_id
          ) as has_children,
          (
              SELECT COALESCE(SUM(amount), 0) 
              FROM live_expense e 
              WHERE e.tenant_id = w.tenant_id 
              AND e.wbs_id IN (
                  WITH RECURSIVE descendants AS (
                      SELECT wbs_id FROM wbs_budget WHERE wbs_id = w.wbs_id
                      UNION ALL
                      SELECT b.wbs_id FROM wbs_budget b INNER JOIN descendants d ON b.parent_wbs_id = d.wbs_id
                  )
                  SELECT wbs_id FROM descendants
              )
              ${dateFiltersLive}
          ) as total_paid_rollup,
          (
              SELECT COALESCE(SUM(amount), 0) 
              FROM live_expense e 
              WHERE e.wbs_id = w.wbs_id
              ${dateFiltersLive}
          ) as total_paid_self,
          (
              SELECT COALESCE(SUM(amount_committed), 0) 
              FROM lpo l
              WHERE l.tenant_id = w.tenant_id 
              AND l.wbs_id IN (
                  WITH RECURSIVE descendants AS (
                      SELECT wbs_id FROM wbs_budget WHERE wbs_id = w.wbs_id
                      UNION ALL
                      SELECT b.wbs_id FROM wbs_budget b INNER JOIN descendants d ON b.parent_wbs_id = d.wbs_id
                  )
                  SELECT wbs_id FROM descendants
              )
              ${dateFiltersLpo}
          ) as total_committed_lpo
      FROM wbs_budget w
      WHERE w.tenant_id = $1
      ${projectIdClause}
      ORDER BY w.sort_order ASC, w.wbs_code ASC
    `;

    const finalResults = await this.dataSource.query(query, queryParams);

    return finalResults.map((r: any) => {
      const hasChildren = r.has_children === true || r.has_children === 't';
      const ownBudget = r.total_cost_budgeted ? parseFloat(r.total_cost_budgeted.toString()) : 0;
      const rollupBudget = r.total_cost_budgeted_rollup ? parseFloat(r.total_cost_budgeted_rollup.toString()) : 0;

      return {
        wbs_id: r.wbs_id,
        parent_wbs_id: r.parent_wbs_id,
        wbs_code: r.wbs_code,
        description: r.description,
        total_cost_budgeted: hasChildren ? rollupBudget : ownBudget, // FIX: Parents sum their children, leaves use their own budget
        total_cost_budgeted_rollup: rollupBudget,
        has_children: hasChildren,
        total_paid_rollup: r.total_paid_rollup ? parseFloat(r.total_paid_rollup.toString()) : 0,
        total_paid_self: r.total_paid_self ? parseFloat(r.total_paid_self.toString()) : 0,
        total_committed_lpo: r.total_committed_lpo ? parseFloat(r.total_committed_lpo.toString()) : 0,
        status: r.status,
        category_id: r.category_id,
        project_id: r.project_id,
        sort_order: r.sort_order ? parseInt(r.sort_order.toString()) : 0,
        uom: r.uom,
        quantity_budgeted: r.quantity_budgeted ? parseFloat(r.quantity_budgeted.toString()) : null,
        days_budgeted: r.days_budgeted ? parseFloat(r.days_budgeted.toString()) : null,
        unit_cost_budgeted: r.unit_cost_budgeted ? parseFloat(r.unit_cost_budgeted.toString()) : null,
        custom_metadata: r.custom_metadata,
      };
    });
  }

  async exportWbsBudgetsToCsv(
    getWbsBudgetsDto: GetWbsBudgetsDto,
    tenant_id: string,
  ): Promise<Buffer> {
    const { data: wbsBudgets } = await this.findAllWbsBudgets(
      getWbsBudgetsDto,
      tenant_id,
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
          `"${budget.wbs_id}"`,
          `"${budget.wbs_code}"`,
          `"${budget.description.replace(/"/g, '""')}"`,
          budget.unit_cost_budgeted,
          budget.days_budgeted,
          budget.total_cost_budgeted,
          budget.status,
          `"${budget.category?.name || "N/A"}"`,
          `"${budget.project?.project_name || "N/A"}"`,
          budget.created_at.toISOString(),
          budget.updated_at?.toISOString() || "", // Added null check
        ].join(","),
      ),
    ];

    return Buffer.from(csvRows.join("\n"), "utf8");
  }

  async exportLiveExpensesToCsv(
    getLiveExpensesDto: GetLiveExpensesDto,
    tenant_id: string,
  ): Promise<Buffer> {
    const { data: liveExpenses } = await this.findAllLiveExpenses(
      getLiveExpensesDto,
      tenant_id,
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
        ].join(","),
      ),
    ];

    return Buffer.from(csvRows.join("\n"), "utf8");
  }

  // --- PHASE 12: DOSSIER ANALYTICS ---

  async findBudgetDossier(id: string, tenant_id: string) {
    const budget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id },
      relations: ['project', 'category', 'user']
    });

    if (!budget) {
      throw new NotFoundException(`Budget item ${id} not found.`);
    }

    // Calculate Rollups
    const rollupResults = await this.getWbsBudgetRollup(tenant_id, { 
      projectId: budget.project_id 
    });
    
    const budgetRollup = rollupResults.find(r => r.wbs_id === id);
    const totalPaidRollup = budgetRollup?.total_paid_rollup || 0;
    const remainingBudget = Number(budget.total_cost_budgeted) - totalPaidRollup;
    const burnRate = Number(budget.total_cost_budgeted) > 0 
      ? (totalPaidRollup / Number(budget.total_cost_budgeted)) * 100 
      : 0;

    // Fetch Recent Related Expenses
    const expenses = await this.liveExpenseRepository.find({
      where: { wbs_id: id, tenant_id },
      order: { expense_date: 'DESC' },
      take: 10
    });

    return {
      wbs_id: budget.wbs_id,
      wbs_code: budget.wbs_code,
      description: budget.description,
      total_cost_budgeted: budget.total_cost_budgeted,
      project_id: budget.project_id,
      project_name: budget.project?.project_name || 'N/A',
      project_currency: budget.project?.currency || 'NGN',
      created_at: budget.created_at,
      status: budget.status,
      total_paid_rollup: totalPaidRollup,
      remaining_budget: remainingBudget,
      burn_rate: burnRate,
      expenses: expenses.map(e => ({
        expense_id: e.id,
        description: e.description,
        actual_paid_amount: e.amount,
        expense_date: e.expense_date,
        variance_flag: e.variance_flag
      }))
    };
  }

  async findExpenseDossier(id: string, tenant_id: string) {
    const expense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id },
      relations: ['wbsBudget', 'wbsBudget.project']
    });

    if (!expense) {
      throw new NotFoundException(`Expense entry ${id} not found.`);
    }

    // Fetch user email for attribution
    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: expense.user_id },
      select: ['email']
    });

    return {
      expense_id: expense.id,
      wbs_id: expense.wbs_id,
      wbs_code: expense.wbsBudget?.wbs_code || 'N/A',
      budget_description: expense.wbsBudget?.description || 'N/A',
      project_id: expense.project_id,
      project_name: expense.wbsBudget?.project?.project_name || 'N/A',
      project_currency: expense.wbsBudget?.project?.currency || 'NGN',
      description: expense.description,
      actual_paid_amount: expense.amount,
      expense_date: expense.expense_date,
      variance_flag: expense.variance_flag,
      created_at: expense.created_at,
      performed_by_email: user?.email || 'System/Unknown'
    };
  }

  async importWbsFromCsv(
    projectId: string,
    csvContent: string,
    userId: string,
    tenant_id: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length <= 1) return { imported: 0, errors: ['CSV is empty or missing data'] };

    // Basic CSV parser that handles quoted strings
    const parseCsvLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const dataRows = lines.slice(1);

    const importDtos: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = parseCsvLine(dataRows[i]);
      const dto: any = { project_id: projectId };

      headers.forEach((header, index) => {
        const val = row[index];
        if (!val) return;

        if (header.includes('code')) dto.wbs_code = val;
        else if (header.includes('description')) dto.description = val;
        else if (header.includes('unit cost')) dto.unit_cost_budgeted = parseFloat(val) || 0;
        else if (header.includes('quantity')) dto.quantity_budgeted = parseFloat(val) || 0;
        else if (header.includes('days')) dto.days_budgeted = parseInt(val) || 1;
        else if (header.includes('parent')) dto.parent_wbs_code = val; // Store for matching
      });

      if (!dto.wbs_code || !dto.description) {
        errors.push(`Row ${i + 2}: Missing WBS Code or Description`);
        continue;
      }
      importDtos.push(dto);
    }

    if (importDtos.length === 0) return { imported: 0, errors };

    // Step 2: Resolve parent-child relationships if parent codes are provided
    // This requires two passes or a clever mapping. 
    // Since createWbsBudgetDraftBatch handles flat lists, we'll implement a localized version here
    // that resolves codes to parent IDs within this batch or against existing ones.
    
    const codeToId: Record<string, string> = {};
    let importedCount = 0;

    // We process one by one to handle hierarchy correctly within the import
    for (const dto of importDtos) {
      const parentId = dto.parent_wbs_code ? codeToId[dto.parent_wbs_code] : null;
      try {
        const savedItem = await this.createWbsBudgetDraft({
          ...dto,
          parent_wbs_id: parentId,
        }, userId, tenant_id);
        codeToId[dto.wbs_code] = savedItem.wbs_id;
        importedCount++;
      } catch (err: any) {
        errors.push(`Failed to import ${dto.wbs_code}: ${err.message}`);
      }
    }

    return { imported: importedCount, errors };
  }

  async reorderWbsItems(
    items: { id: string; sort_order: number }[],
    tenant_id: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const item of items) {
        await queryRunner.manager.update(
          WbsBudgetEntity,
          { wbs_id: item.id, tenant_id },
          { sort_order: item.sort_order }
        );
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async importWbsFromExcel(
    projectId: string,
    fileBuffer: Buffer,
    userId: string,
    tenant_id: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException("No worksheet found in Excel file.");
    }
    
    const importDtos: any[] = [];
    const errors: string[] = [];
    
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.text.toLowerCase());
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const dto: any = { project_id: projectId };
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (!header) return;
        const val = cell.text;

        if (header.includes('code') && !header.includes('parent')) dto.wbs_code = val;
        else if (header.includes('description')) dto.description = val;
        else if (header.includes('unit cost')) dto.unit_cost_budgeted = parseFloat(val) || 0;
        else if (header.includes('quantity')) dto.quantity_budgeted = parseFloat(val) || 1;
        else if (header.includes('days')) dto.days_budgeted = parseInt(val) || 1;
        else if (header.includes('total')) dto.total_cost_budgeted = parseFloat(val) || 0;
        else if (header.includes('parent')) dto.parent_wbs_code = val;
      });

      if (!dto.wbs_code || !dto.description) {
        errors.push(`Row ${rowNumber}: Missing WBS Code or Description`);
        return;
      }
      importDtos.push(dto);
    });

    const codeToId: Record<string, string> = {};
    let importedCount = 0;

    for (const dto of importDtos) {
      const parentId = dto.parent_wbs_code ? codeToId[dto.parent_wbs_code] : null;
      try {
        const savedItem = await this.createWbsBudgetDraft({
          ...dto,
          parent_wbs_id: parentId,
        }, userId, tenant_id);
        codeToId[dto.wbs_code] = savedItem.wbs_id;
        importedCount++;
      } catch (err: any) {
        errors.push(`Failed to import ${dto.wbs_code}: ${err.message}`);
      }
    }

    return { imported: importedCount, errors };
  }

  /**
   * ADVANCED: Intelligent Impact Analysis for approvals.
   * Calculates how a specific draft affects project-wide financial health.
   */
  async getBudgetImpactAnalysis(
    draftId: string,
    tenantId: string,
  ): Promise<BudgetImpactAnalysisDto> {
    const draft = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: draftId, tenant_id: tenantId },
      relations: ['project', 'category'],
    });

    if (!draft) {
      throw new NotFoundException(`Budget draft ${draftId} not found`);
    }

    const projectId = draft.project_id;
    const project = draft.project;

    if (!project) {
        throw new BadRequestException("Draft is not associated with a project.");
    }

    // 1. Core Financial Baseline
    const approvedResult = await this.wbsBudgetRepository
      .createQueryBuilder('wbs')
      .select('SUM(wbs.total_cost_budgeted)', 'total')
      .where('wbs.project_id = :projectId', { projectId })
      .andWhere('wbs.tenant_id = :tenantId', { tenantId })
      .andWhere('wbs.status = :status', { status: WbsBudgetStatus.APPROVED })
      .andWhere('wbs.parent_wbs_id IS NULL')
      .getRawOne();

    const pendingResult = await this.wbsBudgetRepository
      .createQueryBuilder('wbs')
      .select('SUM(wbs.total_cost_budgeted)', 'total')
      .where('wbs.project_id = :projectId', { projectId })
      .andWhere('wbs.tenant_id = :tenantId', { tenantId })
      .andWhere('wbs.status = :status', { status: WbsBudgetStatus.PENDING })
      .andWhere('wbs.parent_wbs_id IS NULL')
      .getRawOne();

    const totalApprovedAmount = parseFloat(approvedResult?.total || '0');
    const totalPendingAmount = parseFloat(pendingResult?.total || '0');
    const contractValue = Number(project.contract_value || 0);

    // 2. Simulated Impact
    const draftAmount = Number(draft.total_cost_budgeted || 0);
    const newTotalIfApproved = totalApprovedAmount + draftAmount;
    const remainingContractBuffer = Math.max(0, contractValue - newTotalIfApproved);
    const percentage = contractValue > 0 ? (newTotalIfApproved / contractValue) * 100 : 0;

    // 3. Tax Impact (VAT/WHT)
    const vatRate = Number(project.vat_rate || 7.5) / 100;
    const whtRate = Number(project.wht_rate || 5.0) / 100;
    const estimatedVatImpact = draftAmount * vatRate;
    const estimatedWhtImpact = draftAmount * whtRate;

    // 4. Risk Intelligence (Historical Volatility)
    const { logs } = await this.auditService.findAuditLogs({
      targetType: 'WBS_BUDGET',
      action: 'STATUS_UPDATE', // Filter for status changes
      tenantId: tenantId as any,
      limit: 100,
    });

    const relevantLogs = logs.filter(l => l.targetId === draftId);
    // Find previous rejections (status changed to REJECTED in details)
    const previousRejections = relevantLogs.filter(l => (l.details as any)?.newStatus === WbsBudgetStatus.REJECTED);
    const rejectionsCount = previousRejections.length;
    
    // Volatility Score: Higher based on rejections and total status changes
    const volatilityScore = (rejectionsCount * 30) + (relevantLogs.length * 5);

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (percentage > 100) riskLevel = 'CRITICAL';
    else if (percentage > 90 || volatilityScore > 50) riskLevel = 'HIGH';
    else if (percentage > 75 || volatilityScore > 30) riskLevel = 'MEDIUM';

    return {
      draftId,
      projectId,
      projectName: project.project_name,
      draftAmount,
      totalApprovedAmount,
      totalPendingAmount,
      contractValue,
      newTotalIfApproved,
      remainingContractBuffer,
      percentageOfContractValue: percentage,
      estimatedVatImpact,
      estimatedWhtImpact,
      volatilityScore,
      previousRejectionsCount: rejectionsCount,
      riskLevel,
      categoryName: draft.category?.name,
    };
  }

  async validateWbsItemDraft(
    dto: CreateWbsBudgetDto,
    tenantId: string,
    existingItemId?: string,
  ): Promise<WbsValidationResultDto> {
    const conflicts: WbsValidationResultDto['conflicts'] = [];
    const { wbs_code, parent_wbs_id, project_id, total_cost_budgeted, unit_cost_budgeted, quantity_budgeted, days_budgeted } = dto;

    if (!project_id) {
        return { 
          isValid: false, 
          conflicts: [{ type: 'PROJECT_MISMATCH', severity: 'CRITICAL', message: 'Project context is missing.' }], 
          summary: 'Validation failed: Missing project context.' 
        };
    }

    const duplicate = await this.wbsBudgetRepository.findOne({
      where: { wbs_code, project_id, tenant_id: tenantId }
    });

    if (duplicate && duplicate.wbs_id !== existingItemId) {
      conflicts.push({
        type: 'DUPLICATE_CODE',
        severity: 'CRITICAL',
        message: `WBS Code "${wbs_code}" is already in use for this project.`,
      });
    }

    const unitCost = unit_cost_budgeted || 0;
    const qty = quantity_budgeted || 1;
    const days = days_budgeted || 1;
    const computedTotal = unitCost * qty * days;
    const draftAmount = total_cost_budgeted && total_cost_budgeted > 0 ? total_cost_budgeted : computedTotal;

    if (parent_wbs_id) {
      const parent = await this.wbsBudgetRepository.findOne({
        where: { wbs_id: parent_wbs_id, tenant_id: tenantId }
      });

      if (parent) {
        if (!wbs_code.startsWith(parent.wbs_code + '.')) {
             conflicts.push({
                type: 'HIERARCHY_MISMATCH',
                severity: 'WARNING',
                message: `WBS Code "${wbs_code}" should start with "${parent.wbs_code}."`,
             });
        }
        if (parent.project_id !== project_id) {
             conflicts.push({
                type: 'PROJECT_MISMATCH',
                severity: 'CRITICAL',
                message: 'Parent item project mismatch detected.',
             });
        }

        const brothers = await this.wbsBudgetRepository.find({
            where: { parent_wbs_id, tenant_id: tenantId }
        });
        
        let childrenTotal = 0;
        for (const brother of brothers) {
            if (brother.wbs_id !== existingItemId) {
                childrenTotal += Number(brother.total_cost_budgeted || 0);
            }
        }

        const parentLimit = Number(parent.total_cost_budgeted || 0);
        if (parentLimit > 0 && (childrenTotal + draftAmount) > parentLimit) {
            conflicts.push({
                type: 'BUDGET_OVERRUN',
                severity: 'WARNING',
                message: 'Structural Overage: subtree budget exceeds parent limit.',
            });
        }
      }
    }

    const criticalCount = conflicts.filter(c => c.severity === 'CRITICAL').length;
    
    return {
      isValid: criticalCount === 0,
      conflicts,
      summary: conflicts.length === 0 
        ? 'Code and Budget structure are healthy.' 
        : `Detected ${conflicts.length} structural issue(s).`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // APPROVAL RECALL
  // Allows a senior authorizer (CFO / AdminDirector / CEO) to revoke a previously
  // approved budget and place it back into the pending-approval queue.
  // ─────────────────────────────────────────────────────────────────────────────
  async recallWbsBudgetApproval(
    wbsId: string,
    tenantId: string,
    recalledBy: UserPayload,
    reason?: string,
  ): Promise<WbsBudgetEntity> {
    const budget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: wbsId, tenant_id: tenantId },
    });

    if (!budget) {
      throw new NotFoundException(`WBS Budget item "${wbsId}" not found.`);
    }

    if (budget.status !== WbsBudgetStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot recall: Budget status is "${budget.status}". Only APPROVED budgets can be recalled.`,
      );
    }

    const previousStatus = budget.status;
    budget.status = WbsBudgetStatus.RECALLED;
    const updated = await this.wbsBudgetRepository.save(budget);

    // Audit trail
    try {
      await this.auditService.log(
        recalledBy.id,
        'RECALL_APPROVAL',
        tenantId,
        `Budget ${wbsId} approval recalled by ${recalledBy.email}`,
        {
          entity: 'WbsBudget',
          entityId: wbsId,
          previous_status: previousStatus,
          new_status: WbsBudgetStatus.RECALLED,
          reason: reason || 'No reason provided',
        },
        recalledBy.email
      );
    } catch (e) {
      this.logger.warn(`Audit log failed for recall on ${wbsId}: ${(e as Error).message}`);
    }

    this.logger.log(
      `Budget ${wbsId} approval recalled by ${recalledBy.email}.`,
    );

    return updated;
  }

  /**
   * CAPEX Portfolio Intelligence Dashboard Aggregation.
   * Supports Portfolio mode (all projects) and Drill-Down mode (single project).
   */
  async getCapexIntelligence(tenantId: string, projectId?: string): Promise<any> {
    try {
      this.logger.log(`Fetching CAPEX Intelligence for tenant ${tenantId}, project ${projectId ?? 'ALL'}`);
      const projectRepo = this.dataSource.getRepository(ProjectEntity);

      const projectQuery = projectRepo.createQueryBuilder('p')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.deleted_at IS NULL');
      if (projectId) {
        projectQuery.andWhere('p.project_id = :projectId', { projectId });
      }
      const projects = await projectQuery.getMany();
      const projectIds = projects.map(p => p.project_id);
      
      if (projectIds.length === 0) {
        return {
          kpis: { totalPortfolioValue: 0, activeProjects: 0, avgUtilization: 0, totalBudgeted: 0, totalActual: 0, totalLpoCommitments: 0, remainingBudget: 0 },
          monthlyBurnByCategory: [], portfolioHeatMap: [], topCostOverruns: [], projectList: [],
        };
      }

      const monthlyBurn: any[] = await this.dataSource.query(
        `SELECT TO_CHAR(le.expense_date, 'YYYY-MM') as month,
          COALESCE(wc.name, 'Uncategorized') as category,
          SUM(le.amount) as actual
        FROM live_expense le
        LEFT JOIN wbs_budget wb ON wb.wbs_id = le.wbs_id
        LEFT JOIN wbs_category wc ON wc.id = wb.category_id
        WHERE le.project_id = ANY($1)
        AND le.expense_date >= NOW() - INTERVAL '12 months'
        GROUP BY month, category ORDER BY month ASC`,
        [projectIds],
      );

      const portfolioHeatMap: any[] = await this.dataSource.query(
        `SELECT p.project_id as id, p.project_name as name, p.contract_value,
          COALESCE(SUM(wb.total_cost_budgeted), 0) as total_budgeted,
          COALESCE(SUM(wb.total_cost_actual), 0) as total_actual,
          COALESCE(SUM(wb.total_committed_lpo), 0) as total_committed,
          CASE WHEN COALESCE(SUM(wb.total_cost_budgeted),0) > 0
            THEN ROUND((COALESCE(SUM(wb.total_cost_actual),0) / NULLIF(SUM(wb.total_cost_budgeted),0)) * 100, 1)
            ELSE 0 END as utilization_pct,
          CASE
            WHEN COALESCE(SUM(wb.total_cost_budgeted),0) > 0
              AND ROUND((COALESCE(SUM(wb.total_cost_actual),0) / NULLIF(SUM(wb.total_cost_budgeted),0)) * 100, 1) > 90 THEN 'CRITICAL'
            WHEN COALESCE(SUM(wb.total_cost_budgeted),0) > 0
              AND ROUND((COALESCE(SUM(wb.total_cost_actual),0) / NULLIF(SUM(wb.total_cost_budgeted),0)) * 100, 1) > 70 THEN 'WARNING'
            ELSE 'OK'
          END as rag_status
        FROM project p
        LEFT JOIN wbs_budget wb ON wb.project_id = p.project_id
        WHERE p.project_id = ANY($1)
        GROUP BY p.project_id, p.project_name, p.contract_value
        ORDER BY utilization_pct DESC`,
        [projectIds],
      );

      const topCostOverruns = portfolioHeatMap
        .filter((p: any) => Number(p.total_actual) > Number(p.total_budgeted))
        .map((p: any) => ({
          ...p,
          variance: Number(p.total_actual) - Number(p.total_budgeted),
          variance_pct: Number(p.total_budgeted) > 0
            ? Math.round(((Number(p.total_actual) - Number(p.total_budgeted)) / Number(p.total_budgeted)) * 100)
            : 0,
        }))
        .sort((a: any, b: any) => b.variance_pct - a.variance_pct)
        .slice(0, 5);

      const totalBudgeted = portfolioHeatMap.reduce((s: number, p: any) => s + Number(p.total_budgeted || 0), 0);
      const totalActual = portfolioHeatMap.reduce((s: number, p: any) => s + Number(p.total_actual || 0), 0);
      const totalCommitted = portfolioHeatMap.reduce((s: number, p: any) => s + Number(p.total_committed || 0), 0);
      const totalPortfolioValue = portfolioHeatMap.reduce((s: number, p: any) => s + Number(p.contract_value || 0), 0);

      const result = {
        kpis: {
          totalPortfolioValue,
          activeProjects: projects.length,
          avgUtilization: totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0,
          totalBudgeted,
          totalActual,
          totalLpoCommitments: totalCommitted,
          remainingBudget: totalBudgeted - totalActual,
        },
        monthlyBurnByCategory: monthlyBurn,
        portfolioHeatMap,
        topCostOverruns,
        projectList: projects.map(p => ({ id: p.project_id, name: p.project_name })),
      };

      return result;
    } catch (err: any) {
      throw err;
    }
  }
}