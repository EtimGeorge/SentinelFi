import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('EMAIL_FROM');
    if (!from) {
        this.logger.error('EMAIL_FROM environment variable not set.');
        throw new Error('Email service is not configured.');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error('Failed to send email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`Email sent successfully to ${to}`, data);
    } catch (error) {
      this.logger.error('An unexpected error occurred while sending email:', error);
      throw error;
    }
  }
}