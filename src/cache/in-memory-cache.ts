import { CacheStrategy } from '../types';

export class InMemoryCache implements CacheStrategy {
  private cache = new Map<string, { value: string; expires: number }>();
  private defaultTTL: number;

  constructor(defaultTTL = 3600000) {
    // 1 hour default TTL
    this.defaultTTL = defaultTTL;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
    this.cache.delete(key); // Clean up expired entries
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expires });
  }
}
