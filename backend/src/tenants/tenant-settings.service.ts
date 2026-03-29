import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantSettingsEntity } from "./tenant-settings.entity";
import { TenantEntity } from "./tenant.entity";
import { UserEntity } from "../auth/user.entity";
import { UpdateTenantSettingsDto } from "./dto/tenant-settings.dto";
import { AuditService } from "../audit/audit.service";
import * as nodemailer from "nodemailer";

export interface SubscriptionMetrics {
  plan: string;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  activeUsers: number;
  maxUsers: number;
  userConsumptionPct: number;
  maxStorageGb: number;
  // storageUsedGb and storageConsumptionPct are placeholders until real tracking is wired
  storageUsedGb: number;
  storageConsumptionPct: number;
  isDcsEnabled: boolean;
  isApiEnabled: boolean;
}

export interface TenantSettingsResponse extends Omit<
  TenantSettingsEntity,
  "smtpConfig" | "erpConfig" | "sendgridApiKey"
> {
  // Mask secrets in API response
  smtpConfigured: boolean;
  erpConfigured: boolean;
  sendgridConfigured: boolean;
  smtpServer?: string; // Only expose non-secret portions
  erpProvider?: string;
}

@Injectable()
export class TenantSettingsService {
  private readonly logger = new Logger(TenantSettingsService.name);

  constructor(
    @InjectRepository(TenantSettingsEntity)
    private readonly settingsRepo: Repository<TenantSettingsEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Gets or creates TenantSettings for a tenant.
   */
  async getOrCreateSettings(tenantId: string): Promise<TenantSettingsEntity> {
    let settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings) {
      this.logger.log(`Creating default TenantSettings for tenant ${tenantId}`);
      settings = this.settingsRepo.create({ tenantId });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  /**
   * Returns settings for a tenant, masking secret values.
   */
  async getSettings(tenantId: string): Promise<TenantSettingsResponse> {
    const settings = await this.getOrCreateSettings(tenantId);

    // Build a safe response without raw secrets
    const { smtpConfig, erpConfig, sendgridApiKey, ...safeFields } =
      settings as any;
    return {
      ...safeFields,
      smtpConfigured: !!smtpConfig && !!smtpConfig.server,
      erpConfigured: !!erpConfig && !!erpConfig.baseUrl,
      sendgridConfigured: !!sendgridApiKey,
      smtpServer: smtpConfig?.server ?? undefined,
      erpProvider: erpConfig?.provider ?? undefined,
    } as TenantSettingsResponse;
  }

  /**
   * Updates tenant settings for the given tenant.
   * Callers must verify that the requesting user belongs to this tenant.
   */
  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
    actorUserId: string,
  ): Promise<TenantSettingsResponse> {
    const settings = await this.getOrCreateSettings(tenantId);

    // Merge changes, never blindly overwrite audit log fields with empty values
    Object.assign(settings, dto);
    const saved = await this.settingsRepo.save(settings);

    this.auditService
      .log(
        actorUserId,
        "TENANT_SETTINGS_UPDATED",
        tenantId,
        "Tenant settings were updated.",
        { changes: Object.keys(dto) },
        tenantId,
      )
      .catch((e: Error) => this.logger.error(`Audit log failed: ${e.message}`));

    return this.getSettings(tenantId);
  }

  /**
   * Calculates live subscription consumption metrics for the tenant.
   * Returns user quota usage, storage quota usage, and subscription expiry details.
   */
  async getSubscriptionMetrics(tenantId: string): Promise<SubscriptionMetrics> {
    const tenant = await this.tenantRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const settings = await this.getOrCreateSettings(tenantId);

    // Count active users for this tenant from the shared user table
    const activeUsers = await this.userRepo.count({
      where: { tenant_id: tenantId, is_active: true },
    });

    // Days until tenant expiry
    let daysUntilExpiry: number | null = null;
    let isExpired = false;
    if (tenant.expires_at) {
      const now = Date.now();
      const expiry = new Date(tenant.expires_at).getTime();
      daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      isExpired = daysUntilExpiry < 0;
    }

    const userConsumptionPct =
      tenant.max_users > 0
        ? Math.min(Math.round((activeUsers / tenant.max_users) * 100), 100)
        : 0;

    // Storage: placeholder until actual file tracking is wired in
    const storageUsedGb = 0;
    const storageConsumptionPct =
      tenant.max_storage_gb > 0
        ? Math.min(
            Math.round((storageUsedGb / tenant.max_storage_gb) * 100),
            100,
          )
        : 0;

    return {
      plan: tenant.plan,
      expiresAt: tenant.expires_at,
      daysUntilExpiry,
      isExpired,
      activeUsers,
      maxUsers: tenant.max_users,
      userConsumptionPct,
      maxStorageGb: tenant.max_storage_gb,
      storageUsedGb,
      storageConsumptionPct,
      isDcsEnabled: settings.isDcsEnabled,
      isApiEnabled: settings.isApiEnabled,
    };
  }

  /**
   * Validates SMTP connection using the tenant's saved config or a provided one.
   * Sends a test email to the specified recipient.
   */
  async testSmtpConnection(
    tenantId: string,
    toEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    // Load SMTP config with select: true override
    const settings = await this.settingsRepo
      .createQueryBuilder("ts")
      .addSelect("ts.smtp_config")
      .addSelect("ts.sendgrid_api_key")
      .where("ts.tenant_id = :tenantId", { tenantId })
      .getOne();

    if (!settings?.smtpConfig?.server) {
      throw new ForbiddenException(
        "No SMTP configuration found. Please save SMTP settings first.",
      );
    }

    const { smtpConfig } = settings;
    this.logger.log(
      `Testing SMTP connection for tenant ${tenantId} to ${toEmail}`,
    );

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.server,
        port: smtpConfig.port,
        secure: smtpConfig.useTls,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        connectionTimeout: 8000,
      });

      await transporter.verify();
      await transporter.sendMail({
        from: smtpConfig.from,
        to: toEmail,
        subject: "SentinelFi — SMTP Connection Test",
        html: `
          <h2>SMTP is configured correctly ✅</h2>
          <p>This test email was sent from your SentinelFi tenant settings.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
      });

      this.logger.log(
        `SMTP test to ${toEmail} succeeded for tenant ${tenantId}`,
      );
      return {
        success: true,
        message: `Test email sent successfully to ${toEmail}.`,
      };
    } catch (err: any) {
      const msg = err?.message ?? "Unknown SMTP error";
      this.logger.error(`SMTP test failed for tenant ${tenantId}: ${msg}`);
      return { success: false, message: `Connection failed: ${msg}` };
    }
  }

  /**
   * Validates an ERP/API endpoint by issuing an authenticated HEAD/GET request.
   */
  async testErpConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string; statusCode?: number }> {
    const settings = await this.settingsRepo
      .createQueryBuilder("ts")
      .addSelect("ts.erp_config")
      .where("ts.tenant_id = :tenantId", { tenantId })
      .getOne();

    if (!settings?.erpConfig?.baseUrl) {
      throw new ForbiddenException(
        "No ERP configuration found. Please save ERP settings first.",
      );
    }

    const { erpConfig } = settings;
    this.logger.log(
      `Testing ERP connection for tenant ${tenantId} → ${erpConfig.baseUrl}`,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(erpConfig.baseUrl, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${erpConfig.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const ok = resp.status < 500;
      return {
        success: ok,
        statusCode: resp.status,
        message: ok
          ? `ERP endpoint responded with ${resp.status}.`
          : `ERP endpoint returned error ${resp.status}.`,
      };
    } catch (err: any) {
      const msg =
        err?.code === 20
          ? "Connection timed out after 8 seconds."
          : (err?.message ?? "Unknown error");
      this.logger.error(`ERP test failed for tenant ${tenantId}: ${msg}`);
      return { success: false, message: msg };
    }
  }
}
