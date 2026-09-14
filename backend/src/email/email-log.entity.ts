import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

export type EmailLogStatus = "sent" | "failed" | "preview";

/**
 * Audit trail for every outbound email.
 * Written fire-and-forget at the EmailService choke point so all sends
 * (templated + raw + attachment) are captured without a single missed path.
 */
@Entity({ name: "email_log", schema: "public" })
export class EmailLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Tenant context when known (billing/renewal sends); null for system mail. */
  @Index()
  @Column({ name: "tenant_id", type: "uuid", nullable: true })
  tenantId!: string | null;

  @Column({ name: "to", type: "varchar", length: 255 })
  to!: string;

  @Column({ name: "subject", type: "varchar", length: 255 })
  subject!: string;

  /** Handlebar template name, e.g. "payment-receipt", "invitation". */
  @Index()
  @Column({ name: "template", type: "varchar", length: 80, nullable: true })
  template!: string | null;

  /** "resend" | "smtp" */
  @Column({ name: "provider", type: "varchar", length: 40 })
  provider!: string;

  @Index()
  @Column({ name: "status", type: "varchar", length: 20, default: "sent" })
  status!: EmailLogStatus;

  /** Failure detail when status = "failed". */
  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage!: string | null;

  @Index()
  @Column({
    name: "sent_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  sentAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}