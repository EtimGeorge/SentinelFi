import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailService } from "./email.service";
import { EmailController } from "./email.controller";
import { EmailLogEntity } from "./email-log.entity";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EmailLogEntity])],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}