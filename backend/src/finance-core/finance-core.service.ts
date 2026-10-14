import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { FiscalYearEntity } from "./entities/fiscal-year.entity";
import {
  FiscalPeriodEntity,
  FiscalPeriodType,
} from "./entities/fiscal-period.entity";
import { DepartmentEntity } from "./entities/department.entity";
import { CostCenterEntity } from "./entities/cost-center.entity";
import { AccountClassEntity } from "./entities/account-class.entity";
import { AccountGroupEntity } from "./entities/account-group.entity";
import { GLAccountEntity } from "./entities/gl-account.entity";
import {
  P2PRequisitionEntity,
  DocumentStatus,
} from "./entities/p2p-requisition.entity";
import {
  P2PPurchaseOrderEntity,
  POStatus,
} from "./entities/p2p-purchase-order.entity";
import { P2PInvoiceEntity, InvoiceStatus } from "./entities/p2p-invoice.entity";
import { P2PReceiptEntity } from "./entities/p2p-receipt.entity";
import { P2PPurchaseOrderLineEntity } from "./entities/p2p-purchase-order-line.entity";
import { P2PReceiptLineEntity } from "./entities/p2p-receipt-line.entity";
import { BudgetLedgerEntity } from "./entities/budget-ledger.entity";
import { PayrollLineItemEntity } from "./entities/payroll-line-item.entity";
import { PayrollRunStatus } from "./entities/payroll-run.entity";
import { ClsService } from "nestjs-cls";
import { DOAService } from "../common/doa.service";
import {
  ApprovalLogEntity,
  ApprovalDocumentType,
  ApprovalStatus,
} from "../common/entities/approval-log.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserEntity } from "../auth/user.entity";
import { UserPayload } from "@shared/types/user";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { GetFinancialDocumentsDto } from "./dto/get-financial-documents.dto";
import { SelectQueryBuilder } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import * as hbs from "handlebars";
import { format } from "date-fns";
import { PdfGenerationService } from "../common/pdf-generation.service";
import { TenantService } from "../tenants/tenant.service";
import { EncumbranceStatus, EncumbranceSourceType } from "@shared/types";
import { ThreeWayMatchResult, ThreeWayMatchLine } from "@shared/types";
import { OperationalBudgetsService } from "../operational-budgets/operational-budgets.service";
import { BudgetControlService } from "../common/budget-control.service";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { OperationalBudgetStatus } from "@shared/types";
import { VendorEntity, VendorStatus } from "./entities/vendor.entity";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";
import { QueryVendorsDto } from "./dto/query-vendors.dto";

@Injectable()
export class FinanceCoreService {
  private readonly logger = new Logger(FinanceCoreService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(FiscalYearEntity, TENANT_DATA_SOURCE)
    private fiscalYearRepo: Repository<FiscalYearEntity>,
    @InjectRepository(FiscalPeriodEntity, TENANT_DATA_SOURCE)
    private fiscalPeriodRepo: Repository<FiscalPeriodEntity>,
    @InjectRepository(DepartmentEntity, TENANT_DATA_SOURCE)
    private departmentRepo: Repository<DepartmentEntity>,
    @InjectRepository(CostCenterEntity, TENANT_DATA_SOURCE)
    private costCenterRepo: Repository<CostCenterEntity>,
    @InjectRepository(AccountClassEntity, TENANT_DATA_SOURCE)
    private accountClassRepo: Repository<AccountClassEntity>,
    @InjectRepository(AccountGroupEntity, TENANT_DATA_SOURCE)
    private accountGroupRepo: Repository<AccountGroupEntity>,
    @InjectRepository(GLAccountEntity, TENANT_DATA_SOURCE)
    private glAccountRepo: Repository<GLAccountEntity>,
    @InjectRepository(P2PRequisitionEntity, TENANT_DATA_SOURCE)
    private requisitionRepo: Repository<P2PRequisitionEntity>,
    @InjectRepository(P2PPurchaseOrderEntity, TENANT_DATA_SOURCE)
    private poRepo: Repository<P2PPurchaseOrderEntity>,
    @InjectRepository(P2PInvoiceEntity, TENANT_DATA_SOURCE)
    private invoiceRepo: Repository<P2PInvoiceEntity>,
    @InjectRepository(P2PReceiptEntity, TENANT_DATA_SOURCE)
    private receiptRepo: Repository<P2PReceiptEntity>,
    @InjectRepository(P2PPurchaseOrderLineEntity, TENANT_DATA_SOURCE)
    private poLineRepo: Repository<P2PPurchaseOrderLineEntity>,
    @InjectRepository(P2PReceiptLineEntity, TENANT_DATA_SOURCE)
    private receiptLineRepo: Repository<P2PReceiptLineEntity>,
    @InjectRepository(BudgetLedgerEntity, TENANT_DATA_SOURCE)
    private budgetLedgerRepo: Repository<BudgetLedgerEntity>,
    @InjectRepository(PayrollLineItemEntity, TENANT_DATA_SOURCE)
    private payrollLineItemRepo: Repository<PayrollLineItemEntity>,
    @InjectRepository(ApprovalLogEntity, TENANT_DATA_SOURCE)
    private approvalLogRepo: Repository<ApprovalLogEntity>,
    @InjectRepository(VendorEntity, TENANT_DATA_SOURCE)
    private vendorRepo: Repository<VendorEntity>,
    private readonly doaService: DOAService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfGenerationService,
    private readonly tenantService: TenantService,
    private readonly operationalBudgetsService: OperationalBudgetsService,
    private readonly budgetControlService: BudgetControlService,
  ) {}

  private getTenantId(): string {
    // Canonical CLS key is tenant_id (set by TenancyGuard, read by
    // tenancy-aware-data-source and tenants/client services).
    const tenantId = this.cls.get("tenant_id");
    if (!tenantId) {
      throw new InternalServerErrorException("Tenant context missing. Request must include a valid tenant.");
    }
    return tenantId;
  }

  /**
   * Atomically allocate the next document number for (tenant, type, year).
   * Backed by the tenant `document_sequence` table (migration
   * 1777000000003). The INSERT ... ON CONFLICT DO UPDATE ... RETURNING is a
   * single atomic statement, so concurrent allocations serialise on the
   * composite-PK row lock and never collide (unlike the old count()+1, which
   * also rewound on deletion).
   */
  private async nextDocumentNumber(
    manager: EntityManager,
    tenantId: string,
    docType: string,
    prefix: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const rows: Array<{ last_value: number | string }> = await manager.query(
      `INSERT INTO "document_sequence" ("tenant_id", "doc_type", "period_year", "last_value")
       VALUES ($1, $2, $3, 1)
       ON CONFLICT ("tenant_id", "doc_type", "period_year")
       DO UPDATE SET "last_value" = "document_sequence"."last_value" + 1,
                     "updated_at" = now()
       RETURNING "last_value"`,
      [tenantId, docType, year],
    );
    const seq = Number(rows?.[0]?.last_value ?? 0);
    return `${prefix}-${year}-${seq.toString().padStart(4, "0")}`;
  }

  // --- Fiscal Calendar Management ---

  async createFiscalYear(data: {
    label: string;
    startDate: Date;
    endDate: Date;
  }) {
    const tenantId = this.getTenantId();

    // 1. Basic validation
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new ConflictException("Start date must be before end date.");
    }

    // 2. Check for duplicate labels
    const existingLabel = await this.fiscalYearRepo.findOne({
      where: { tenant_id: tenantId, year_label: data.label },
    });
    if (existingLabel)
      throw new ConflictException(
        `Fiscal Year label '${data.label}' is already in use.`,
      );

    // 3. Check for overlapping date ranges
    const overlapping = await this.fiscalYearRepo
      .createQueryBuilder("fy")
      .where("fy.tenant_id = :tenantId", { tenantId })
      .andWhere("(fy.start_date <= :endDate AND fy.end_date >= :startDate)", {
        startDate: data.startDate,
        endDate: data.endDate,
      })
      .getOne();

    if (overlapping) {
      throw new ConflictException(
        `This fiscal cycle overlaps with an existing cycle (FY ${overlapping.year_label}).`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const fy = manager.create(FiscalYearEntity, {
        tenant_id: tenantId,
        year_label: data.label,
        start_date: data.startDate,
        end_date: data.endDate,
      });
      const savedFy = await manager.save(fy);

      // Automatically generate 12 monthly periods starting from the fiscal year start
      const start = new Date(data.startDate);
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      for (let i = 0; i < 12; i++) {
        // Calculate the first day and last day of each subsequent month
        const pStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const pEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

        const period = manager.create(FiscalPeriodEntity, {
          tenant_id: tenantId,
          fiscal_year_id: savedFy.id,
          period_name: months[pStart.getMonth()],
          period_type: FiscalPeriodType.MONTH,
          start_date: pStart,
          end_date: pEnd,
        });
        await manager.save(period);
      }

      return savedFy;
    });
  }

  async getFiscalYears() {
    return this.fiscalYearRepo.find({
      where: { tenant_id: this.getTenantId() },
      order: { start_date: "DESC" },
      relations: ["periods"],
    });
  }

  // --- Organizational Structure ---

  async createDepartment(data: {
    name: string;
    code: string;
    parentId?: string;
  }) {
    const dept = this.departmentRepo.create({
      tenant_id: this.getTenantId(),
      name: data.name,
      code: data.code,
      parent_department_id: data.parentId,
    });
    return this.departmentRepo.save(dept);
  }

  async getDepartments() {
    return this.departmentRepo.find({
      where: { tenant_id: this.getTenantId() },
      relations: ["costCenters", "parentDepartment"],
    });
  }

  async createCostCenter(data: {
    name: string;
    code: string;
    departmentId: string;
  }) {
    const cc = this.costCenterRepo.create({
      tenant_id: this.getTenantId(),
      name: data.name,
      code: data.code,
      department_id: data.departmentId,
    });
    return this.costCenterRepo.save(cc);
  }

  // --- Chart of Accounts ---
  async getChartOfAccounts() {
    return this.accountClassRepo.find({
      where: { tenant_id: this.getTenantId() },
      relations: ["accountGroups", "accountGroups.glAccounts"],
      order: { code: "ASC" },
    });
  }

  // --- Procure-to-Pay (P2P) Spending Pipeline ---

  // --- Vendor Master ---

  private async resolveVendor(
    tenantId: string,
    vendorId: string,
  ): Promise<VendorEntity> {
    const vendor = await this.vendorRepo.findOne({
      where: { id: vendorId, tenant_id: tenantId },
    });
    if (!vendor) {
      throw new NotFoundException(
        `Vendor ${vendorId} not found for this tenant.`,
      );
    }
    return vendor;
  }

  async createVendor(data: CreateVendorDto): Promise<VendorEntity> {
    const tenantId = this.getTenantId();
    const existing = await this.vendorRepo.findOne({
      where: { tenant_id: tenantId, code: data.code },
    });
    if (existing) {
      throw new ConflictException(
        `Vendor code "${data.code}" already exists for this tenant.`,
      );
    }

    const vendor = this.vendorRepo.create({
      tenant_id: tenantId,
      code: data.code,
      name: data.name,
      tax_id: data.taxId ?? null,
      contact_name: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      payment_terms_days: data.paymentTermsDays ?? 30,
      currency: data.currency ?? "USD",
      status: data.status ?? VendorStatus.ACTIVE,
      notes: data.notes ?? null,
    });

    return this.vendorRepo.save(vendor);
  }

  async getVendors(dto: QueryVendorsDto) {
    const tenantId = this.getTenantId();
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const qb = this.vendorRepo
      .createQueryBuilder("vendor")
      .where("vendor.tenant_id = :tenantId", { tenantId });

    if (dto.status) {
      qb.andWhere("vendor.status = :status", { status: dto.status });
    }
    if (dto.search) {
      qb.andWhere(
        "(vendor.name ILIKE :search OR vendor.code ILIKE :search OR vendor.email ILIKE :search)",
        { search: `%${dto.search}%` },
      );
    }

    qb.orderBy("vendor.name", dto.sortOrder ?? "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getVendor(id: string): Promise<VendorEntity> {
    return this.resolveVendor(this.getTenantId(), id);
  }

  async updateVendor(id: string, data: UpdateVendorDto): Promise<VendorEntity> {
    const vendor = await this.resolveVendor(this.getTenantId(), id);

    if (data.name !== undefined) vendor.name = data.name;
    if (data.taxId !== undefined) vendor.tax_id = data.taxId;
    if (data.contactName !== undefined) vendor.contact_name = data.contactName;
    if (data.email !== undefined) vendor.email = data.email;
    if (data.phone !== undefined) vendor.phone = data.phone;
    if (data.address !== undefined) vendor.address = data.address;
    if (data.paymentTermsDays !== undefined) {
      vendor.payment_terms_days = data.paymentTermsDays;
    }
    if (data.currency !== undefined) vendor.currency = data.currency;
    if (data.status !== undefined) vendor.status = data.status;
    if (data.notes !== undefined) vendor.notes = data.notes;

    return this.vendorRepo.save(vendor);
  }

  async setVendorStatus(
    id: string,
    status: VendorStatus,
  ): Promise<VendorEntity> {
    const vendor = await this.resolveVendor(this.getTenantId(), id);
    vendor.status = status;
    return this.vendorRepo.save(vendor);
  }

  /**
   * Resolve an optional vendor reference for a document: when a vendorId is
   * supplied it must exist, belong to the tenant and be ACTIVE; returns the
   * canonical name snapshot and id. When absent, the caller's free-text name
   * (if any) is used with a null id.
   */
  private async resolveVendorRef(
    tenantId: string,
    vendorId: string | undefined,
    fallbackName: string | null | undefined,
  ): Promise<{ vendor_id: string | null; vendor_name: string | null }> {
    if (!vendorId) {
      return { vendor_id: null, vendor_name: fallbackName ?? null };
    }
    const vendor = await this.resolveVendor(tenantId, vendorId);
    if (vendor.status !== VendorStatus.ACTIVE) {
      throw new BadRequestException(
        `Vendor ${vendor.name} is ${vendor.status} and cannot be used on new documents.`,
      );
    }
    return { vendor_id: vendor.id, vendor_name: vendor.name };
  }

  async createRequisition(data: {
    description: string;
    estimatedAmount: number;
    costCenterId: string;
    glAccountId: string;
    vendorId?: string;
    vendorName?: string;
    requiredByDate?: string;
    currency?: string;
    exchangeRate?: number;
  }) {
    const tenantId = this.getTenantId();
    const userId = this.cls.get("userId");

    // Generate a unique, atomic, gap-free requisition number (e.g., REQ-2026-0001)
    const reqNumber = await this.nextDocumentNumber(
      this.dataSource.manager,
      tenantId,
      "REQUISITION",
      "REQ",
    );

    const currency = data.currency || "USD";
    const exchangeRate = data.exchangeRate || 1.0;
    const baseAmount = data.estimatedAmount * exchangeRate;

    const vendorRef = await this.resolveVendorRef(
      tenantId,
      data.vendorId,
      data.vendorName,
    );

    const req = this.requisitionRepo.create({
      tenant_id: tenantId,
      requisition_number: reqNumber,
      requester_id: userId,
      description: data.description,
      estimated_amount: data.estimatedAmount,
      cost_center_id: data.costCenterId,
      gl_account_id: data.glAccountId,
      vendor_id: vendorRef.vendor_id,
      vendor_name: vendorRef.vendor_name,
      required_by_date: data.requiredByDate
        ? new Date(data.requiredByDate)
        : null,
      status: DocumentStatus.PENDING_APPROVAL,
      currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
    });

    const requisition = await this.requisitionRepo.save(req);

    // PERSIST APPROVAL LOG (Submission)
    const log = this.approvalLogRepo.create({
      tenant_id: tenantId,
      document_type: ApprovalDocumentType.REQUISITION,
      document_id: requisition.id,
      status: ApprovalStatus.SUBMITTED,
      actor_id: userId,
      amount: data.estimatedAmount,
      comments: "Requisition submitted for approval",
    });
    await this.approvalLogRepo.save(log);

    // Phase 4 (4.1): raise a soft-hold (RESERVED) on the requisition pipeline.
    // Resolve the matching active operational budget via cost-center department.
    const budgetId = await this.resolveOperationalBudgetForCostCenter(
      tenantId,
      data.costCenterId,
    );
    await this.operationalBudgetsService.createEncumbrance({
      tenantId,
      sourceType: EncumbranceSourceType.REQUISITION,
      sourceId: requisition.id,
      amount: baseAmount,
      operationalBudgetId: budgetId,
      operationalBudgetCategoryId: null,
      status: EncumbranceStatus.RESERVED,
      notes: `Requisition ${reqNumber}: ${data.description}`,
    });

    return requisition;
  }

  /**
   * Phase 4 (4.7): resolve the ACTIVE operational budget covering a
   * cost-center's department so spend can be checked against an OPEX plan.
   * Prefers a budget whose date-range spans today; falls back to the most
   * recent active budget for the department.
   */
  private async resolveOperationalBudgetForCostCenter(
    tenantId: string,
    costCenterId: string,
  ): Promise<string | null> {
    const costCenter = await this.costCenterRepo.findOne({
      where: { tenant_id: tenantId, id: costCenterId },
      relations: ["department"],
    });
    const departmentId = costCenter?.department?.id ?? costCenter?.department_id;
    if (!departmentId) return null;

    const budgets = await this.dataSource
      .getRepository(OperationalBudgetEntity)
      .find({
        where: {
          tenant_id: tenantId,
          department_id: departmentId,
          status: OperationalBudgetStatus.ACTIVE,
        },
      });
    if (!budgets.length) return null;

    const now = new Date();
    const spanning = budgets.find(
      (b) =>
        (!b.start_date || new Date(b.start_date) <= now) &&
        (!b.end_date || new Date(b.end_date) >= now),
    );
    return (spanning ?? budgets[0]).operational_budget_id;
  }

  async getRequisitions(dto: GetFinancialDocumentsDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = dto;
    const queryBuilder = this.requisitionRepo
      .createQueryBuilder("requisition")
      .leftJoinAndSelect("requisition.costCenter", "costCenter")
      .leftJoinAndSelect("requisition.glAccount", "glAccount")
      .leftJoinAndSelect("requisition.requester", "requester")
      .where("requisition.tenant_id = :tenantId", {
        tenantId: this.getTenantId(),
      });

    this._applyFinancialFilters(
      queryBuilder,
      dto,
      "requisition",
      "estimated_amount",
    );

    // Validate sortBy to prevent SQL injection and column-not-found errors
    const validSortColumns = ['created_at', 'updated_at', 'estimated_amount', 'requisition_number', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`requisition.${safeSortBy}`, safeSortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      return { data, total };
    } catch (err: any) {
      this.logger.error(`[FinanceCore] Failed to fetch requisitions: ${err.message}`);
      throw new InternalServerErrorException('Failed to fetch requisitions');
    }
  }

  async createPurchaseOrder(
    requisitionId: string,
    actor: UserPayload | UserEntity,
    lines?: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      glAccountId?: string | null;
      costCenterId?: string | null;
    }>,
  ) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async (manager) => {
      const requisition = await manager.findOne(P2PRequisitionEntity, {
        where: { id: requisitionId, tenant_id: tenantId },
        relations: ["costCenter"],
      });

      if (!requisition) {
        throw new NotFoundException(`Requisition ${requisitionId} not found.`);
      }

      if (requisition.status !== DocumentStatus.PENDING_APPROVAL) {
        throw new ConflictException(
          `Requisition ${requisitionId} is not in PENDING_APPROVAL status.`,
        );
      }

      // 1. Validate DOA Authority based on base_amount (normalized to USD)
      await this.doaService.validateAuthority(
        actor,
        requisition.estimated_amount,
        requisition.currency,
      );

      // Phase 4 (4.7): real-time budget capacity check against the matching
      // active OPEX budget before the commitment is firmed as a PO.
      let varianceWarning: {
        budgeted: number;
        actual: number;
        committed: number;
        overrunAmount: number;
        variancePct: number;
        flag: string;
      } | null = null;
      const budgetId = requisition.costCenter
        ? await this.resolveOperationalBudgetForCostCenter(
            tenantId,
            requisition.costCenter.id,
          )
        : null;
      if (budgetId) {
        const budget = await manager.findOne(OperationalBudgetEntity, {
          where: {
            operational_budget_id: budgetId,
            tenant_id: tenantId,
          },
        });
        if (budget) {
          const activeEncumbrances =
            await this.operationalBudgetsService.getActiveEncumbrancesForBudget(
              budgetId,
              tenantId,
            );
          const committedPipeline = activeEncumbrances.reduce(
            (sum, enc) => sum + Number(enc.amount || 0),
            0,
          );
          const check =
            await this.budgetControlService.validateOperationalExpenseVariance({
              budgetName: budget.name,
              budgeted: Number(budget.budgeted_amount || 0),
              actualSpent: Number(budget.actual_spent || 0),
              committedAmount: committedPipeline,
              amount: Number(
                Number(requisition.base_amount) || 
                Number(requisition.estimated_amount) || 0
              ),
            });
          if (check.action === "BLOCK") {
            throw new ConflictException(
              `[OPEX-CONTROL] PO #blocked: ${check.message}`,
            );
          }
          if (check.action === "REQUIRE_OVERRIDE" || check.action === "WARN") {
            varianceWarning = {
              budgeted: Number(budget.budgeted_amount || 0),
              actual: Number(budget.actual_spent || 0),
              committed:
                committedPipeline +
                Number(
                  Number(requisition.base_amount) || 
                  Number(requisition.estimated_amount) || 0
                ),
              overrunAmount: check.overrunAmount,
              variancePct: check.variancePercentage,
              flag: check.flag,
            };
            this.logger.warn(
              `[OPEX-CONTROL] PO issuing with ${check.flag} on "${budget.name}": ${check.message}`,
            );
          }
        }
      }

      // 2. Update requisition status
      requisition.status = DocumentStatus.APPROVED;
      await manager.save(requisition);

      // 2. Create Purchase Order
      const poNumber = await this.nextDocumentNumber(
        manager,
        tenantId,
        "PURCHASE_ORDER",
        "PO",
      );

      // Normalise the ordered lines. Explicit lines win; otherwise synthesize a
      // single line from the requisition so every PO is line-trackable.
      const orderedLines =
        lines && lines.length > 0
          ? lines.map((line) => {
              const quantity = Number(line.quantity);
              const unitAmount = Number(line.unitAmount);
              if (!line.description || !line.description.trim()) {
                throw new BadRequestException(
                  "Each purchase order line requires a description.",
                );
              }
              if (!(quantity > 0) || !(unitAmount >= 0)) {
                throw new BadRequestException(
                  "Each purchase order line requires a positive quantity and a non-negative unit amount.",
                );
              }
              return {
                description: line.description.trim(),
                quantity,
                unitAmount,
                lineAmount: quantity * unitAmount,
                glAccountId: line.glAccountId ?? requisition.gl_account_id,
                costCenterId: line.costCenterId ?? requisition.cost_center_id,
              };
            })
          : [
              {
                description:
                  (requisition.description || "").trim() || "Ordered item",
                quantity: 1,
                unitAmount: Number(requisition.estimated_amount),
                lineAmount: Number(requisition.estimated_amount),
                glAccountId: requisition.gl_account_id,
                costCenterId: requisition.cost_center_id,
              },
            ];

      const committedAmount = orderedLines.reduce(
        (sum, line) => sum + line.lineAmount,
        0,
      );
      const exchangeRate = Number(requisition.exchange_rate) || 1;
      const requisitionBaseAmount =
        requisition.base_amount == null ? null : Number(requisition.base_amount);

      // Explicit lines must not exceed the approved requisition ceiling; the
      // DOA authority check above only cleared the requisition's own amount.
      if (lines && lines.length > 0) {
        const estimated = Number(requisition.estimated_amount) || 0;
        const ceilingTolerance = Math.max(estimated * 0.0001, 0.01);
        if (committedAmount > estimated + ceilingTolerance) {
          throw new ConflictException(
            `Purchase order lines total ${committedAmount} exceeds the approved requisition amount ${estimated}. Raise a new requisition for the difference.`,
          );
        }
      }

      const po = manager.create(P2PPurchaseOrderEntity, {
        tenant_id: tenantId,
        po_number: poNumber,
        requisition_id: requisitionId,
        vendor_id: requisition.vendor_id,
        vendor_name: requisition.vendor_name || "Generic Vendor",
        committed_amount: committedAmount,
        currency: requisition.currency,
        exchange_rate: requisition.exchange_rate,
        committed_base_amount:
          requisitionBaseAmount != null
            ? requisitionBaseAmount
            : committedAmount * exchangeRate,
        status: POStatus.ISSUED,
      });

      const savedPo = await manager.save(po);

      await manager.save(
        orderedLines.map((line, index) =>
          manager.create(P2PPurchaseOrderLineEntity, {
            tenant_id: tenantId,
            purchase_order_id: savedPo.id,
            line_number: index + 1,
            description: line.description,
            quantity: line.quantity,
            unit_amount: line.unitAmount,
            line_amount: line.lineAmount,
            received_quantity: 0,
            gl_account_id: line.glAccountId ?? null,
            cost_center_id: line.costCenterId ?? null,
          }),
        ),
      );

      // Phase 4 (4.1): the requisition's soft-hold is released now that the
      // commitment is firmed — the PO carries the FIRM hold going forward.
      await this.operationalBudgetsService.releaseEncumbrancesForSource(
        EncumbranceSourceType.REQUISITION,
        requisitionId,
        tenantId,
      );
      await this.operationalBudgetsService.createEncumbrance({
        tenantId,
        sourceType: EncumbranceSourceType.PURCHASE_ORDER,
        sourceId: savedPo.id,
        amount: Number(requisition.base_amount ?? requisition.estimated_amount),
        operationalBudgetId: budgetId,
        operationalBudgetCategoryId: null,
        status: EncumbranceStatus.FIRM,
        notes: `Purchase order ${poNumber} committed`,
      });

      const result = savedPo as P2PPurchaseOrderEntity & {
        varianceWarning?: typeof varianceWarning;
      };
      if (varianceWarning) result.varianceWarning = varianceWarning;
      return result;
    });
  }

  async rejectRequisition(
    requisitionId: string,
    actor: UserPayload | UserEntity,
  ) {
    const tenantId = this.getTenantId();
    const userId = (actor as any).id || (actor as any).sub;

    return await this.dataSource.transaction(async (manager) => {
      const requisition = await manager.findOne(P2PRequisitionEntity, {
        where: { id: requisitionId, tenant_id: tenantId },
      });

      if (!requisition) {
        throw new NotFoundException(`Requisition ${requisitionId} not found.`);
      }

      if (requisition.status !== DocumentStatus.PENDING_APPROVAL) {
        throw new ConflictException(
          `Requisition ${requisitionId} is not in PENDING_APPROVAL status.`,
        );
      }

      // Update requisition status
      requisition.status = DocumentStatus.REJECTED;
      await manager.save(requisition);

      // PERSIST APPROVAL LOG (Rejection)
      const log = manager.create(ApprovalLogEntity, {
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.REQUISITION,
        document_id: requisition.id,
        status: ApprovalStatus.REJECTED,
        actor_id: userId,
        amount: requisition.estimated_amount,
        comments: "Requisition rejected",
      });
      await manager.save(log);

      // Phase 4 (4.1): release the reserved hold on the rejected requisition.
      await this.operationalBudgetsService.releaseEncumbrancesForSource(
        EncumbranceSourceType.REQUISITION,
        requisitionId,
        tenantId,
      );

      return requisition;
    });
  }

  async getPurchaseOrders(dto: GetFinancialDocumentsDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = dto;
    const queryBuilder = this.poRepo
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.requisition", "requisition")
      .leftJoinAndSelect("requisition.costCenter", "costCenter")
      .leftJoinAndSelect("requisition.glAccount", "glAccount")
      .leftJoinAndSelect("po.lines", "lines")
      .where("po.tenant_id = :tenantId", { tenantId: this.getTenantId() });

    this._applyFinancialFilters(queryBuilder, dto, "po", "committed_amount");

    queryBuilder.orderBy(`po.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async createInvoice(data: {
    invoiceNumber: string;
    amount: number;
    vendorName: string;
    invoiceDate: string;
    poId?: string;
    costCenterId: string;
    glAccountId: string;
    currency?: string;
    exchangeRate?: number;
    vendorId?: string;
    retentionPct?: number;
    whtPct?: number;
  }) {
    const tenantId = this.getTenantId();

    const currency = data.currency || "USD";
    const exchangeRate = data.exchangeRate || 1.0;
    const baseAmount = data.amount * exchangeRate;

    const vendorRef = await this.resolveVendorRef(
      tenantId,
      data.vendorId,
      data.vendorName,
    );

    // Contractor payables controls: retention (retainage) and withholding tax.
    const retentionPct = Number(data.retentionPct ?? 0);
    const whtPct = Number(data.whtPct ?? 0);
    if (!Number.isFinite(retentionPct) || retentionPct < 0 || retentionPct > 100) {
      throw new BadRequestException(
        "retentionPct must be a number between 0 and 100.",
      );
    }
    if (!Number.isFinite(whtPct) || whtPct < 0 || whtPct > 100) {
      throw new BadRequestException(
        "whtPct must be a number between 0 and 100.",
      );
    }
    const round4 = (n: number): number => Math.round(n * 10000) / 10000;
    const retentionAmount = round4((data.amount * retentionPct) / 100);
    const whtAmount = round4((data.amount * whtPct) / 100);
    const netPayable = round4(
      data.amount - retentionAmount - whtAmount,
    );

    const invoice = this.invoiceRepo.create({
      tenant_id: tenantId,
      invoice_number: data.invoiceNumber,
      amount: data.amount,
      vendor_id: vendorRef.vendor_id,
      vendor_name: vendorRef.vendor_name ?? data.vendorName,
      invoice_date: new Date(data.invoiceDate),
      purchase_order_id: data.poId,
      cost_center_id: data.costCenterId,
      gl_account_id: data.glAccountId,
      status: InvoiceStatus.RECEIVED,
      currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      retention_pct: retentionPct,
      retention_amount: retentionAmount,
      wht_pct: whtPct,
      wht_amount: whtAmount,
      net_payable: netPayable,
    });

    const saved = await this.invoiceRepo.save(invoice);

    // Phase 4 (4.8): a PO-backed invoice nudges fulfilment status toward
    // FULFILLED so the pipeline reflects physical completeness (a three-way
    // match is validated via the dedicated endpoint).
    if (data.poId) {
      const po = await this.poRepo.findOne({
        where: { id: data.poId, tenant_id: tenantId },
      });
      if (po && po.status === POStatus.ISSUED) {
        po.status = POStatus.PARTIALLY_FULFILLED;
        po.updated_at = new Date();
        await this.poRepo.save(po);
      }
    }

    return saved;
  }

  async getInvoices(dto: GetFinancialDocumentsDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = dto;
    const queryBuilder = this.invoiceRepo
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.costCenter", "costCenter")
      .leftJoinAndSelect("invoice.glAccount", "glAccount")
      .leftJoinAndSelect("invoice.purchaseOrder", "purchaseOrder")
      .where("invoice.tenant_id = :tenantId", { tenantId: this.getTenantId() });

    this._applyFinancialFilters(queryBuilder, dto, "invoice", "amount");

    queryBuilder.orderBy(`invoice.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async payInvoice(
    invoiceId: string,
    tenantId: string,
    actorUserId: string,
    actorRole?: string,
  ) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found.`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException(
        `Invoice ${invoice.invoice_number} is already paid.`,
      );
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.updated_at = new Date();
    const paid = await this.invoiceRepo.save(invoice);

    // Phase 4 (4.1): paying the invoice realises the PO commitment — liquidate.
    if (invoice.purchase_order_id) {
      await this.operationalBudgetsService.liquidateEncumbrancesForSource(
        EncumbranceSourceType.PURCHASE_ORDER,
        invoice.purchase_order_id,
        tenantId,
      );
      const po = await this.poRepo.findOne({
        where: { id: invoice.purchase_order_id, tenant_id: tenantId },
      });
      if (po && po.status === POStatus.ISSUED) {
        po.status = POStatus.FULFILLED;
        po.updated_at = new Date();
        await this.poRepo.save(po);
      }
    }

    this.logger.log(
      `[FINANCE-CORE] INVOICE PAID | ${invoice.invoice_number} | By: ${actorRole} (${actorUserId})`,
    );

    return paid;
  }

  // ─── Phase 4 (4.8) — Receipts & 3-Way Match ─────────────────────────────

  /**
   * Record goods/services received against a purchase order.
   *
   * Two modes:
   *  - Line-level: pass `lines[]` keyed by `purchaseOrderLineId`. Over-receipt
   *    against the ordered line quantity is rejected, and each PO line's running
   *    `received_quantity` is incremented for line-level 3-way matching.
   *  - Legacy amount-level: pass `quantity`/`unitAmount`; a single receipt line
   *    is auto-linked to the PO's first line (when the PO has lines).
   */
  async recordReceipt(input: {
    purchaseOrderId: string;
    receivedByUserId: string;
    receivedDate: string;
    quantity?: number;
    unitAmount?: number;
    notes?: string;
    currency?: string;
    exchangeRate?: number;
    lines?: Array<{
      purchaseOrderLineId: string;
      quantity: number;
      unitAmount?: number;
    }>;
  }) {
    const tenantId = this.getTenantId();
    const overReceiptTolerance = 1e-6;

    const po = await this.poRepo.findOne({
      where: { id: input.purchaseOrderId, tenant_id: tenantId },
    });
    if (!po) {
      throw new NotFoundException(
        `Purchase order ${input.purchaseOrderId} not found.`,
      );
    }
    if (po.status === POStatus.CANCELLED) {
      throw new ConflictException(
        `Cannot record a receipt against cancelled PO ${po.po_number}.`,
      );
    }

    const poLines = await this.poLineRepo.find({
      where: { tenant_id: tenantId, purchase_order_id: po.id },
    });

    const resolvedLines: Array<{
      purchaseOrderLineId: string | null;
      quantity: number;
      unitAmount: number;
    }> = [];

    if (input.lines && input.lines.length > 0) {
      const byId = new Map(poLines.map((l) => [l.id, l]));
      const seen = new Set<string>();
      for (const line of input.lines) {
        const poLine = byId.get(line.purchaseOrderLineId);
        if (!poLine) {
          throw new BadRequestException(
            `Purchase order line ${line.purchaseOrderLineId} does not belong to PO ${po.po_number}.`,
          );
        }
        if (seen.has(line.purchaseOrderLineId)) {
          throw new BadRequestException(
            `Purchase order line ${line.purchaseOrderLineId} appears more than once in the receipt.`,
          );
        }
        seen.add(line.purchaseOrderLineId);

        const quantity = Number(line.quantity);
        if (!(quantity > 0)) {
          throw new BadRequestException(
            "Each receipt line requires a positive quantity.",
          );
        }
        const alreadyReceived = Number(poLine.received_quantity || 0);
        const ordered = Number(poLine.quantity || 0);
        if (alreadyReceived + quantity > ordered + overReceiptTolerance) {
          throw new ConflictException(
            `Over-receipt on line ${poLine.line_number}: ordered ${ordered}, already received ${alreadyReceived}, attempted ${quantity}.`,
          );
        }
        resolvedLines.push({
          purchaseOrderLineId: poLine.id,
          quantity,
          unitAmount:
            line.unitAmount !== undefined && line.unitAmount !== null
              ? Number(line.unitAmount)
              : Number(poLine.unit_amount),
        });
      }
    } else {
      const quantity = Number(input.quantity);
      const unitAmount = Number(input.unitAmount);
      if (!(quantity > 0) || !Number.isFinite(unitAmount)) {
        throw new BadRequestException(
          "A receipt requires a positive quantity and a unit amount.",
        );
      }
      const firstLine = poLines.length
        ? poLines.reduce((a, b) => (a.line_number <= b.line_number ? a : b))
        : null;
      if (firstLine) {
        const alreadyReceived = Number(firstLine.received_quantity || 0);
        const ordered = Number(firstLine.quantity || 0);
        if (alreadyReceived + quantity > ordered + overReceiptTolerance) {
          throw new ConflictException(
            `Over-receipt on line ${firstLine.line_number}: ordered ${ordered}, already received ${alreadyReceived}, attempted ${quantity}.`,
          );
        }
      }
      resolvedLines.push({
        purchaseOrderLineId: firstLine ? firstLine.id : null,
        quantity,
        unitAmount,
      });
    }

    const totalQty = resolvedLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalAmount = resolvedLines.reduce(
      (sum, line) => sum + line.quantity * line.unitAmount,
      0,
    );

    // Receipts inherit the PO's currency/rate unless explicitly overridden, so
    // received amounts normalise to base currency for the three-way match.
    const receiptCurrency = (input.currency || po.currency || "USD")
      .toString()
      .toUpperCase();
    const receiptExchangeRate =
      input.exchangeRate !== undefined && input.exchangeRate !== null
        ? Number(input.exchangeRate)
        : Number(po.exchange_rate) || 1;
    if (!(receiptExchangeRate > 0)) {
      throw new BadRequestException("exchangeRate must be greater than zero.");
    }
    const totalBaseAmount =
      Math.round(totalAmount * receiptExchangeRate * 10000) / 10000;

    return await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(P2PReceiptEntity, {
          tenant_id: tenantId,
          purchase_order_id: input.purchaseOrderId,
          received_by_user_id: input.receivedByUserId,
          received_date: new Date(input.receivedDate),
          quantity: totalQty,
          unit_amount: totalQty > 0 ? totalAmount / totalQty : 0,
          amount: totalAmount,
          currency: receiptCurrency,
          exchange_rate: receiptExchangeRate,
          base_amount: totalBaseAmount,
          notes: input.notes ?? null,
        }),
      );

      await manager.save(
        resolvedLines.map((line) =>
          manager.create(P2PReceiptLineEntity, {
            tenant_id: tenantId,
            receipt_id: saved.id,
            purchase_order_line_id: line.purchaseOrderLineId,
            quantity: line.quantity,
            unit_amount: line.unitAmount,
            line_amount: line.quantity * line.unitAmount,
          }),
        ),
      );

      // Roll received quantities onto the PO lines for line-level matching.
      const poLineById = new Map(poLines.map((l) => [l.id, l]));
      for (const line of resolvedLines) {
        if (!line.purchaseOrderLineId) continue;
        const poLine = poLineById.get(line.purchaseOrderLineId);
        if (!poLine) continue;
        poLine.received_quantity =
          Number(poLine.received_quantity || 0) + line.quantity;
        await manager.save(poLine);
      }

      const receivedRow = await manager
        .createQueryBuilder(P2PReceiptEntity, "r")
        .select("COALESCE(SUM(r.amount), 0)", "total")
        .where("r.tenant_id = :tenantId", { tenantId })
        .andWhere("r.purchase_order_id = :purchaseOrderId", {
          purchaseOrderId: po.id,
        })
        .getRawOne();
      const receivedTotal = Number(receivedRow?.total) || 0;

      if (receivedTotal >= Number(po.committed_amount || 0)) {
        po.status = POStatus.FULFILLED;
      } else if (po.status === POStatus.ISSUED) {
        po.status = POStatus.PARTIALLY_FULFILLED;
      }
      po.updated_at = new Date();
      await manager.save(po);

      return saved;
    });
  }

  async getPurchaseOrderReceipts(purchaseOrderId: string, tenantId: string) {
    await this.poRepo.findOneOrFail({
      where: { id: purchaseOrderId, tenant_id: tenantId },
    });
    return this.receiptRepo.find({
      where: { tenant_id: tenantId, purchase_order_id: purchaseOrderId },
      relations: ["lines"],
      order: { received_date: "DESC" },
    });
  }

  /**
   * Phase 4 (4.8) — Three-way match: PO (order) vs Receipts (received) vs
   * Invoice (billed). Returns a MATCHED / PARTIAL_MATCH / MISMATCH verdict
   * plus the over-commitment context against the linked OPEX budget when the
   * PO was firmed under an active budget.
   */
  async getThreeWayMatch(purchaseOrderId: string, tenantId: string) {
    const po = await this.poRepo.findOne({
      where: { id: purchaseOrderId, tenant_id: tenantId },
      relations: [
        "requisition",
        "invoices",
        "receipts",
        "receipts.lines",
        "lines",
      ],
    });
    if (!po) {
      throw new NotFoundException(
        `Purchase order ${purchaseOrderId} not found.`,
      );
    }

    // Reconcile everything in base currency (USD) so mixed-currency POs,
    // receipts and invoices are compared on a like-for-like basis.
    const poBaseAmount =
      po.committed_base_amount != null && Number(po.committed_base_amount) !== 0
        ? Number(po.committed_base_amount)
        : Number(po.committed_amount) * (Number(po.exchange_rate) || 1);

    const receivedTotal = (po.receipts || []).reduce(
      (sum, r) =>
        sum +
        Number(
          r.base_amount != null && Number(r.base_amount) !== 0
            ? r.base_amount
            : Number(r.amount) * (Number(r.exchange_rate) || 1),
        ),
      0,
    );
    const invoicedTotal = (po.invoices || [])
      .filter((inv) => inv.status !== InvoiceStatus.REJECTED)
      .reduce(
        (sum, inv) =>
          sum +
          Number(
            inv.base_amount != null && Number(inv.base_amount) !== 0
              ? inv.base_amount
              : Number(inv.amount) * (Number(inv.exchange_rate) || 1),
          ),
        0,
      );

    const poAmount = poBaseAmount;
    const variance = invoicedTotal - poAmount;

    let status: "MATCHED" | "PARTIAL_MATCH" | "MISMATCH";
    if (invoicedTotal === 0) {
      status = "PARTIAL_MATCH"; // PO issued, nothing billed yet
    } else if (Math.abs(variance) <= poBaseAmount * 0.01) {
      status = "MATCHED";
    } else if (invoicedTotal < poAmount) {
      status = "PARTIAL_MATCH";
    } else {
      status = "MISMATCH";
    }

    let overCommitment: ThreeWayMatchResult["overCommitment"] = null;
    let budgetId: string | null = null;
    if (po.requisition?.cost_center_id) {
      budgetId = await this.resolveOperationalBudgetForCostCenter(
        tenantId,
        po.requisition.cost_center_id,
      );
    }
    if (budgetId) {
      const budget = await this.dataSource
        .getRepository(OperationalBudgetEntity)
        .findOne({
          where: { operational_budget_id: budgetId, tenant_id: tenantId },
        });
      if (budget) {
        const activeEncumbrances =
          await this.operationalBudgetsService.getActiveEncumbrancesForBudget(
            budgetId,
            tenantId,
          );
        const committed = activeEncumbrances.reduce(
          (sum, enc) => sum + Number(enc.amount || 0),
          0,
        );
        const actual = Number(budget.actual_spent || 0);
        const overrunAmount = Math.max(
          0,
          Number(budget.actual_spent || 0) +
            committed -
            Number(budget.budgeted_amount || 0),
        );
        overCommitment = {
          budgeted: Number(budget.budgeted_amount || 0),
          actual,
          committed,
          overrunAmount,
          variancePct:
            Number(budget.budgeted_amount || 0) > 0
              ? (overrunAmount / Number(budget.budgeted_amount)) * 100
              : 0,
        };
      }
    }

    const matchLines: ThreeWayMatchLine[] = (po.lines || [])
      .slice()
      .sort((a, b) => a.line_number - b.line_number)
      .map((line) => {
        const orderedQty = Number(line.quantity || 0);
        const unitAmount = Number(line.unit_amount || 0);
        const lineAmount = Number(line.line_amount || 0);

        let receivedQty = 0;
        for (const receipt of po.receipts || []) {
          for (const receiptLine of receipt.lines || []) {
            if (receiptLine.purchase_order_line_id === line.id) {
              receivedQty += Number(receiptLine.quantity || 0);
            }
          }
        }
        if (receivedQty === 0) {
          receivedQty = Number(line.received_quantity || 0);
        }

        let lineStatus: ThreeWayMatchLine["status"];
        if (receivedQty <= 0) {
          lineStatus = "NOT_RECEIVED";
        } else if (receivedQty > orderedQty + 1e-6) {
          lineStatus = "OVER_RECEIVED";
        } else if (receivedQty < orderedQty - 1e-6) {
          lineStatus = "PARTIAL";
        } else {
          lineStatus = "MATCHED";
        }

        return {
          lineId: line.id,
          lineNumber: line.line_number,
          description: line.description,
          orderedQty,
          receivedQty,
          unitAmount,
          lineAmount,
          receivedAmount: receivedQty * unitAmount,
          status: lineStatus,
        };
      });

    const result: ThreeWayMatchResult = {
      poId: po.id,
      poNumber: po.po_number,
      currency: po.currency || "USD",
      poAmount,
      receivedAmount: receivedTotal,
      invoicedAmount: invoicedTotal,
      variance,
      status,
      ...(matchLines.length > 0 ? { lines: matchLines } : {}),
      overCommitment: overCommitment ?? null,
    };
    return result;
  }

  /**
   * Phase 4 (4.10) — Procure-to-pay side of the merged "needs attention" queue:
   * pending requisitions, issued POs awaiting fulfilment, and overdue invoices.
   */
  async getProcurementNeedsAttention(tenantId: string) {
    const pendingRequisitions = await this.requisitionRepo.find({
      where: { tenant_id: tenantId, status: DocumentStatus.PENDING_APPROVAL },
      order: { created_at: "ASC" },
      take: 25,
    });
    const issuedPos = await this.poRepo.find({
      where: { tenant_id: tenantId, status: POStatus.PARTIALLY_FULFILLED },
      order: { created_at: "ASC" },
      take: 25,
    });
    const overdueInvoices = await this.invoiceRepo
      .createQueryBuilder("inv")
      .where("inv.tenant_id = :tenantId", { tenantId })
      .andWhere("inv.status IN (:...statuses)", {
        statuses: [InvoiceStatus.RECEIVED, InvoiceStatus.UNDER_REVIEW],
      })
      .andWhere(
        "(inv.due_date IS NOT NULL AND inv.due_date < CURRENT_DATE) OR inv.status = :received",
        { received: InvoiceStatus.RECEIVED },
      )
      .orderBy("inv.invoice_date", "ASC")
      .take(25)
      .getMany();

    return {
      pendingRequisitions,
      awaitingFulfilment: issuedPos,
      overdueInvoices,
    };
  }

  private _applyFinancialFilters(
    queryBuilder: SelectQueryBuilder<any>,
    dto: GetFinancialDocumentsDto,
    alias: string,
    amountField: string,
  ) {
    const {
      search,
      status,
      costCenterId,
      glAccountId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = dto;

    // Validate sortBy to prevent SQL injection and column-not-found errors
    const validSortColumns: Record<string, string[]> = {
      requisition: ['created_at', 'updated_at', 'estimated_amount', 'requisition_number', 'status'],
      po: ['created_at', 'updated_at', 'committed_amount', 'status'],
      invoice: ['created_at', 'updated_at', 'amount', 'invoice_number', 'status'],
    };
    const validColumns = validSortColumns[alias] || ['created_at'];
    const safeSortBy = validColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Apply sort at the end, after all filters
    // Store for later use
    (queryBuilder as any)._safeSortBy = safeSortBy;
    (queryBuilder as any)._safeSortOrder = safeSortOrder;

    if (search) {
      queryBuilder.andWhere(
        `(${alias}.description ILIKE :search OR ${alias}.vendor_name ILIKE :search OR ${alias}.requisition_number ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere(`${alias}.status = :status`, { status });
    }

    if (costCenterId) {
      queryBuilder.andWhere(`${alias}.cost_center_id = :costCenterId`, {
        costCenterId,
      });
    }

    if (glAccountId) {
      queryBuilder.andWhere(`${alias}.gl_account_id = :glAccountId`, {
        glAccountId,
      });
    }

    if (startDate) {
      const field = alias === "invoice" ? "invoice_date" : "created_at";
      queryBuilder.andWhere(`${alias}.${field} >= :startDate`, { startDate });
    }

    if (endDate) {
      const field = alias === "invoice" ? "invoice_date" : "created_at";
      queryBuilder.andWhere(`${alias}.${field} <= :endDate`, { endDate });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere(`${alias}.${amountField} >= :minAmount`, {
        minAmount,
      });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere(`${alias}.${amountField} <= :maxAmount`, {
        maxAmount,
      });
    }
  }

  async getBudgetConsumption(
    costCenterId: string,
    glAccountId: string,
    fiscalPeriodId: string,
  ) {
    const tenantId = this.getTenantId();

    // 1. Get Total Allocated Budget from Ledger
    const allocations = await this.budgetLedgerRepo.find({
      where: {
        tenant_id: tenantId,
        cost_center_id: costCenterId,
        gl_account_id: glAccountId,
        fiscal_period_id: fiscalPeriodId,
      },
    });
    const allocated = allocations.reduce((sum, a) => sum + Number(a.amount), 0);

    // 2. Get Committed Spend (POs that are not yet cancelled)
    const pos = await this.poRepo.find({
      where: {
        tenant_id: tenantId,
        status: POStatus.ISSUED,
        requisition: {
          cost_center_id: costCenterId,
          gl_account_id: glAccountId,
        },
      },
      relations: ["requisition"],
    });
    const committed = pos.reduce(
      (sum, p) => sum + Number(p.committed_base_amount || p.committed_amount),
      0,
    );

    // 3. Get Actual Spend (Approved/Paid Invoices)
    const invoices = await this.invoiceRepo.find({
      where: {
        tenant_id: tenantId,
        cost_center_id: costCenterId,
        gl_account_id: glAccountId,
        status: InvoiceStatus.PAID,
      },
    });
    const invoiceActual = invoices.reduce(
      (sum, i) => sum + Number(i.base_amount || i.amount),
      0,
    );

    // 4. Get Payroll Actual Spend (Posted Payroll Runs)
    const payrollItems = await this.payrollLineItemRepo.find({
      where: {
        tenant_id: tenantId,
        cost_center_id: costCenterId,
        gl_account_id: glAccountId,
        payrollRun: {
          status: PayrollRunStatus.POSTED,
          fiscal_period_id: fiscalPeriodId,
        },
      },
      relations: ["payrollRun"],
    });
    const payrollActual = payrollItems.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const totalActual = invoiceActual + payrollActual;

    return {
      allocated,
      committed,
      actual: totalActual,
      remaining: allocated - committed - totalActual,
    };
  }

  async getEmployees() {
    const tenantId = this.getTenantId();
    // We use a raw query or a dedicated repository if available,
    // but since UserEntity is in the 'public' schema and doesn't have a repo in FinanceCoreModule yet,
    // we'll use the dataSource to fetch users for this tenant.
    return this.dataSource.getRepository(UserEntity).find({
      where: { tenant_id: tenantId, is_active: true },
      select: ["id", "email", "first_name", "last_name"],
    });
  }

  async getOperationalAnalytics(fiscalYearId: string, costCenterId?: string) {
    const tenantId = this.getTenantId();

    // 1. Fetch all periods for this year
    const periods = await this.fiscalPeriodRepo.find({
      where: { tenant_id: tenantId, fiscal_year_id: fiscalYearId },
      order: { start_date: "ASC" },
    });

    const results = await Promise.all(
      periods.map(async (period) => {
        // Re-use consumption logic but at a broader scale if costCenterId is missing

        // Allocations
        const allocQuery = this.budgetLedgerRepo
          .createQueryBuilder("ledger")
          .where("ledger.tenant_id = :tenantId", { tenantId })
          .andWhere("ledger.fiscal_period_id = :periodId", {
            periodId: period.id,
          });
        if (costCenterId)
          allocQuery.andWhere("ledger.cost_center_id = :ccId", {
            ccId: costCenterId,
          });
        const { allocated } = await allocQuery
          .select("SUM(ledger.amount)", "allocated")
          .getRawOne();

        // Committed (POs)
        const poQuery = this.poRepo
          .createQueryBuilder("po")
          .leftJoin("po.requisition", "req")
          .where("po.tenant_id = :tenantId", { tenantId })
          .andWhere("po.status = :status", { status: POStatus.ISSUED });
        // Note: Requisitions don't have fiscal_period_id yet, so we'll approximate by PO date
        // In a real system, POs would be linked to a budget cycle.
        // For now, we'll filter by PO date inside the period.
        poQuery.andWhere("po.created_at BETWEEN :start AND :end", {
          start: period.start_date,
          end: period.end_date,
        });
        if (costCenterId)
          poQuery.andWhere("req.cost_center_id = :ccId", {
            ccId: costCenterId,
          });
        const { committed } = await poQuery
          .select(
            "SUM(COALESCE(po.committed_base_amount, po.committed_amount))",
            "committed",
          )
          .getRawOne();

        // Actual (Invoices)
        const invQuery = this.invoiceRepo
          .createQueryBuilder("inv")
          .where("inv.tenant_id = :tenantId", { tenantId })
          .andWhere("inv.status = :status", { status: InvoiceStatus.PAID })
          .andWhere("inv.invoice_date BETWEEN :start AND :end", {
            start: period.start_date,
            end: period.end_date,
          });
        if (costCenterId)
          invQuery.andWhere("inv.cost_center_id = :ccId", {
            ccId: costCenterId,
          });
        const { actualInvoices } = await invQuery
          .select(
            "SUM(COALESCE(inv.base_amount, inv.amount))",
            "actualInvoices",
          )
          .getRawOne();

        // Actual (Payroll)
        const payQuery = this.payrollLineItemRepo
          .createQueryBuilder("pli")
          .leftJoin("pli.payrollRun", "run")
          .where("pli.tenant_id = :tenantId", { tenantId })
          .andWhere("run.status = :status", { status: PayrollRunStatus.POSTED })
          .andWhere("run.fiscal_period_id = :periodId", {
            periodId: period.id,
          });
        if (costCenterId)
          payQuery.andWhere("pli.cost_center_id = :ccId", {
            ccId: costCenterId,
          });
        const { actualPayroll } = await payQuery
          .select("SUM(pli.amount)", "actualPayroll")
          .getRawOne();

        const totalActual =
          (Number(actualInvoices) || 0) + (Number(actualPayroll) || 0);

        return {
          periodId: period.id,
          periodName: period.period_name,
          allocated: Number(allocated) || 0,
          committed: Number(committed) || 0,
          actual: totalActual,
          variance:
            (Number(allocated) || 0) - (Number(committed) || 0) - totalActual,
        };
      }),
    );

    return {
      yearId: fiscalYearId,
      periods: results,
      totals: {
        allocated: results.reduce((sum, r) => sum + r.allocated, 0),
        committed: results.reduce((sum, r) => sum + r.committed, 0),
        actual: results.reduce((sum, r) => sum + r.actual, 0),
        variance: results.reduce((sum, r) => sum + r.variance, 0),
      },
    };
  }

  /**
   * OPEX Command Center Dashboard Aggregation.
   * Returns all data required for the OPEX Intelligence dashboard.
   */
  async getOpexIntelligence(fiscalYearId?: string): Promise<any> {
    const tenantId = this.getTenantId();
    this.logger.log(
      `Fetching OPEX Intelligence for tenant ${tenantId}, year ${fiscalYearId ?? "latest"}`,
    );

    // Resolve fiscal year
    let resolvedYearId = fiscalYearId;
    if (!resolvedYearId) {
      const latest = await this.fiscalYearRepo.findOne({
        where: { tenant_id: tenantId },
        order: { start_date: "DESC" },
      });
      resolvedYearId = latest?.id;
    }

    // Department expenditure matrix: budget vs actual per cost center
    const deptExpenditureRaw: any[] = await this.dataSource.query(
      `SELECT
        d.name as department,
        cc.name as cost_center,
        COALESCE(SUM(bl.amount) FILTER (WHERE bl.budget_type = 'PRIMARY_ALLOCATION'), 0) as allocated,
        COALESCE(SUM(inv.base_amount), SUM(inv.amount), 0) as actual_spent
      FROM department d
      JOIN cost_center cc ON cc.department_id = d.id
      LEFT JOIN budget_ledger bl ON bl.cost_center_id = cc.id
      LEFT JOIN p2p_invoice inv ON inv.cost_center_id = cc.id AND inv.status = 'PAID'
      WHERE d.tenant_id = $1
      GROUP BY d.name, cc.name
      ORDER BY d.name, actual_spent DESC`,
      [tenantId],
    );

    // Payroll cost decomposition by item type (last 12 months)
    const payrollDecomposition: any[] = await this.dataSource.query(
      `SELECT item_type, SUM(amount) as total
      FROM payroll_line_item
      WHERE tenant_id = $1
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY item_type`,
      [tenantId],
    );

    // Rolling 12-month burn rate: total OPEX actual per month
    const rollingBurnRate: any[] = await this.dataSource.query(
      `SELECT
        TO_CHAR(inv.created_at, 'YYYY-MM') as month,
        SUM(COALESCE(inv.base_amount, inv.amount)) as actual
      FROM p2p_invoice inv
      JOIN cost_center cc ON cc.id = inv.cost_center_id
      WHERE cc.tenant_id = $1
      AND inv.status IN ('PAID', 'APPROVED')
      AND inv.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC`,
      [tenantId],
    );

    // P2P procurement funnel: stage counts and volumes
    const [reqCount, poCount, invCount, paidCount] = await Promise.all([
      this.requisitionRepo.count({ where: { tenant_id: tenantId } }),
      this.poRepo.count({ where: { tenant_id: tenantId } }),
      this.invoiceRepo.count({ where: { tenant_id: tenantId } }),
      this.invoiceRepo.count({
        where: { tenant_id: tenantId, status: "PAID" as any },
      }),
    ]);

    // Budget runway: total allocated vs total spent YTD
    const budgetTotals: any[] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(bl.amount) FILTER (WHERE bl.budget_type = 'PRIMARY_ALLOCATION'), 0) as total_allocated,
        COALESCE(SUM(inv.base_amount), SUM(inv.amount), 0) as total_spent
      FROM budget_ledger bl
      JOIN fiscal_period fp ON fp.id = bl.fiscal_period_id
      LEFT JOIN p2p_invoice inv ON inv.cost_center_id = bl.cost_center_id AND inv.status = 'PAID'
      WHERE fp.tenant_id = $1
      AND ($2::uuid IS NULL OR fp.fiscal_year_id = $2::uuid)`,
      [tenantId, resolvedYearId ?? null],
    );

    const totalAllocated = Number(budgetTotals[0]?.total_allocated || 0);
    const totalSpent = Number(budgetTotals[0]?.total_spent || 0);
    const utilizationPct =
      totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

    // Payroll KPIs from payroll_line_item
    const payrollKpis: any[] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(amount) FILTER (WHERE item_type IN ('BASE_SALARY','BONUS','COMMISSION')), 0) as gross_pay,
        COALESCE(SUM(amount) FILTER (WHERE item_type = 'EMPLOYER_TAX'), 0) as employer_taxes,
        COALESCE(SUM(amount) FILTER (WHERE item_type = 'EMPLOYER_BENEFIT'), 0) as employer_benefits
      FROM payroll_line_item WHERE tenant_id = $1
      AND created_at >= date_trunc('year', NOW())`,
      [tenantId],
    );

    return {
      kpis: {
        totalAllocated,
        totalSpent,
        variance: totalAllocated - totalSpent,
        utilizationPct,
        p2pCycleCount: reqCount,
        payrollGross: Number(payrollKpis[0]?.gross_pay || 0),
      },
      departmentExpenditure: deptExpenditureRaw,
      payrollDecomposition,
      rollingBurnRate,
      procurementFunnel: {
        requisitions: reqCount,
        purchaseOrders: poCount,
        invoices: invCount,
        paid: paidCount,
      },
      budgetRunway: {
        totalAllocated,
        totalSpent,
        utilizationPct,
        remainingBudget: totalAllocated - totalSpent,
      },
    };
  }

  // --- PDF GENERATION ENGINE ---

  private formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  async generatePurchaseOrderPdf(
    poId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const po = await this.poRepo.findOne({
      where: { id: poId, tenant_id: tenantId },
      relations: [
        "requisition",
        "requisition.requester",
        "requisition.costCenter",
      ],
    });

    if (!po) throw new NotFoundException(`Purchase Order ${poId} not found.`);

    const tenant = await this.tenantService.findOneTenant(tenantId);

    // Compile HBS
    const templatePath = path.join(
      __dirname,
      "..",
      "common",
      "templates",
      "purchase-order.hbs",
    );
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found at ${templatePath}`);
      throw new InternalServerErrorException("PDF Template not found.");
    }
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);

    const data = {
      poNumber: po.po_number,
      brandPrimaryColorHex: tenant.brandPrimaryColorHex || "#0f172a",
      brandLogoBase64: tenant.brandLogoBase64,
      tenantName: tenant.name,
      companyAddress: tenant.companyAddress || "SentinelFi Platform",
      poDate: format(po.created_at, "MMM dd, yyyy"),
      paymentTerms: "Net 30", // Default
      projectName: "Main Operations",
      vendorName: po.vendor_name,
      vendorAddress: "Registered Vendor Address", // Placeholder
      vendorContact: "Vendor Representative",
      vendorEmail: "vendor@example.com",
      deliveryAddress: tenant.companyAddress || "Main Office",
      requesterName: `${po.requisition.requester.first_name} ${po.requisition.requester.last_name}`,
      lineItems: [
        {
          description: po.requisition.description,
          wbsCode: po.requisition.costCenter?.code || "N/A",
          quantity: 1,
          formattedUnitPrice: this.formatCurrency(
            po.committed_amount,
            po.currency,
          ),
          formattedTotal: this.formatCurrency(po.committed_amount, po.currency),
        },
      ],
      formattedSubtotal: this.formatCurrency(po.committed_amount, po.currency),
      formattedTax: this.formatCurrency(0, po.currency),
      formattedGrandTotal: this.formatCurrency(
        po.committed_amount,
        po.currency,
      ),
      currencyCode: po.currency,
      termsAndConditions: "Standard SentinelFi P2P Terms Apply.",
      isApproved: po.status === POStatus.ISSUED,
      approvalSignature: "DIGITALLY SIGNED",
      approvalDate: format(po.updated_at, "MMM dd, yyyy"),
      generationDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      poStatus: po.status,
      statusColor: po.status === POStatus.ISSUED ? "#10b981" : "#64748b",
    };

    const html = template(data);
    return this.pdfService.generatePdfFromHtml(html);
  }

  async generateInvoicePdf(
    invoiceId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
      relations: ["costCenter", "purchaseOrder"],
    });

    if (!invoice)
      throw new NotFoundException(`Invoice ${invoiceId} not found.`);

    const tenant = await this.tenantService.findOneTenant(tenantId);

    const templatePath = path.join(
      __dirname,
      "..",
      "common",
      "templates",
      "invoice.hbs",
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = hbs.compile(templateSource);

    const data = {
      invoiceNumber: invoice.invoice_number,
      brandPrimaryColorHex: tenant.brandPrimaryColorHex || "#0f172a",
      brandLogoBase64: tenant.brandLogoBase64,
      tenantName: tenant.name,
      companyAddress: tenant.companyAddress || "SentinelFi Platform",
      issueDate: format(invoice.invoice_date, "MMM dd, yyyy"),
      dueDate: invoice.due_date
        ? format(invoice.due_date, "MMM dd, yyyy")
        : "Upon Receipt",
      poNumber: invoice.purchaseOrder?.po_number || "N/A",
      clientName: tenant.name,
      clientAddress: tenant.companyAddress,
      clientContact: "Finance Department",
      clientEmail: "finance@sentinelfi.com",
      lineItems: [
        {
          description: `Services rendered for cost center ${invoice.costCenter.name}`,
          quantity: 1,
          formattedRate: this.formatCurrency(invoice.amount, invoice.currency),
          formattedAmount: this.formatCurrency(
            invoice.amount,
            invoice.currency,
          ),
        },
      ],
      formattedSubtotal: this.formatCurrency(invoice.amount, invoice.currency),
      formattedTax: this.formatCurrency(0, invoice.currency),
      formattedDiscount: this.formatCurrency(0, invoice.currency),
      formattedGrandTotal: this.formatCurrency(
        invoice.amount,
        invoice.currency,
      ),
      formattedAmountPaid:
        invoice.status === InvoiceStatus.PAID
          ? this.formatCurrency(invoice.amount, invoice.currency)
          : this.formatCurrency(0, invoice.currency),
      formattedAmountDue:
        invoice.status === InvoiceStatus.PAID
          ? this.formatCurrency(0, invoice.currency)
          : this.formatCurrency(invoice.amount, invoice.currency),
      currencyCode: invoice.currency,
      paymentInstructions:
        "Please wire to the account specified in your contract.",
      generationDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      invoiceStatus: invoice.status,
      statusColor:
        invoice.status === InvoiceStatus.PAID ? "#10b981" : "#f59e0b",
    };

    const html = template(data);
    return this.pdfService.generatePdfFromHtml(html);
  }
}
