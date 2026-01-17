import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "permissions", schema: "public" })
export class PermissionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 100 })
  name!: string; // e.g., "users:create", "wbs:delete"

  @Column({ type: "text", nullable: true })
  description?: string;
}
