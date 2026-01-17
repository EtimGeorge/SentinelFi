import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from './settings.entity';
import { UpdateSettingsDto } from './dto/settings.dto';
import { EmailService } from '../email/email.service'; // Import EmailService

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly settingsId = 1; // Fixed ID for the single settings row

  constructor(
    @InjectRepository(SettingsEntity)
    private settingsRepository: Repository<SettingsEntity>,
    private readonly emailService: EmailService, // Inject EmailService
  ) {}

  async getSettings(): Promise<SettingsEntity> {
    let settings = await this.settingsRepository.findOne({ where: { id: this.settingsId } });
    if (!settings) {
      this.logger.log('No settings found, creating default settings.');
      settings = this.settingsRepository.create({ id: this.settingsId });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto): Promise<SettingsEntity> {
    let settings = await this.getSettings();
    settings = this.settingsRepository.merge(settings, updateSettingsDto);
    await this.settingsRepository.save(settings);
    this.logger.log('Global settings updated.');
    return settings;
  }

  async sendTestEmail(to: string): Promise<void> {
    this.logger.log(`Attempting to send test email to ${to} via Resend...`);

    try {
      const subject = 'Test Email from SentinelFi';
      const html = '<h1>Welcome to SentinelFi!</h1><p>This is a test email sent from the SentinelFi platform using Resend. If you received this, your email configuration is working correctly.</p>';
      await this.emailService.sendEmail(to, subject, html);
      this.logger.log(`Test email sent to ${to} successfully.`);
    } catch (error) {
        if (error instanceof Error) {
            this.logger.error(`Failed to send test email to ${to}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to send test email: ${error.message}`);
        }
        this.logger.error(`An unknown error occurred while sending test email to ${to}`, error);
        throw new InternalServerErrorException('An unknown error occurred while sending test email.');
    }
  }
}
