/**
 * Performance cache implementation for skill registry and execution engine
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  enableStats: boolean;
}

/**
 * LRU Cache with TTL support for performance optimization
 */
export class PerformanceCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder = new Map<K, number>();
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private accessCounter = 0;

  constructor(private config: CacheConfig) {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: config.maxSize,
      hitRate: 0
    };

    // Start cleanup timer
    if (config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, config.cleanupInterval);
    }
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss();
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.recordMiss();
      return undefined;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    
    this.recordHit();
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<V> = {
      value,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.updateStats();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all keys in cache
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    this.updateStats();
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private recordHit(): void {
    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }
  }

  private recordMiss(): void {
    if (this.config.enableStats) {
      this.stats.misses++;
      this.updateHitRate();
    }
  }

  private updateStats(): void {
    if (this.config.enableStats) {
      this.stats.size = this.cache.size;
      this.updateHitRate();
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: this.config.maxSize,
      hitRate: 0
    };
  }
}

/**
 * Specialized cache for skill definitions
 */
export class SkillCache extends PerformanceCache<string, any> {
  constructor(maxSize = 1000, defaultTtl = 5 * 60 * 1000) { // 5 minutes default TTL
    super({
      maxSize,
      defaultTtl,
      cleanupInterval: 60 * 1000, // Cleanup every minute
      enableStats: true
    });
  }

  /**
   * Cache skill definition with longer TTL
   */
  cacheSkill(skillId: string, skill: any): void {
    this.set(skillId, skill, 15 * 60 * 1000); // 15 minutes for skills
  }

  /**
   * Cache query results with shorter TTL
   */
  cacheQuery(queryKey: string, results: any[]): void {
    this.set(queryKey, results, 2 * 60 * 1000); // 2 minutes for queries
  }

  /**
   * Cache validation results
   */
  cacheValidation(skillId: string, validation: any): void {
    this.set(`validation:${skillId}`, validation, 5 * 60 * 1000); // 5 minutes for validation
  }

  /**
   * Get cached validation result
   */
  getCachedValidation(skillId: string): any | undefined {
    return this.get(`validation:${skillId}`);
  }

  /**
   * Generate cache key for queries
   */
  static generateQueryKey(query: any): string {
    return `query:${JSON.stringify(query)}`;
  }
}

/**
 * Resource usage tracker for performance monitoring
 */
export class ResourceTracker {
  private memoryBaseline: number;
  private startTime: number;
  private checkpoints: Array<{ name: string; memory: number; time: number }> = [];

  constructor() {
    this.memoryBaseline = this.getCurrentMemoryUsage();
    this.startTime = Date.now();
  }

  /**
   * Add a performance checkpoint
   */
  checkpoint(name: string): void {
    this.checkpoints.push({
      name,
      memory: this.getCurrentMemoryUsage(),
      time: Date.now()
    });
  }

  /**
   * Get performance report
   */
  getReport(): {
    totalDuration: number;
    memoryDelta: number;
    checkpoints: Array<{ name: string; memoryDelta: number; duration: number }>;
  } {
    const currentMemory = this.getCurrentMemoryUsage();
    const totalDuration = Date.now() - this.startTime;
    const memoryDelta = currentMemory - this.memoryBaseline;

    const processedCheckpoints = this.checkpoints.map((checkpoint, index) => {
      const prevTime = index === 0 ? this.startTime : this.checkpoints[index - 1].time;
      const prevMemory = index === 0 ? this.memoryBaseline : this.checkpoints[index - 1].memory;
      
      return {
        name: checkpoint.name,
        memoryDelta: checkpoint.memory - prevMemory,
        duration: checkpoint.time - prevTime
      };
    });

    return {
      totalDuration,
      memoryDelta,
      checkpoints: processedCheckpoints
    };
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0; // Fallback for browser environments
  }
}