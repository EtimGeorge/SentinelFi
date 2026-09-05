import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
} from "typeorm";

@Entity("notifications")
@Index(["tenant_id"])
@Index(["user_id"])
@Index(["is_read"])
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid", nullable: true })
  user_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", length: 50, default: "info" })
  type!: string;

  @Column({ type: "boolean", default: false })
  is_read!: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata?: any;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
