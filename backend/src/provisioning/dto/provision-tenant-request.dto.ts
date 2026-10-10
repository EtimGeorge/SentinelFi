import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsNumber, IsUUID, Min, MaxLength, ValidateIf, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { BillingCycle } from "../../billing/entities/subscription.entity";

/**
 * Identity half of provisioning (Step 1).
 * Shared by POST /super/tenants (identity-only) and the full orchestrator.
 */
export class ProvisionIdentityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName!: string;

  @IsEmail({}, { message: "Admin email must be a valid email address" })
  @IsNotEmpty()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adminFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adminLastName?: string;

  /** Optional explicit schema; when omitted derived via deriveSchemaName(). */
  @IsOptional()
  @IsString()
  schemaName?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  defaultCurrencyCode?: string;
}

/**
 * Commercial half of provisioning (Step 2).
 * Shared by POST /super/billing/subscriptions (standalone renew/upgrade)
 * and the full orchestrator.
 */
export enum OfflineInvoiceStatus {
  Pending = "pending",
  Paid = "paid",
}

export class ProvisionCommercialsDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @ValidateIf((o) => o.plan !== "free")
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ValidateIf((o) => o.plan !== "free")
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountUsd?: number;

  /** Duration in months; omitted for free-forever. */
  @ValidateIf((o) => o.plan !== "free")
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  months?: number;

  /** Honest invoice state: offline bank-transfer provisions start Pending. */
  @IsOptional()
  @IsEnum(OfflineInvoiceStatus)
  invoiceStatus?: OfflineInvoiceStatus;

  @IsOptional()
  @IsString()
  paymentProofText?: string;

  @IsOptional()
  @IsString()
  offlineBankReference?: string;
}

/**
 * Full orchestrator input: identity + optional commercials + idempotency.
 * When `commercials` is omitted the tenant is created login-capable with a
 * free subscription row + invitation (never a subscription-less zombie).
 */
export class ProvisionTenantRequestDto extends ProvisionIdentityDto {
  @IsOptional()
  commercials?: ProvisionCommercialsDto;

  /** One UUID per wizard session; retries reuse it for safe replay. */
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/** Standalone commercial attach/renew on an existing tenant. */
export class AttachCommercialsDto extends ProvisionCommercialsDto {
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/** Uniform result powering the wizard success screen + audit. */
export interface ProvisionTenantResult {
  tenant_id: string;
  schema_name: string;
  provisioning_status: string;
  plan: string;
  expires_at: Date | null;
  subscription_id: string | null;
  invoice_id: string | null;
  invoice_status: string | null;
  invitation_sent: boolean;
  invitation_expires_at: Date | null;
  /** What the admin types into the Tenant Login tab. */
  tenant_login_hint: string;
  resumed: boolean;
  message: string;
}
