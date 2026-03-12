import { Controller, Get, Post, Param, Query, Body, UseGuards, Req, Patch, BadRequestException } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MessageEntity } from "./entities/message.entity";
import { ConversationEntity } from "./entities/conversation.entity";

@Controller("messaging")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get("conversations")
  async getConversations(@Req() req: any): Promise<ConversationEntity[]> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    return await this.messagingService.getConversationsForUser(userId, tenantId);
  }

  @Post("conversations")
  async createConversation(
    @Req() req: any,
    @Body() body: { userIds: string[], name?: string }
  ): Promise<ConversationEntity> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    if (!body.userIds || !body.userIds.length) {
      throw new BadRequestException("userIds array is required");
    }
    return await this.messagingService.createConversation(userId, body.userIds, tenantId, body.name);
  }

  @Post("support")
  async dispatchSupport(
    @Req() req: any,
    @Body() body: { subject: string, description: string }
  ): Promise<ConversationEntity> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    if (!body.subject || !body.description) {
      throw new BadRequestException("Subject and description are required for priority dispatch");
    }
    return await this.messagingService.createSupportConversation(userId, tenantId, body.subject, body.description);
  }

  @Get("conversations/:conversationId/history")
  async getHistory(
    @Param("conversationId") conversationId: string,
    @Query("limit") limit?: string
  ): Promise<MessageEntity[]> {
    return await this.messagingService.getChatHistory(conversationId, limit ? parseInt(limit, 10) : 50);
  }

  @Patch("conversations/:conversationId/read")
  async markAsRead(
    @Req() req: any, 
    @Param("conversationId") conversationId: string
  ): Promise<{ success: boolean }> {
    await this.messagingService.markConversationAsRead(conversationId, req.user.id);
    return { success: true };
  }
}
