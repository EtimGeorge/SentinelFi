import {
  Injectable,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { ProcessedWebhookEntity } from "./entities/processed-webhook.entity";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProcessedWebhookEntity)
    private readonly processedWebhookRepository: Repository<ProcessedWebhookEntity>,
  ) {}

  /**
   * Verifies Paystack signature and checks for idempotency.
   */
  async verifyPaystack(rawBody: string, signature: string): Promise<boolean> {
    const secret = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    if (!secret) {
      this.logger.error("PAYSTACK_SECRET_KEY not configured.");
      throw new InternalServerErrorException("Payment configuration error.");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      this.logger.warn("Paystack signature mismatch.");
      throw new ForbiddenException("Invalid signature");
    }

    const event = JSON.parse(rawBody);
    const eventId = event.data?.id || event.id; // Paystack unique event ID

    return this.isNewEvent(eventId, "paystack", event);
  }

  /**
   * Simple check for PayPal idempotency.
   * Note: Real PayPal signature verification requires a more complex handshake
   * or the PayPal SDK, which we will detail in the GUIDE.
   */
  async verifyPaypal(body: any): Promise<boolean> {
    const eventId = body.id; // PayPal unique event ID
    if (!eventId) return true;

    return this.isNewEvent(eventId, "paypal", body);
  }

  private async isNewEvent(
    eventId: string,
    provider: string,
    payload: any,
  ): Promise<boolean> {
    const existing = await this.processedWebhookRepository.findOne({
      where: { gateway_event_id: eventId },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate webhook received from ${provider}: ${eventId}. Skipping.`,
      );
      return false;
    }

    const processed = this.processedWebhookRepository.create({
      gateway_event_id: eventId,
      provider,
      payload,
    });
    await this.processedWebhookRepository.save(processed);

    return true;
  }
}
