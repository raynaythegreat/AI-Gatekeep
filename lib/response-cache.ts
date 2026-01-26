import { SecureStorage } from "@/lib/secureStorage";

export interface CacheEntry<T> {
  timestamp: number;
  data: T;
  ttl: number;
  key: string;
  tags: string[];
}

export interface CacheConfig {
  ttl?: number; // milliseconds
  maxSizeMB?: number;
  persistent?: boolean; // store to disk
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  size: number; // bytes
  keys: string[];
}

export class ResponseCache {
  private inMemoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    deletes: 0,
    size: 0,
    keys: [],
  };
  private readonly cacheKeyPrefix = "athena-response-cache-";
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSizeMB = 100; // 100MB
  private readonly maxInMemoryEntries = 1000;

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached data or undefined if not found/expired
   */
  async get<T>(key: string): Promise<T | undefined> {
    const now = Date.now();
    const entry = this.inMemoryCache.get(key);

    // If in memory and not expired, return it
    if (entry && now - entry.timestamp < entry.ttl) {
      this.stats.hits++;
      return entry.data;
    }

    // Try to load from disk if persistent cache
    try {
      const diskEntry = await this.loadFromDisk<T>(key);
      if (diskEntry && now - diskEntry.timestamp < diskEntry.ttl) {
        // Restore to memory
        this.inMemoryCache.set(key, diskEntry);
        this.stats.hits++;
        return diskEntry.data;
      }
    } catch (error) {
      // Disk cache might not be available (e.g., in Electron without access)
      console.debug("Failed to load from disk cache:", error);
    }

    // Cache miss
    this.stats.misses++;
    return undefined;
  }

  /**
   * Store a value in cache
   * @param key Cache key
   * @param data Data to cache
   * @param config Optional cache configuration
   */
  async set<T>(key: string, data: T, config?: CacheConfig): Promise<void> {
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
      ttl: config?.ttl ?? this.defaultTTL,
      key,
      tags: config?.tags ?? [],
    };

    // Check memory limit
    if (this.inMemoryCache.size >= this.maxInMemoryEntries) {
      // Remove oldest 20 entries
      const keys = Array.from(this.inMemoryCache.keys());
      keys.slice(0, 20).forEach(k => {
        const entry = this.inMemoryCache.get(k);
        if (entry) {
          this.stats.size -= this.estimateEntrySize(entry);
          this.inMemoryCache.delete(k);
        }
      });
    }

    // Store in memory
    this.inMemoryCache.set(key, entry);
    this.stats.writes++;
    this.stats.size += this.estimateEntrySize(entry);
    this.updateKeysList();

    // Store to disk if persistent
    if (config?.persistent) {
      try {
        await this.saveToDisk(key, entry);
      } catch (error) {
        console.debug("Failed to save to disk cache:", error);
      }
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    if (this.inMemoryCache.has(key)) {
      const entry = this.inMemoryCache.get(key)!;
      this.stats.size -= this.estimateEntrySize(entry);
      this.inMemoryCache.delete(key);
      this.updateKeysList();
      this.stats.deletes++;
    }

    // Also delete from disk
    try {
      await this.deleteFromDisk(key);
    } catch (error) {
      console.debug("Failed to delete from disk cache:", error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear(tags?: string[]): Promise<void> {
    if (tags && tags.length > 0) {
      // Clear only entries with matching tags
      for (const [key, entry] of Array.from(this.inMemoryCache.entries())) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          await this.delete(key);
        }
      }
    } else {
      // Clear everything
      this.inMemoryCache.clear();
      this.stats = {
        hits: 0,
        misses: 0,
        writes: 0,
        deletes: 0,
        size: 0,
        keys: [],
      };
      
      try {
        await this.clearAllFromDisk();
      } catch (error) {
        console.debug("Failed to clear disk cache:", error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Estimate memory size of a cache entry
   * @param entry Cache entry
   * @returns Estimated size in bytes
   */
  private estimateEntrySize(entry: CacheEntry<any>): number {
    try {
      return JSON.stringify(entry).length * 2; // Rough estimate - 2 bytes per char
    } catch {
      return 1000; // Fallback: 1KB
    }
  }

  /**
   * Update stats.keys with current cache keys
   */
  private updateKeysList(): void {
    this.stats.keys = Array.from(this.inMemoryCache.keys());
  }

  /**
   * Load from disk storage (Electron-specific if available)
   * @param key Cache key
   * @returns Disk entry or undefined
   */
  private async loadFromDisk<T>(key: string): Promise<CacheEntry<T> | undefined> {
    if (typeof window === "undefined" || !(window as any).electronAPI) {
      return undefined;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      const serialized = await electronAPI.storeGet(this.cacheKeyPrefix + key);
      if (!serialized) return undefined;

      const entry = JSON.parse(serialized) as CacheEntry<T>;
      return entry;
    } catch (error) {
      console.debug("Failed to load from disk:", error);
      return undefined;
    }
  }

  /**
   * Save to disk storage (Electron-specific)
   * @param key Cache key
   * @param entry Cache entry
   */
  private async saveToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (typeof window === "undefined" || !(window as any).electronAPI) {
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      const serialized = JSON.stringify(entry);
      await electronAPI.storeSet(this.cacheKeyPrefix + key, serialized);
    } catch (error) {
      console.debug("Failed to save to disk:", error);
    }
  }

  /**
   * Delete from disk storage
   * @param key Cache key
   */
  private async deleteFromDisk(key: string): Promise<void> {
    if (typeof window === "undefined" || !(window as any).electronAPI) {
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      await electronAPI.storeDelete(this.cacheKeyPrefix + key);
    } catch (error) {
      console.debug("Failed to delete from disk:", error);
    }
  }

  /**
   * Clear all entries from disk storage
   */
  private async clearAllFromDisk(): Promise<void> {
    if (typeof window === "undefined" || !(window as any).electronAPI) {
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      const allKeys = await electronAPI.storeGetAllKeys() || [];
      
      for (const key of allKeys) {
        if (key.startsWith(this.cacheKeyPrefix)) {
          await electronAPI.storeDelete(key);
        }
      }
    } catch (error) {
      console.debug("Failed to clear disk cache:", error);
    }
  }

  /**
   * Get cache key with tags
   * @param baseKey Base cache key
   * @param tags Optional tags to include
   */
  static generateKey(baseKey: string, tags: string[] = []): string {
    if (tags.length === 0) return baseKey;
    const sortedTags = [...tags].sort();
    return `${baseKey}:${sortedTags.join(":")}`;
  }
}

// Singleton instance
let responseCache: ResponseCache | null = null;

export function getResponseCache(): ResponseCache {
  if (!responseCache) {
    responseCache = new ResponseCache();
  }
  return responseCache;
}

// Cache key constants - use these for standardization
export const CACHE_KEYS = {
  MODELS: (provider: string) => `models:${provider}`,
  REPO_STRUCTURE: (repo: string) => `repo:structure:${repo}`,
  REPO_FILES: (repo: string, path?: string) => `repo:files:${path ? `${path}:` : ""}${repo}`,
  DEPLOY_RECOMMENDATION: (repo: string) => `deploy:recommendation:${repo}`,
  STATUS: () => `status`,
  API_KEYS: () => `api-keys`,
} as const;

// Cache configuration presets
export const CACHE_TTLS = {
  LONG: 10 * 60 * 1000, // 10 minutes (models)
  MEDIUM: 5 * 60 * 1000, // 5 minutes (repo data)
  SHORT: 60 * 1000, // 1 minute (status)
  SESSION: Infinity as number, // Until session ends (API keys)
} as const;

// Cache tags for easy invalidation
export const CACHE_TAGS = {
  MODELS: "models",
  REPO: "repo",
  DEPLOY: "deploy",
  STATUS: "status",
} as const;