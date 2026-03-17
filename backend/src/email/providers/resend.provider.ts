import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailOptions, EmailProvider } from '../interfaces/email-provider.interface';

export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY')!);
  }

  getName(): string {
    return 'Resend';
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const from = options.from || this.configService.get<string>('EMAIL_FROM')!;
    
    const { data, error } = await this.resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      throw new Error(`Resend provider error: ${error.message}`);
    }

    this.logger.log(`Email sent via Resend to ${options.to}. ID: ${data?.id}`);
  }
}
