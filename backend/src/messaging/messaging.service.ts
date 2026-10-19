import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, LessThan } from "typeorm";
import { MessageEntity } from "./entities/message.entity";
import { ConversationEntity } from "./entities/conversation.entity";
import { ConversationMemberEntity } from "./entities/conversation-member.entity";
import { UserEntity } from "../auth/user.entity";
import { Role } from "@shared/types/role.enum";

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(ConversationMemberEntity)
    private readonly memberRepository: Repository<ConversationMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * ELITE SUPPORT DISPATCHER: Creates a priority bridge between a Tenant Admin and the Landlord team.
   */
  async createSupportConversation(
    userId: string,
    tenantId: string,
    subject: string,
    description: string,
  ): Promise<ConversationEntity> {
    // 1. Find a SuperAdmin to handle this request
    const superAdmin = await this.userRepository.findOne({
      where: { roles: { name: Role.SuperAdmin } as any },
      relations: ["roles"],
    });

    if (!superAdmin) {
      throw new BadRequestException(
        "No available support staff found. Please try again later.",
      );
    }

    // 2. Create the conversation. The SuperAdmin is a cross-tenant member by
    //    design, so the same-tenant rule is relaxed for this single member
    //    (role-verified above).
    const conversation = await this.createConversation(
      userId,
      [superAdmin.id],
      tenantId,
      `PRIORITY: ${subject}`,
      { allowSuperAdminMembers: true },
    );

    // 3. Inject the initial context message
    const initialContent = `--- PRIORITY SUPPORT DISPATCH ---\nSubject: ${subject}\n\nDescription: ${description}`;

    await this.saveMessage({
      senderId: userId,
      conversationId: conversation.id,
      content: initialContent,
      tenantId: tenantId,
      metadata: { is_support: true, subject },
    });

    return conversation;
  }

  async saveMessage(data: {
    senderId: string;
    conversationId: string;
    content: string;
    tenantId: string;
    metadata?: any;
  }): Promise<MessageEntity> {
    const isMember = await this.memberRepository.findOne({
      where: { conversation_id: data.conversationId, user_id: data.senderId },
    });

    if (!isMember) {
      throw new ForbiddenException(
        "You are not a member of this conversation.",
      );
    }

    const message = this.messageRepository.create({
      sender_id: data.senderId,
      conversation_id: data.conversationId,
      content: data.content,
      tenant_id: data.tenantId,
      metadata: data.metadata,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update the conversation's last_activity_at so it bumps to the top of the list
    await this.conversationRepository.update(data.conversationId, {
      last_activity_at: new Date(),
    });

    // Fetch the fully populated message to return
    return this.messageRepository.findOneOrFail({
      where: { id: savedMessage.id },
      relations: ["sender"],
    });
  }

  async getConversationsForUser(
    userId: string,
    tenantId: string,
  ): Promise<ConversationEntity[]> {
    const userMemberships = await this.memberRepository.find({
      where: { user_id: userId },
    });

    if (!userMemberships.length) return [];

    const convIds = userMemberships.map((m) => m.conversation_id);

    const conversations = await this.conversationRepository.find({
      where: { id: In(convIds), tenant_id: tenantId },
      relations: ["members", "members.user"],
      order: { last_activity_at: "DESC" },
    });

    // ── Unread counts + last-message preview ──────────────────────────────
    // Two aggregate queries total (not per-conversation) so the conversations
    // list stays O(1)-ish regardless of how many conversations a user has.
    const readAtByConv = new Map<string, Date | null>(
      userMemberships.map((m) => [m.conversation_id, m.last_read_at ?? null]),
    );

    const unreadRows: { conversation_id: string; unread: string }[] =
      await this.conversationRepository.manager.query(
        `SELECT m.conversation_id, COUNT(*)::text AS unread
           FROM message m
           JOIN conversation_member cm
             ON cm.conversation_id = m.conversation_id AND cm.user_id = $2
          WHERE m.conversation_id = ANY($1::uuid[])
            AND m.tenant_id = $3::uuid
            AND m.sender_id != $2::uuid
            AND m.created_at > COALESCE(cm.last_read_at, 'epoch')
          GROUP BY m.conversation_id`,
        [convIds, userId, tenantId],
      );

    const unreadByConv = new Map<string, number>();
    for (const row of unreadRows) {
      unreadByConv.set(row.conversation_id, Number(row.unread) || 0);
    }

    const lastMessageRows: {
      conversation_id: string;
      content: string;
      sender_id: string;
      created_at: Date;
    }[] = await this.conversationRepository.manager.query(
      `SELECT DISTINCT ON (m.conversation_id)
              m.conversation_id, m.content, m.sender_id, m.created_at
         FROM message m
        WHERE m.conversation_id = ANY($1::uuid[])
          AND m.tenant_id = $2::uuid
        ORDER BY m.conversation_id, m.created_at DESC`,
      [convIds, tenantId],
    );

    const lastMessageByConv = new Map<string, any>();
    for (const row of lastMessageRows) {
      lastMessageByConv.set(row.conversation_id, row);
    }

    for (const conv of conversations) {
      const unread = unreadByConv.get(conv.id) ?? 0;
      (conv as any).unread_count = unread;
      const last = lastMessageByConv.get(conv.id);
      if (last) {
        (conv as any).last_message_preview = String(last.content || "").slice(
          0,
          120,
        );
        (conv as any).last_message_at = last.created_at;
      }
      // Expose caller's own read marker for receipt rendering.
      (conv as any).viewer_last_read_at = readAtByConv.get(conv.id) ?? null;
    }

    return conversations;
  }

  async getChatHistory(
    conversationId: string,
    userId: string,
    tenantId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<MessageEntity[]> {
    const isMember = await this.memberRepository.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });
    if (!isMember) {
      throw new ForbiddenException(
        "You are not a member of this conversation.",
      );
    }

    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(Math.floor(limit), 200))
      : 50;

    if (before) {
      // Cursor pagination ("load earlier"): fetch the N messages immediately
      // preceding the cursor, then hand them back in ascending order so the
      // client can prepend them verbatim.
      const older = await this.messageRepository.find({
        where: {
          conversation_id: conversationId,
          tenant_id: tenantId,
          created_at: LessThan(before),
        },
        order: { created_at: "DESC" },
        take: safeLimit,
        relations: ["sender"],
      });
      return older.reverse();
    }

    return await this.messageRepository.find({
      where: { conversation_id: conversationId, tenant_id: tenantId },
      order: { created_at: "ASC" },
      take: safeLimit,
      relations: ["sender"],
    });
  }

  async isConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });
    return !!member;
  }

  private async resolveUserIdentifiers(
    identifiers: string[],
    tenantId: string,
  ): Promise<string[]> {
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuids: string[] = [];
    const lookups: string[] = [];
    for (const raw of identifiers) {
      const v = (raw || "").trim();
      if (!v) continue;
      // Skip synthetic SYSTEM identifier – handled by UI guard, but be defensive
      if (v === "SYSTEM") continue;
      if (uuidV4.test(v)) uuids.push(v);
      else lookups.push(v.toLowerCase());
    }
    if (lookups.length === 0) return uuids;
    // Resolve emails/usernames to UUIDs via public.user table scoped to tenant
    const users = await this.userRepository
      .createQueryBuilder("u")
      .where("u.tenant_id = :tenantId", { tenantId })
      .andWhere(
        "(LOWER(u.email) IN (:...lookups) OR LOWER(COALESCE(u.username,'')) IN (:...lookups))",
        { lookups },
      )
      .getMany();
    const map = new Map<string, string>();
    for (const u of users) {
      map.set(u.email.toLowerCase(), u.id);
      if ((u as any).username) map.set((u as any).username.toLowerCase(), u.id);
    }
    for (const l of lookups) {
      const id = map.get(l);
      if (!id) {
        throw new BadRequestException(`User not found for identifier: ${l}`);
      }
      uuids.push(id);
    }
    return uuids;
  }

  async createConversation(
    creatorId: string,
    selectedUserIds: string[],
    tenantId: string,
    name?: string,
    options?: { allowSuperAdminMembers?: boolean },
  ): Promise<ConversationEntity> {
    if (!tenantId) {
      throw new BadRequestException(
        "Messaging is tenant-scoped — SuperAdmin must impersonate a tenant user first.",
      );
    }
    // Accept both UUIDs and emails/usernames – resolve emails to UUIDs tenant-scoped
    const resolvedIds = await this.resolveUserIdentifiers(selectedUserIds, tenantId);
    if (resolvedIds.length === 0 && selectedUserIds.length > 0) {
      // All identifiers were synthetic (e.g. SYSTEM) – nothing to create
      throw new BadRequestException("No valid user identifiers provided.");
    }
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const allMembers = Array.from(new Set([creatorId, ...resolvedIds]));
    if (allMembers.length < 2) {
      throw new BadRequestException("A conversation needs at least 2 members.");
    }
    for (const uid of allMembers) {
      if (!uuidV4.test(uid)) {
        throw new BadRequestException(`Invalid userId format: ${uid}`);
      }
    }
    // Validate all members belong to same tenant (prevents FK 500 and cross-tenant leak)
    const users = await this.userRepository.find({
      where: { id: In(allMembers) },
      select: ["id", "tenant_id"] as any,
      relations: ["roles"],
    });
    if (users.length !== allMembers.length) {
      const found = new Set(users.map((u) => u.id));
      const missing = allMembers.filter((id) => !found.has(id));
      throw new BadRequestException(`User(s) not found: ${missing.join(", ")}`);
    }
    const isSuperAdmin = (u: any): boolean =>
      Array.isArray(u.roles) &&
      u.roles.some((r: any) => r.name === Role.SuperAdmin);
    const crossTenant = users.find((u) => {
      if ((u.tenant_id ?? null) === tenantId) return false;
      // SuperAdmins bridge tenant boundaries in support dispatches. This is
      // intentionally restricted: the caller (createSupportConversation) only
      // grants the flag after loading the SuperAdmin with its roles relation.
      if (options?.allowSuperAdminMembers && isSuperAdmin(u)) return false;
      return true;
    });
    if (crossTenant) {
      throw new ForbiddenException(
        "All conversation members must belong to the same tenant.",
      );
    }

    // Check if an exact DIRECT conversation already exists to prevent duplicates
    if (allMembers.length === 2) {
      // Find all conversations containing creator
      const creatorConvs = await this.memberRepository.find({
        where: { user_id: creatorId },
        relations: ["conversation", "conversation.members"],
      });
      const targetId = allMembers.find((id) => id !== creatorId);

      const existing = creatorConvs.find(
        (m) =>
          m.conversation?.type === "DIRECT" &&
          m.conversation.members?.some((mem) => mem.user_id === targetId),
      );

      if (existing) {
        return existing.conversation; // Return existing direct chat
      }
    }

    // Creation — use manager transaction without extra DataSource injection
    const queryRunner = this.conversationRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const conv = queryRunner.manager.getRepository(ConversationEntity).create({
        tenant_id: tenantId,
        type: allMembers.length === 2 ? "DIRECT" : "GROUP",
        name: name || undefined,
      });
      const savedConv = await queryRunner.manager.getRepository(ConversationEntity).save(conv);
      const members = allMembers.map((userId) =>
        queryRunner.manager.getRepository(ConversationMemberEntity).create({
          conversation_id: savedConv.id,
          user_id: userId,
          // tenant_id is NOT NULL (multi-tenancy hardening) and is scoped to
          // the conversation's tenant so member rows stay inside the schema boundary.
          tenant_id: savedConv.tenant_id,
        }),
      );
      await queryRunner.manager.getRepository(ConversationMemberEntity).save(members);
      await queryRunner.commitTransaction();
      const full = await this.conversationRepository.findOne({
        where: { id: savedConv.id },
        relations: ["members", "members.user"],
      });
      if (!full) throw new BadRequestException("Failed to load created conversation");
      return full;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.memberRepository.update(
      { conversation_id: conversationId, user_id: userId },
      { last_read_at: new Date() },
    );
  }
}
