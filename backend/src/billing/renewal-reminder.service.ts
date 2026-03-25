import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SubscriptionEntity, SubscriptionStatus, BillingCycle } from './entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { PLAN_PRICING } from './billing.service';

@Injectable()
export class RenewalReminderService {
  private readonly logger = new Logger(RenewalReminderService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Runs daily at 08:00 UTC.
   * Sends 7-day renewal reminders and 1-day renewal reminders to active subscribers.
   */
  @Cron('0 8 * * *', { name: 'renewal-reminders', timeZone: 'UTC' })
  async sendRenewalReminders(): Promise<void> {
    this.logger.log('[CronJob] Running renewal reminder scan...');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://sentinelfi.com');

    const today = new Date();

    // Send 7-day warnings
    await this.sendRemindersForDaysOut(7, 'in 7 days', today, frontendUrl);

    // Send 1-day warnings
    await this.sendRemindersForDaysOut(1, 'tomorrow', today, frontendUrl);

    this.logger.log('[CronJob] Renewal reminder scan complete.');
  }

  /**
   * Runs daily at 09:00 UTC.
   * Sends trial expiry warnings (3 days before trial ends).
   */
  @Cron('0 9 * * *', { name: 'trial-expiry-warnings', timeZone: 'UTC' })
  async sendTrialExpiryWarnings(): Promise<void> {
    this.logger.log('[CronJob] Running trial expiry warning scan...');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://sentinelfi.com');

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trialsSoonExpiring = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIALING,
        trial_ends_at: Between(startOfDay, endOfDay),
      },
    });

    this.logger.log(`[CronJob] Found ${trialsSoonExpiring.length} trial(s) expiring in 3 days.`);

    for (const sub of trialsSoonExpiring) {
      if (!sub.admin_email) continue;
      try {
        await this.emailService.sendTrialExpiryWarningEmail(sub.admin_email, {
          firstName: sub.admin_first_name || sub.company_name || 'Valued Client',
          companyName: sub.company_name!,
          trialEndDate: sub.trial_ends_at!.toDateString(),
          pricingUrl: `${frontendUrl}/landing/pricing`,
        });
        this.logger.log(`[CronJob] Trial expiry warning sent to ${sub.admin_email}`);
      } catch (err: any) {
        this.logger.error(`[CronJob] Failed to send trial expiry warning to ${sub.admin_email}: ${err.message}`);
      }
    }
  }

  /**
   * Runs daily at 07:30 UTC.
   * Automatically marks expired subscriptions as EXPIRED.
   */
  @Cron('30 7 * * *', { name: 'expire-subscriptions', timeZone: 'UTC' })
  async expireSubscriptions(): Promise<void> {
    const now = new Date();
    const result = await this.subscriptionRepository
      .createQueryBuilder()
      .update(SubscriptionEntity)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('status IN (:...statuses)', { statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] })
      .andWhere('current_period_end < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.warn(`[CronJob] Expired ${result.affected} subscription(s).`);
    }
  }

  private async sendRemindersForDaysOut(
    daysOut: number,
    daysLabel: string,
    today: Date,
    frontendUrl: string,
  ): Promise<void> {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysOut);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const subscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        current_period_end: Between(startOfDay, endOfDay),
      },
    });

    this.logger.log(`[CronJob] Found ${subscriptions.length} subscription(s) expiring in ${daysOut} day(s).`);

    for (const sub of subscriptions) {
      if (!sub.admin_email) continue;

      const planConfig = PLAN_PRICING[sub.plan as keyof typeof PLAN_PRICING];
      const renewalAmountUsd = Number(sub.amount_usd) || (planConfig?.amount_usd ?? 0);

      try {
        await this.emailService.sendRenewalReminderEmail(sub.admin_email, {
          firstName: sub.admin_first_name || sub.company_name || 'Valued Client',
          companyName: sub.company_name!,
          plan: sub.plan,
          billingCycle: sub.billing_cycle,
          daysRemaining: daysOut,
          daysLabel,
          expiryDate: sub.current_period_end!.toDateString(),
          renewalAmountFormatted: renewalAmountUsd.toFixed(2),
          renewUrl: `${frontendUrl}/landing/pricing`,
        });
        this.logger.log(`[CronJob] ${daysOut}-day renewal reminder → ${sub.admin_email}`);
      } catch (err: any) {
        this.logger.error(`[CronJob] Failed to send reminder to ${sub.admin_email}: ${err.message}`);
      }
    }
  }
}
