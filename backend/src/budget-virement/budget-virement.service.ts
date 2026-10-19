import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Repository, DataSource, DeepPartial } from "typeorm";
import { ClsService } from "nestjs-cls";

import { TENANT_DATA_SOURCE } from "../database/constants";
import {
  BudgetVirementEntity,
  VirementStatus,
} from "./entities/budget-virement.entity";
import {
  CreateBudgetVirementDto,
  SubmitVirementDto,
  ApproveVirementDto,
} from "./dto/index";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import {
  ApprovalLogEntity,
  ApprovalDocumentType,
  ApprovalStatus,
} from "../common/entities/approval-log.entity";
import { DOAService } from "../common/doa.service";
import { NotificationsService } from "../notifications/notifications.service";
import { UserPayload } from "@shared/types/user";

const round4 = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
};

@Injectable()
export class BudgetVirementService {
  private readonly logger = new Logger(BudgetVirementService.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @Inject("BUDGET_VIREMENT_REPOSITORY")
    private readonly virementRepo: Repository<BudgetVirementEntity>,
    @Inject("OPERATIONALBUDGETCATEGORY_REPOSITORY")
    private readonly categoryRepo: Repository<OperationalBudgetCategoryEntity>,
    @Inject("OPERATIONALBUDGET_REPOSITORY")
    private readonly budgetRepo: Repository<OperationalBudgetEntity>,
    @Inject("APPROVAL_LOG_REPOSITORY")
    private readonly approvalLogRepo: Repository<ApprovalLogEntity>,
    private readonly doaService: DOAService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getTenantId(): string {
    const tenantId = this.cls.get("tenant_id");
    if (!tenantId) {
      throw new InternalServerErrorException(
        "Tenant context missing. Request must include a valid tenant.",
      );
    }
    return tenantId;
  }

  async createVirement(
    dto: CreateBudgetVirementDto,
    createdByUserId: string,
    tenantId: string,
  ) {
    // Validate source and destination categories exist and belong to same budget
    const source = await this.categoryRepo.findOne({
      where: {
        operational_budget_category_id: dto.source_category_id,
        tenant_id: tenantId,
        operational_budget_id: dto.operational_budget_id,
      },
    });
    if (!source) {
      throw new NotFoundException("Source budget category not found.");
    }

    const destination = await this.categoryRepo.findOne({
      where: {
        operational_budget_category_id: dto.destination_category_id,
        tenant_id: tenantId,
        operational_budget_id: dto.operational_budget_id,
      },
    });
    if (!destination) {
      throw new NotFoundException("Destination budget category not found.");
    }

    if (
      source.operational_budget_category_id ===
      destination.operational_budget_category_id
    ) {
      throw new BadRequestException(
        "Source and destination categories must differ.",
      );
    }

    // Source must have sufficient budgeted amount
    if (Number(source.budgeted_amount) < Number(dto.amount)) {
      throw new ConflictException(
        "Insufficient budgeted amount in source category for this virement.",
      );
    }

    const virementData: DeepPartial<BudgetVirementEntity> = {
      tenant_id: tenantId,
      operational_budget_id: dto.operational_budget_id,
      source_category_id: dto.source_category_id,
      destination_category_id: dto.destination_category_id,
      amount: round4(dto.amount),
      status: VirementStatus.DRAFT,
      reason: dto.reason || null,
      created_by_user_id: createdByUserId,
    };
    const virement = this.virementRepo.create(virementData);
    const saved = await this.virementRepo.save(virement);

    return saved;
  }

  async listVirements(
    tenantId: string,
    operationalBudgetId?: string,
    status?: string,
  ) {
    const where: any = { tenant_id: tenantId };
    if (operationalBudgetId) where.operational_budget_id = operationalBudgetId;
    if (status) where.status = status;
    return this.virementRepo.find({
      where,
      order: { created_at: "DESC" },
    });
  }

  async getVirement(id: string, tenantId: string) {
    const virement = await this.virementRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!virement) throw new NotFoundException("Budget virement not found");
    return virement;
  }

  async submitVirement(
    dto: SubmitVirementDto,
    actor: UserPayload,
    tenantId: string,
  ) {
    const virement = await this.getVirement(dto.virement_id, tenantId);
    if (virement.status !== VirementStatus.DRAFT) {
      throw new ConflictException("Only DRAFT virements can be submitted.");
    }

    const source = await this.categoryRepo.findOne({
      where: {
        operational_budget_category_id: virement.source_category_id,
        tenant_id: tenantId,
      },
    });

    const amount = Number(virement.amount);

    // SoD: creator cannot submit their own virement for approval when over threshold
    const currencyCode = "USD"; // OPEX budgets are USD-normalized
    if (
      (await this.doaService.requiresDualControl(amount, currencyCode)) &&
      virement.created_by_user_id === actor.id
    ) {
      throw new ForbiddenException(
        "Segregation of duties: you cannot submit a virement you created that exceeds the dual-control threshold.",
      );
    }

    // DOA authority check
    await this.doaService.validateAuthority(actor, amount, currencyCode);

    virement.status = VirementStatus.PENDING;
    const saved = await this.virementRepo.save(virement);

    // PERSIST APPROVAL LOG — budget virement submission
    await this.approvalLogRepo.save(
      this.approvalLogRepo.create({
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.BUDGET_VIREMENT,
        document_id: virement.id,
        status: ApprovalStatus.SUBMITTED,
        actor_id: actor.id,
        amount,
        comments: `Budget virement submitted for approval: ${source?.name ?? "source"} → ${amount}`,
      } as any),
    );

    return saved;
  }

  async approveVirement(
    dto: ApproveVirementDto,
    actor: UserPayload,
    actorRole: string,
    tenantId: string,
  ) {
    const virement = await this.getVirement(dto.virement_id, tenantId);
    if (virement.status !== VirementStatus.PENDING) {
      throw new ConflictException("Only PENDING virements can be approved.");
    }

    const source = await this.categoryRepo.findOne({
      where: {
        operational_budget_category_id: virement.source_category_id,
        tenant_id: tenantId,
      },
    });
    const destination = await this.categoryRepo.findOne({
      where: {
        operational_budget_category_id: virement.destination_category_id,
        tenant_id: tenantId,
      },
    });

    if (!source || !destination) {
      throw new NotFoundException("Source or destination category not found.");
    }

    const amount = Number(virement.amount);
    const currencyCode = "USD";

    // DOA authority check
    await this.doaService.validateAuthority(actor, amount, currencyCode);

    // Apply the virement: decrease source, increase destination
    source.budgeted_amount = round4(Number(source.budgeted_amount) - amount);
    destination.budgeted_amount = round4(
      Number(destination.budgeted_amount) + amount,
    );

    await this.categoryRepo.save(source);
    await this.categoryRepo.save(destination);

    virement.status = VirementStatus.APPROVED;
    const saved = await this.virementRepo.save(virement);

    // PERSIST APPROVAL LOG — budget virement approval
    await this.approvalLogRepo.save(
      this.approvalLogRepo.create({
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.BUDGET_VIREMENT,
        document_id: virement.id,
        status: ApprovalStatus.APPROVED,
        actor_id: actor.id,
        amount,
        comments:
          dto.comments ||
          `Budget virement approved by ${actorRole}: ${source.name} → ${destination.name} (${amount})`,
      } as any),
    );

    await this.notificationsService.sendVarianceAlert(
      "Budget Virement Approved",
      `Virement ${virement.id}: ${amount} moved from ${source.name} to ${destination.name}.`,
      "info",
    );

    return saved;
  }

  async rejectVirement(
    dto: ApproveVirementDto,
    actor: UserPayload,
    actorRole: string,
    tenantId: string,
  ) {
    const virement = await this.getVirement(dto.virement_id, tenantId);
    if (virement.status !== VirementStatus.PENDING) {
      throw new ConflictException("Only PENDING virements can be rejected.");
    }

    const amount = Number(virement.amount);
    const currencyCode = "USD";

    // DOA authority check (rejecting also requires authority)
    await this.doaService.validateAuthority(actor, amount, currencyCode);

    virement.status = VirementStatus.REJECTED;
    const saved = await this.virementRepo.save(virement);

    await this.approvalLogRepo.save(
      this.approvalLogRepo.create({
        tenant_id: tenantId,
        document_type: ApprovalDocumentType.BUDGET_VIREMENT,
        document_id: virement.id,
        status: ApprovalStatus.REJECTED,
        actor_id: actor.id,
        amount,
        comments: dto.comments || `Budget virement rejected by ${actorRole}`,
      } as any),
    );

    return saved;
  }

  async cancelVirement(id: string, actor: UserPayload, tenantId: string) {
    const virement = await this.getVirement(id, tenantId);
    if (
      virement.status === VirementStatus.APPLIED ||
      virement.status === VirementStatus.APPROVED
    ) {
      throw new ConflictException(
        "Cannot cancel an approved or applied virement.",
      );
    }

    virement.status = VirementStatus.CANCELLED;
    const saved = await this.virementRepo.save(virement);

    return saved;
  }
}
