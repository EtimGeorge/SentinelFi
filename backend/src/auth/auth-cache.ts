import { UserPayload } from "@shared/types/user";
import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

/**
 * Pluggable Cache Interface for Auth Metadata.
 * Allows switching between In-Memory, Redis, etc.
 */
export interface IAuthCache {
  get(key: string): Promise<UserPayload | null>;
  set(key: string, value: UserPayload, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Simple In-Memory implementation of IAuthCache.
 * Best for local development without Redis.
 */
@Injectable()
export class InMemoryAuthCache implements IAuthCache {
  private cache = new Map<string, { data: UserPayload; expires: number }>();

  async get(key: string): Promise<UserPayload | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async set(
    key: string,
    value: UserPayload,
    ttlSeconds: number,
  ): Promise<void> {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

/**
 * Redis implementation of IAuthCache.
 * Required for enterprise scaling (10,000+ users) across multiple backend nodes.
 */
@Injectable()
export class RedisAuthCache implements IAuthCache {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(key: string): Promise<UserPayload | null> {
    const result = await this.cacheManager.get<UserPayload>(key);
    return result || null;
  }

  async set(
    key: string,
    value: UserPayload,
    ttlSeconds: number,
  ): Promise<void> {
    // TTL is in seconds for redis-store
    await this.cacheManager.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
