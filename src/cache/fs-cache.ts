import fs from 'fs/promises';
import path from 'path';
import { CacheStrategy } from '../types';

export class FsCache implements CacheStrategy {
  private cacheDir: string;
  private defaultTTL: number;

  constructor(cacheDir = './cache', defaultTTL = 3600000) {
    this.cacheDir = cacheDir;
    this.defaultTTL = defaultTTL;
    fs.mkdir(cacheDir, { recursive: true }).catch(() => {});
  }

  async get(key: string): Promise<string | null> {
    const filePath = path.join(this.cacheDir, key);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const { value, expires } = JSON.parse(data);
      if (expires > Date.now()) {
        return value;
      }
      await fs.unlink(filePath);
    } catch (error) {}
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const filePath = path.join(this.cacheDir, key);
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    await fs.writeFile(filePath, JSON.stringify({ value, expires }), 'utf-8');
  }
}
