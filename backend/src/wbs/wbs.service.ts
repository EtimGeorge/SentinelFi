import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ClsServiceManager } from "nestjs-cls";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  DataSource,
  In,
  IsNull,
} from "typeorm";

import { WbsBudgetEntity } from "./wbs-budget.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { UpdateWbsBudgetDto } from "./dto/update-wbs-budget.dto";
import { LpoEntity } from "../projects/lpo.entity";
import { LiveExpenseEntity } from "./live-expense.entity";
import type { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { UpdateLiveExpenseDto } from "./dto/update-live-expense.dto";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { Inject, forwardRef } from "@nestjs/common";
import { GetWbsBudgetsDto } from "./dto/get-wbs-budgets.dto";
import { GetLiveExpensesDto } from "./dto/get-live-expenses.dto";
import {
  WBS_BUDGET_SORT_COLUMNS,
  LIVE_EXPENSE_SORT_COLUMNS,
} from "./wbs-sort.constants";
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";
import { CreateWbsCategoryDto } from "./dto/create-wbs-category.dto";
import { WbsTemplateEntity } from "./wbs-template.entity";
import {
  analyseDelimitedText,
  analyseSpreadsheetFile,
  codeKey,
  describeImportBlockers,
  importableRows,
  toCreateWbsBudgetPayload,
  SpreadsheetTooLargeError,
  MAX_IMPORT_BYTES,
  MAX_DATA_ROWS,
  type MappedRow,
  type WbsImportAnalysis,
  type WbsImportResult,
  type WbsImportMode,
} from "./utils/wbs-spreadsheet-import.util";
import {
  UserPayload,
  WbsBudgetStatus,
  VarianceFlag,
  ApprovalStatus,
} from "@shared/types";
import { CreateWbsTemplateDto } from "./dto/create-wbs-template.dto";
import { ProjectEntity } from "../projects/project.entity";

import { ProjectsService } from "../projects/projects.service";
import { UserEntity } from "../auth/user.entity"; // NEW: Import UserEntity
import { Buffer } from "buffer"; // Needed for export methods
import { randomUUID } from "crypto";
import { NotificationsService } from "../notifications/notifications.service"; // NEW: Import NotificationsService
import { BudgetControlService } from "../common/budget-control.service";
import { queryOutstandingCommitment } from "../common/outstanding-commitment";
import { DOAService } from "../common/doa.service";
import {
  ApprovalLogEntity,
  ApprovalDocumentType,
} from "../common/entities/approval-log.entity";
import { AuditService } from "../audit/audit.service";
import { BudgetImpactAnalysisDto } from "./dto/budget-impact-analysis.dto";
import { WbsValidationResultDto } from "./dto/wbs-validation-result.dto";
import * as fs from "fs";
import * as path from "path";
import * as hbs from "handlebars";
import { format } from "date-fns";
import { PdfGenerationService } from "../common/pdf-generation.service";
import { TenantService } from "../tenants/tenant.service";
import { FinancialForensicsService } from "../common/services/financial-forensics.service";
import {
  CurrencyService,
  convertWithMap,
} from "../currency/currency.service";



/**
 * Rows written per INSERT during a spreadsheet import. Chunking keeps a
 * 5,000-row file from becoming one multi-megabyte statement, while staying
 * large enough that the whole import is a handful of round trips.
 */
const WBS_IMPORT_CHUNK = 100;

/** Sentinel for the top level of the tree when keying siblings. */
const ROOT_SIBLING_KEY = "__root__";

/** Marks an id that exists only inside a dry run and was never persisted. */
const PREVIEW_ID_PREFIX = "preview:";

/**
 * Category labels are matched across spreadsheets written by hand, so case,
 * spacing and punctuation are normalised before comparison. "Civil Works ",
 * "civil-works" and "CIVIL WORKS" are the same category to an operator.
 */
function normaliseCategoryKey(label: string | null | undefined): string {
  return String(label ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface WbsBudgetRollupQueryResult {  wbs_id: string;
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
    private readonly pdfService: PdfGenerationService,
    @Inject(forwardRef(() => TenantService))
    private readonly tenantService: TenantService,
    private readonly forensicsService: FinancialForensicsService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Intermittent `relation "wbs_budget" does not exist` is a search_path problem,
   * not a missing-table problem, so the log line has to answer two questions at
   * once: which request produced it, and which schema the pooled connection was
   * actually pointed at. A bare error message cannot distinguish these:
   *
   *   - SCHEMA_NAME resolved to "public" (or is missing) while tenant_id is a
   *     real tenant -> the guard/CLS fallback routed the query to the wrong
   *     schema.
   *   - SCHEMA_NAME is a valid tenant schema            -> the pooled
   *     connection was reused without search_path being re-applied.
   *
   * The correlation id is the join key between the client-visible failure and
   * this server-side line, so it is always included.
   */
  private tenancySnapshot(tenantId?: string | null): string {
    let correlationId = "no-cid";
    let clsTenantId: string | null = null;
    let schemaName: string | null = null;
    try {
      const cls = ClsServiceManager.getClsService();
      correlationId = cls.get("X-Correlation-Id") ?? "no-cid";
      clsTenantId = cls.get("tenant_id") ?? null;
      schemaName = cls.get("SCHEMA_NAME") ?? null;
    } catch {
      // CLS unavailable (bootstrap/tests). The schema is reported as unknown
      // rather than guessed, because guessing here is what hides the bug.
      correlationId = "cls-unavailable";
    }
    return `[CID: ${correlationId}] [tenant_id: ${clsTenantId ?? "null"}] [requested_tenant: ${tenantId ?? "null"}] [SCHEMA_NAME: ${schemaName ?? "UNSET->public"}]`;
  }

  // Centralized Governance Constants for "Bulletproof" Verification
  private readonly CRITICAL_OVERRIDE_ROLES = [
    "CFO",
    "CEO",
    "Admin Director",
    "SuperAdmin",
  ];
  private readonly MAJOR_OVERRIDE_ROLES = [
    "Finance Manager",
    "CFO",
    "CEO",
    "Admin Director",
    "SuperAdmin",
    "Finance Officer",
  ];

  // WBS Budget (Draft) Operations
  /**
   * BE-2: best-effort project-journal write. The audit trail must never break
   * the money path, so failures are logged, not thrown. Skipped when there is
   * no project to attribute the event to, or no actor to attribute it by
   * (performed_by_user_id is non-nullable).
   */
  private async auditProjectEvent(
    projectId: string | null | undefined,
    tenantId: string,
    userId: string | null | undefined,
    changeType: string,
    oldValue: number | null,
    newValue: number | null,
    description: string,
  ): Promise<void> {
    if (!projectId || !userId) return;
    try {
      await this.projectsService.logAudit(
        projectId,
        tenantId,
        userId,
        changeType,
        oldValue,
        newValue,
        description,
      );
    } catch (err) {
      this.logger.warn(
        `[WBS] project_audit write failed (${changeType}): ${(err as Error).message}`,
      );
    }
  }

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
    const finalTotal =
      total_cost_budgeted && total_cost_budgeted > 0
        ? total_cost_budgeted
        : computedTotal;

    // Get max sort_order for siblings
    const maxSortItem = await this.wbsBudgetRepository.findOne({
      where: {
        parent_wbs_id: parent_wbs_id ?? IsNull(),
        tenant_id: tenant_id,
        project_id: project_id,
      },
      order: { sort_order: "DESC" },
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
      await this.validateBudgetAgainstContractValue(
        project_id,
        tenant_id,
        project,
      );
    }

    await this.auditProjectEvent(
      saved.project_id,
      tenant_id,
      userId,
      "WBS_CREATED",
      null,
      Number(saved.total_cost_budgeted),
      `WBS "${saved.wbs_code}" created as draft (${saved.description || "no description"}).`,
    );

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
      const finalTotal =
        dto.total_cost_budgeted && dto.total_cost_budgeted > 0
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

    const savedBatch = await this.wbsBudgetRepository.save(wbsBudgets);

    // One journal row per project (batches may span projects).
    const batchAgg = new Map<string, { count: number; total: number }>();
    for (const item of savedBatch) {
      if (!item.project_id) continue;
      const agg = batchAgg.get(item.project_id) ?? { count: 0, total: 0 };
      agg.count += 1;
      agg.total += Number(item.total_cost_budgeted) || 0;
      batchAgg.set(item.project_id, agg);
    }
    for (const [pid, agg] of batchAgg) {
      await this.auditProjectEvent(
        pid,
        tenant_id,
        userId,
        "WBS_BATCH_CREATED",
        null,
        agg.total,
        `Batch draft creation: ${agg.count} WBS line(s) created as draft.`,
      );
    }

    return savedBatch;
  }

  async updateWbsBudget(
    id: string,
    updateWbsBudgetDto: UpdateWbsBudgetDto,
    tenant_id: string,
    actorId?: string,
  ): Promise<WbsBudgetEntity> {
    const wbsBudget = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsBudget) {
      throw new NotFoundException(
        `WBS Budget with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    // --- [BASELINE LOCK] Approved (or in-review) budget lines are baselined.
    // Direct edits would silently rewrite financial history that expenses,
    // LPOs and reports already consumed. DRAFT/REJECTED/RECALLED lines stay
    // editable; APPROVED/PENDING lines must go through recall first so the
    // change is re-approved and audited.
    if (
      wbsBudget.status === WbsBudgetStatus.APPROVED ||
      wbsBudget.status === WbsBudgetStatus.PENDING
    ) {
      throw new BadRequestException(
        `BASELINE_LOCKED: WBS "${wbsBudget.wbs_code}" is ${wbsBudget.status} and baselined. ` +
          `Recall the approval first (PATCH /wbs/budget/:id/recall), edit, then resubmit — ` +
          `direct edits to baselined lines are blocked to preserve the financial audit trail.`,
      );
    }

    const oldTotal = Number(wbsBudget.total_cost_budgeted);
    this.wbsBudgetRepository.merge(wbsBudget, updateWbsBudgetDto);
    const savedBudget = await this.wbsBudgetRepository.save(wbsBudget);
    await this.auditProjectEvent(
      savedBudget.project_id,
      tenant_id,
      actorId,
      "WBS_UPDATED",
      Number.isNaN(oldTotal) ? null : oldTotal,
      Number(savedBudget.total_cost_budgeted),
      `WBS "${savedBudget.wbs_code}" edited while ${savedBudget.status}.`,
    );
    return savedBudget;
  }

  async deleteWbsItem(
    id: string, // Keep 'id' as parameter name for controller consistency
    tenant_id: string,
    options: { recursive: boolean } = { recursive: false },
    actorId?: string,
  ): Promise<void> {
    const wbsItem = await this.wbsBudgetRepository.findOne({
      where: { wbs_id: id, tenant_id: tenant_id }, // Changed id to wbs_id
    });

    if (!wbsItem) {
      throw new NotFoundException(
        `WBS item with ID ${id} not found for tenant ${tenant_id}`,
      );
    }

    // --- [GUARD] Approved budgets cannot be destroyed while they carry spend ---
    if (wbsItem.status === WbsBudgetStatus.APPROVED) {
      const expenseCount = await this.liveExpenseRepository.count({
        where: { wbs_id: id, tenant_id: tenant_id },
      });
      const lpoCount = await this.dataSource
        .getRepository(LpoEntity)
        .count({ where: { wbs_id: id, tenant_id: tenant_id } });
      if (expenseCount > 0 || lpoCount > 0) {
        throw new BadRequestException(
          "CRITICAL_INTEGRITY_BLOCK: This approved WBS line already has expenses or LPO commitments. It cannot be deleted. Recall or archive the budget instead.",
        );
      }
    }

    // --- [GUARD] Child lines require explicit recursive deletion ---
    const children = await this.findAllChildren(id, tenant_id);
    const childIds = children.map((child) => child.wbs_id);
    if (childIds.length > 0 && !options.recursive) {
      throw new BadRequestException(
        `WBS item "${wbsItem.wbs_code}" has ${childIds.length} child line(s). Deletion requires the "recursive" flag.`,
      );
    }

    // --- [GUARD] Detect dangling financial references before hitting the FK constraint ---
    const childAndSelf = [id, ...childIds];
    for (const wbsId of childAndSelf) {
      const expenseCount = await this.liveExpenseRepository.count({
        where: { wbs_id: wbsId, tenant_id: tenant_id },
      });
      if (expenseCount > 0) {
        throw new BadRequestException(
          "CRITICAL_INTEGRITY_BLOCK: One or more lines under this WBS item have posted expense entries. Delete the expenses first, or archive the budget to preserve the financial audit trail.",
        );
      }
      const lpoCount = await this.dataSource
        .getRepository(LpoEntity)
        .count({ where: { wbs_id: wbsId, tenant_id: tenant_id } });
      if (lpoCount > 0) {
        throw new BadRequestException(
          "CRITICAL_INTEGRITY_BLOCK: One or more lines under this WBS item have LPO commitments. Delete the LPOs first, or archive the budget to preserve the financial audit trail.",
        );
      }
    }

    if (options.recursive) {
      if (childIds.length > 0) {
        await this.wbsBudgetRepository.delete({
          wbs_id: In(childIds),
          tenant_id: tenant_id,
        });
      }
    }

    await this.wbsBudgetRepository.delete({ wbs_id: id, tenant_id: tenant_id });

    await this.auditProjectEvent(
      wbsItem.project_id,
      tenant_id,
      actorId,
      "WBS_DELETED",
      Number(wbsItem.total_cost_budgeted),
      null,
      `WBS "${wbsItem.wbs_code}" deleted${options.recursive && childIds.length > 0 ? ` with ${childIds.length} child line(s)` : ""}.`,
    );
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
      ? await this.wbsBudgetRepository.findOne({
          where: { wbs_id, tenant_id },
          relations: ["project"],
        })
      : null;

    if (wbs_id && !wbsItem) {
      throw new NotFoundException(
        `WBS Budget line with ID "${wbs_id}" not found for this tenant.`,
      );
    }

    // --- [GUARD] Budget State Check ---
    if (
      wbsItem &&
      wbsItem.status !== WbsBudgetStatus.APPROVED &&
      wbsItem.status !== WbsBudgetStatus.RECALLED
    ) {
      throw new BadRequestException(
        `"${wbsItem.wbs_code}" cannot be used for expenses because it is in ${wbsItem.status} status. It must be APPROVED or RECALLED first.`,
      );
    }

    // --- 2. Variance & Override Check ---
    let approvalStatus = ApprovalStatus.APPROVED;
    let finalFlag = VarianceFlag.NO_VARIANCE;

    if (wbsItem) {
      // BE-5: canonical outstanding-commitment math (shared helper).
      const committedAmount = await queryOutstandingCommitment(
        this.dataSource,
        wbsItem.wbs_id,
        tenant_id,
      );

      const varianceResult = await this.budgetControlService.validateWbsExpense(
        wbsItem,
        expenseDto.amount,
        tenant_id,
        committedAmount,
      );

      finalFlag = varianceResult.flag;

      // 2. [ADVANCED] Quantity/Duration Variance Check
      if (expenseDto.quantity > 0 && wbsItem.quantity_budgeted > 0) {
        const remainingQty =
          wbsItem.quantity_budgeted - (wbsItem.quantity_actual || 0);
        if (expenseDto.quantity > remainingQty * 1.05) {
          finalFlag = VarianceFlag.MAJOR_VARIANCE;
        }
      }
      if (expenseDto.days && wbsItem.days_budgeted! > 0) {
        const remainingDays =
          wbsItem.days_budgeted! - (wbsItem.days_actual || 0);
        if (expenseDto.days > remainingDays * 1.05) {
          finalFlag = VarianceFlag.MAJOR_VARIANCE;
        }
      }

      // --- Enforce Governance Decisions (Asynchronous Flow) ---
      if (
        varianceResult.action === "BLOCK" ||
        varianceResult.action === "REQUIRE_OVERRIDE"
      ) {
        const isCritical = varianceResult.action === "BLOCK";
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
            hint: "Provide an override_reason justification before submitting.",
          });
        }

        if (isAuthorizedAtAll) {
          // User HAS authority to force it through immediately.
          this.logger.warn(
            `[WBS] AUTHORIZED OVERRIDE by ${actorRole} | WBS: ${wbsItem.wbs_code} | Reason: ${override_reason}`,
          );
          finalFlag = VarianceFlag.OVERRIDE_APPLIED;
          approvalStatus = ApprovalStatus.APPROVED;
        } else {
          // User lacks authority, route to pending queue.
          this.logger.log(
            `[WBS] PENDING APPROVAL routed for ${actorRole} | WBS: ${wbsItem.wbs_code}`,
          );
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
      const projectData =
        wbsItem?.project ??
        (project_id
          ? await this.projectsService
              .findOne(project_id, tenant_id)
              .catch(() => null)
          : null);

      if (projectData) {
        vatAmount =
          expenseDto.amount * (Number(projectData.vat_rate || 0) / 100);
        whtAmount =
          expenseDto.amount * (Number(projectData.wht_rate || 0) / 100);
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

      const savedExpense = await queryRunner.manager.save(
        LiveExpenseEntity,
        liveExpense,
      );

      // ONLY increment denormalized actual spend if APPROVED
      if (wbsItem && approvalStatus === ApprovalStatus.APPROVED) {
        await queryRunner.manager.increment(
          WbsBudgetEntity,
          { wbs_id: wbsItem.wbs_id, tenant_id },
          "total_cost_actual",
          expenseDto.amount,
        );

        // Granular Fulfillment Tracking
        if (expenseDto.quantity) {
          await queryRunner.manager.increment(
            WbsBudgetEntity,
            { wbs_id: wbsItem.wbs_id, tenant_id },
            "quantity_actual",
            expenseDto.quantity,
          );
        }

        if (expenseDto.days) {
          await queryRunner.manager.increment(
            WbsBudgetEntity,
            { wbs_id: wbsItem.wbs_id, tenant_id },
            "days_actual",
            expenseDto.days,
          );
        }

        // If it was an override that was instantly approved, notify the team
        if (finalFlag === VarianceFlag.OVERRIDE_APPLIED && override_reason) {
          this.notificationsService.sendOverrideApprovedAlert({
            authorizer: actorRole || "System",
            wbsCode: wbsItem.wbs_code,
            projectName: projectData?.project_name || "Unknown Project",
            amount: expenseDto.amount,
            varianceFlag: finalFlag || "UNKNOWN",
            overrideReason: override_reason,
            expenseId: savedExpense.id,
          });
        }
      }

      await queryRunner.commitTransaction();

      await this.auditProjectEvent(
        expenseDto.project_id ?? wbsItem?.project_id,
        tenant_id,
        userId,
        "EXPENSE_LOGGED",
        null,
        Number(expenseDto.amount),
        `Expense ${savedExpense.id} logged on WBS "${wbsItem?.wbs_code ?? wbs_id ?? "unlinked"}" (${approvalStatus}, ${finalFlag}).`,
      );

      return savedExpense;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[WBS] logLiveExpenseEntry transaction failed: ${this.tenancySnapshot(tenant_id)} ${(err as Error).message}`,
      );
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
    errors: {
      index: number;
      wbs_code?: string;
      message: string;
      errorCode?: string;
    }[];
    totalCount: number;
    successCount: number;
  }> {
    const results: { saved: LiveExpenseEntity[]; errors: any[] } = {
      saved: [],
      errors: [],
    };

    for (let i = 0; i < entries.length; i++) {
      const expenseDto = entries[i];
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const { wbs_id, override_reason } = expenseDto;
        const wbsItem = wbs_id
          ? await queryRunner.manager.findOne(WbsBudgetEntity, {
              where: { wbs_id, tenant_id },
              relations: ["project"],
            })
          : null;

        if (wbs_id && !wbsItem) {
          throw new Error(`WBS Budget line "${wbs_id}" not found.`);
        }

        // --- [GUARD] Budget State Check ---
        if (
          wbsItem &&
          wbsItem.status !== WbsBudgetStatus.APPROVED &&
          wbsItem.status !== WbsBudgetStatus.RECALLED
        ) {
          throw new Error(
            `"${wbsItem.wbs_code}" is in ${wbsItem.status} status. Expenses can only be logged against APPROVED or RECALLED budget lines.`,
          );
        }

        let approvalStatus = ApprovalStatus.APPROVED;
        let finalFlag = VarianceFlag.NO_VARIANCE;

        if (wbsItem) {
          // 1. Financial Variance Check (BE-5: canonical shared math).
          const committedAmount = await queryOutstandingCommitment(
            queryRunner.manager,
            wbsItem.wbs_id,
            tenant_id,
          );
          const varianceResult =
            await this.budgetControlService.validateWbsExpense(
              wbsItem,
              expenseDto.amount,
              tenant_id,
              committedAmount,
            );
          finalFlag = varianceResult.flag;

          // 2. [ADVANCED] Quantity/Duration Variance Check
          // Challenging the logic: Price might be OK, but quantity leak is a risk.
          if (expenseDto.quantity > 0 && wbsItem.quantity_budgeted > 0) {
            const remainingQty =
              wbsItem.quantity_budgeted - (wbsItem.quantity_actual || 0);
            if (expenseDto.quantity > remainingQty * 1.05) {
              // 5% buffer on quantity too
              finalFlag = VarianceFlag.MAJOR_VARIANCE; // Force review if quantity is excessive
            }
          }

          if (
            varianceResult.action === "BLOCK" ||
            varianceResult.action === "REQUIRE_OVERRIDE"
          ) {
            const isCritical = varianceResult.action === "BLOCK";
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
            await queryRunner.manager.increment(
              WbsBudgetEntity,
              { wbs_id: wbsItem.wbs_id, tenant_id },
              "total_cost_actual",
              expenseDto.amount,
            );
            if (expenseDto.quantity)
              await queryRunner.manager.increment(
                WbsBudgetEntity,
                { wbs_id: wbsItem.wbs_id, tenant_id },
                "quantity_actual",
                expenseDto.quantity,
              );
            if (expenseDto.days)
              await queryRunner.manager.increment(
                WbsBudgetEntity,
                { wbs_id: wbsItem.wbs_id, tenant_id },
                "days_actual",
                expenseDto.days,
              );

            if (
              finalFlag === VarianceFlag.OVERRIDE_APPLIED &&
              override_reason
            ) {
              this.notificationsService.sendOverrideApprovedAlert({
                authorizer: actorRole || "System",
                wbsCode: wbsItem.wbs_code,
                projectName: wbsItem.project?.project_name || "Unknown Project",
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
        const projectData =
          wbsItem?.project ??
          (expenseDto.project_id
            ? await this.projectsService
                .findOne(expenseDto.project_id, tenant_id)
                .catch(() => null)
            : null);
        if (projectData) {
          vatAmount =
            expenseDto.amount * (Number(projectData.vat_rate || 0) / 100);
          whtAmount =
            expenseDto.amount * (Number(projectData.wht_rate || 0) / 100);
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

        const saved = await queryRunner.manager.save(
          LiveExpenseEntity,
          liveExpense,
        );
        results.saved.push(saved);
        await queryRunner.commitTransaction();
      } catch (err: any) {
        await queryRunner.rollbackTransaction();
        results.errors.push({
          index: i,
          wbs_code: entries[i].wbs_id, // we might not have the code yet if lookup failed
          message: err.message,
          errorCode: err.response?.errorCode || "VALIDATION_ERROR",
        });
        this.logger.warn(`[WBS] Batch item ${i} failed: ${err.message}`);
      } finally {
        await queryRunner.release();
      }
    }

    // One journal row per project for the successfully posted lines.
    const batchSavedAgg = new Map<string, { count: number; total: number }>();
    for (const item of results.saved) {
      const pid = (item as any).project_id as string | null | undefined;
      if (!pid) continue;
      const agg = batchSavedAgg.get(pid) ?? { count: 0, total: 0 };
      agg.count += 1;
      agg.total += Number((item as any).amount) || 0;
      batchSavedAgg.set(pid, agg);
    }
    for (const [pid, agg] of batchSavedAgg) {
      await this.auditProjectEvent(
        pid,
        tenant_id,
        userId,
        "EXPENSE_BATCH_LOGGED",
        null,
        agg.total,
        `Batch expense posting: ${agg.count} line(s) posted.`,
      );
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
        variance_flag: In([
          VarianceFlag.MAJOR_VARIANCE,
          VarianceFlag.UNAPPROVED_BUDGET_USAGE,
        ]),
      },
      relations: ["wbsBudget"],
      order: { created_at: "DESC" },
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
      relations: ["wbsBudget", "wbsBudget.project"],
      order: { created_at: "DESC" },
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
    actorId?: string,
  ): Promise<LiveExpenseEntity> {
    const expense = await this.liveExpenseRepository.findOne({
      where: { id: expenseId, tenant_id },
      relations: ["wbsBudget", "wbsBudget.project"],
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.approval_status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Expense is not in a pending state (Current: ${expense.approval_status}).`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update the expense status
      expense.approval_status = ApprovalStatus.APPROVED;
      expense.variance_flag = VarianceFlag.OVERRIDE_APPLIED;
      const savedExpense = await queryRunner.manager.save(
        LiveExpenseEntity,
        expense,
      );

      // 2. Increment the actual budget spending (since it was deferred earlier)
      if (expense.wbsBudget) {
        await queryRunner.manager.increment(
          WbsBudgetEntity,
          { wbs_id: expense.wbsBudget.wbs_id, tenant_id },
          "total_cost_actual",
          expense.amount,
        );
      }

      await queryRunner.commitTransaction();

      await this.auditProjectEvent(
        expense.wbsBudget?.project_id ?? expense.wbsBudget?.project?.project_id,
        tenant_id,
        actorId,
        "EXPENSE_OVERRUN_APPROVED",
        null,
        Number(expense.amount),
        `Overrun on expense ${expense.id} approved by ${authorizerRole} (${expense.override_reason || "no reason recorded"}).`,
      );

      // 3. Notify the enterprise that an override was authorized
      this.notificationsService.sendOverrideApprovedAlert({
        authorizer: authorizerRole,
        wbsCode: expense.wbsBudget?.wbs_code || "Unknown",
        projectName:
          expense.wbsBudget?.project?.project_name || "Unknown Project",
        amount: expense.amount,
        varianceFlag: "OVERRIDE_APPLIED",
        overrideReason:
          expense.override_reason || "Approved via Governance Hub",
        expenseId: expense.id,
      });

      this.logger.log(
        `[WBS] Overrun approved by ${authorizerRole} for Expense: ${expense.id}`,
      );
      return savedExpense;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[WBS] Failed to approve overrun ${expenseId}: ${(err as Error).message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * BE-3: rejects a pending overrun. Pending expenses never touched the
   * denormalized actuals (only APPROVED postings increment), so rejection is
   * a pure state transition + journal + notification — nothing to unwind.
   * The expense stays on the ledger as REJECTED evidence instead of vanishing.
   */
  async rejectOverrun(
    expenseId: string,
    tenant_id: string,
    rejecterRole: string,
    actorId?: string,
    reason?: string,
  ): Promise<LiveExpenseEntity> {
    const expense = await this.liveExpenseRepository.findOne({
      where: { id: expenseId, tenant_id },
      relations: ["wbsBudget", "wbsBudget.project"],
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    if (expense.approval_status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Expense is not in a pending state (Current: ${expense.approval_status}).`,
      );
    }

    expense.approval_status = ApprovalStatus.REJECTED;
    const savedExpense =
      await this.liveExpenseRepository.save(expense);

    await this.auditProjectEvent(
      expense.wbsBudget?.project_id ?? expense.wbsBudget?.project?.project_id,
      tenant_id,
      actorId,
      "EXPENSE_OVERRUN_REJECTED",
      Number(expense.amount),
      null,
      `Overrun on expense ${expense.id} rejected by ${rejecterRole} (${reason || expense.override_reason || "no reason recorded"}).`,
    );

    this.notificationsService.sendVarianceAlert(
      "Overrun Rejected",
      `Overrun expense ${expense.id} on WBS ${expense.wbsBudget?.wbs_code || "Unknown"} was rejected by ${rejecterRole}. Reason: ${reason || expense.override_reason || "not provided"}.`,
      "warning",
    );

    this.logger.log(
      `[WBS] Overrun rejected by ${rejecterRole} for Expense: ${expense.id}`,
    );
    return savedExpense;
  }

  async updateLiveExpenseEntry(
    id: string,
    updateDto: UpdateLiveExpenseDto,
    tenant_id: string,
    actorRole?: string,
    actorId?: string,
  ): Promise<LiveExpenseEntity> {
    const liveExpense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id },
    });

    if (!liveExpense) {
      throw new NotFoundException(`Expense ${id} not found.`);
    }

    // --- [GOVERNANCE RE-CHECK] Edited approved expenses must not silently breach budget ---
    if (
      liveExpense.approval_status === ApprovalStatus.APPROVED &&
      updateDto.amount !== undefined &&
      Number(updateDto.amount) > Number(liveExpense.amount)
    ) {
      const wbsItem = liveExpense.wbs_id
        ? await this.wbsBudgetRepository.findOne({
            where: { wbs_id: liveExpense.wbs_id, tenant_id },
            relations: ["project"],
          })
        : null;
      if (wbsItem) {
        // BE-5: canonical outstanding-commitment math (shared helper).
        const committedAmount = await queryOutstandingCommitment(
          this.dataSource,
          wbsItem.wbs_id,
          tenant_id,
        );
        const varianceResult = await this.budgetControlService.validateWbsExpense(
          wbsItem,
          updateDto.amount,
          tenant_id,
          committedAmount,
        );

        if (
          varianceResult.flag !== VarianceFlag.UNAPPROVED_BUDGET_USAGE &&
          (varianceResult.action === "BLOCK" ||
            varianceResult.action === "REQUIRE_OVERRIDE")
        ) {
          const allowedRoles =
            varianceResult.action === "BLOCK"
              ? this.CRITICAL_OVERRIDE_ROLES
              : this.MAJOR_OVERRIDE_ROLES;
          const isAuthorized = actorRole && allowedRoles.includes(actorRole);
          const overrideReason =
            updateDto.override_reason ?? liveExpense.override_reason;

          if (!isAuthorized || !overrideReason) {
            throw new BadRequestException({
              statusCode: 403,
              errorCode: varianceResult.flag,
              message: `${varianceResult.message} Adjusting this expense to ${updateDto.amount} would breach the WBS budget.`,
              requiredRoles: varianceResult.requiredRoles,
              hint: "Provide an override_reason (and a Finance Manager+ role) to apply the change, or lower the amount.",
            });
          }
          liveExpense.variance_flag = VarianceFlag.OVERRIDE_APPLIED;
          liveExpense.override_reason = overrideReason;
        } else if (varianceResult.flag !== VarianceFlag.UNAPPROVED_BUDGET_USAGE) {
          liveExpense.variance_flag = varianceResult.flag;
        }
      }
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
          const amountDelta =
            (updateDto.amount ?? liveExpense.amount) -
            (liveExpense.amount || 0);
          const quantityDelta =
            (updateDto.quantity ?? liveExpense.quantity ?? 0) -
            (liveExpense.quantity || 0);
          const daysDelta =
            (updateDto.days ?? liveExpense.days ?? 0) - (liveExpense.days || 0);

          if (amountDelta !== 0) {
            await queryRunner.manager.increment(
              WbsBudgetEntity,
              { wbs_id: oldWbsId, tenant_id },
              "total_cost_actual",
              amountDelta,
            );
          }
          if (quantityDelta !== 0) {
            await queryRunner.manager.increment(
              WbsBudgetEntity,
              { wbs_id: oldWbsId, tenant_id },
              "quantity_actual",
              quantityDelta,
            );
          }
          if (daysDelta !== 0) {
            await queryRunner.manager.increment(
              WbsBudgetEntity,
              { wbs_id: oldWbsId, tenant_id },
              "days_actual",
              daysDelta,
            );
          }
        } else if (oldWbsId !== newWbsId) {
          // WBS SWITCH: Revert old, Apply new
          if (oldWbsId) {
            await queryRunner.manager.decrement(
              WbsBudgetEntity,
              { wbs_id: oldWbsId, tenant_id },
              "total_cost_actual",
              liveExpense.amount,
            );
            if (liveExpense.quantity)
              await queryRunner.manager.decrement(
                WbsBudgetEntity,
                { wbs_id: oldWbsId, tenant_id },
                "quantity_actual",
                liveExpense.quantity,
              );
            if (liveExpense.days)
              await queryRunner.manager.decrement(
                WbsBudgetEntity,
                { wbs_id: oldWbsId, tenant_id },
                "days_actual",
                liveExpense.days,
              );
          }

          if (newWbsId) {
            const finalAmount = updateDto.amount ?? liveExpense.amount;
            const finalQuantity = updateDto.quantity ?? liveExpense.quantity;
            const finalDays = updateDto.days ?? liveExpense.days;

            await queryRunner.manager.increment(
              WbsBudgetEntity,
              { wbs_id: newWbsId, tenant_id },
              "total_cost_actual",
              finalAmount,
            );
            if (finalQuantity)
              await queryRunner.manager.increment(
                WbsBudgetEntity,
                { wbs_id: newWbsId, tenant_id },
                "quantity_actual",
                finalQuantity,
              );
            if (finalDays)
              await queryRunner.manager.increment(
                WbsBudgetEntity,
                { wbs_id: newWbsId, tenant_id },
                "days_actual",
                finalDays,
              );
          }
        }
      }

      const oldAmount = Number(liveExpense.amount);
      const preUpdateWbsId = liveExpense.wbs_id;
      Object.assign(liveExpense, updateDto);
      const saved = await queryRunner.manager.save(
        LiveExpenseEntity,
        liveExpense,
      );
      await queryRunner.commitTransaction();

      let expenseProjectId: string | null | undefined =
        (saved as any).project_id ?? liveExpense.project_id;
      if (!expenseProjectId && saved.wbs_id) {
        const wbsRow = await this.wbsBudgetRepository.findOne({
          where: { wbs_id: saved.wbs_id, tenant_id },
        });
        expenseProjectId = wbsRow?.project_id;
      }
      const wbsNote =
        updateDto.wbs_id && updateDto.wbs_id !== preUpdateWbsId
          ? ` Moved from WBS ${preUpdateWbsId} to ${updateDto.wbs_id}.`
          : "";
      await this.auditProjectEvent(
        expenseProjectId,
        tenant_id,
        actorId,
        "EXPENSE_UPDATED",
        Number.isNaN(oldAmount) ? null : oldAmount,
        Number(saved.amount),
        `Expense ${saved.id} corrected.${wbsNote}`,
      );
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLiveExpenseEntry(
    id: string,
    tenant_id: string,
    actorId?: string,
  ): Promise<void> {
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
      if (
        liveExpense.approval_status === ApprovalStatus.APPROVED &&
        liveExpense.wbs_id
      ) {
        await queryRunner.manager.decrement(
          WbsBudgetEntity,
          { wbs_id: liveExpense.wbs_id, tenant_id },
          "total_cost_actual",
          liveExpense.amount,
        );

        if (liveExpense.quantity) {
          await queryRunner.manager.decrement(
            WbsBudgetEntity,
            { wbs_id: liveExpense.wbs_id, tenant_id },
            "quantity_actual",
            liveExpense.quantity,
          );
        }

        if (liveExpense.days) {
          await queryRunner.manager.decrement(
            WbsBudgetEntity,
            { wbs_id: liveExpense.wbs_id, tenant_id },
            "days_actual",
            liveExpense.days,
          );
        }
      }

      // 2. Delete the record
      await queryRunner.manager.delete(LiveExpenseEntity, { id, tenant_id });

      await queryRunner.commitTransaction();

      let deletedProjectId: string | null | undefined =
        liveExpense.project_id;
      if (!deletedProjectId && liveExpense.wbs_id) {
        const wbsRow = await this.wbsBudgetRepository.findOne({
          where: { wbs_id: liveExpense.wbs_id, tenant_id },
        });
        deletedProjectId = wbsRow?.project_id;
      }
      await this.auditProjectEvent(
        deletedProjectId,
        tenant_id,
        actorId,
        "EXPENSE_DELETED",
        Number(liveExpense.amount),
        null,
        `Expense ${id} deleted (was ${liveExpense.approval_status}). Reversed spend is unwound from WBS actuals above.`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLiveExpenseBatch(
    ids: string[],
    tenant_id: string,
    actorId?: string,
  ): Promise<{ successCount: number; errors: any[] }> {
    const results: {
      successCount: number;
      errors: { id: string; message: string }[];
    } = { successCount: 0, errors: [] };
    for (const id of ids) {
      try {
        await this.deleteLiveExpenseEntry(id, tenant_id, actorId);
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
      where: {
        name: dto.name,
        tenant_id: tenant_id,
        parent_id: dto.parent_id ?? IsNull(),
      },
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
        throw new NotFoundException(
          `Parent category with ID ${dto.parent_id} not found in tenant ${tenant_id}`,
        );
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

  async findAllWbsCategories(
    tenant_id: string,
    includeInactive: boolean = false,
  ): Promise<WbsCategoryEntity[]> {
    return this.wbsCategoryRepository.find({
      where: includeInactive
        ? { tenant_id: tenant_id }
        : { tenant_id: tenant_id, is_active: true },
      order: { sort_order: "ASC", name: "ASC" },
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
    const newParentId =
      updateWbsCategoryDto.parent_id === undefined
        ? category.parent_id
        : updateWbsCategoryDto.parent_id;

    if (
      updateWbsCategoryDto.name !== undefined ||
      updateWbsCategoryDto.parent_id !== undefined
    ) {
      const existingCategoryWithName = await this.wbsCategoryRepository.findOne(
        {
          where: {
            name: newName,
            tenant_id: tenant_id,
            parent_id: newParentId ?? IsNull(),
          },
        },
      );
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
        throw new NotFoundException(
          `Parent category with ID ${updateWbsCategoryDto.parent_id} not found in tenant ${tenant_id}`,
        );
      }
    }

    // Merge all provided fields
    this.wbsCategoryRepository.merge(category, updateWbsCategoryDto);
    return this.wbsCategoryRepository.save(category);
  }

  async deleteWbsCategory(
    id: string,
    tenant_id: string,
    forceSoftDelete: boolean = false,
  ): Promise<{ softDeleted: boolean; usageCount: number }> {
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
      where: { category_id: id, tenant_id: tenant_id },
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
      relations: ["project"], // Need project for currency
    });
    if (!wbsBudget) {
      throw new NotFoundException(`WBS Budget ${id} not found`);
    }

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      [WbsBudgetStatus.DRAFT]: [WbsBudgetStatus.PENDING],
      [WbsBudgetStatus.PENDING]: [
        WbsBudgetStatus.APPROVED,
        WbsBudgetStatus.REJECTED,
      ],
      [WbsBudgetStatus.REJECTED]: [WbsBudgetStatus.DRAFT], // Can revert to draft for editing
      [WbsBudgetStatus.APPROVED]: [], // Final state — no transitions
    };

    const allowed = validTransitions[wbsBudget.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${wbsBudget.status} to ${newStatus}. Valid transitions: ${allowed.join(", ") || "none"}`,
      );
    }

    // IF APPROVED: Check DOA Authority
    if (newStatus === WbsBudgetStatus.APPROVED) {
      await this.doaService.validateAuthority(
        actor,
        Number(wbsBudget.total_cost_budgeted),
        wbsBudget.project?.currency || "USD",
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

    await this.auditProjectEvent(
      wbsBudget.project_id,
      tenant_id,
      actor.id,
      "WBS_STATUS_CHANGE",
      null,
      Number(wbsBudget.total_cost_budgeted),
      `WBS "${wbsBudget.wbs_code}" status ${oldStatus} → ${newStatus}.`,
    );

    // Send notification on status change
    const actionLabel =
      newStatus === WbsBudgetStatus.APPROVED
        ? "Budget Approved"
        : newStatus === WbsBudgetStatus.REJECTED
          ? "Budget Rejected"
          : newStatus === WbsBudgetStatus.PENDING
            ? "Budget Submitted for Approval"
            : "Budget Status Changed";

    this.notificationsService.sendVarianceAlert(
      actionLabel,
      `WBS ${wbsBudget.wbs_code} (${wbsBudget.description}) status changed to ${newStatus} by ${actor.first_name} ${actor.last_name}.`,
      newStatus === WbsBudgetStatus.REJECTED ? "warning" : "info",
    );

    return saved;
  }

  private mapToApprovalStatus(wbsStatus: WbsBudgetStatus): ApprovalStatus {
    switch (wbsStatus) {
      case WbsBudgetStatus.PENDING:
        return ApprovalStatus.PENDING_APPROVAL;
      case WbsBudgetStatus.APPROVED:
        return ApprovalStatus.APPROVED;
      case WbsBudgetStatus.REJECTED:
        return ApprovalStatus.REJECTED;
      default:
        return ApprovalStatus.PENDING_APPROVAL;
    }
  }

  // ===== NEW: Bulk Project Budget Submission =====
  async submitProjectBudgetDrafts(
    projectId: string,
    tenant_id: string,
  ): Promise<{ count: number }> {
    const result = await this.wbsBudgetRepository.update(
      {
        project_id: projectId,
        tenant_id,
        status: In([WbsBudgetStatus.DRAFT, WbsBudgetStatus.REJECTED]),
      },
      {
        status: WbsBudgetStatus.PENDING,
        updated_at: new Date(),
      },
    );

    if (result.affected && result.affected > 0) {
      // Since we don't have the project details directly here easily without another query,
      // we just use the ID for the notification.
      this.notificationsService.sendVarianceAlert(
        "Project Budget Submitted",
        `${result.affected} line items for project ${projectId} have been submitted for approval.`,
        "info",
      );
    }

    return { count: result.affected || 0 };
  }

  // ===== NEW: Budget vs. Contract Value Validation =====
  async validateBudgetAgainstContractValue(
    projectId: string,
    tenant_id: string,
    project?: ProjectEntity,
  ): Promise<{
    totalBudgeted: number;
    contractValue: number;
    overBudget: boolean;
  }> {
    if (!project) {
      project =
        (await this.dataSource
          .getRepository(ProjectEntity)
          .findOne({ where: { project_id: projectId, tenant_id } })) ||
        undefined;
    }
    if (!project)
      return { totalBudgeted: 0, contractValue: 0, overBudget: false };

    const contractValue = Number(project.contract_value || 0);
    if (contractValue <= 0)
      return { totalBudgeted: 0, contractValue: 0, overBudget: false };

    // Sum all root-level WBS budgets for this project
    const result = await this.wbsBudgetRepository
      .createQueryBuilder("wbs")
      .select("COALESCE(SUM(wbs.total_cost_budgeted), 0)", "total")
      .where("wbs.project_id = :projectId", { projectId })
      .andWhere("wbs.tenant_id = :tenant_id", { tenant_id })
      .andWhere("wbs.parent_wbs_id IS NULL") // Only root-level to avoid double-counting
      .getRawOne();

    const totalBudgeted = parseFloat(result?.total || "0");
    const overBudget = totalBudgeted > contractValue;

    if (overBudget) {
      const overage = totalBudgeted - contractValue;
      this.logger.warn(
        `[validateBudgetAgainstContractValue] Project ${projectId}: Total WBS budgets (${totalBudgeted}) exceed contract value (${contractValue}) by ${overage}`,
      );
      this.notificationsService.sendVarianceAlert(
        "Budget Exceeds Contract Value",
        `Total WBS budgets (${totalBudgeted.toFixed(2)}) exceed the contract value (${contractValue.toFixed(2)}) by ${overage.toFixed(2)}.`,
        "warning",
      );
    }

    return { totalBudgeted, contractValue, overBudget };
  }

  // ===== NEW: Seed Default Categories for Tenant =====
  async seedDefaultCategories(tenant_id: string): Promise<WbsCategoryEntity[]> {
    const defaults = [
      {
        code: "LAB",
        name: "Labor",
        color: "#3B82F6",
        description: "Workforce costs — wages, salaries, benefits",
        sort_order: 1,
      },
      {
        code: "MAT",
        name: "Materials",
        color: "#10B981",
        description: "Raw materials, supplies, consumables",
        sort_order: 2,
      },
      {
        code: "EQP",
        name: "Equipment",
        color: "#F59E0B",
        description: "Machinery, tools, rentals",
        sort_order: 3,
      },
      {
        code: "SUB",
        name: "Subcontractor",
        color: "#8B5CF6",
        description: "Third-party contracted services",
        sort_order: 4,
      },
      {
        code: "PRO",
        name: "Professional Services",
        color: "#EC4899",
        description: "Consultancy, legal, engineering",
        sort_order: 5,
      },
      {
        code: "TRV",
        name: "Travel & Logistics",
        color: "#06B6D4",
        description: "Transportation, accommodation, per diem",
        sort_order: 6,
      },
      {
        code: "OVH",
        name: "Overhead",
        color: "#6B7280",
        description: "Administrative, insurance, utilities",
        sort_order: 7,
      },
      {
        code: "CON",
        name: "Contingency",
        color: "#EF4444",
        description: "Risk reserves, unforeseen costs",
        sort_order: 8,
      },
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
    this.logger.log(
      `Seeded ${categories.length} default WBS categories for tenant ${tenant_id}`,
    );
    return categories;
  }

  // ===== NEW: WBS Templates Operations =====
  async findAllTemplates(tenant_id?: string): Promise<WbsTemplateEntity[]> {
    return this.wbsTemplateRepository.find({
      where: [
        { tenant_id: IsNull() }, // System templates
        { tenant_id: tenant_id }, // Tenant-specific templates
      ],
      order: { name: "ASC" },
    });
  }

  async createWbsTemplate(
    dto: CreateWbsTemplateDto,
    tenant_id: string,
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
    tenant_id: string,
  ): Promise<void> {
    const template = await this.wbsTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`WBS Template ${templateId} not found`);
    }

    const structure = Array.isArray(template.structure)
      ? template.structure
      : [];
    const codeToId: Record<string, string> = {};

    // Sort items to ensure parents are created before children if codes are hierarchical
    const sortedItems = [...structure].sort(
      (a, b) => a.code.length - b.code.length,
    );

    for (const item of sortedItems) {
      const parentId = item.parent_code ? codeToId[item.parent_code] : null;

      const createdItem = await this.createWbsBudgetDraft(
        {
          project_id: projectId,
          parent_wbs_id: parentId,
          wbs_code: item.code,
          description: item.description,
          unit_cost_budgeted: 0,
          quantity_budgeted: 1,
          days_budgeted: 1,
          total_cost_budgeted: 0,
          category_id: undefined,
        },
        userId,
        tenant_id,
      );

      codeToId[item.code] = createdItem.wbs_id;
    }

    this.logger.log(
      `Applied template "${template.name}" to project ${projectId} (${sortedItems.length} items)`,
    );
  }

  async seedDefaultTemplates(): Promise<void> {
    const templatesDir = path.join(__dirname, "..", "wbs", "data", "templates");

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(
        `WBS Templates directory not found at ${templatesDir}. Skipping seeding.`,
      );
      return;
    }

    const files = fs
      .readdirSync(templatesDir)
      .filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const filePath = path.join(templatesDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const t = JSON.parse(content);

        const existing = await this.wbsTemplateRepository.findOne({
          where: { name: t.name, tenant_id: IsNull() },
        });

        if (!existing) {
          await this.wbsTemplateRepository.save(
            this.wbsTemplateRepository.create({
              name: t.name,
              industry: t.industry,
              structure: t.structure,
              tenant_id: null,
            }),
          );
          this.logger.log(`Seeded WBS Template: ${t.name}`);
        } else {
          // Optional: Update structure if it changed
          existing.structure = t.structure;
          existing.industry = t.industry;
          await this.wbsTemplateRepository.save(existing);
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to seed template from ${file}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Default WBS templates verified/seeded from JSON assets.`);
  }

  // Enhanced WBS Budget Retrieval with Filters and Pagination
  async findAllWbsBudgets(
    getWbsBudgetsDto: GetWbsBudgetsDto,
    tenant_id: string,
  ): Promise<{ data: WbsBudgetEntity[]; total: number }> {
    const {
      wbsCode,
      description,
      search,
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

    // sortOrder is user-controlled and interpolated into the ORDER BY
    // directive; normalize it strictly (defense in depth beyond the DTO IsIn).
    const safeSortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

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
    if (search) {
      queryBuilder.andWhere(
        "(wbs.wbs_code ILIKE :search OR wbs.description ILIKE :search OR project.project_name ILIKE :search)",
        { search: `%${search}%` },
      );
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

    if (sortBy === "wbs_code") {
      // Advanced Logic: Numerical sorting for WBS strings (1.9 before 1.10)
      // IMPORTANT: Use a dot-free SELECT alias + orderBy alias. TypeORM's
      // pagination path (createOrderByCombinedWithSelectExpression) splits any
      // order criteria on the first "." and resolves the first segment as an
      // alias; a raw dotted expression like `string_to_array(wbs.wbs_code, '.' )`
      // is misparsed as alias "string_to_array(wbs" and throws. Routing the
      // expression through addSelect(..., "wbs_sort_key") lets it survive both
      // the direct and the paginated (subquery) code paths.
      queryBuilder
        .addSelect("string_to_array(wbs.wbs_code, '.')::int[]", "wbs_sort_key")
        .orderBy("wbs_sort_key", safeSortOrder)
        .addOrderBy("wbs.wbs_code", safeSortOrder);
    } else {
      // Defense in depth: sortBy is validated in the DTO (IsIn allowlist), but
      // re-check here too before interpolating into ORDER BY.
      const safeSortBy = WBS_BUDGET_SORT_COLUMNS.includes(sortBy)
        ? sortBy
        : "sort_order";
      queryBuilder
        .orderBy(`wbs.${safeSortBy}`, safeSortOrder)
        .addOrderBy("wbs.wbs_id", "ASC");
    }
    queryBuilder.skip((page - 1) * limit).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      return { data, total };
    } catch (err: any) {
      this.logger.error(
        `[WBS] Database query failed with sortBy='${sortBy}'. ${this.tenancySnapshot(tenant_id)} pgCode=${err?.code ?? "n/a"} Error: ${err.message}`,
      );

      // Safety Fallback: Use basic Alphanumeric sorting on wbs_code
      this.logger.warn(
        `[WBS] Falling back to standard string-based WBS sorting. ${this.tenancySnapshot(tenant_id)}`,
      );
      const fallbackQuery = this.wbsBudgetRepository
        .createQueryBuilder("wbs")
        .leftJoinAndSelect("wbs.project", "project")
        .leftJoinAndSelect("wbs.category", "category")
        .where("wbs.tenant_id = :tenant_id", { tenant_id });

      if (projectId)
        fallbackQuery.andWhere("wbs.project_id = :projectId", { projectId });
      if (status) fallbackQuery.andWhere("wbs.status = :status", { status });
      if (wbsCode)
        fallbackQuery.andWhere("wbs.wbs_code ILIKE :wbsCode", {
          wbsCode: `%${wbsCode}%`,
        });
      if (description)
        fallbackQuery.andWhere("wbs.description ILIKE :description", {
          description: `%${description}%`,
        });
      if (categoryId)
        fallbackQuery.andWhere("wbs.category_id = :categoryId", { categoryId });
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
      search,
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
      .leftJoin("liveExpense.wbsBudget", "wbsSearch")
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
    if (search) {
      queryBuilder.andWhere(
        "(liveExpense.description ILIKE :search OR wbsSearch.wbs_code ILIKE :search OR wbsSearch.description ILIKE :search)",
        { search: `%${search}%` },
      );
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

    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['created_at', 'updated_at', 'amount', 'description', 'expense_date'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    queryBuilder.orderBy(`liveExpense.${safeSortBy}`, safeSortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      return { data, total };
    } catch (err: any) {
      this.logger.error(
        `[WBS] Database query failed for live expenses. ${this.tenancySnapshot(tenant_id)} pgCode=${err?.code ?? "n/a"} Error: ${err.message}`,
      );
      // Safety Fallback: Retry without sort
      const fallbackQuery = this.liveExpenseRepository
        .createQueryBuilder("liveExpense")
        .where("liveExpense.tenant_id = :tenant_id", { tenant_id });

      if (wbsId) fallbackQuery.andWhere("liveExpense.wbs_id = :wbsId", { wbsId });
      if (projectId) fallbackQuery.andWhere("liveExpense.project_id = :projectId", { projectId });
      if (description) fallbackQuery.andWhere("liveExpense.description ILIKE :description", { description: `%${description}%` });
      if (search) fallbackQuery.andWhere("liveExpense.description ILIKE :search", { search: `%${search}%` });
      if (minAmount) fallbackQuery.andWhere("liveExpense.amount >= :minAmount", { minAmount });
      if (maxAmount) fallbackQuery.andWhere("liveExpense.amount <= :maxAmount", { maxAmount });
      if (userId) fallbackQuery.andWhere("liveExpense.user_id = :userId", { userId });

      const [data, total] = await fallbackQuery
        .orderBy("liveExpense.created_at", "DESC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, total };
    }
  }

  async getWbsBudgetRollup(
    tenant_id: string,
    filters: { startDate?: string; endDate?: string; projectId?: string } = {},
  ): Promise<WbsBudgetRollupDto[]> {
    const { startDate, endDate, projectId } = filters;

    const queryParams: any[] = [tenant_id];
    let paramIdx = 2;

    let projectIdClause = "";
    if (projectId) {
      projectIdClause = `AND w.project_id = $${paramIdx++}`;
      queryParams.push(projectId);
    }

    let dateFiltersLive = "";
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

    let dateFiltersLpo = "";
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
              AND l.approval_status = 'APPROVED'
              AND l.status <> 'CANCELLED'
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
      const hasChildren = r.has_children === true || r.has_children === "t";
      const ownBudget = r.total_cost_budgeted
        ? parseFloat(r.total_cost_budgeted.toString())
        : 0;
      const rollupBudget = r.total_cost_budgeted_rollup
        ? parseFloat(r.total_cost_budgeted_rollup.toString())
        : 0;

      return {
        wbs_id: r.wbs_id,
        parent_wbs_id: r.parent_wbs_id,
        wbs_code: r.wbs_code,
        description: r.description,
        total_cost_budgeted: hasChildren ? rollupBudget : ownBudget, // FIX: Parents sum their children, leaves use their own budget
        total_cost_budgeted_rollup: rollupBudget,
        has_children: hasChildren,
        total_paid_rollup: r.total_paid_rollup
          ? parseFloat(r.total_paid_rollup.toString())
          : 0,
        total_paid_self: r.total_paid_self
          ? parseFloat(r.total_paid_self.toString())
          : 0,
        total_committed_lpo: r.total_committed_lpo
          ? parseFloat(r.total_committed_lpo.toString())
          : 0,
        status: r.status,
        category_id: r.category_id,
        project_id: r.project_id,
        sort_order: r.sort_order ? parseInt(r.sort_order.toString()) : 0,
        uom: r.uom,
        quantity_budgeted: r.quantity_budgeted
          ? parseFloat(r.quantity_budgeted.toString())
          : null,
        days_budgeted: r.days_budgeted
          ? parseFloat(r.days_budgeted.toString())
          : null,
        unit_cost_budgeted: r.unit_cost_budgeted
          ? parseFloat(r.unit_cost_budgeted.toString())
          : null,
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
          `"${(expense.description || "").replace(/"/g, '""')}"`,
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
      relations: ["project", "category", "user"],
    });

    if (!budget) {
      throw new NotFoundException(`Budget item ${id} not found.`);
    }

    // Calculate Rollups
    const rollupResults = await this.getWbsBudgetRollup(tenant_id, {
      projectId: budget.project_id,
    });

    const budgetRollup = rollupResults.find((r) => r.wbs_id === id);
    const totalPaidRollup = budgetRollup?.total_paid_rollup || 0;
    const remainingBudget =
      Number(budget.total_cost_budgeted) - totalPaidRollup;
    const burnRate =
      Number(budget.total_cost_budgeted) > 0
        ? (totalPaidRollup / Number(budget.total_cost_budgeted)) * 100
        : 0;

    // Fetch Recent Related Expenses
    const expenses = await this.liveExpenseRepository.find({
      where: { wbs_id: id, tenant_id },
      order: { expense_date: "DESC" },
      take: 10,
    });

    return {
      wbs_id: budget.wbs_id,
      wbs_code: budget.wbs_code,
      description: budget.description,
      total_cost_budgeted: budget.total_cost_budgeted,
      project_id: budget.project_id,
      project_name: budget.project?.project_name || "N/A",
      project_currency: budget.project?.currency || "NGN",
      created_at: budget.created_at,
      status: budget.status,
      total_paid_rollup: totalPaidRollup,
      remaining_budget: remainingBudget,
      burn_rate: burnRate,
      expenses: expenses.map((e) => ({
        expense_id: e.id,
        description: e.description,
        actual_paid_amount: e.amount,
        expense_date: e.expense_date,
        variance_flag: e.variance_flag,
      })),
    };
  }

  async findExpenseDossier(id: string, tenant_id: string) {
    const expense = await this.liveExpenseRepository.findOne({
      where: { id, tenant_id },
      relations: ["wbsBudget", "wbsBudget.project"],
    });

    if (!expense) {
      throw new NotFoundException(`Expense entry ${id} not found.`);
    }

    // Fetch user email for attribution
    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: expense.user_id },
      select: ["email"],
    });

    return {
      expense_id: expense.id,
      wbs_id: expense.wbs_id,
      wbs_code: expense.wbsBudget?.wbs_code || "N/A",
      budget_description: expense.wbsBudget?.description || "N/A",
      project_id: expense.project_id,
      project_name: expense.wbsBudget?.project?.project_name || "N/A",
      project_currency: expense.wbsBudget?.project?.currency || "NGN",
      description: expense.description,
      actual_paid_amount: expense.amount,
      expense_date: expense.expense_date,
      variance_flag: expense.variance_flag,
      created_at: expense.created_at,
      performed_by_email: user?.email || "System/Unknown",
    };
  }

  /**
   * Import WBS line items from CSV/TSV text. Parsing, header detection, column
   * mapping and validation all live in the spreadsheet engine, so pasted text
   * and an uploaded file are understood exactly the same way.
   */
  async importWbsFromCsv(
    projectId: string,
    csvContent: string,
    userId: string,
    tenant_id: string,
    mode?: WbsImportMode,
  ): Promise<WbsImportResult> {
    return this.runWbsImport({
      analysis: analyseDelimitedText(csvContent),
      projectId,
      userId,
      tenant_id,
      mode,
    });
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
          { sort_order: item.sort_order },
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

  /**
   * Import WBS line items from an uploaded spreadsheet. Accepts whatever the
   * browser sends (.xlsx, .xls or a CSV picked through the same control) and
   * decides how to read it from the bytes rather than from the extension the
   * client happened to report.
   */
  async importWbsFromExcel(
    projectId: string,
    fileBuffer: Buffer,
    userId: string,
    tenant_id: string,
    fileName?: string,
    mode?: WbsImportMode,
  ): Promise<WbsImportResult> {
    return this.runWbsImport({
      analysis: await this.analyseUpload({ fileBuffer, fileName }),
      projectId,
      userId,
      tenant_id,
      mode,
    });
  }

  /**
   * Dry run of a spreadsheet import. Performs the same analysis and the same
   * conflict checks as the real import and writes nothing, so the operator can
   * see which sheet was read, how the columns were mapped, how many rows will be
   * created, which codes already exist and which rows are blocked — before a
   * single line item lands in the database.
   */
  async previewWbsImport(params: {
    projectId: string;
    userId: string;
    tenant_id: string;
    csvContent?: string;
    fileBuffer?: Buffer;
    fileName?: string;
    mode?: WbsImportMode;
  }): Promise<WbsImportResult> {
    return this.runWbsImport({
      analysis: await this.analyseUpload({
        fileBuffer: params.fileBuffer,
        fileName: params.fileName,
        csvContent: params.csvContent,
      }),
      projectId: params.projectId,
      userId: params.userId,
      tenant_id: params.tenant_id,
      mode: params.mode,
      dryRun: true,
    });
  }

  /**
   * One parse path for every upload: a workbook, a CSV/TSV that arrived as a
   * file, or CSV text pasted into the request body. The two import endpoints used
   * to disagree about delimiters, header rows and which worksheet to read
   * because each parsed the file itself; neither can any more.
   */
  private async analyseUpload(params: {
    fileBuffer?: Buffer;
    fileName?: string;
    csvContent?: string;
  }): Promise<WbsImportAnalysis> {
    const buffer = params.fileBuffer;
    if (buffer && buffer.length > 0) {
      if (buffer.length > MAX_IMPORT_BYTES) {
        const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);
        const limitMb = MAX_IMPORT_BYTES / 1024 / 1024;
        throw new BadRequestException(
          `That file is ${sizeMb} MB and the import limit is ${limitMb} MB. Remove the rows you do not need, or split the sheet and import it in parts.`,
        );
      }
      let analysis: WbsImportAnalysis;
      try {
        ({ analysis } = await analyseSpreadsheetFile(
          params.fileName ?? "upload",
          buffer,
        ));
      } catch (err) {
        // A workbook is a ZIP, so a file that passes the byte limit can still
        // inflate to gigabytes. ExcelJS throws a generic Error for that and for
        // a corrupt payload; both are "wrong file", not "server fault", and
        // leaving them as a 500 tells the operator nothing actionable.
        if (err instanceof SpreadsheetTooLargeError) {
          throw new BadRequestException(err.message);
        }
        this.logger.warn(
          `[WBS] Upload could not be read as a spreadsheet: ${(err as Error).message}`,
        );
        throw new BadRequestException(
          `The uploaded file could not be read as a spreadsheet. If it is a real .xls, re-save it as .xlsx: ${(err as Error).message}`,
        );
      }
      return analysis;
    }
    if (params.csvContent && params.csvContent.trim().length > 0) {
      return analyseDelimitedText(params.csvContent);
    }

    throw new BadRequestException(
      "Nothing to import: attach a spreadsheet (.xlsx, .xls, .csv) or paste the CSV text.",
    );
  }

  /**
   * Blocking findings for the caller. When nothing at all can be imported the
   * blockers explain why the file was rejected; otherwise the per-row issues are
   * what still has to be fixed before those specific rows can be brought in.
   */
  private wbsImportIssues(
    analysis: WbsImportAnalysis,
    importable: MappedRow[],
  ): string[] {
    if (importable.length === 0) {
      return describeImportBlockers(analysis);
    }
    return analysis.rows
      .filter((row) => row.issues.length > 0)
      .map((row) => `Row ${row.sourceRow}: ${row.issues.join("; ")}`);
  }

  /**
   * Turns an analysis into line items. One code path serves both the preview and
   * the real import so a preview can never drift from what the import will do.
   *
   * Rows arrive parents-first, so a parent's id is always known before its
   * children are written. Codes that already exist in this project are linked to
   * and reported rather than written a second time: re-importing the same sheet
   * must never double a budget, which is exactly what the old importer did.
   */
  private async runWbsImport(params: {
    analysis: WbsImportAnalysis;
    projectId: string;
    userId: string;
    tenant_id: string;
    mode?: WbsImportMode;
    dryRun?: boolean;
  }): Promise<WbsImportResult> {
    const { analysis, projectId, userId, tenant_id } = params;
    const mode: WbsImportMode = params.mode ?? "create";
    const dryRun = params.dryRun ?? false;

    // A file that was only partly read must never be committed. Reporting the
    // rows that DID fit as a successful import is how a budget silently loses
    // 40% of its line items with nothing in the audit trail to show for it.
    if (analysis.truncated && !dryRun) {
      throw new BadRequestException(
        `This file is too large to import: ${analysis.droppedRows} data row(s) beyond row ${MAX_DATA_ROWS} were not read, so nothing was imported rather than importing it in part. Split the sheet into files of at most ${MAX_DATA_ROWS} rows and import them one at a time.`,
      );
    }

    const rows = importableRows(analysis);
    const errors: string[] = this.wbsImportIssues(analysis, rows);
    const warnings: string[] = [...analysis.warnings];
    const created: WbsImportResult["created"] = [];
    const updated: WbsImportResult["updated"] = [];
    const skippedExisting: WbsImportResult["skippedExisting"] = [];

    const finish = (): WbsImportResult => ({
      imported: created.length + updated.length,
      errors,
      created,
      updated,
      skippedExisting,
      rows: analysis.rows,
      warnings,
      summary: analysis.summary,
      truncated: analysis.truncated,
      droppedRows: analysis.droppedRows,
      headerRow: analysis.headerRow,
      columns: analysis.columns,
      currencies: analysis.currencies,
      dryRun,
    });

    const project = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { project_id: projectId, tenant_id } });
    if (!project) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found in tenant ${tenant_id}`,
      );
    }

    // ── Pre-resolve everything the writer needs, in two queries ─────────────
    // createWbsBudgetDraft costs ~5 round trips per row (project, category, max
    // sort_order, insert, contract check), so the old loop turned a 500-row file
    // into ~2,500 queries. Everything a row needs is resolved once, up front.
    const [existingItems, categories] = await Promise.all([
      this.wbsBudgetRepository.find({
        where: { project_id: projectId, tenant_id },
        select: ["wbs_id", "wbs_code", "parent_wbs_id", "sort_order"],
      }),
      this.wbsCategoryRepository.find({
        where: { tenant_id, is_active: true },
        select: ["id", "name", "code"],
      }),
    ]);

    const codeToId = new Map<string, string>();
    // sort_order continues from the highest existing sibling, so an import does
    // not renumber a tree the operator has already arranged by hand.
    const sortCursor = new Map<string, number>();
    for (const item of existingItems) {
      codeToId.set(codeKey(item.wbs_code), item.wbs_id);
      const siblingKey = item.parent_wbs_id ?? ROOT_SIBLING_KEY;
      const current = sortCursor.get(siblingKey);
      if (current === undefined || item.sort_order > current) {
        sortCursor.set(siblingKey, item.sort_order);
      }
    }

    // Cost categories are tenant-owned labels, so the file's "Cost Type" text is
    // resolved against THIS tenant's categories rather than invented. An
    // unmatched label is a warning, not a blocker: the line item still belongs
    // in the budget, it just is not classified.
    const categoryIds = new Map<string, string>();
    for (const category of categories) {
      categoryIds.set(normaliseCategoryKey(category.name), category.id);
      if (category.code) {
        categoryIds.set(normaliseCategoryKey(category.code), category.id);
      }
    }
    const unknownCategories = new Set<string>();

    // ── Plan every write before performing any of them ──────────────────────
    const planned: Array<{ row: MappedRow; entity: WbsBudgetEntity }> = [];
    const updatePlans: Array<{ wbs_id: string; patch: Record<string, unknown> }> = [];

    for (const row of rows) {
      const payload = toCreateWbsBudgetPayload(row, projectId);
      const key = codeKey(payload.wbs_code);

      let categoryId: string | null = null;
      if (payload.category_label) {
        categoryId =
          categoryIds.get(normaliseCategoryKey(payload.category_label)) ?? null;
        if (!categoryId) unknownCategories.add(payload.category_label);
      }

      const parentId = payload.parent_wbs_code
        ? (codeToId.get(codeKey(payload.parent_wbs_code)) ?? null)
        : null;
      if (payload.parent_wbs_code && !parentId) {
        errors.push(
          `Row ${row.sourceRow}: its parent "${payload.parent_wbs_code}" is neither in this file nor in this project, so this row was not imported.`,
        );
        continue;
      }

      const alreadyThere = codeToId.get(key);
      if (alreadyThere && !alreadyThere.startsWith(PREVIEW_ID_PREFIX)) {
        if (mode === "skip") {
          skippedExisting.push({ wbs_code: row.wbs_code, sourceRow: row.sourceRow });
          continue;
        }
        if (mode === "create") {
          errors.push(
            `Row ${row.sourceRow} (${row.wbs_code}): a line item with this WBS code already exists in the project. Import with mode "update" to overwrite it or "skip" to leave it unchanged.`,
          );
          continue;
        }
        // mode "update": keep the id, the position in the tree and the creation
        // timestamp; refresh only the values the file actually states.
        updatePlans.push({
          wbs_id: alreadyThere,
          patch: {
            description: payload.description,
            unit_cost_budgeted: payload.unit_cost_budgeted,
            quantity_budgeted: payload.quantity_budgeted,
            days_budgeted: payload.days_budgeted,
            total_cost_budgeted: payload.total_cost_budgeted,
            uom: payload.uom ?? null,
            category_id: categoryId,
            parent_wbs_id: parentId,
            custom_metadata: this.buildImportProvenance(row, analysis, projectId),
          },
        });
        updated.push({
          wbs_code: row.wbs_code,
          wbs_id: alreadyThere,
          sourceRow: row.sourceRow,
        });
        continue;
      }

      if (alreadyThere) {
        // A code duplicated inside the file: the parser already flagged the
        // second one, so it never reaches here.
        continue;
      }

      const siblingKey = parentId ?? ROOT_SIBLING_KEY;
      const nextSort = (sortCursor.get(siblingKey) ?? -1) + 1;
      sortCursor.set(siblingKey, nextSort);

      const entity = new WbsBudgetEntity();
      entity.wbs_id = dryRun ? `${PREVIEW_ID_PREFIX}${key}` : randomUUID();
      entity.project_id = projectId;
      entity.parent_wbs_id = parentId;
      entity.category_id = categoryId;
      entity.wbs_code = payload.wbs_code;
      entity.description = payload.description;
      entity.unit_cost_budgeted = payload.unit_cost_budgeted;
      entity.quantity_budgeted = payload.quantity_budgeted;
      entity.days_budgeted = payload.days_budgeted;
      entity.total_cost_budgeted = payload.total_cost_budgeted;
      entity.uom = payload.uom ?? null;
      entity.status = WbsBudgetStatus.DRAFT;
      entity.sort_order = nextSort;
      entity.tenant_id = tenant_id;
      entity.user = { id: userId } as UserEntity;
      entity.custom_metadata = this.buildImportProvenance(row, analysis, projectId);

      planned.push({ row, entity });
      // Registering the id immediately is what lets a later row in the same
      // file point at this one. resolveHierarchy guarantees a parent is always
      // planned before its children, so the FK is satisfied within the chunk.
      codeToId.set(key, entity.wbs_id);
    }

    if (unknownCategories.size > 0) {
      warnings.push(
        `${unknownCategories.size} cost categor${unknownCategories.size === 1 ? "y" : "ies"} in the file match no active category in this tenant and were left unclassified: ${[...unknownCategories].slice(0, 10).join(", ")}.`,
      );
    }
    if (skippedExisting.length > 0) {
      warnings.push(
        `${skippedExisting.length} row(s) already existed in the project and were left unchanged (mode "skip").`,
      );
    }
    if (updatePlans.length > 0) {
      warnings.push(
        `${updatePlans.length} existing line item(s) were updated. Their ids, positions in the tree and creation timestamps were preserved.`,
      );
    }
    if (errors.length > 0) {
      warnings.push(
        `${errors.length} row(s) could not be imported and were not written.`,
      );
    }

    // `created` is only filled in once the write is known to have happened, so a
    // rolled-back import can never report rows that do not exist.
    const recordCreated = () => {
      for (const { row, entity } of planned) {
        created.push({
          wbs_code: row.wbs_code,
          wbs_id: entity.wbs_id,
          sourceRow: row.sourceRow,
        });
      }
    };

    if (dryRun) {
      recordCreated();
      warnings.push(
        "Dry run: nothing was written. The preview ids below are placeholders, not database ids.",
      );
      return finish();
    }

    if (planned.length === 0 && updatePlans.length === 0) {
      return finish();
    }

    // ── Write: ONE transaction, chunked so a 5,000-row file does not build a
    // single enormous multi-megabyte INSERT statement.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (let i = 0; i < planned.length; i += WBS_IMPORT_CHUNK) {
        const chunk = planned.slice(i, i + WBS_IMPORT_CHUNK);
        await queryRunner.manager.insert(
          WbsBudgetEntity,
          chunk.map(({ entity }) => ({
            wbs_id: entity.wbs_id,
            project_id: entity.project_id,
            parent_wbs_id: entity.parent_wbs_id,
            category_id: entity.category_id,
            wbs_code: entity.wbs_code,
            description: entity.description,
            unit_cost_budgeted: entity.unit_cost_budgeted,
            quantity_budgeted: entity.quantity_budgeted,
            days_budgeted: entity.days_budgeted,
            uom: entity.uom,
            total_cost_budgeted: entity.total_cost_budgeted,
            status: entity.status,
            sort_order: entity.sort_order,
            user: entity.user,
            tenant_id: entity.tenant_id,
            custom_metadata: entity.custom_metadata,
          })),
        );
      }

      for (const update of updatePlans) {
        await queryRunner.manager.update(
          WbsBudgetEntity,
          { wbs_id: update.wbs_id, tenant_id },
          update.patch,
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      planned.length = 0;
      updatePlans.length = 0;
      updated.length = 0;
      // The old loop caught per-row failures and carried on, which left a
      // project with half a WBS and a total nobody could explain. A budget that
      // is partly wrong is more dangerous than one that is absent, so this rolls
      // back in full and says so.
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[WBS] Spreadsheet import rolled back in full for project ${projectId}: ${(err as Error).message} ${this.tenancySnapshot(tenant_id)}`,
      );
      throw new InternalServerErrorException(
        `The import was rolled back in full and nothing was saved: ${(err as Error).message}`,
      );
    } finally {
      await queryRunner.release();
    }

    // Only now that the write has committed do the created rows become fact.
    recordCreated();

    // The budget has just become the control figure for this project, so the
    // contract-value check runs once for the finished tree rather than once per
    // row the way it did through createWbsBudgetDraft.
    //
    // This runs after the commit on purpose. The check alerts and logs; it never
    // throws, so it cannot turn a committed import into a reported failure. Its
    // finding is reported back to the operator rather than being logged where
    // only a server operator would ever see it.
    const contractCheck = await this.validateBudgetAgainstContractValue(
      projectId,
      tenant_id,
      project,
    );
    if (contractCheck.overBudget) {
      const overage =
        contractCheck.totalBudgeted - contractCheck.contractValue;
      warnings.push(
        `The imported total of ${contractCheck.totalBudgeted.toFixed(2)} exceeds the project contract value of ${contractCheck.contractValue.toFixed(2)} by ${overage.toFixed(2)}. The budget was saved and a variance alert was raised.`,
      );
    }

    await this.auditService.log(
      userId,
      "WBS_IMPORT",
      tenant_id,
      `Imported ${created.length} and updated ${updated.length} WBS line item(s) into project ${projectId} (mode: ${mode}, source: ${analysis.source}${analysis.sheetName ? `, sheet "${analysis.sheetName}"` : ""}, estimated total ${analysis.summary.estimatedTotal}).`,
      {
        targetType: "WbsBudget",
        targetId: projectId,
        mode,
        source: analysis.source,
        sheetName: analysis.sheetName,
        headerRow: analysis.headerRow,
        encoding: analysis.encoding,
        delimiter: analysis.delimiter,
        currencies: analysis.currencies,
        created: created.length,
        updated: updated.length,
        skippedExisting: skippedExisting.length,
        flagged: analysis.summary.flagged,
        errors,
      },
    );

    return finish();
  }

  /**
   * Records where a line item came from, on the row itself. Without this, a
   * reviewer asking "why is budget line 4.2 worth this?" has no way back to the
   * spreadsheet cell that produced it.
   */
  private buildImportProvenance(
    row: MappedRow,
    analysis: WbsImportAnalysis,
    projectId: string,
  ): Record<string, unknown> {
    return {
      importedFrom: {
        source: analysis.source,
        sheetName: analysis.sheetName,
        headerRow: analysis.headerRow,
        sourceRow: row.sourceRow,
        delimiter: analysis.delimiter,
        encoding: analysis.encoding,
        projectId,
        at: new Date().toISOString(),
      },
    };
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
      relations: ["project", "category"],
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
      .createQueryBuilder("wbs")
      .select("SUM(wbs.total_cost_budgeted)", "total")
      .where("wbs.project_id = :projectId", { projectId })
      .andWhere("wbs.tenant_id = :tenantId", { tenantId })
      .andWhere("wbs.status = :status", { status: WbsBudgetStatus.APPROVED })
      .andWhere("wbs.parent_wbs_id IS NULL")
      .getRawOne();

    const pendingResult = await this.wbsBudgetRepository
      .createQueryBuilder("wbs")
      .select("SUM(wbs.total_cost_budgeted)", "total")
      .where("wbs.project_id = :projectId", { projectId })
      .andWhere("wbs.tenant_id = :tenantId", { tenantId })
      .andWhere("wbs.status = :status", { status: WbsBudgetStatus.PENDING })
      .andWhere("wbs.parent_wbs_id IS NULL")
      .getRawOne();

    const totalApprovedAmount = parseFloat(approvedResult?.total || "0");
    const totalPendingAmount = parseFloat(pendingResult?.total || "0");
    const contractValue = Number(project.contract_value || 0);

    // 2. Simulated Impact
    const draftAmount = Number(draft.total_cost_budgeted || 0);
    const newTotalIfApproved = totalApprovedAmount + draftAmount;
    const remainingContractBuffer = Math.max(
      0,
      contractValue - newTotalIfApproved,
    );
    const percentage =
      contractValue > 0 ? (newTotalIfApproved / contractValue) * 100 : 0;

    // 3. Tax Impact (VAT/WHT)
    const vatRate = Number(project.vat_rate || 7.5) / 100;
    const whtRate = Number(project.wht_rate || 5.0) / 100;
    const estimatedVatImpact = draftAmount * vatRate;
    const estimatedWhtImpact = draftAmount * whtRate;

    // 4. Risk Intelligence (Historical Volatility)
    const { logs } = await this.auditService.findAuditLogs({
      targetType: "WBS_BUDGET",
      action: "STATUS_UPDATE", // Filter for status changes
      tenantId: tenantId as any,
      limit: 100,
    });

    const relevantLogs = logs.filter((l) => l.targetId === draftId);
    // Find previous rejections (status changed to REJECTED in details)
    const previousRejections = relevantLogs.filter(
      (l) => (l.details as any)?.newStatus === WbsBudgetStatus.REJECTED,
    );
    const rejectionsCount = previousRejections.length;

    // Volatility Score: Higher based on rejections and total status changes
    const volatilityScore = rejectionsCount * 30 + relevantLogs.length * 5;

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (percentage > 100) riskLevel = "CRITICAL";
    else if (percentage > 90 || volatilityScore > 50) riskLevel = "HIGH";
    else if (percentage > 75 || volatilityScore > 30) riskLevel = "MEDIUM";

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
    const conflicts: WbsValidationResultDto["conflicts"] = [];
    const {
      wbs_code,
      parent_wbs_id,
      project_id,
      total_cost_budgeted,
      unit_cost_budgeted,
      quantity_budgeted,
      days_budgeted,
    } = dto;

    if (!project_id) {
      return {
        isValid: false,
        conflicts: [
          {
            type: "PROJECT_MISMATCH",
            severity: "CRITICAL",
            message: "Project context is missing.",
          },
        ],
        summary: "Validation failed: Missing project context.",
      };
    }

    const duplicate = await this.wbsBudgetRepository.findOne({
      where: { wbs_code, project_id, tenant_id: tenantId },
    });

    if (duplicate && duplicate.wbs_id !== existingItemId) {
      conflicts.push({
        type: "DUPLICATE_CODE",
        severity: "CRITICAL",
        message: `WBS Code "${wbs_code}" is already in use for this project.`,
      });
    }

    const unitCost = unit_cost_budgeted || 0;
    const qty = quantity_budgeted || 1;
    const days = days_budgeted || 1;
    const computedTotal = unitCost * qty * days;
    const draftAmount =
      total_cost_budgeted && total_cost_budgeted > 0
        ? total_cost_budgeted
        : computedTotal;

    if (parent_wbs_id) {
      const parent = await this.wbsBudgetRepository.findOne({
        where: { wbs_id: parent_wbs_id, tenant_id: tenantId },
      });

      if (parent) {
        if (!wbs_code.startsWith(parent.wbs_code + ".")) {
          conflicts.push({
            type: "HIERARCHY_MISMATCH",
            severity: "WARNING",
            message: `WBS Code "${wbs_code}" should start with "${parent.wbs_code}."`,
          });
        }
        if (parent.project_id !== project_id) {
          conflicts.push({
            type: "PROJECT_MISMATCH",
            severity: "CRITICAL",
            message: "Parent item project mismatch detected.",
          });
        }

        const brothers = await this.wbsBudgetRepository.find({
          where: { parent_wbs_id, tenant_id: tenantId },
        });

        let childrenTotal = 0;
        for (const brother of brothers) {
          if (brother.wbs_id !== existingItemId) {
            childrenTotal += Number(brother.total_cost_budgeted || 0);
          }
        }

        const parentLimit = Number(parent.total_cost_budgeted || 0);
        if (parentLimit > 0 && childrenTotal + draftAmount > parentLimit) {
          conflicts.push({
            type: "BUDGET_OVERRUN",
            severity: "WARNING",
            message: "Structural Overage: subtree budget exceeds parent limit.",
          });
        }
      }
    }

    const criticalCount = conflicts.filter(
      (c: any) => c.severity === "CRITICAL",
    ).length;

    return {
      isValid: criticalCount === 0,
      conflicts,
      summary:
        conflicts.length === 0
          ? "Code and Budget structure are healthy."
          : `Detected ${conflicts.length} structural issue(s).`,
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
        "RECALL_APPROVAL",
        tenantId,
        `Budget ${wbsId} approval recalled by ${recalledBy.email}`,
        {
          entity: "WbsBudget",
          entityId: wbsId,
          previous_status: previousStatus,
          new_status: WbsBudgetStatus.RECALLED,
          reason: reason || "No reason provided",
        },
        recalledBy.email,
      );
    } catch (e) {
      this.logger.warn(
        `Audit log failed for recall on ${wbsId}: ${(e as Error).message}`,
      );
    }

    this.logger.log(
      `Budget ${wbsId} approval recalled by ${recalledBy.email}.`,
    );

    await this.auditProjectEvent(
      budget.project_id,
      tenantId,
      recalledBy.id,
      "WBS_RECALLED",
      null,
      Number(budget.total_cost_budgeted),
      `WBS approval recalled (${reason || "no reason given"}). Line returns to the editable queue.`,
    );

    return updated;
  }

  /**
   * CAPEX Portfolio Intelligence Dashboard Aggregation.
   * Supports Portfolio mode (all projects) and Drill-Down mode (single project).
   */
  async getCapexIntelligence(
    tenantId: string,
    projectId?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Fetching CAPEX Intelligence for tenant ${tenantId}, project ${projectId ?? "ALL"}`,
      );
      const projectRepo = this.dataSource.getRepository(ProjectEntity);

      const projectQuery = projectRepo
        .createQueryBuilder("p")
        .where("p.tenant_id = :tenantId", { tenantId })
        .andWhere("p.deleted_at IS NULL");
      if (projectId) {
        projectQuery.andWhere("p.project_id = :projectId", { projectId });
      }
      const projects = await projectQuery.getMany();
      const projectIds = projects.map((p) => p.project_id);

      // ── Currency normalization ──────────────────────────────────────
      // Projects carry their own currency; raw cross-project SUMs would add
      // e.g. NGN + USD as plain numbers. Everything below is converted to
      // the tenant base currency BEFORE aggregating, and the response
      // declares `currency` so clients convert from a real source.
      let baseCurrency = "USD";
      try {
        const tenant = await this.tenantService.findOneTenant(tenantId);
        if (tenant?.default_currency_code) {
          baseCurrency = tenant.default_currency_code.toUpperCase();
        }
      } catch {
        this.logger.warn(
          `[CAPEX] Tenant lookup failed for ${tenantId}, defaulting analytics currency to USD`,
        );
      }
      const rates = await this.currencyService.getUsdRateMap();
      const unconverted = new Set<string>();
      const toBase = (amount: any, from?: string | null): number => {
        const { value, converted } = convertWithMap(
          Number(amount) || 0,
          from || "USD",
          baseCurrency,
          rates,
        );
        if (!converted && from) unconverted.add(String(from).toUpperCase());
        return value;
      };

      if (projectIds.length === 0) {
        return {
          kpis: {
            totalPortfolioValue: 0,
            activeProjects: 0,
            avgUtilization: 0,
            totalBudgeted: 0,
            totalActual: 0,
            totalLpoCommitments: 0,
            remainingBudget: 0,
          },
          monthlyBurnByCategory: [],
          portfolioHeatMap: [],
          topCostOverruns: [],
          projectList: [],
          currency: baseCurrency,
          currencyWarnings: [],
        };
      }

      // Burn grouped by month+category+CURRENCY so mixed-currency spend is
      // converted before merging (never summed raw).
      const burnRows: any[] = await this.dataSource.query(
        `SELECT TO_CHAR(le.expense_date, 'YYYY-MM') as month,
          COALESCE(wc.name, 'Uncategorized') as category,
          COALESCE(p.currency, 'USD') as currency,
          SUM(le.amount) as actual
        FROM live_expense le
        LEFT JOIN wbs_budget wb ON wb.wbs_id = le.wbs_id
        LEFT JOIN wbs_category wc ON wc.id = wb.category_id
        LEFT JOIN project p ON p.project_id = le.project_id
        WHERE le.project_id = ANY($1)
        AND le.expense_date >= NOW() - INTERVAL '12 months'
        GROUP BY month, category, currency ORDER BY month ASC`,
        [projectIds],
      );

      // Merge converted burn into month+category buckets in base currency
      const burnBuckets = new Map<string, number>();
      for (const row of burnRows) {
        const key = `${row.month}|||${row.category}`;
        burnBuckets.set(
          key,
          (burnBuckets.get(key) || 0) + toBase(row.actual, row.currency),
        );
      }
      const monthlyBurn = [...burnBuckets.entries()].map(([key, actual]) => {
        const [month, category] = key.split("|||");
        return { month, category, actual: Math.round(actual * 100) / 100 };
      });

      const rawHeatMap: any[] = await this.dataSource.query(
        `SELECT p.project_id as id, p.project_name as name, p.contract_value,
          COALESCE(p.currency, 'USD') as currency,
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
        GROUP BY p.project_id, p.project_name, p.contract_value, p.currency
        ORDER BY utilization_pct DESC`,
        [projectIds],
      );

      // NOTE: utilization_pct / rag_status are ratios — currency-invariant,
      // safe to keep from SQL. Monetary fields are converted to base here.
      const portfolioHeatMap = rawHeatMap.map((p: any) => ({
        ...p,
        contract_value: Math.round(toBase(p.contract_value, p.currency) * 100) / 100,
        total_budgeted: Math.round(toBase(p.total_budgeted, p.currency) * 100) / 100,
        total_actual: Math.round(toBase(p.total_actual, p.currency) * 100) / 100,
        total_committed: Math.round(toBase(p.total_committed, p.currency) * 100) / 100,
      }));

      const topCostOverruns = portfolioHeatMap
        .filter((p: any) => Number(p.total_actual) > Number(p.total_budgeted))
        .map((p: any) => ({
          ...p,
          variance: Number(p.total_actual) - Number(p.total_budgeted),
          variance_pct:
            Number(p.total_budgeted) > 0
              ? Math.round(
                  ((Number(p.total_actual) - Number(p.total_budgeted)) /
                    Number(p.total_budgeted)) *
                    100,
                )
              : 0,
        }))
        .sort((a: any, b: any) => b.variance_pct - a.variance_pct)
        .slice(0, 5);

      const totalBudgeted = portfolioHeatMap.reduce(
        (s: number, p: any) => s + Number(p.total_budgeted || 0),
        0,
      );
      const totalActual = portfolioHeatMap.reduce(
        (s: number, p: any) => s + Number(p.total_actual || 0),
        0,
      );
      const totalCommitted = portfolioHeatMap.reduce(
        (s: number, p: any) => s + Number(p.total_committed || 0),
        0,
      );
      const totalPortfolioValue = portfolioHeatMap.reduce(
        (s: number, p: any) => s + Number(p.contract_value || 0),
        0,
      );

      const result = {
        kpis: {
          totalPortfolioValue,
          activeProjects: projects.length,
          avgUtilization:
            totalBudgeted > 0
              ? Math.round((totalActual / totalBudgeted) * 100)
              : 0,
          totalBudgeted,
          totalActual,
          totalLpoCommitments: totalCommitted,
          remainingBudget: totalBudgeted - totalActual,
        },
        monthlyBurnByCategory: monthlyBurn,
        portfolioHeatMap,
        topCostOverruns,
        projectList: projects.map((p) => ({
          id: p.project_id,
          name: p.project_name,
          currency: (p as any).currency || baseCurrency,
        })),
        currency: baseCurrency,
        currencyWarnings: [...unconverted],
      };

      return result;
    } catch (err: any) {
      throw err;
    }
  }

  // --- PDF GENERATION ENGINE ---

  private formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  async generateBudgetReportPdf(
    projectId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const project = await this.projectsService.findOneBasic(
      projectId,
      tenantId,
    );
    if (!project)
      throw new NotFoundException(`Project ${projectId} not found.`);

    const tenant = await this.tenantService.findOneTenant(tenantId);
    const rollupData = await this.getWbsBudgetRollup(tenantId, { projectId });

    // Group rollup data by Category
    const categoriesMap = new Map<string, any>();

    // Fetch all categories for this tenant to get names
    const allCategories = await this.wbsCategoryRepository.find({
      where: { tenant_id: tenantId },
    });
    const categoryNameMap = new Map(allCategories.map((c) => [c.id, c.name]));
    const categoryCodeMap = new Map(allCategories.map((c) => [c.id, c.code]));

    let totalBudget = 0;
    let totalSpent = 0;

    rollupData.forEach((item) => {
      const catId = item.category_id || "unassigned";
      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, {
          categoryCode: categoryCodeMap.get(catId) || "N/A",
          categoryName:
            categoryNameMap.get(catId) || "Unassigned / Direct Costs",
          items: [],
          totalBudget: 0,
          totalSpent: 0,
        });
      }

      const catGroup = categoriesMap.get(catId);
      const budgeted = Number(item.total_cost_budgeted || 0);
      const spent = Number(item.total_paid_rollup || 0);
      const burnRate = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      catGroup.items.push({
        wbsCode: item.wbs_code,
        description: item.description,
        formattedBudgeted: this.formatCurrency(budgeted),
        formattedSpent: this.formatCurrency(spent),
        burnRatePct: burnRate.toFixed(1),
        statusClass:
          burnRate > 100
            ? "status-danger"
            : burnRate > 85
              ? "status-warn"
              : "status-ok",
        statusText: burnRate > 100 ? "OVER" : burnRate > 85 ? "RISK" : "OK",
      });

      catGroup.totalBudget += budgeted;
      catGroup.totalSpent += spent;
      totalBudget += budgeted;
      totalSpent += spent;
    });

    const budgetCategories = Array.from(categoriesMap.values()).map((cat) => ({
      ...cat,
      formattedCategoryBudgeted: this.formatCurrency(cat.totalBudget),
      formattedCategorySpent: this.formatCurrency(cat.totalSpent),
    }));

    const templatePath = path.join(
      __dirname,
      "..",
      "common",
      "templates",
      "budget-report.hbs",
    );
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Budget template not found at ${templatePath}`);
      throw new InternalServerErrorException("Handbars template not found.");
    }
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);

    const data = {
      reportTitle: "Project Budget Performance Report",
      brandPrimaryColorHex: tenant.brandPrimaryColorHex || "#0f172a",
      brandLogoBase64: tenant.brandLogoBase64,
      tenantName: tenant.name,
      projectName: project.project_name,
      generationDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      formattedTotalBudget: this.formatCurrency(totalBudget),
      formattedTotalSpent: this.formatCurrency(totalSpent),
      isOverBudget: totalSpent > totalBudget,
      formattedTotalVariance: this.formatCurrency(totalBudget - totalSpent),
      budgetCategories,
    };

    const html = template(data);
    return this.pdfService.generatePdfFromHtml(html);
  }

  async getProjectForensics(projectId: string, tenantId: string) {
    const project = await this.projectsService.findOneBasic(
      projectId,
      tenantId,
    );
    if (!project)
      throw new NotFoundException(`Project ${projectId} not found.`);

    // 1. Get Rollup Financials
    const rollupData = await this.getWbsBudgetRollup(tenantId, { projectId });
    const totalBudget = rollupData.reduce(
      (sum, item) => sum + Number(item.total_cost_budgeted || 0),
      0,
    );
    const totalSpent = rollupData.reduce(
      (sum, item) => sum + Number(item.total_paid_rollup || 0),
      0,
    );

    // 2. Fetch 30-day History for Burn Rate
    const history = await this.dataSource.query(
      `SELECT DATE(expense_date) as date, SUM(amount) as amount 
       FROM live_expense 
       WHERE project_id = $1 AND tenant_id = $2 
       AND expense_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(expense_date) ORDER BY DATE(expense_date) ASC`,
      [projectId, tenantId],
    );

    // 3. Delegation to Central Forensics Service
    return this.forensicsService.calculateForensics(
      totalBudget,
      totalSpent,
      0, // totalCommittedLPO - placeholder for now
      history.map((h: any) => ({
        date: format(h.date, "yyyy-MM-dd"),
        amount: parseFloat(h.amount),
      })),
    );


  }

  async generateAiInsightPdf(
    projectId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const project = await this.projectsService.findOneBasic(
      projectId,
      tenantId,
    );
    const tenant = await this.tenantService.findOneTenant(tenantId);
    const forensics = await this.getProjectForensics(projectId, tenantId);

    const rollupData = await this.getWbsBudgetRollup(tenantId, { projectId });
    const totalBudget = rollupData.reduce(
      (sum, item) => sum + Number(item.total_cost_budgeted || 0),
      0,
    );
    const totalSpent = rollupData.reduce(
      (sum, item) => sum + Number(item.total_paid_rollup || 0),
      0,
    );

    const templatePath = path.join(
      __dirname,
      "..",
      "common",
      "templates",
      "ai-insight-report.hbs",
    );
    if (!fs.existsSync(templatePath))
      throw new InternalServerErrorException("AI Insight template not found.");

    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);

    // Dynamic AI Narrative Generation based on Forensics
    const exhaustionDateStr = forensics.estimatedExhaustionDate
      ? format(new Date(forensics.estimatedExhaustionDate), "MMMM dd, yyyy")
      : "N/A";

    const aiNarrative = `
      <p>The project exhibit a **${forensics.riskLevel}** financial risk profile. 
      With a monthly burn rate of **${forensics.burnRatePercentage.toFixed(1)}%**, budget depletion is projected for **${exhaustionDateStr}**.</p>

      <p>Current variance analysis indicates a ${totalSpent > totalBudget ? "cost overrun" : "favorable variance"} 
      of ${this.formatCurrency(Math.abs(totalBudget - totalSpent))}.</p>
    `;


    const recommendations = [
      forensics.riskLevel === "CRITICAL"
        ? "Immediate budget reallocation or project scope reduction required."
        : "Maintain current spending controls and monitor weekly.",
      "Audit the top cost centers for recurring overruns.",
      "Negotiate with vendors for volume-based discounts if scalability is expected.",
    ];

    const data = {
      brandPrimaryColorHex: tenant.brandPrimaryColorHex || "#0f172a",
      brandLogoBase64: tenant.brandLogoBase64,
      tenantName: tenant.name,
      projectName: project.project_name,
      formattedTotalBudget: this.formatCurrency(totalBudget),
      formattedTotalActual: this.formatCurrency(totalSpent),
      formattedRemaining: this.formatCurrency(
        Math.max(0, totalBudget - totalSpent),
      ),
      riskLevel: forensics.riskLevel,
      aiNarrative,
      recommendations,
      generationDate: format(new Date(), "MMM dd, yyyy"),
    };

    const html = template(data);
    return this.pdfService.generatePdfFromHtml(html);
  }

  async generateExpensesReportPdf(
    projectId: string,
    tenantId: string,
  ): Promise<Buffer> {
    return this.getProjectExpensesReport(projectId, tenantId);
  }

  async getProjectExpensesReport(
    projectId: string,
    tenantId: string,
  ): Promise<Buffer> {

    const project = await this.projectsService.findOneBasic(
      projectId,
      tenantId,
    );
    const tenant = await this.tenantService.findOneTenant(tenantId);

    const expenses = await this.liveExpenseRepository.find({
      where: { project_id: projectId, tenant_id: tenantId },
      relations: ["wbsBudget"],
      order: { expense_date: "DESC" },
    });

    const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const templatePath = path.join(
      __dirname,
      "..",
      "common",
      "templates",
      "expenses-report.hbs",
    );
    if (!fs.existsSync(templatePath))
      throw new InternalServerErrorException("Expenses template not found.");

    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);

    const data = {
      brandPrimaryColorHex: tenant.brandPrimaryColorHex || "#0f172a",
      brandLogoBase64: tenant.brandLogoBase64,
      tenantName: tenant.name,
      projectName: project.project_name,
      projectCode: project.project_code || "N/A",
      totalExpensesCount: expenses.length,
      totalSpend: this.formatCurrency(totalSpend),
      periodLabel: "Lifetime to Date",
      expenses: expenses.map((e) => ({
        date: format(e.expense_date, "yyyy-MM-dd"),
        wbsCode: e.wbsBudget?.wbs_code || "N/A",
        description: e.description,
        vendor: e.vendor_name || "Generic Vendor",
        category: "Operating Expense",
        formattedAmount: this.formatCurrency(Number(e.amount)),
      })),
      generationDate: format(new Date(), "MMM dd, yyyy"),
    };

    const html = template(data);
    return this.pdfService.generatePdfFromHtml(html);
  }
}
