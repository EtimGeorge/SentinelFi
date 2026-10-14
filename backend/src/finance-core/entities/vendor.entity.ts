import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum VendorStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

/**
 * Tenant-scoped vendor master. Vendors were previously free-text strings on
 * requisitions / POs / invoices, which prevented reliable spend-by-vendor
 * reporting, duplicate detection, and payment-term enforcement. Documents keep
 * a denormalised `vendor_name` snapshot for display, but now also carry a
 * nullable `vendor_id` FK so they can be reconciled to the master.
 */
@Entity("vendor")
@Index(["tenant_id", "code"], { unique: true })
export class VendorEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 50 })
  code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tax_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_name!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "integer", default: 30 })
  payment_terms_days!: number;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "enum", enum: VendorStatus, default: VendorStatus.ACTIVE })
  status!: VendorStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
