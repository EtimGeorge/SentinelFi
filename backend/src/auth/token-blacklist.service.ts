/**
 * TokenBlacklistService — In-memory JWT blacklist with TTL-based eviction.
 *
 * Architecture note: For a single-replica deployment this in-memory store is sufficient.
 * For horizontal scaling (multiple pods), replace the Map with a Redis SET:
 *   await redis.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
 *   const isBlacklisted = await redis.exists(`blacklist:${jti}`);
 *
 * The JTI (JWT ID) claim uniquely identifies each token. We store it until
 * the token's natural expiry time, after which it is automatically evicted.
 */
import { Injectable, Logger } from "@nestjs/common";

interface BlacklistEntry {
  expiresAt: number; // Unix timestamp ms
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly store = new Map<string, BlacklistEntry>();

  // Run cleanup every 10 minutes to free memory
  constructor() {
    setInterval(() => this.evictExpired(), 10 * 60 * 1000);
  }

  /**
   * Adds a token JTI to the blacklist until its expiry time.
   * @param jti   - JWT ID claim from the token payload
   * @param exp   - Token expiry as Unix timestamp in SECONDS (standard JWT format)
   */
  blacklist(jti: string, exp: number): void {
    const expiresAt = exp * 1000; // Convert to ms
    this.store.set(jti, { expiresAt });
    this.logger.debug(
      `[Blacklist] Token ${jti} blacklisted until ${new Date(expiresAt).toISOString()}`,
    );
  }

  /**
   * Returns true if the given JTI is on the blacklist and not yet expired.
   */
  isBlacklisted(jti: string): boolean {
    const entry = this.store.get(jti);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(jti);
      return false;
    }
    return true;
  }

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [jti, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(jti);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.logger.debug(`[Blacklist] Evicted ${evicted} expired entries`);
    }
  }

  /** Returns the current size of the blacklist (for monitoring). */
  get size(): number {
    return this.store.size;
  }
}
