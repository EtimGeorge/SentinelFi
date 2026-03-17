import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailOptions, EmailProvider } from '../interfaces/email-provider.interface';

export class SmtpProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  getName(): string {
    return 'SMTP';
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const from = options.from || this.configService.get<string>('EMAIL_FROM');
    
    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    
    this.logger.log(`Email sent via SMTP to ${options.to}`);
  }
}
