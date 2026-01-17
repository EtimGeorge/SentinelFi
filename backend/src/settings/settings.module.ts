import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsEntity } from './settings.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([SettingsEntity]), EmailModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
