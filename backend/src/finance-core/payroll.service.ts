import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PayrollRunEntity, PayrollRunStatus } from './entities/payroll-run.entity';
import { PayrollLineItemEntity, PayrollLineItemType } from './entities/payroll-line-item.entity';
import { ClsService } from 'nestjs-cls';

import { TENANT_DATA_SOURCE } from '../database/constants';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(PayrollRunEntity, TENANT_DATA_SOURCE) private payrollRunRepo: Repository<PayrollRunEntity>,
    @InjectRepository(PayrollLineItemEntity, TENANT_DATA_SOURCE) private payrollLineItemRepo: Repository<PayrollLineItemEntity>,
  ) {}

  private getTenantId(): string {
    return this.cls.get('tenantId');
  }

  async createRun(data: { runIdentifier: string; fiscalPeriodId: string; runDate: string }) {
    const tenantId = this.getTenantId();
    const run = this.payrollRunRepo.create({
      tenant_id: tenantId,
      run_identifier: data.runIdentifier,
      fiscal_period_id: data.fiscalPeriodId,
      run_date: new Date(data.runDate),
      status: PayrollRunStatus.DRAFT,
      total_gross_pay: 0,
      total_taxes_employer: 0,
      total_benefits_employer: 0,
    });
    return this.payrollRunRepo.save(run);
  }

  async getRuns() {
    return this.payrollRunRepo.find({
      where: { tenant_id: this.getTenantId() },
      order: { run_date: 'DESC' },
      relations: ['fiscalPeriod'],
    });
  }

  async getKPIs() {
    const tenantId = this.getTenantId();
    
    // Aggregate data from all runs for this tenant
    const runs = await this.payrollRunRepo.find({
      where: { tenant_id: tenantId }
    });

    const totalGross = runs.reduce((sum, r) => sum + Number(r.total_gross_pay || 0), 0);
    const employerTaxes = runs.reduce((sum, r) => sum + Number(r.total_taxes_employer || 0), 0);
    const employerBenefits = runs.reduce((sum, r) => sum + Number(r.total_benefits_employer || 0), 0);
    
    // Pending posted: APPROVED but not yet POSTED
    const pendingPosted = runs
      .filter(r => r.status === PayrollRunStatus.APPROVED)
      .reduce((sum, r) => sum + Number(r.total_gross_pay || 0), 0);

    return {
      totalGross,
      pendingPosted,
      employerTaxes,
      employerBenefits,
      currency: 'NGN' // Should ideally come from tenant settings
    };
  }

  async getRunDetails(id: string) {
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: this.getTenantId() },
      relations: ['lineItems', 'lineItems.employee', 'lineItems.costCenter', 'lineItems.glAccount', 'fiscalPeriod'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async addLineItem(runId: string, data: {
    employeeId: string;
    costCenterId: string;
    glAccountId: string;
    itemType: PayrollLineItemType;
    amount: number;
  }) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRunEntity, { where: { id: runId, tenant_id: tenantId } });
      if (!run) throw new NotFoundException('Payroll run not found');
      if (run.status !== PayrollRunStatus.DRAFT) {
        throw new ConflictException('Can only add items to a DRAFT payroll run');
      }

      const item = manager.create(PayrollLineItemEntity, {
        tenant_id: tenantId,
        payroll_run_id: runId,
        employee_id: data.employeeId,
        cost_center_id: data.costCenterId,
        gl_account_id: data.glAccountId,
        item_type: data.itemType,
        amount: data.amount,
      });

      const savedItem = await manager.save(item);

      // Update run totals
      if (data.itemType === PayrollLineItemType.BASE_SALARY || data.itemType === PayrollLineItemType.BONUS || data.itemType === PayrollLineItemType.COMMISSION) {
        run.total_gross_pay = Number(run.total_gross_pay) + Number(data.amount);
      } else if (data.itemType === PayrollLineItemType.EMPLOYER_TAX) {
        run.total_taxes_employer = Number(run.total_taxes_employer) + Number(data.amount);
      } else if (data.itemType === PayrollLineItemType.EMPLOYER_BENEFIT) {
        run.total_benefits_employer = Number(run.total_benefits_employer) + Number(data.amount);
      }

      await manager.save(run);
      return savedItem;
    });
  }

  async approveRun(id: string) {
    const run = await this.payrollRunRepo.findOne({ where: { id, tenant_id: this.getTenantId() } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) throw new ConflictException('Only DRAFT runs can be approved');
    
    run.status = PayrollRunStatus.APPROVED;
    return this.payrollRunRepo.save(run);
  }

  async postRun(id: string) {
    const tenantId = this.getTenantId();
    return await this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRunEntity, { where: { id, tenant_id: tenantId } });
      if (!run) throw new NotFoundException('Payroll run not found');
      if (run.status !== PayrollRunStatus.APPROVED) throw new ConflictException('Only APPROVED runs can be posted');

      run.status = PayrollRunStatus.POSTED;
      
      // In a real ERP, this would also create General Ledger entries.
      // For now, we update the status, and the getBudgetConsumption will aggregate POSTED runs.
      
      return await manager.save(run);
    });
  }

  async deleteRun(id: string) {
    const run = await this.payrollRunRepo.findOne({ where: { id, tenant_id: this.getTenantId() } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === PayrollRunStatus.POSTED) throw new ConflictException('Cannot delete a POSTED payroll run');
    
    return await this.payrollRunRepo.remove(run);
  }
}
