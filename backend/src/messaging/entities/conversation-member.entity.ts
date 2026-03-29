import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ConversationEntity } from "./conversation.entity";
import { UserEntity } from "../../auth/user.entity";

@Entity("conversation_member")
@Index(["conversation_id", "user_id"], { unique: true }) // A user is only in a combo once
@Index(["user_id"]) // For quickly finding all conversations a user belongs to
export class ConversationMemberEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  conversation_id!: string;

  @ManyToOne(() => ConversationEntity, (conv) => conv.members, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ConversationEntity;

  @Column({ type: "uuid" })
  user_id!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  // The timestamp of the last message this specific user has read
  @Column({ type: "timestamptz", nullable: true })
  last_read_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  joined_at!: Date;
}
