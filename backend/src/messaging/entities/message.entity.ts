import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { UserEntity } from "../../auth/user.entity";
import { ConversationEntity } from "./conversation.entity";


@Entity("message")
export class MessageEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  tenant_id!: string;

  @Index()
  @Column({ type: "uuid" })
  conversation_id!: string;

  @ManyToOne(() => ConversationEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ConversationEntity;

  @Index()
  @Column({ type: "uuid" })
  sender_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "sender_id" })
  sender!: UserEntity;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "boolean", default: false })
  is_read!: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata?: {
      type?: "USER_CHAT" | "SYSTEM_ALERT" | "AI_GUIDANCE";
      related_document_id?: string;
      action_url?: string;
  };

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
