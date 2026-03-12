import { Injectable, Logger, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
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
  async createSupportConversation(userId: string, tenantId: string, subject: string, description: string): Promise<ConversationEntity> {
    // 1. Find a SuperAdmin to handle this request
    const superAdmin = await this.userRepository.findOne({
      where: { roles: { name: Role.SuperAdmin } as any },
      relations: ['roles']
    });

    if (!superAdmin) {
      throw new BadRequestException("No available support staff found. Please try again later.");
    }

    // 2. Create the conversation
    const conversation = await this.createConversation(userId, [superAdmin.id], tenantId, `PRIORITY: ${subject}`);

    // 3. Inject the initial context message
    const initialContent = `--- PRIORITY SUPPORT DISPATCH ---\nSubject: ${subject}\n\nDescription: ${description}`;
    
    await this.saveMessage({
      senderId: userId,
      conversationId: conversation.id,
      content: initialContent,
      tenantId: tenantId,
      metadata: { is_support: true, subject }
    });

    return conversation;
  }

  async saveMessage(data: { 
    senderId: string, 
    conversationId: string, 
    content: string, 
    tenantId: string,
    metadata?: any
  }): Promise<MessageEntity> {
    const isMember = await this.memberRepository.findOne({
      where: { conversation_id: data.conversationId, user_id: data.senderId }
    });
    
    if (!isMember) {
      throw new ForbiddenException("You are not a member of this conversation.");
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
      last_activity_at: new Date()
    });
    
    // Fetch the fully populated message to return
    return this.messageRepository.findOneOrFail({
      where: { id: savedMessage.id },
      relations: ["sender"]
    });
  }

  async getConversationsForUser(userId: string, tenantId: string): Promise<ConversationEntity[]> {
    const userMemberships = await this.memberRepository.find({
      where: { user_id: userId },
    });
    
    if (!userMemberships.length) return [];
    
    const convIds = userMemberships.map(m => m.conversation_id);
    
    return await this.conversationRepository.find({
      where: { id: In(convIds), tenant_id: tenantId },
      relations: ["members", "members.user"],
      order: { last_activity_at: "DESC" }
    });
  }

  async getChatHistory(conversationId: string, limit: number = 50): Promise<MessageEntity[]> {
    return await this.messageRepository.find({
      where: { conversation_id: conversationId },
      order: { created_at: "ASC" },
      take: limit,
      relations: ["sender"]
    });
  }
  
  async createConversation(creatorId: string, selectedUserIds: string[], tenantId: string, name?: string): Promise<ConversationEntity> {
    const allMembers = Array.from(new Set([creatorId, ...selectedUserIds]));
    if (allMembers.length < 2) {
      throw new BadRequestException("A conversation needs at least 2 members.");
    }
    
    // Check if an exact DIRECT conversation already exists to prevent duplicates
    if (allMembers.length === 2) {
      // Find all conversations containing creator
      const creatorConvs = await this.memberRepository.find({ where: { user_id: creatorId }, relations: ["conversation", "conversation.members"] });
      const targetId = allMembers.find(id => id !== creatorId);
      
      const existing = creatorConvs.find(m => 
        m.conversation.type === "DIRECT" && 
        m.conversation.members.some(mem => mem.user_id === targetId)
      );
      
      if (existing) {
        return existing.conversation; // Return existing direct chat
      }
    }
    
    const conv = this.conversationRepository.create({
      tenant_id: tenantId,
      type: allMembers.length === 2 ? "DIRECT" : "GROUP",
      name: name || undefined,
    });
    
    const savedConv = await this.conversationRepository.save(conv);
    
    const members = allMembers.map(userId => this.memberRepository.create({
      conversation_id: savedConv.id,
      user_id: userId
    }));
    
    await this.memberRepository.save(members);
    
    return this.conversationRepository.findOneOrFail({
      where: { id: savedConv.id },
      relations: ["members", "members.user"]
    });
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await this.memberRepository.update(
      { conversation_id: conversationId, user_id: userId },
      { last_read_at: new Date() }
    );
  }
}
