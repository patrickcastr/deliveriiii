// Lightweight Redis wrapper with in-memory fallback for dev environments
import Redis from 'ioredis';

type TTLStoreValue = { value: string; expiresAt?: number };

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX' | 'PX', ttl?: number): Promise<'OK'>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ping(): Promise<string>;
}

class MemoryRedis implements RedisLike {
  private store = new Map<string, TTLStoreValue>();

  private purgeIfExpired(key: string) {
    const item = this.store.get(key);
    if (!item) return;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    this.purgeIfExpired(key);
    const v = this.store.get(key);
    return v ? v.value : null;
  }

  async set(key: string, value: string, mode?: 'EX' | 'PX', ttl?: number): Promise<'OK'> {
    const rec: TTLStoreValue = { value };
    if (mode && ttl && ttl > 0) {
      const ms = mode === 'PX' ? ttl : ttl * 1000;
      rec.expiresAt = Date.now() + ms;
    }
    this.store.set(key, rec);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const had = this.store.delete(key);
    return had ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    this.purgeIfExpired(key);
    const v = await this.get(key);
    const n = (v ? Number(v) : 0) + 1;
    await this.set(key, String(n));
    return n;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, item);
    return 1;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
}

export function createRedis(url?: string | null): RedisLike {
  // If no URL provided, prefer in-memory fallback for local dev
  if (!url) return new MemoryRedis();

  try {
    const client = new (Redis as any)(url, {
      // Be resilient in dev: don't crash on connection problems
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    // best-effort connect in background; ignore failures
    client.on('error', () => {
      /* no-op: avoid crashing in dev */
    });
    // Start connecting but don't await
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    client.connect?.();
    return client as unknown as RedisLike;
  } catch {
    // Fallback to memory if ioredis fails to construct
    return new MemoryRedis();
  }
}
