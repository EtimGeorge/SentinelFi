import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IndustryType } from "../../../shared/types/industry.enum";

@Entity({ name: "wbs_template" })
export class WbsTemplateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({
    type: "enum",
    enum: IndustryType,
    default: IndustryType.GENERAL,
  })
  industry!: IndustryType;

  @Column({ type: "jsonb" })
  structure!: any[]; // Array of items: { code, description, parent_code? }

  @Column({ type: "uuid", nullable: true })
  tenant_id!: string | null;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  updated_at!: Date | null;
}
