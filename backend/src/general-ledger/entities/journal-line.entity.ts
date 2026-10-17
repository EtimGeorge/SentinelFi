import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { JournalEntryEntity } from "./journal-entry.entity";
import { GLAccountEntity } from "../../finance-core/entities/gl-account.entity";

/**
 * A single debit or credit leg of a {@link JournalEntryEntity}. Exactly one of
 * `debit`/`credit` is expected to be non-zero per line. Decimal(19,4) mirrors
 * the other monetary columns (budget_ledger, encumbrances).
 */
@Entity("gl_journal_line")
@Index("IDX_gl_journal_line_tenant_entry", ["tenant_id", "journal_entry_id"])
@Index("IDX_gl_journal_line_tenant_account", ["tenant_id", "gl_account_id"])
export class JournalLineEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  journal_entry_id!: string;

  @ManyToOne(() => JournalEntryEntity, (entry) => entry.lines, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "journal_entry_id" })
  entry!: JournalEntryEntity;

  @Column({ type: "uuid" })
  gl_account_id!: string;

  @ManyToOne(() => GLAccountEntity)
  @JoinColumn({ name: "gl_account_id" })
  glAccount!: GLAccountEntity;

  @Column({ type: "uuid", nullable: true })
  cost_center_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;

  @Column({ type: "int", default: 1 })
  line_number!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  debit!: number;

  @Column({ type: "decimal", precision: 19, scale: 4, default: 0 })
  credit!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
