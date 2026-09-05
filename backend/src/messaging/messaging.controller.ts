import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Patch,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { IsArray, ArrayMinSize, IsUUID, IsOptional, IsString, MaxLength } from "class-validator";
import { MessagingService } from "./messaging.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MessageEntity } from "./entities/message.entity";
import { ConversationEntity } from "./entities/conversation.entity";

class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  userIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

class SupportDispatchDto {
  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;
}

@Controller("messaging")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get("conversations")
  async getConversations(@Req() req: any): Promise<ConversationEntity[]> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    return await this.messagingService.getConversationsForUser(
      userId,
      tenantId,
    );
  }

  @Post("conversations")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createConversation(
    @Req() req: any,
    @Body() body: CreateConversationDto,
  ): Promise<ConversationEntity> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    return await this.messagingService.createConversation(
      userId,
      body.userIds,
      tenantId,
      body.name,
    );
  }

  @Post("support")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async dispatchSupport(
    @Req() req: any,
    @Body() body: SupportDispatchDto,
  ): Promise<ConversationEntity> {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    return await this.messagingService.createSupportConversation(
      userId,
      tenantId,
      body.subject,
      body.description,
    );
  }

  @Get("conversations/:conversationId/history")
  async getHistory(
    @Param("conversationId") conversationId: string,
    @Query("limit") limit?: string,
  ): Promise<MessageEntity[]> {
    return await this.messagingService.getChatHistory(
      conversationId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Patch("conversations/:conversationId/read")
  async markAsRead(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
  ): Promise<{ success: boolean }> {
    await this.messagingService.markConversationAsRead(
      conversationId,
      req.user.id,
    );
    return { success: true };
  }
}
