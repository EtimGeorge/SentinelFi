import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { UserEntity } from "../../auth/user.entity";
import { CostCenterEntity } from "./cost-center.entity";

@Entity("department")
@Index(["tenant_id", "code"], { unique: true })
export class DepartmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 50 })
  code!: string;

  @Column({ type: "uuid", nullable: true })
  manager_id!: string | null;

  @ManyToOne("UserEntity")
  @JoinColumn({ name: "manager_id" })
  manager!: UserEntity;

  @Column({ type: "uuid", nullable: true })
  parent_department_id!: string | null;

  @ManyToOne(() => DepartmentEntity, { nullable: true })
  @JoinColumn({ name: "parent_department_id" })
  parentDepartment!: DepartmentEntity;

  @OneToMany(() => CostCenterEntity, cc => cc.department)
  costCenters!: CostCenterEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
