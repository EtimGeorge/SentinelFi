import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ConversationMemberEntity } from "./conversation-member.entity";
import { MessageEntity } from "./message.entity";

@Entity("conversation")
@Index(["tenant_id"])
export class ConversationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  // e.g. "DIRECT" or "GROUP"
  @Column({ type: "varchar", length: 20, default: "DIRECT" })
  type!: string;

  // Optional: Custom name for group chats
  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string;

  @OneToMany(() => ConversationMemberEntity, (member) => member.conversation, {
    cascade: ["insert", "update"],
  })
  members!: ConversationMemberEntity[];

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages!: MessageEntity[];

  // Used to quickly order the inbox list for users
  @UpdateDateColumn({ type: "timestamptz" })
  last_activity_at!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
