// Serviço de Cache - BRATVACODER
// Suporta Redis (se configurado) ou fallback para memória

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string = "*"): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    if (pattern === "*") return allKeys;
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return allKeys.filter(key => regex.test(key));
  }
}

class RedisCache {
  private client: any;
  private connected: boolean = false;

  async connect(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return false;

    try {
      // @ts-ignore - Redis é opcional e pode não estar instalado
      const redis = await import("redis").catch(() => null);
      if (!redis) {
        console.log("[CACHE] Módulo Redis não instalado, usando cache em memória");
        return false;
      }
      this.client = redis.createClient({ url: redisUrl });
      await this.client.connect();
      this.connected = true;
      console.log("[CACHE] Conectado ao Redis");
      return true;
    } catch (error) {
      console.error("[CACHE] Erro ao conectar Redis:", error instanceof Error ? error.message : "Erro desconhecido");
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Silently fail
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.flushDb();
    } catch {
      // Silently fail
    }
  }

  async keys(pattern: string = "*"): Promise<string[]> {
    if (!this.connected) return [];
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class CacheService {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private useRedis: boolean = false;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
  }

  async init(): Promise<{ type: "redis" | "memory"; status: "connected" }> {
    const redisConnected = await this.redisCache.connect();
    this.useRedis = redisConnected;
    return {
      type: this.useRedis ? "redis" : "memory",
      status: "connected",
    };
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis) {
      return this.redisCache.get<T>(key);
    }
    return this.memoryCache.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    if (this.useRedis) {
      return this.redisCache.set(key, value, ttlSeconds);
    }
    return this.memoryCache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    if (this.useRedis) {
      return this.redisCache.delete(key);
    }
    return this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    if (this.useRedis) {
      return this.redisCache.clear();
    }
    return this.memoryCache.clear();
  }

  async keys(pattern: string = "*"): Promise<string[]> {
    if (this.useRedis) {
      return this.redisCache.keys(pattern);
    }
    return this.memoryCache.keys(pattern);
  }

  getStatus(): { type: "redis" | "memory"; connected: boolean } {
    return {
      type: this.useRedis ? "redis" : "memory",
      connected: true,
    };
  }
}

export const cacheService = new CacheService();
