import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private readonly emailService: EmailService) {}

  async processContactRequest(data: {
    name: string;
    email: string;
    company: string;
    message: string;
    interests: string[];
  }) {
    this.logger.log(`Received contact request from ${data.email} (${data.company})`);

    // 1. Send Auto-Response to the Lead
    try {
      await this.emailService.sendTemplatedEmail(
        data.email,
        'SentinelFi | Your Briefing Request has been Transmitted',
        'marketing-auto-response',
        {
          name: data.name,
          company: data.company,
          interests: data.interests.join(', '),
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      );
    } catch (err) {
      this.logger.error(`Failed to send auto-response to ${data.email}`, err);
    }

    // 2. Notify internal SentinelFi team (simulated)
    this.logger.log(`INTERNAL NOTIFICATION: New high-fidelity lead captured: ${data.name} @ ${data.company}`);

    return {
      status: 'success',
      message: 'Transmission complete. Our governance engineers will reach out shortly.',
    };
  }
}
