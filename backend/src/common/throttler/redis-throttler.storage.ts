import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ThrottlerStorage,
  ThrottlerStorageService,
} from "@nestjs/throttler";
import Redis from "ioredis";

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage["increment"]>
>;

/**
 * Atomically increments the hit counter and, on the first hit of a window, sets
 * the TTL. Returns [hits, pttlMillis]. Running it as a script keeps INCR and
 * PEXPIRE from interleaving across API instances.
 */
const INCR_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { hits, redis.call('PTTL', KEYS[1]) }
`;

/**
 * Redis-backed ThrottlerStorage.
 *
 * WHY: the default @nestjs/throttler storage keeps counters in a process-local
 * Map. With more than one API instance — which is exactly what you get the
 * moment you scale — each instance throttles independently, so the effective
 * limit is `limit x instances`. This shares the window across all instances.
 *
 * FAIL-OPEN: if Redis is configured but unreachable, we delegate to the stock
 * in-memory storage rather than rejecting every request. Availability of the
 * API is a higher priority than perfectly distributed limiting (same posture as
 * the cache module, SEC-P1-01). The degradation is logged once per call site.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly fallback = new ThrottlerStorageService();
  private readonly redis: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>("REDIS_URL") ||
      `redis://${this.configService.get<string>("REDIS_HOST") || "localhost"}:${this.configService.get<string>("REDIS_PORT") || 6379}`;

    if (!redisUrl) {
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: false,
        // Fail fast (into the fallback) instead of queueing forever when down.
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });
      this.redis.on("error", (err) => {
        this.logger.warn(
          `Throttler Redis connection error, using in-memory fallback: ${err.message}`,
        );
      });
    } catch (error) {
      this.logger.warn(
        `Throttler Redis init failed, using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.redis = null;
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.redis) {
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }

    const storageKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `${storageKey}:block`;

    try {
      // If a block is active, keep rejecting with the remaining block time.
      const blockPttl = await this.redis.pttl(blockKey);
      if (blockPttl > 0) {
        const hitsPttl = await this.redis.pttl(storageKey);
        return {
          totalHits: limit + 1,
          timeToExpire: Math.ceil(Math.max(hitsPttl, 0) / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockPttl / 1000),
        };
      }

      const result = (await this.redis.eval(
        INCR_SCRIPT,
        1,
        storageKey,
        String(ttl),
      )) as [number, number];
      const hits = Number(result[0]);
      const pttl = Number(result[1]);

      let isBlocked = false;
      let timeToBlockExpire = 0;

      if (hits > limit) {
        if (blockDuration > 0) {
          await this.redis.set(blockKey, "1", "PX", blockDuration, "NX");
          const bp = await this.redis.pttl(blockKey);
          timeToBlockExpire = Math.ceil(Math.max(bp, 0) / 1000);
        }
        isBlocked = true;
      }

      return {
        totalHits: hits,
        timeToExpire: Math.ceil(Math.max(pttl, 0) / 1000),
        isBlocked,
        timeToBlockExpire,
      };
    } catch (error) {
      this.logger.warn(
        `Throttler Redis command failed, using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
