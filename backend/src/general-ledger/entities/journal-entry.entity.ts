import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import {
  JournalEntryStatus,
  JournalSourceType,
} from "../../../../shared/types/general-ledger";
import { JournalLineEntity } from "./journal-line.entity";

/**
 * A double-entry General Ledger journal voucher. Lines (debits/credits) live
 * in {@link JournalLineEntity}. A POSTED entry is immutable and must balance
 * (sum debit == sum credit). Entries are idempotent by
 * (tenant_id, source_type, source_id): at most one non-VOID entry may exist
 * per source document so replayed postings cannot double-book.
 */
@Entity("gl_journal_entry")
@Index("IDX_gl_journal_entry_tenant_date", ["tenant_id", "entry_date"])
@Index("IDX_gl_journal_entry_tenant_status", ["tenant_id", "status"])
@Index("IDX_gl_journal_entry_source", [
  "tenant_id",
  "source_type",
  "source_id",
])
@Index("UQ_gl_journal_entry_tenant_number", ["tenant_id", "entry_number"], {
  unique: true,
})
export class JournalEntryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 40 })
  entry_number!: string;

  @Column({ type: "date" })
  entry_date!: string;

  @Column({ type: "text", nullable: true })
  memo!: string | null;

  @Column({
    type: "enum",
    enum: JournalSourceType,
    default: JournalSourceType.MANUAL,
  })
  source_type!: JournalSourceType;

  @Column({ type: "uuid", nullable: true })
  source_id!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  source_reference!: string | null;

  @Column({
    type: "enum",
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status!: JournalEntryStatus;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  total_debit!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  total_credit!: number;

  @Column({ type: "timestamptz", nullable: true })
  posted_at!: Date | null;

  @Column({ type: "uuid", nullable: true })
  posted_by_user_id!: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  reversal_of_entry_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  reversed_by_entry_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  created_by_user_id!: string | null;

  @OneToMany(() => JournalLineEntity, (line) => line.entry)
  lines!: JournalLineEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
