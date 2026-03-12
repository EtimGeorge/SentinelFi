import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { DepartmentEntity } from "./department.entity";
import { UserEntity } from "../../auth/user.entity";

@Entity("cost_center")
@Index(["tenant_id", "code"], { unique: true })
export class CostCenterEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 50 })
  code!: string;

  @Column({ type: "uuid" })
  department_id!: string;

  @ManyToOne(() => DepartmentEntity, dept => dept.costCenters)
  @JoinColumn({ name: "department_id" })
  department!: DepartmentEntity;

  @Column({ type: "uuid", nullable: true })
  owner_id!: string | null;

  @ManyToOne("UserEntity")
  @JoinColumn({ name: "owner_id" })
  owner!: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
