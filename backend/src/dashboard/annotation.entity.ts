import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { UserEntity } from "../auth/user.entity";

export enum AnnotationTargetType {
  WBS = "WBS",
  EXPENSE = "EXPENSE",
}

@Entity({ name: "ceo_annotation" })
@Index(["tenant_id", "target_type", "target_id"])
export class CEOAnnotationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({
    type: "enum",
    enum: AnnotationTargetType,
  })
  target_type!: AnnotationTargetType;

  @Column({ type: "uuid" })
  target_id!: string; // The UUID of the WBS node or Expense record

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "uuid" })
  author_id!: string;

  @ManyToOne("UserEntity")
  @JoinColumn({ name: "author_id", referencedColumnName: "id" })
  author!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
