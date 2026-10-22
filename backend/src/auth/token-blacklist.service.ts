/**
 * TokenBlacklistService — JWT revocation list with TTL-based eviction.
 *
 * A token is revoked by storing its JTI until the token's natural expiry, after
 * which the entry is evicted automatically (nothing to check past `exp`).
 *
 * Two backends, chosen at construction based on config + availability:
 *
 *  1. **Redis (distributed)** — used when `NODE_ENV=production` or
 *     `USE_REDIS=true` AND the shared CACHE_MANAGER is present. Revocations are
 *     then visible to *every* backend node, which is the only correct behavior
 *     when running more than one replica behind a load balancer. Without this,
 *     a logout handled by node A leaves node B still accepting the revoked
 *     token until its `exp` — a real (if bounded) auth bypass in a scale-out
 *     deployment.
 *
 *  2. **In-memory Map** — dev default and Redis-down fallback. Correct for a
 *     single replica; entries evicted on a 10-minute sweep.
 *
 * The JTI (JWT ID) claim uniquely identifies each token.
 */
import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";

const BLACKLIST_PREFIX = "jwt_blacklist:";

interface BlacklistEntry {
  expiresAt: number; // Unix timestamp ms
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly store = new Map<string, BlacklistEntry>();
  private readonly redis: Cache | null;
  private readonly distributed: boolean;

  constructor(
    @Optional() @Inject(CACHE_MANAGER) cacheManager?: Cache,
  ) {
    this.redis = cacheManager ?? null;
    this.distributed =
      !!this.redis &&
      (process.env.NODE_ENV === "production" ||
        process.env.USE_REDIS === "true");

    if (this.distributed) {
      this.logger.log(
        "[Blacklist] Using distributed (Redis) token blacklist — revocations are shared across all nodes.",
      );
    } else {
      // Run cleanup every 10 minutes to free memory (in-memory path only).
      setInterval(() => this.evictExpired(), 10 * 60 * 1000).unref?.();
      this.logger.log(
        "[Blacklist] Using in-memory token blacklist (single-node). Set REDIS_URL + USE_REDIS=true (or NODE_ENV=production) to share revocations across replicas.",
      );
    }
  }

  /**
   * Adds a token JTI to the blacklist until its expiry time.
   * @param jti   - JWT ID claim from the token payload
   * @param exp   - Token expiry as Unix timestamp in SECONDS (standard JWT format)
   */
  async blacklist(jti: string, exp: number): Promise<void> {
    const expiresAt = exp * 1000; // Convert to ms
    const ttlSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));

    if (this.distributed && this.redis) {
      try {
        await this.redis.set(`${BLACKLIST_PREFIX}${jti}`, "1", ttlSeconds * 1000);
        this.logger.debug(
          `[Blacklist] (redis) Token ${jti} blacklisted for ${ttlSeconds}s`,
        );
        return;
      } catch (err) {
        // Never drop a revocation because Redis hiccuped: fall through to the
        // in-memory store so at least this node enforces it.
        this.logger.error(
          `[Blacklist] Redis write failed for ${jti}, falling back to in-memory: ${(err as Error).message}`,
        );
      }
    }

    this.store.set(jti, { expiresAt });
    this.logger.debug(
      `[Blacklist] Token ${jti} blacklisted until ${new Date(expiresAt).toISOString()}`,
    );
  }

  /**
   * Returns true if the given JTI is on the blacklist and not yet expired.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    // Always check the local store too: a Redis outage may have routed a
    // revocation here (see blacklist()), and a same-node logout must be honored
    // even if the distributed read fails.
    const local = this.store.get(jti);
    if (local) {
      if (Date.now() > local.expiresAt) {
        this.store.delete(jti);
      } else {
        return true;
      }
    }

    if (this.distributed && this.redis) {
      try {
        const hit = await this.redis.get(`${BLACKLIST_PREFIX}${jti}`);
        return !!hit;
      } catch (err) {
        this.logger.error(
          `[Blacklist] Redis read failed for ${jti}: ${(err as Error).message}`,
        );
        // Fail-closed for revocation checks is the wrong trade (would reject all
        // tokens on a Redis blip); the token-version guard in JwtStrategy still
        // covers security-critical revocation, so degrade to local-only here.
        return false;
      }
    }
    return false;
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

  /** Returns the current size of the local blacklist (for monitoring). */
  get size(): number {
    return this.store.size;
  }
}
