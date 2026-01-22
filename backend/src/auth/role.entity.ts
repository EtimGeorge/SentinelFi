import { Role } from "@shared/types/role.enum";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { PermissionEntity } from "./permission.entity";

@Entity({ name: "roles", schema: "public" })
export class RoleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 50 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @ManyToMany(() => PermissionEntity, { cascade: true, eager: true })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: PermissionEntity[];
}
