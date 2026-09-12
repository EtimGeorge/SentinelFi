import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { BillingService } from "../billing/billing.service";
import {
  REWARD_REQUIRED_SECONDS,
  MAX_REWARDS_PER_DAY,
  REWARD_SESSION_TTL_SECONDS,
  AdPlacement,
  RewardSession,
} from "./ads.constants";

/**
 * AdsService — owns the VERIFIED rewarded-ad loop.
 *
 * Flow:
 *  1. Frontend: POST /ads/rewarded/start  → { sessionId, requiredSeconds }
 *  2. User watches the provider creative (AdSense/Ad Manager/test).
 *  3. Frontend: POST /ads/rewarded/complete { sessionId } after its countdown.
 *  4. Server checks: session exists, belongs to tenant, unconsumed,
 *     unexpired, and elapsed >= requiredSeconds. Then grants +1 task credit.
 *
 * Why sessions instead of trusting the client?
 * The old `POST /billing/ad-unlock` grants on client word alone — anyone
 * can curl it in a loop for unlimited tasks. Sessions + server clock +
 * single-use tokens + daily caps close that hole.
 *
 * Provider receipts (SSV): when a real rewarded network is plugged in,
 * pass its server-side-verification token as `providerReceipt` and set
 * ADS_SSV_SECRET — verifyProviderReceipt() enforces it. In test mode
 * (no secret configured) the elapsed-time check is the gate.
 */
@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);
  private readonly sessions = new Map<string, RewardSession>();

  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {}

  /** Public, unauthenticated config for the frontend ad loader. Safe to expose. */
  getPublicConfig() {
    const provider = this.configService
      .get<string>("ADS_PROVIDER", "test")
      .toLowerCase();
    return {
      provider, // 'test' | 'adsense' (+ 'admanager' when plugged)
      adsenseClientId:
        this.configService.get<string>("ADSENSE_CLIENT_ID") || null,
      adsenseBannerSlot:
        this.configService.get<string>("ADSENSE_BANNER_SLOT") || null,
      rewardRequiredSeconds: REWARD_REQUIRED_SECONDS,
      maxRewardsPerDay: MAX_REWARDS_PER_DAY,
      adsEnabled:
        this.configService.get<string>("ADS_ENABLED", "true") === "true",
    };
  }

  async startRewardedSession(
    tenantId: string,
    placement: AdPlacement = AdPlacement.REWARDED_TASK_UNLOCK,
  ) {
    if (placement !== AdPlacement.REWARDED_TASK_UNLOCK) {
      throw new BadRequestException("Only task-unlock rewards are supported.");
    }

    this.pruneExpired();

    // Daily cap pre-check (authoritative check also lives in complete step)
    const today = new Date().toISOString().slice(0, 10);
    const activeForTenant = [...this.sessions.values()].filter(
      (s) => s.tenantId === tenantId && !s.consumed,
    );
    if (activeForTenant.length >= 3) {
      throw new BadRequestException(
        "Too many pending ad sessions. Finish or wait for expiry.",
      );
    }

    const now = Date.now();
    const session: RewardSession = {
      id: crypto.randomUUID(),
      tenantId,
      placement,
      requiredSeconds: REWARD_REQUIRED_SECONDS,
      startedAt: now,
      expiresAt: now + REWARD_SESSION_TTL_SECONDS * 1000,
      consumed: false,
    };
    this.sessions.set(session.id, session);

    this.logger.log(
      `[ADS] Reward session started: ${session.id} (tenant ${tenantId})`,
    );
    return {
      sessionId: session.id,
      requiredSeconds: session.requiredSeconds,
      expiresInSeconds: REWARD_SESSION_TTL_SECONDS,
      // Echo the date so the client can show "credits reset daily"
      rewardDate: today,
    };
  }

  async completeRewardedSession(
    tenantId: string,
    sessionId: string,
    providerReceipt?: string,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new BadRequestException("Invalid or unknown ad session.");
    }
    if (session.consumed) {
      throw new BadRequestException("Ad session already redeemed.");
    }
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new BadRequestException("Ad session expired. Start a new one.");
    }

    // Server-clock gate: the reward requires a full watch
    const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
    if (elapsedSeconds < session.requiredSeconds) {
      throw new ForbiddenException(
        `Ad not watched long enough (${Math.floor(elapsedSeconds)}s / ${session.requiredSeconds}s).`,
      );
    }

    // Provider server-side verification (real networks) — enforced only
    // when ADS_SSV_SECRET is configured; otherwise test mode.
    await this.verifyProviderReceipt(providerReceipt);

    session.consumed = true;
    this.sessions.delete(sessionId);

    try {
      const result = await this.billingService.grantAdUnlock(tenantId);
      this.logger.log(
        `[ADS] Reward granted: tenant ${tenantId} → ${result.ad_unlock_credits} credit(s) today`,
      );
      return result;
    } catch (err: any) {
      // Daily cap / plan errors surface as 400s from BillingService
      throw err;
    }
  }

  /**
   * SSV hook for real rewarded networks (Ad Manager / AdinPlay / etc.).
   * They sign a callback/token with a shared secret; we verify it here.
   * Test mode (no ADS_SSV_SECRET): accept — elapsed-time gate applies.
   */
  private async verifyProviderReceipt(
    receipt?: string,
  ): Promise<void> {
    const ssvSecret = this.configService.get<string>("ADS_SSV_SECRET");
    if (!ssvSecret) return; // test / display-only mode
    if (!receipt) {
      throw new ForbiddenException(
        "Provider receipt required for rewarded verification.",
      );
    }
    // HMAC check: provider sends `payload.signature`; shared-secret verify.
    // Concrete format depends on the network — implement per provider docs.
    const [payload, signature] = receipt.split(".");
    if (!payload || !signature) {
      throw new ForbiddenException("Malformed provider receipt.");
    }
    const expected = crypto
      .createHmac("sha256", ssvSecret)
      .update(payload)
      .digest("hex");
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      throw new ForbiddenException("Invalid provider receipt signature.");
    }
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now > s.expiresAt || s.consumed) this.sessions.delete(id);
    }
    // Bound memory: keep at most 5k sessions
    if (this.sessions.size > 5000) {
      const oldest = [...this.sessions.keys()].slice(
        0,
        this.sessions.size - 5000,
      );
      oldest.forEach((id) => this.sessions.delete(id));
    }
  }
}
