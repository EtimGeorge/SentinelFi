import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TenantEntity } from "../../tenants/tenant.entity";

export enum SubscriptionStatus {
  PENDING = "pending",
  TRIALING = "trialing",
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  ANNUAL = "annual",
  TRIAL = "trial",
}

/**
 * Tracks every subscription lifecycle event for a tenant.
 * This is the source of truth for access control — the JwtAuthGuard
 * reads the tenant's expires_at (synced from current_period_end here).
 */
@Entity({ name: "subscriptions", schema: "public" })
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  tenant_id!: string;

  @ManyToOne(() => TenantEntity, { nullable: true })
  @JoinColumn({ name: "tenant_id" })
  tenant!: TenantEntity;

  /** 'trial' | 'professional' | 'enterprise' */
  @Column({ type: "varchar", length: 50 })
  plan!: string;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status!: SubscriptionStatus;

  @Column({
    type: "enum",
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billing_cycle!: BillingCycle;

  /** Canonical price in USD — always USD regardless of display currency */
  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  amount_usd!: number;

  /** 'paystack' | 'paypal' | 'superadmin' | 'trial' */
  @Column({ type: "varchar", length: 50, nullable: true })
  gateway!: string;

  /** Reference ID returned by the payment gateway */
  @Column({ type: "varchar", length: 255, nullable: true })
  gateway_reference!: string;

  /** Email used during checkout — for pre-provisioned tenants before user exists */
  @Column({ type: "varchar", length: 255, nullable: true })
  admin_email!: string;

  /** First name of the admin provisioning the workspace */
  @Column({ type: "varchar", length: 255, nullable: true })
  admin_first_name!: string;

  /** Last name of the admin provisioning the workspace */
  @Column({ type: "varchar", length: 255, nullable: true })
  admin_last_name!: string;

  /** Company name captured at checkout */
  @Column({ type: "varchar", length: 255, nullable: true })
  company_name!: string;

  /** Base reporting currency selected at checkout (e.g., USD, NGN) */
  @Column({ type: "varchar", length: 3, default: "USD" })
  base_currency!: string;

  /** When the free trial expires */
  @Column({ type: "timestamptz", nullable: true })
  trial_ends_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  current_period_start!: Date | null;

  /** KEY: drives expiry blocking in JwtAuthGuard */
  @Column({ type: "timestamptz", nullable: true })
  current_period_end!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  cancelled_at!: Date | null;

  // --- Offline Audit Trail Proofs ---
  /** URL or path to the uploaded PDF/Image receipt for offline payments */
  @Column({ type: "varchar", length: 1000, nullable: true })
  payment_proof_url!: string | null;

  /** Structured text of the credit alert (SMS/Email) for offline payments */
  @Column({ type: "text", nullable: true })
  payment_proof_text!: string | null;

  /** Extracted or manual bank reference ID for reconciliation */
  @Column({ type: "varchar", length: 255, nullable: true })
  offline_bank_reference!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
