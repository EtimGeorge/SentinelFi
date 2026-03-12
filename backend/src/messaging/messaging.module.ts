import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessagingService } from "./messaging.service";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingController } from "./messaging.controller";
import { MessageEntity } from "./entities/message.entity";
import { ConversationEntity } from "./entities/conversation.entity";
import { ConversationMemberEntity } from "./entities/conversation-member.entity";
import { UserEntity } from "../auth/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageEntity, ConversationEntity, ConversationMemberEntity, UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MessagingService, MessagingGateway],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
