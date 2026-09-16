import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { AcademyProgressEntity } from "./academy-progress.entity";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(AcademyProgressEntity)
    private readonly progressRepo: Repository<AcademyProgressEntity>,
  ) {}

  // ── Academy progress ledger ──────────────────────────────────────────────

  async getAcademyProgress(
    userId?: string,
    visitorId?: string,
  ): Promise<{ visitorId?: string; ledger: Record<string, unknown> } | null> {
    if (!userId && !visitorId) return null;
    const row = userId
      ? await this.progressRepo.findOneBy({ userId })
      : await this.progressRepo.findOneBy({ visitorId });
    if (!row) return null;
    return {
      ...(row.visitorId ? { visitorId: row.visitorId } : {}),
      ledger: row.ledger ?? {},
    };
  }

  /**
   * Upserts the learner's ledger. One row per identity (user or visitor);
   * a signed-in learner who previously browsed anonymously is folded onto
   * their user row, never duplicated.
   */
  async saveAcademyProgress(
    body: { ledger?: Record<string, unknown> },
    userId?: string,
    visitorId?: string,
  ): Promise<{ status: "ok" | "ignored" }> {
    if (!userId && !visitorId) return { status: "ignored" };
    let row = userId
      ? await this.progressRepo.findOneBy({ userId })
      : await this.progressRepo.findOneBy({ visitorId });

    if (!row) {
      row = this.progressRepo.create({
        userId: userId ?? null,
        visitorId: visitorId ?? null,
        ledger: body.ledger ?? {},
      });
    } else {
      // Authoritative merge: keep the union of lesson keys, prefer newer state.
      const remote = (row.ledger ?? {}) as Record<string, { completedAt?: string }>;
      const incoming = (body.ledger ?? {}) as Record<string, { completedAt?: string }>;
      const merged: Record<string, unknown> = { ...remote };
      for (const [slug, state] of Object.entries(incoming)) {
        const remoteTs = remote[slug]?.completedAt ? Date.parse(remote[slug].completedAt) : 0;
        const incomingTs = state?.completedAt ? Date.parse(state.completedAt) : 0;
        if (incomingTs >= remoteTs) merged[slug] = state;
      }
      row.ledger = merged;
    }

    row.updatedAt = new Date();
    await this.progressRepo.save(row);
    return { status: "ok" };
  }

  async processContactRequest(data: {
    name: string;
    email: string;
    company: string;
    message: string;
    interests: string[];
  }) {
    this.logger.log(
      `Received contact request from ${data.email} (${data.company})`,
    );

    // 1. Send Auto-Response to the Lead
    try {
      await this.emailService.sendTemplatedEmail(
        data.email,
        "SentinelFi | Your Briefing Request has been Transmitted",
        "marketing-auto-response",
        {
          name: data.name,
          company: data.company,
          interests: data.interests.join(", "),
          frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        },
      );
    } catch (err) {
      this.logger.error(`Failed to send auto-response to ${data.email}`, err);
    }

    // 2. Notify internal SentinelFi team (simulated)
    this.logger.log(
      `INTERNAL NOTIFICATION: New high-fidelity lead captured: ${data.name} @ ${data.company}`,
    );

    return {
      status: "success",
      message:
        "Transmission complete. Our governance engineers will reach out shortly.",
    };
  }
}
