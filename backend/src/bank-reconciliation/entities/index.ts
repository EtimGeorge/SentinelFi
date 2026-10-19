import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum BankAccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CLOSED = "CLOSED",
}

@Entity("bank_account")
export class BankAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 255 })
  account_name!: string;

  @Column({ type: "varchar", length: 50 })
  account_number_masked!: string;

  @Column({ type: "varchar", length: 255 })
  bank_name!: string;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency_code!: string;

  @Column({ type: "numeric", precision: 19, scale: 4, default: () => "0" })
  opening_balance!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: () => "0" })
  current_balance!: number;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: BankAccountStatus;

  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}

export enum ReconciliationStatus {
  OPEN = "OPEN",
  MATCHED = "MATCHED",
  APPROVED = "APPROVED",
  POSTED = "POSTED",
  CANCELLED = "CANCELLED",
}

export enum ReconciliationMatchType {
  AUTO = "AUTO",
  MANUAL = "MANUAL",
}

@Entity("bank_reconciliation")
export class BankReconciliationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  bank_account_id!: string;

  @Column({ type: "date" })
  reconciliation_date!: string;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  statement_balance!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: () => "0" })
  book_balance!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, default: () => "0" })
  difference!: number;

  @Column({ type: "varchar", length: 20, default: "OPEN" })
  status!: ReconciliationStatus;

  @Column({ type: "uuid", nullable: true })
  approved_by_user_id!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  approved_at!: Date | null;

  @Column({ type: "uuid" })
  created_by_user_id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}

@Entity("bank_statement_line")
export class BankStatementLineEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  bank_account_id!: string;

  @Column({ type: "varchar", length: 255 })
  statement_reference!: string;

  @Column({ type: "date" })
  transaction_date!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "numeric", precision: 19, scale: 4, nullable: true })
  balance_after!: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference_number!: string | null;

  @Column({ type: "boolean", default: false })
  is_matched!: boolean;

  @Column({ type: "uuid", nullable: true })
  matched_reconciliation_id!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}

@Entity("bank_reconciliation_line")
export class BankReconciliationLineEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  reconciliation_id!: string;

  @Column({ type: "uuid", nullable: true })
  bank_statement_line_id!: string | null;

  @Column({ type: "numeric", precision: 19, scale: 4 })
  amount!: number;

  @Column({ type: "varchar", length: 10, default: "MANUAL" })
  match_type!: ReconciliationMatchType;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
