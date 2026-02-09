import { UserPayload } from "@shared/types/user";

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
 */
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

  async set(key: string, value: UserPayload, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}