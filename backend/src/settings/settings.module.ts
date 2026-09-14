import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { SettingsEntity } from "./settings.entity";
import { EmailModule } from "../email/email.module";
import { UserEntity } from "../auth/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SettingsEntity, UserEntity]), EmailModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
