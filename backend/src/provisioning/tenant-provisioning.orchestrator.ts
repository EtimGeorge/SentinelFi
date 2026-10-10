import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";
import { TenantEntity } from "../tenants/tenant.entity";
import { TenantService } from "../tenants/tenant.service";
import { InvitationService } from "../auth/invitation.service";
import { InvitationEntity } from "../auth/entities/invitation.entity";
import { AuditService } from "../audit/audit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Role } from "@shared/types/role.enum";
import { TenantProvisioningStatus } from "@shared/types/tenant-provisioning-status.enum";
import { deriveSchemaName } from "../common/utils/schema-name.util";
import {
  SubscriptionEntity,
  SubscriptionStatus,
  BillingCycle,
} from "../billing/entities/subscription.entity";
import { BillingInvoiceEntity } from "../billing/entities/billing-invoice.entity";
import { InvoiceStatus } from "@shared/types/billing";
import { FREE_PLAN_TASK_CAP } from "../billing/billing.service";
import {
  ProvisionTenantRequestDto,
  ProvisionCommercialsDto,
  ProvisionTenantResult,
  OfflineInvoiceStatus,
} from "./dto/provision-tenant-request.dto";

export interface NormalizedCommercials {
  plan: string;
  billingCycle: BillingCycle;
  amountUsd: number;
  months?: number;
  invoiceStatus: OfflineInvoiceStatus;
  paymentProofText?: string;
  offlineBankReference?: string;
}

/**
 * Single provisioning orchestrator (saga, NOT one mega-transaction).
 * Owns: canonical schema derivation, idempotent replay, atomic commercials
 * write, single audit event. TenantService keeps owning schema/migrations.
 */
@Injectable()
export class TenantProvisioningOrchestrator {
  private readonly logger = new Logger(TenantProvisioningOrchestrator.name);

  private readonly replayCache = new Map<
    string,
    { result: ProvisionTenantResult; storedAt: number }
  >();
  private static readonly REPLAY_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly REPLAY_MAX = 1000;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(BillingInvoiceEntity)
    private readonly invoiceRepository: Repository<BillingInvoiceEntity>,
    private readonly tenantService: TenantService,
    private readonly invitationService: InvitationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Full provisioning entry point: identity → commercials → invitation → audit.
   *
   * Saga shape (NOT one mega-transaction): `TenantService.createTenant` commits
   * the identity half (row reservation + schema + migrations + ACTIVE promotion),
   * then the commercials half (subscription [+ invoice] + tenant expiry/plan)
   * commits atomically in its own transaction. A failure between the halves
   * leaves an ACTIVE tenant that a retry with the same `idempotencyKey` completes
   * — never a subscription-less zombie.
   */
  async provisionTenant(
    dto: ProvisionTenantRequestDto,
    actor?: { id: string; email: string },
  ): Promise<ProvisionTenantResult> {
    // ── Idempotent replay (in-process, within TTL) ───────────────────────────
    if (dto.idempotencyKey) {
      const cached = this.replayCache.get(dto.idempotencyKey);
      if (cached) {
        if (
          Date.now() - cached.storedAt <
          TenantProvisioningOrchestrator.REPLAY_TTL_MS
        ) {
          return { ...cached.result, resumed: true };
        }
        this.replayCache.delete(dto.idempotencyKey);
      }
    }

    // R1b: canonical schema derivation — validates an explicit schemaName too,
    // so both paths reach DDL through the single source of truth.
    const schemaName = deriveSchemaName(dto.schemaName ?? dto.companyName);
    const commercials = this.normalizeCommercials(dto.commercials);

    // ── Identity half (or replay/resume of an already-committed identity) ────
    let tenant: TenantEntity | null = null;

    if (dto.idempotencyKey) {
      // name + schema must BOTH match: a schema-name collision on a different
      // company must fall through to createTenant and surface its Conflict.
      const existing = await this.tenantRepository.findOne({
        where: { schema_name: schemaName, name: dto.companyName },
      });
      if (
        existing &&
        existing.provisioning_status === TenantProvisioningStatus.ACTIVE
      ) {
        const existingSubscription = await this.subscriptionRepository.findOne({
          where: { tenant_id: existing.tenant_id },
          order: { created_at: "DESC" },
        });
        if (existingSubscription) {
          // Both halves committed on an earlier attempt → safe replay.
          const invoice = await this.invoiceRepository.findOne({
            where: { subscription_id: existingSubscription.id },
            order: { created_at: "DESC" },
          });
          const invitation = await this.ensureInvitation(existing, dto);
          const result = this.buildResult({
            tenant: existing,
            subscription: existingSubscription,
            invoice,
            invitation,
            dto,
            resumed: true,
          });
          this.remember(dto.idempotencyKey, result);
          return result;
        }
        // Identity committed, commercials did not → finish them below.
        tenant = existing;
      }
    }

    if (tenant === null) {
      const created = await this.tenantService.createTenant(
        {
          name: dto.companyName,
          schema_name: schemaName,
          admin_email: dto.adminEmail,
          admin_first_name: dto.adminFirstName,
          admin_last_name: dto.adminLastName,
          plan: commercials.plan,
          default_currency_code: dto.defaultCurrencyCode,
        },
        actor,
      );
      // createTenant returns a column-limited projection; re-read the full row
      // (provisioning_status / expires_at feed the result).
      tenant = await this.tenantRepository.findOneOrFail({
        where: { tenant_id: created.tenant_id },
      });
    }

    // ── Commercials half: one atomic write ───────────────────────────────────
    const { subscription, invoice, expiresAt } = await this.writeCommercials(
      tenant,
      commercials,
      dto,
    );
    // Keep the in-memory row in sync with the committed update.
    tenant.plan = commercials.plan;
    tenant.expires_at = expiresAt;

    const invitation = await this.ensureInvitation(tenant, dto);
    const result = this.buildResult({
      tenant,
      subscription,
      invoice,
      invitation,
      dto,
      resumed: false,
    });

    // Single audit event for the whole orchestration.
    this.auditService
      .log(
        actor?.id ?? "SYSTEM",
        "TENANT_PROVISIONED",
        tenant.tenant_id,
        result.message,
        {
          schema_name: tenant.schema_name,
          plan: commercials.plan,
          subscription_id: subscription.id,
          invoice_id: invoice?.id ?? null,
          invitation_sent: result.invitation_sent,
          expires_at: result.expires_at,
          idempotency_key: dto.idempotencyKey ?? null,
        },
        actor?.email ?? "SYSTEM",
      )
      .catch((err) =>
        this.logger.error(`Failed to log provisioning audit: ${err.message}`),
      );

    this.remember(dto.idempotencyKey, result);
    return result;
  }

  /**
   * Commercials half: subscription (+ invoice for paid plans) and the tenant
   * expiry/plan update commit as ONE unit — a partial write is rolled back so a
   * retry with the same idempotency key can complete it.
   */
  private async writeCommercials(
    tenant: TenantEntity,
    commercials: NormalizedCommercials,
    dto: ProvisionTenantRequestDto,
  ): Promise<{
    subscription: SubscriptionEntity;
    invoice: BillingInvoiceEntity | null;
    expiresAt: Date | null;
  }> {
    const now = new Date();
    const isFree = commercials.plan === "free";
    let expiresAt: Date | null = null;
    if (!isFree) {
      expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + (commercials.months ?? 1));
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const subscription = queryRunner.manager.create(SubscriptionEntity, {
        tenant_id: tenant.tenant_id,
        plan: commercials.plan,
        status: SubscriptionStatus.ACTIVE,
        billing_cycle: commercials.billingCycle,
        amount_usd: commercials.amountUsd,
        gateway: "superadmin",
        admin_email: dto.adminEmail,
        admin_first_name: dto.adminFirstName,
        admin_last_name: dto.adminLastName,
        company_name: dto.companyName,
        base_currency: dto.defaultCurrencyCode ?? "USD",
        current_period_start: now,
        current_period_end: expiresAt,
        payment_proof_text: commercials.paymentProofText ?? null,
        offline_bank_reference: commercials.offlineBankReference ?? null,
        max_tasks_per_day: isFree ? FREE_PLAN_TASK_CAP : null,
        has_ads: isFree,
        ad_unlock_credits: 0,
        ad_unlock_date: null,
      });
      await queryRunner.manager.save(SubscriptionEntity, subscription);

      let invoice: BillingInvoiceEntity | null = null;
      if (!isFree) {
        const paid = commercials.invoiceStatus === OfflineInvoiceStatus.Paid;
        invoice = queryRunner.manager.create(BillingInvoiceEntity, {
          tenant_id: tenant.tenant_id,
          subscription_id: subscription.id,
          invoice_number: `INV-${crypto.randomBytes(3)
            .toString("hex")
            .toUpperCase()}`,
          amount_usd: commercials.amountUsd,
          status: paid ? InvoiceStatus.Paid : InvoiceStatus.Pending,
          due_date: now,
          paid_at: paid ? now : null,
        });
        await queryRunner.manager.save(BillingInvoiceEntity, invoice);
      }

      await queryRunner.manager.update(
        TenantEntity,
        { tenant_id: tenant.tenant_id },
        { plan: commercials.plan, expires_at: expiresAt, is_active: true },
      );
      await queryRunner.commitTransaction();
      JwtAuthGuard.invalidateTenantStatus(tenant.tenant_id);
      return { subscription, invoice, expiresAt };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Commercials provisioning failed for '${tenant.name}': ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /** Free default when commercials are omitted — never a subscription-less zombie. */
  private normalizeCommercials(
    commercials?: ProvisionCommercialsDto,
  ): NormalizedCommercials {
    if (!commercials || commercials.plan === "free") {
      return {
        plan: commercials?.plan ?? "free",
        billingCycle: BillingCycle.FREE,
        amountUsd: 0,
        invoiceStatus: OfflineInvoiceStatus.Pending, // no invoice row is written for free
      };
    }
    return {
      plan: commercials.plan,
      billingCycle: commercials.billingCycle ?? BillingCycle.MONTHLY,
      amountUsd: commercials.amountUsd ?? 0,
      months: commercials.months,
      // Honest invoice state: offline bank-transfer provisions start Pending.
      invoiceStatus: commercials.invoiceStatus ?? OfflineInvoiceStatus.Pending,
      paymentProofText: commercials.paymentProofText,
      offlineBankReference: commercials.offlineBankReference,
    };
  }

  /**
   * createTenant's Phase-3 invitation is best-effort — recreate only when the
   * row is genuinely missing so a replay never double-mails the admin.
   */
  private async ensureInvitation(
    tenant: TenantEntity,
    dto: ProvisionTenantRequestDto,
  ): Promise<InvitationEntity | null> {
    const existing = await this.dataSource
      .getRepository(InvitationEntity)
      .findOne({
        where: { tenant_id: tenant.tenant_id, email: dto.adminEmail },
        order: { created_at: "DESC" },
      });
    if (existing) return existing;
    try {
      return await this.invitationService.createInvitation(
        dto.adminEmail,
        Role.AdminDirector,
        tenant,
        dto.adminFirstName,
        dto.adminLastName,
      );
    } catch (err) {
      this.logger.error(
        `Invitation for '${dto.adminEmail}' failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private buildResult(args: {
    tenant: TenantEntity;
    subscription: SubscriptionEntity;
    invoice: BillingInvoiceEntity | null;
    invitation: InvitationEntity | null;
    dto: ProvisionTenantRequestDto;
    resumed: boolean;
  }): ProvisionTenantResult {
    const { tenant, subscription, invoice, invitation, dto, resumed } = args;
    let message: string;
    if (resumed) {
      message = `Tenant '${tenant.name}' is already provisioned on the '${subscription.plan}' plan.`;
    } else {
      const expiry = tenant.expires_at
        ? `; expires ${tenant.expires_at.toISOString()}`
        : "";
      message = `Tenant '${tenant.name}' provisioned on the '${subscription.plan}' plan${expiry}.`;
    }
    return {
      tenant_id: tenant.tenant_id,
      schema_name: tenant.schema_name,
      provisioning_status: tenant.provisioning_status,
      plan: subscription.plan,
      expires_at: tenant.expires_at,
      subscription_id: subscription.id,
      invoice_id: invoice?.id ?? null,
      invoice_status: invoice?.status ?? null,
      invitation_sent: invitation !== null,
      invitation_expires_at: invitation?.expires_at ?? null,
      tenant_login_hint: dto.adminEmail,
      resumed,
      message,
    };
  }

  private remember(
    idempotencyKey: string | undefined,
    result: ProvisionTenantResult,
  ): void {
    if (!idempotencyKey) return;
    if (this.replayCache.size >= TenantProvisioningOrchestrator.REPLAY_MAX) {
      const oldest = this.replayCache.keys().next().value;
      if (oldest !== undefined) this.replayCache.delete(oldest);
    }
    this.replayCache.set(idempotencyKey, { result, storedAt: Date.now() });
  }
}
