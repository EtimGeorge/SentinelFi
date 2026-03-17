import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { EmailProvider, EmailOptions } from './interfaces/email-provider.interface';
import { SmtpProvider } from './providers/smtp.provider';
import { ResendProvider } from './providers/resend.provider';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private provider!: EmailProvider;
  private readonly templatesDir = path.join(process.cwd(), 'src/email/templates');
  private layoutTemplate!: Handlebars.TemplateDelegate;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeProvider();
    this.initializeTemplates();
  }

  private initializeProvider() {
    const providerType = this.configService.get<string>('EMAIL_PROVIDER', 'resend').toLowerCase();

    if (providerType === 'smtp') {
      this.provider = new SmtpProvider(this.configService);
    } else {
      this.provider = new ResendProvider(this.configService);
    }

    this.logger.log(`Email Service initialized with [${this.provider.getName()}] provider.`);
  }

  private initializeTemplates() {
    try {
      const layoutPath = path.join(this.templatesDir, 'layout.hbs');
      if (fs.existsSync(layoutPath)) {
        const source = fs.readFileSync(layoutPath, 'utf8');
        this.layoutTemplate = Handlebars.compile(source);
      } else {
        this.logger.warn('Email layout template not found. Using raw bodies.');
      }
    } catch (err) {
      this.logger.error('Failed to initialize email templates:', err);
    }
  }

  /**
   * Sends a standardized email using the configured provider.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // Developer Preview Guard
    if (this.configService.get<string>('NODE_ENV') === 'development' && 
        this.configService.get<boolean>('EMAIL_PREVIEW_ONLY', true)) {
      this.logger.warn(`[EMAIL PREVIEW] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.provider.sendEmail({ to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send email via ${this.provider.getName()}:`, error);
      throw error;
    }
  }

  /**
   * Sends an email using a Handlebars template.
   */
  async sendTemplatedEmail(
    to: string, 
    subject: string, 
    templateName: string, 
    context: any
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const source = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(source);
    
    // Render the body
    const bodyHtml = template(context);

    // Wrap in layout if available
    const finalHtml = this.layoutTemplate 
      ? this.layoutTemplate({ 
          body: bodyHtml, 
          subject, 
          year: new Date().getFullYear(),
          ...context 
        })
      : bodyHtml;

    await this.sendEmail(to, subject, finalHtml);
  }
}