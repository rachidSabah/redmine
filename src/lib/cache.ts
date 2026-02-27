/**
 * Caching Service for Synchro PM
 * In-memory cache with TTL support (use Redis in production)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * In-memory cache implementation
 * For production with multiple instances, use Redis
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }
}

// Singleton instance
const memoryCache = new MemoryCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  memoryCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Cache Service with decorators and utilities
 */
export class CacheService {
  private prefix: string;

  constructor(prefix: string = "") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  /**
   * Get or set a value (compute if missing)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    const fullKey = this.getKey(key);
    const cached = memoryCache.get<T>(fullKey);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    memoryCache.set(fullKey, value, ttlMs);
    return value;
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    return memoryCache.get<T>(this.getKey(key));
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, value: T, ttlMs: number = 60000): void {
    memoryCache.set(this.getKey(key), value, ttlMs);
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return memoryCache.delete(this.getKey(key));
  }

  /**
   * Invalidate all keys matching pattern
   */
  invalidatePattern(pattern: string): number {
    return memoryCache.deletePattern(this.getKey(pattern));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return memoryCache.getStats();
  }
}

// Pre-configured cache instances
export const caches = {
  // User data cache - 5 minutes
  users: new CacheService("users"),
  
  // Organization cache - 10 minutes
  organizations: new CacheService("orgs"),
  
  // Project cache - 5 minutes
  projects: new CacheService("projects"),
  
  // Ticket cache - 2 minutes
  tickets: new CacheService("tickets"),
  
  // Dashboard stats - 1 minute
  dashboard: new CacheService("dashboard"),
  
  // Search results - 30 seconds
  search: new CacheService("search"),
  
  // Wiki pages - 5 minutes
  wiki: new CacheService("wiki"),
  
  // API responses - 1 minute
  api: new CacheService("api"),
};

// Cache TTL presets
export const CacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 60 * 1000,     // 1 minute
  STANDARD: 5 * 60 * 1000, // 5 minutes
  LONG: 10 * 60 * 1000,  // 10 minutes
  HOUR: 60 * 60 * 1000,  // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 1 day
} as const;

/**
 * Decorator for caching async function results
 */
export function cached(
  cacheName: keyof typeof caches,
  keyFn: (...args: any[]) => string,
  ttl: number = CacheTTL.STANDARD
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = caches[cacheName];

    descriptor.value = async function (...args: any[]) {
      const key = keyFn(...args);
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  invalidateUser(userId: string) {
    caches.users.delete(userId);
    caches.api.invalidatePattern(`user:${userId}:*`);
  },

  invalidateOrganization(orgId: string) {
    caches.organizations.delete(orgId);
    caches.projects.invalidatePattern(`org:${orgId}:*`);
    caches.api.invalidatePattern(`org:${orgId}:*`);
  },

  invalidateProject(projectId: string) {
    caches.projects.delete(projectId);
    caches.tickets.invalidatePattern(`project:${projectId}:*`);
    caches.api.invalidatePattern(`project:${projectId}:*`);
  },

  invalidateTicket(ticketId: string, projectId?: string) {
    caches.tickets.delete(ticketId);
    if (projectId) {
      caches.projects.delete(projectId);
    }
    caches.dashboard.invalidatePattern("*");
  },

  invalidateDashboard() {
    caches.dashboard.clear();
  },

  clearAll() {
    Object.values(caches).forEach(c => c.delete?.(""));
    memoryCache.clear();
  },
};

// Export singleton
export const cacheService = new CacheService();
