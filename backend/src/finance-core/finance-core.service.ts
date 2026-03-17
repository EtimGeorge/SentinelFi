import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { FiscalPeriodEntity, FiscalPeriodType } from './entities/fiscal-period.entity';
import { DepartmentEntity } from './entities/department.entity';
import { CostCenterEntity } from './entities/cost-center.entity';
import { AccountClassEntity } from './entities/account-class.entity';
import { AccountGroupEntity } from './entities/account-group.entity';
import { GLAccountEntity } from './entities/gl-account.entity';
import { P2PRequisitionEntity, DocumentStatus } from './entities/p2p-requisition.entity';
import { P2PPurchaseOrderEntity, POStatus } from './entities/p2p-purchase-order.entity';
import { P2PInvoiceEntity, InvoiceStatus } from './entities/p2p-invoice.entity';
import { BudgetLedgerEntity } from './entities/budget-ledger.entity';
import { PayrollLineItemEntity } from './entities/payroll-line-item.entity';
import { PayrollRunStatus } from './entities/payroll-run.entity';
import { ClsService } from 'nestjs-cls';
import { DOAService } from '../common/doa.service';
import { ApprovalLogEntity, ApprovalDocumentType, ApprovalStatus } from '../common/entities/approval-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UserEntity } from '../auth/user.entity';
import { UserPayload } from '@shared/types/user';
import { TENANT_DATA_SOURCE } from '../database/constants';
import { GetFinancialDocumentsDto } from './dto/get-financial-documents.dto';
import { SelectQueryBuilder } from 'typeorm';

@Injectable()
export class FinanceCoreService {
  private readonly logger = new Logger(FinanceCoreService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(FiscalYearEntity, TENANT_DATA_SOURCE) private fiscalYearRepo: Repository<FiscalYearEntity>,
    @InjectRepository(FiscalPeriodEntity, TENANT_DATA_SOURCE) private fiscalPeriodRepo: Repository<FiscalPeriodEntity>,
    @InjectRepository(DepartmentEntity, TENANT_DATA_SOURCE) private departmentRepo: Repository<DepartmentEntity>,
    @InjectRepository(CostCenterEntity, TENANT_DATA_SOURCE) private costCenterRepo: Repository<CostCenterEntity>,
    @InjectRepository(AccountClassEntity, TENANT_DATA_SOURCE) private accountClassRepo: Repository<AccountClassEntity>,
    @InjectRepository(AccountGroupEntity, TENANT_DATA_SOURCE) private accountGroupRepo: Repository<AccountGroupEntity>,
    @InjectRepository(GLAccountEntity, TENANT_DATA_SOURCE) private glAccountRepo: Repository<GLAccountEntity>,
    @InjectRepository(P2PRequisitionEntity, TENANT_DATA_SOURCE) private requisitionRepo: Repository<P2PRequisitionEntity>,
    @InjectRepository(P2PPurchaseOrderEntity, TENANT_DATA_SOURCE) private poRepo: Repository<P2PPurchaseOrderEntity>,
    @InjectRepository(P2PInvoiceEntity, TENANT_DATA_SOURCE) private invoiceRepo: Repository<P2PInvoiceEntity>,
    @InjectRepository(BudgetLedgerEntity, TENANT_DATA_SOURCE) private budgetLedgerRepo: Repository<BudgetLedgerEntity>,
    @InjectRepository(PayrollLineItemEntity, TENANT_DATA_SOURCE) private payrollLineItemRepo: Repository<PayrollLineItemEntity>,
    @InjectRepository(ApprovalLogEntity, TENANT_DATA_SOURCE) private approvalLogRepo: Repository<ApprovalLogEntity>,
    private readonly doaService: DOAService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getTenantId(): string {
    return this.cls.get('tenantId');
  }

  // --- Fiscal Calendar Management ---

  async createFiscalYear(data: { label: string; startDate: Date; endDate: Date }) {
    const tenantId = this.getTenantId();
    
    // 1. Basic validation
    if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new ConflictException("Start date must be before end date.");
    }

    // 2. Check for duplicate labels
    const existingLabel = await this.fiscalYearRepo.findOne({ where: { tenant_id: tenantId, year_label: data.label } });
    if (existingLabel) throw new ConflictException(`Fiscal Year label '${data.label}' is already in use.`);

    // 3. Check for overlapping date ranges
    const overlapping = await this.fiscalYearRepo.createQueryBuilder('fy')
        .where('fy.tenant_id = :tenantId', { tenantId })
        .andWhere(
            '(fy.start_date <= :endDate AND fy.end_date >= :startDate)',
            { startDate: data.startDate, endDate: data.endDate }
        )
        .getOne();
    
    if (overlapping) {
        throw new ConflictException(`This fiscal cycle overlaps with an existing cycle (FY ${overlapping.year_label}).`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const fy = manager.create(FiscalYearEntity, {
        tenant_id: tenantId,
        year_label: data.label,
        start_date: data.startDate,
        end_date: data.endDate
      });
      const savedFy = await manager.save(fy);

      // Automatically generate 12 monthly periods starting from the fiscal year start
      const start = new Date(data.startDate);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
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
          end_date: pEnd
        });
        await manager.save(period);
      }

      return savedFy;
    });
  }

  async getFiscalYears() {
    return this.fiscalYearRepo.find({
      where: { tenant_id: this.getTenantId() },
      order: { start_date: 'DESC' },
      relations: ['periods']
    });
  }

  // --- Organizational Structure ---

  async createDepartment(data: { name: string; code: string; parentId?: string }) {
    const dept = this.departmentRepo.create({
      tenant_id: this.getTenantId(),
      name: data.name,
      code: data.code,
      parent_department_id: data.parentId
    });
    return this.departmentRepo.save(dept);
  }

  async getDepartments() {
    return this.departmentRepo.find({
      where: { tenant_id: this.getTenantId() },
      relations: ['costCenters', 'parentDepartment']
    });
  }

  async createCostCenter(data: { name: string; code: string; departmentId: string }) {
    const cc = this.costCenterRepo.create({
      tenant_id: this.getTenantId(),
      name: data.name,
      code: data.code,
      department_id: data.departmentId
    });
    return this.costCenterRepo.save(cc);
  }

  // --- Chart of Accounts ---
  async getChartOfAccounts() {
    return this.accountClassRepo.find({
      where: { tenant_id: this.getTenantId() },
      relations: ['accountGroups', 'accountGroups.glAccounts'],
      order: { code: 'ASC' }
    });
  }

  // --- Procure-to-Pay (P2P) Spending Pipeline ---

  async createRequisition(data: { 
    description: string; 
    estimatedAmount: number; 
    costCenterId: string; 
    glAccountId: string;
    vendorName?: string;
    requiredByDate?: string;
    currency?: string;
    exchangeRate?: number;
  }) {
    const tenantId = this.getTenantId();
    const userId = this.cls.get('userId');

    // Generate a unique requisition number (e.g., REQ-2026-XXXX)
    const count = await this.requisitionRepo.count({ where: { tenant_id: tenantId } });
    const reqNumber = `REQ-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const currency = data.currency || 'USD';
    const exchangeRate = data.exchangeRate || 1.0;
    const baseAmount = data.estimatedAmount * exchangeRate;

    const req = this.requisitionRepo.create({
      tenant_id: tenantId,
      requisition_number: reqNumber,
      requester_id: userId,
      description: data.description,
      estimated_amount: data.estimatedAmount,
      cost_center_id: data.costCenterId,
      gl_account_id: data.glAccountId,
      vendor_name: data.vendorName,
      required_by_date: data.requiredByDate ? new Date(data.requiredByDate) : null,
      status: DocumentStatus.PENDING_APPROVAL,
      currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount
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

    return requisition;
  }

  async getRequisitions(dto: GetFinancialDocumentsDto) {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = dto;
    const queryBuilder = this.requisitionRepo.createQueryBuilder('requisition')
      .leftJoinAndSelect('requisition.costCenter', 'costCenter')
      .leftJoinAndSelect('requisition.glAccount', 'glAccount')
      .leftJoinAndSelect('requisition.requester', 'requester')
      .where('requisition.tenant_id = :tenantId', { tenantId: this.getTenantId() });

    this._applyFinancialFilters(queryBuilder, dto, 'requisition', 'estimated_amount');

    queryBuilder.orderBy(`requisition.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async createPurchaseOrder(requisitionId: string, actor: UserPayload | UserEntity) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async manager => {
      const requisition = await manager.findOne(P2PRequisitionEntity, {
        where: { id: requisitionId, tenant_id: tenantId }
      });

      if (!requisition) {
        throw new NotFoundException(`Requisition ${requisitionId} not found.`);
      }

      if (requisition.status !== DocumentStatus.PENDING_APPROVAL) {
        throw new ConflictException(`Requisition ${requisitionId} is not in PENDING_APPROVAL status.`);
      }

      // 1. Validate DOA Authority based on base_amount (normalized to USD)
      await this.doaService.validateAuthority(actor, requisition.estimated_amount, requisition.currency);

      // 2. Update requisition status
      requisition.status = DocumentStatus.APPROVED;
      await manager.save(requisition);

      // 2. Create Purchase Order
      const poCount = await manager.count(P2PPurchaseOrderEntity, { where: { tenant_id: tenantId } });
      const poNumber = `PO-${new Date().getFullYear()}-${(poCount + 1).toString().padStart(4, '0')}`;

      const po = manager.create(P2PPurchaseOrderEntity, {
        tenant_id: tenantId,
        po_number: poNumber,
        requisition_id: requisitionId,
        vendor_name: requisition.vendor_name || 'Generic Vendor',
        committed_amount: requisition.estimated_amount,
        currency: requisition.currency,
        exchange_rate: requisition.exchange_rate,
        committed_base_amount: requisition.base_amount,
        status: POStatus.ISSUED
      });

      return await manager.save(po);
    });
  }

  async rejectRequisition(requisitionId: string, actor: UserPayload | UserEntity) {
    const tenantId = this.getTenantId();
    const userId = (actor as any).id || (actor as any).sub;

    return await this.dataSource.transaction(async manager => {
      const requisition = await manager.findOne(P2PRequisitionEntity, {
        where: { id: requisitionId, tenant_id: tenantId }
      });

      if (!requisition) {
        throw new NotFoundException(`Requisition ${requisitionId} not found.`);
      }

      if (requisition.status !== DocumentStatus.PENDING_APPROVAL) {
        throw new ConflictException(`Requisition ${requisitionId} is not in PENDING_APPROVAL status.`);
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

      return requisition;
    });
  }

  async getPurchaseOrders(dto: GetFinancialDocumentsDto) {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = dto;
    const queryBuilder = this.poRepo.createQueryBuilder('po')
      .leftJoinAndSelect('po.requisition', 'requisition')
      .leftJoinAndSelect('requisition.costCenter', 'costCenter')
      .leftJoinAndSelect('requisition.glAccount', 'glAccount')
      .where('po.tenant_id = :tenantId', { tenantId: this.getTenantId() });

    this._applyFinancialFilters(queryBuilder, dto, 'po', 'committed_amount');

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
  }) {
    const tenantId = this.getTenantId();

    const currency = data.currency || 'USD';
    const exchangeRate = data.exchangeRate || 1.0;
    const baseAmount = data.amount * exchangeRate;

    const invoice = this.invoiceRepo.create({
      tenant_id: tenantId,
      invoice_number: data.invoiceNumber,
      amount: data.amount,
      vendor_name: data.vendorName,
      invoice_date: new Date(data.invoiceDate),
      purchase_order_id: data.poId,
      cost_center_id: data.costCenterId,
      gl_account_id: data.glAccountId,
      status: InvoiceStatus.RECEIVED,
      currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount
    });

    return this.invoiceRepo.save(invoice);
  }

  async getInvoices(dto: GetFinancialDocumentsDto) {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = dto;
    const queryBuilder = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.costCenter', 'costCenter')
      .leftJoinAndSelect('invoice.glAccount', 'glAccount')
      .leftJoinAndSelect('invoice.purchaseOrder', 'purchaseOrder')
      .where('invoice.tenant_id = :tenantId', { tenantId: this.getTenantId() });

    this._applyFinancialFilters(queryBuilder, dto, 'invoice', 'amount');

    queryBuilder.orderBy(`invoice.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  private _applyFinancialFilters(
    queryBuilder: SelectQueryBuilder<any>,
    dto: GetFinancialDocumentsDto,
    alias: string,
    amountField: string
  ) {
    const { search, status, costCenterId, glAccountId, startDate, endDate, minAmount, maxAmount } = dto;

    if (search) {
      queryBuilder.andWhere(
        `(${alias}.description ILIKE :search OR ${alias}.vendor_name ILIKE :search OR ${alias}.${alias}_number ILIKE :search)`,
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere(`${alias}.status = :status`, { status });
    }

    if (costCenterId) {
      queryBuilder.andWhere(`${alias}.cost_center_id = :costCenterId`, { costCenterId });
    }

    if (glAccountId) {
      queryBuilder.andWhere(`${alias}.gl_account_id = :glAccountId`, { glAccountId });
    }

    if (startDate) {
      const field = alias === 'invoice' ? 'invoice_date' : 'created_at';
      queryBuilder.andWhere(`${alias}.${field} >= :startDate`, { startDate });
    }

    if (endDate) {
      const field = alias === 'invoice' ? 'invoice_date' : 'created_at';
      queryBuilder.andWhere(`${alias}.${field} <= :endDate`, { endDate });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere(`${alias}.${amountField} >= :minAmount`, { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere(`${alias}.${amountField} <= :maxAmount`, { maxAmount });
    }
  }

  async getBudgetConsumption(costCenterId: string, glAccountId: string, fiscalPeriodId: string) {
    const tenantId = this.getTenantId();

    // 1. Get Total Allocated Budget from Ledger
    const allocations = await this.budgetLedgerRepo.find({
      where: { tenant_id: tenantId, cost_center_id: costCenterId, gl_account_id: glAccountId, fiscal_period_id: fiscalPeriodId }
    });
    const allocated = allocations.reduce((sum, a) => sum + Number(a.amount), 0);

    // 2. Get Committed Spend (POs that are not yet cancelled)
    const pos = await this.poRepo.find({
      where: { tenant_id: tenantId, status: POStatus.ISSUED, requisition: { cost_center_id: costCenterId, gl_account_id: glAccountId } },
      relations: ['requisition']
    });
    const committed = pos.reduce((sum, p) => sum + Number(p.committed_base_amount || p.committed_amount), 0);

    // 3. Get Actual Spend (Approved/Paid Invoices)
    const invoices = await this.invoiceRepo.find({
      where: { tenant_id: tenantId, cost_center_id: costCenterId, gl_account_id: glAccountId, status: InvoiceStatus.PAID }
    });
    const invoiceActual = invoices.reduce((sum, i) => sum + Number(i.base_amount || i.amount), 0);

    // 4. Get Payroll Actual Spend (Posted Payroll Runs)
    const payrollItems = await this.payrollLineItemRepo.find({
      where: { 
        tenant_id: tenantId, 
        cost_center_id: costCenterId, 
        gl_account_id: glAccountId,
        payrollRun: { 
          status: PayrollRunStatus.POSTED,
          fiscal_period_id: fiscalPeriodId
        }
      },
      relations: ['payrollRun']
    });
    const payrollActual = payrollItems.reduce((sum, p) => sum + Number(p.amount), 0);

    const totalActual = invoiceActual + payrollActual;

    return {
      allocated,
      committed,
      actual: totalActual,
      remaining: allocated - committed - totalActual
    };
  }

  async getEmployees() {
    const tenantId = this.getTenantId();
    // We use a raw query or a dedicated repository if available, 
    // but since UserEntity is in the 'public' schema and doesn't have a repo in FinanceCoreModule yet,
    // we'll use the dataSource to fetch users for this tenant.
    return this.dataSource.getRepository(UserEntity).find({
        where: { tenant_id: tenantId, is_active: true },
        select: ['id', 'email', 'first_name', 'last_name']
    });
  }

  async getOperationalAnalytics(fiscalYearId: string, costCenterId?: string) {
    const tenantId = this.getTenantId();
    
    // 1. Fetch all periods for this year
    const periods = await this.fiscalPeriodRepo.find({
      where: { tenant_id: tenantId, fiscal_year_id: fiscalYearId },
      order: { start_date: 'ASC' }
    });

    const results = await Promise.all(periods.map(async (period) => {
      // Re-use consumption logic but at a broader scale if costCenterId is missing
      
      // Allocations
      const allocQuery = this.budgetLedgerRepo.createQueryBuilder('ledger')
        .where('ledger.tenant_id = :tenantId', { tenantId })
        .andWhere('ledger.fiscal_period_id = :periodId', { periodId: period.id });
      if (costCenterId) allocQuery.andWhere('ledger.cost_center_id = :ccId', { ccId: costCenterId });
      const { allocated } = await allocQuery.select('SUM(ledger.amount)', 'allocated').getRawOne();

      // Committed (POs)
      const poQuery = this.poRepo.createQueryBuilder('po')
        .leftJoin('po.requisition', 'req')
        .where('po.tenant_id = :tenantId', { tenantId })
        .andWhere('po.status = :status', { status: POStatus.ISSUED });
        // Note: Requisitions don't have fiscal_period_id yet, so we'll approximate by PO date 
        // In a real system, POs would be linked to a budget cycle. 
        // For now, we'll filter by PO date inside the period.
        poQuery.andWhere('po.created_at BETWEEN :start AND :end', { start: period.start_date, end: period.end_date });
      if (costCenterId) poQuery.andWhere('req.cost_center_id = :ccId', { ccId: costCenterId });
      const { committed } = await poQuery.select('SUM(COALESCE(po.committed_base_amount, po.committed_amount))', 'committed').getRawOne();

      // Actual (Invoices)
      const invQuery = this.invoiceRepo.createQueryBuilder('inv')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.status = :status', { status: InvoiceStatus.PAID })
        .andWhere('inv.invoice_date BETWEEN :start AND :end', { start: period.start_date, end: period.end_date });
      if (costCenterId) invQuery.andWhere('inv.cost_center_id = :ccId', { ccId: costCenterId });
      const { actualInvoices } = await invQuery.select('SUM(COALESCE(inv.base_amount, inv.amount))', 'actualInvoices').getRawOne();

      // Actual (Payroll)
      const payQuery = this.payrollLineItemRepo.createQueryBuilder('pli')
        .leftJoin('pli.payrollRun', 'run')
        .where('pli.tenant_id = :tenantId', { tenantId })
        .andWhere('run.status = :status', { status: PayrollRunStatus.POSTED })
        .andWhere('run.fiscal_period_id = :periodId', { periodId: period.id });
      if (costCenterId) payQuery.andWhere('pli.cost_center_id = :ccId', { ccId: costCenterId });
      const { actualPayroll } = await payQuery.select('SUM(pli.amount)', 'actualPayroll').getRawOne();

      const totalActual = (Number(actualInvoices) || 0) + (Number(actualPayroll) || 0);

      return {
        periodId: period.id,
        periodName: period.period_name,
        allocated: Number(allocated) || 0,
        committed: Number(committed) || 0,
        actual: totalActual,
        variance: (Number(allocated) || 0) - (Number(committed) || 0) - totalActual
      };
    }));

    return {
      yearId: fiscalYearId,
      periods: results,
      totals: {
        allocated: results.reduce((sum, r) => sum + r.allocated, 0),
        committed: results.reduce((sum, r) => sum + r.committed, 0),
        actual: results.reduce((sum, r) => sum + r.actual, 0),
        variance: results.reduce((sum, r) => sum + r.variance, 0),
      }
    };
  }

  /**
   * OPEX Command Center Dashboard Aggregation.
   * Returns all data required for the OPEX Intelligence dashboard.
   */
  async getOpexIntelligence(fiscalYearId?: string): Promise<any> {
    const tenantId = this.getTenantId();
    this.logger.log(`Fetching OPEX Intelligence for tenant ${tenantId}, year ${fiscalYearId ?? 'latest'}`);

    // Resolve fiscal year
    let resolvedYearId = fiscalYearId;
    if (!resolvedYearId) {
      const latest = await this.fiscalYearRepo.findOne({
        where: { tenant_id: tenantId },
        order: { start_date: 'DESC' },
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
      this.invoiceRepo.count({ where: { tenant_id: tenantId, status: 'PAID' as any } }),
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
    const utilizationPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

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
      procurementFunnel: { requisitions: reqCount, purchaseOrders: poCount, invoices: invCount, paid: paidCount },
      budgetRunway: { totalAllocated, totalSpent, utilizationPct, remainingBudget: totalAllocated - totalSpent },
    };
  }
}

