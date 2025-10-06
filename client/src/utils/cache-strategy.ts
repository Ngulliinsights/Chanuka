/**
 * Advanced Caching Strategy Implementation
 * Provides intelligent caching for API responses, assets, and application state
 */

export interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // maximum number of entries
  strategy: 'lru' | 'lfu' | 'fifo' | 'ttl';
  compression: boolean;
  encryption: boolean;
  persistent: boolean; // use localStorage/IndexedDB
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  averageAccessTime: number;
}

class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    averageAccessTime: 0
  };
  private accessTimes: number[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxAge: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      strategy: 'lru',
      compression: false,
      encryption: false,
      persistent: false,
      ...config
    };

    this.initializeCleanup();
    
    if (this.config.persistent) {
      this.loadFromPersistentStorage();
    }
  }

  private initializeCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      // Check TTL expiration
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
      // Check max age expiration
      else if (now - entry.timestamp > this.config.maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.delete(key);
    });

    // Enforce size limits
    this.enforceSizeLimit();
  }

  private enforceSizeLimit(): void {
    if (this.cache.size <= this.config.maxSize) return;

    const entries = Array.from(this.cache.entries());
    const entriesToEvict = entries.length - this.config.maxSize;

    // Sort based on eviction strategy
    let sortedEntries: [string, CacheEntry<T>][];

    switch (this.config.strategy) {
      case 'lru':
        sortedEntries = entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'lfu':
        sortedEntries = entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'fifo':
        sortedEntries = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case 'ttl':
        sortedEntries = entries.sort(([, a], [, b]) => {
          const aTtl = a.ttl || this.config.maxAge;
          const bTtl = b.ttl || this.config.maxAge;
          return (a.timestamp + aTtl) - (b.timestamp + bTtl);
        });
        break;
      default:
        sortedEntries = entries;
    }

    // Evict oldest/least used entries
    for (let i = 0; i < entriesToEvict; i++) {
      const [key] = sortedEntries[i];
      this.cache.delete(key);
      this.stats.evictions++;
    }

    this.updateStats();
  }

  private async compressValue(value: T): Promise<string> {
    if (!this.config.compression) return JSON.stringify(value);

    try {
      const jsonString = JSON.stringify(value);
      
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonString));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value: chunk, done: readerDone } = await reader.read();
          done = readerDone;
          if (chunk) chunks.push(chunk);
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        chunks.forEach(chunk => {
          compressed.set(chunk, offset);
          offset += chunk.length;
        });
        
        return btoa(String.fromCharCode(...compressed));
      }
      
      // Fallback: simple compression using LZ-string-like algorithm
      return this.simpleCompress(jsonString);
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return JSON.stringify(value);
    }
  }

  private async decompressValue(compressedValue: string, wasCompressed: boolean): Promise<T> {
    if (!wasCompressed) return JSON.parse(compressedValue);

    try {
      // Use DecompressionStream if available
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(compressedValue), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value: chunk, done: readerDone } = await reader.read();
          done = readerDone;
          if (chunk) chunks.push(chunk);
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        chunks.forEach(chunk => {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        });
        
        const jsonString = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonString);
      }
      
      // Fallback: simple decompression
      const jsonString = this.simpleDecompress(compressedValue);
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return JSON.parse(compressedValue);
    }
  }

  private simpleCompress(str: string): string {
    // Simple LZ77-like compression
    let compressed = '';
    let i = 0;
    
    while (i < str.length) {
      let matchLength = 0;
      let matchDistance = 0;
      
      // Look for matches in the previous 255 characters
      for (let j = Math.max(0, i - 255); j < i; j++) {
        let length = 0;
        while (length < 255 && i + length < str.length && str[j + length] === str[i + length]) {
          length++;
        }
        if (length > matchLength) {
          matchLength = length;
          matchDistance = i - j;
        }
      }
      
      if (matchLength > 2) {
        compressed += String.fromCharCode(0) + String.fromCharCode(matchDistance) + String.fromCharCode(matchLength);
        i += matchLength;
      } else {
        compressed += str[i];
        i++;
      }
    }
    
    return btoa(compressed);
  }

  private simpleDecompress(compressed: string): string {
    const str = atob(compressed);
    let decompressed = '';
    let i = 0;
    
    while (i < str.length) {
      if (str.charCodeAt(i) === 0) {
        const distance = str.charCodeAt(i + 1);
        const length = str.charCodeAt(i + 2);
        const start = decompressed.length - distance;
        
        for (let j = 0; j < length; j++) {
          decompressed += decompressed[start + j];
        }
        
        i += 3;
      } else {
        decompressed += str[i];
        i++;
      }
    }
    
    return decompressed;
  }

  private encryptValue(value: string): string {
    if (!this.config.encryption) return value;
    
    // Simple XOR encryption (in production, use proper encryption)
    const key = 'chanuka-cache-key';
    let encrypted = '';
    
    for (let i = 0; i < value.length; i++) {
      encrypted += String.fromCharCode(
        value.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }

  private decryptValue(encryptedValue: string, wasEncrypted: boolean): string {
    if (!wasEncrypted) return encryptedValue;
    
    const key = 'chanuka-cache-key';
    const encrypted = atob(encryptedValue);
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return decrypted;
  }

  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size;
  }

  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;
    this.stats.averageAccessTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0;
  }

  private async loadFromPersistentStorage(): Promise<void> {
    if (!this.config.persistent) return;

    try {
      const stored = localStorage.getItem(`cache-${this.constructor.name}`);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((entry: CacheEntry<T>) => {
          this.cache.set(entry.key, entry);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from persistent storage:', error);
    }
  }

  private async saveToPersistentStorage(): Promise<void> {
    if (!this.config.persistent) return;

    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(`cache-${this.constructor.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to persistent storage:', error);
    }
  }

  // Public API
  public async set(key: string, value: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    const startTime = performance.now();
    
    try {
      const compressedValue = await this.compressValue(value);
      const encryptedValue = this.encryptValue(compressedValue);
      const size = this.calculateSize(encryptedValue);
      
      const entry: CacheEntry<T> = {
        key,
        value: encryptedValue as any, // Store encrypted/compressed string
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        compressed: this.config.compression,
        encrypted: this.config.encryption,
        ttl: options.ttl,
        tags: options.tags
      };

      this.cache.set(key, entry);
      this.enforceSizeLimit();
      this.updateStats();
      
      if (this.config.persistent) {
        await this.saveToPersistentStorage();
      }
    } finally {
      const accessTime = performance.now() - startTime;
      this.accessTimes.push(accessTime);
      if (this.accessTimes.length > 1000) {
        this.accessTimes = this.accessTimes.slice(-500);
      }
    }
  }

  public async get(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = now;
      
      this.stats.hits++;
      this.updateStats();

      // Decrypt and decompress value
      const decryptedValue = this.decryptValue(entry.value as string, entry.encrypted);
      const decompressedValue = await this.decompressValue(decryptedValue, entry.compressed);
      
      return decompressedValue;
    } finally {
      const accessTime = performance.now() - startTime;
      this.accessTimes.push(accessTime);
      if (this.accessTimes.length > 1000) {
        this.accessTimes = this.accessTimes.slice(-500);
      }
    }
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (entry.ttl && now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    if (now - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
      if (this.config.persistent) {
        this.saveToPersistentStorage();
      }
    }
    return deleted;
  }

  public clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      averageAccessTime: 0
    };
    
    if (this.config.persistent) {
      localStorage.removeItem(`cache-${this.constructor.name}`);
    }
  }

  public invalidateByTag(tag: string): number {
    let invalidated = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.tags && entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      invalidated++;
    });

    this.updateStats();
    return invalidated;
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getSize(): number {
    return this.cache.size;
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Specialized cache implementations
export class ApiCache extends AdvancedCache<any> {
  constructor() {
    super({
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
      strategy: 'lru',
      compression: true,
      persistent: true
    });
  }

  public async cacheApiResponse(url: string, method: string, data: any, ttl?: number): Promise<void> {
    const key = `${method}:${url}`;
    await this.set(key, data, { ttl, tags: ['api'] });
  }

  public async getCachedApiResponse(url: string, method: string): Promise<any> {
    const key = `${method}:${url}`;
    return await this.get(key);
  }
}

export class AssetCache extends AdvancedCache<string> {
  constructor() {
    super({
      maxAge: 60 * 60 * 1000, // 1 hour
      maxSize: 50,
      strategy: 'lfu',
      compression: true,
      persistent: true
    });
  }

  public async cacheAsset(url: string, content: string): Promise<void> {
    await this.set(url, content, { tags: ['asset'] });
  }

  public async getCachedAsset(url: string): Promise<string | null> {
    return await this.get(url);
  }
}

export class StateCache extends AdvancedCache<any> {
  constructor() {
    super({
      maxAge: 30 * 60 * 1000, // 30 minutes
      maxSize: 100,
      strategy: 'lru',
      compression: false,
      persistent: false
    });
  }

  public async cacheState(component: string, state: any): Promise<void> {
    await this.set(`state:${component}`, state, { tags: ['state'] });
  }

  public async getCachedState(component: string): Promise<any> {
    return await this.get(`state:${component}`);
  }
}

// Cache manager to coordinate multiple caches
export class CacheManager {
  private caches = new Map<string, AdvancedCache>();
  
  constructor() {
    this.caches.set('api', new ApiCache());
    this.caches.set('asset', new AssetCache());
    this.caches.set('state', new StateCache());
  }

  public getCache(name: string): AdvancedCache | undefined {
    return this.caches.get(name);
  }

  public getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    this.caches.forEach((cache, name) => {
      stats[name] = cache.getStats();
    });
    return stats;
  }

  public clearAll(): void {
    this.caches.forEach(cache => cache.clear());
  }

  public invalidateAllByTag(tag: string): number {
    let totalInvalidated = 0;
    this.caches.forEach(cache => {
      totalInvalidated += cache.invalidateByTag(tag);
    });
    return totalInvalidated;
  }

  public destroy(): void {
    this.caches.forEach(cache => cache.destroy());
    this.caches.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// React hook for cache management
export function useCache(cacheName: string = 'api') {
  const cache = cacheManager.getCache(cacheName);
  
  if (!cache) {
    throw new Error(`Cache '${cacheName}' not found`);
  }

  return {
    set: cache.set.bind(cache),
    get: cache.get.bind(cache),
    has: cache.has.bind(cache),
    delete: cache.delete.bind(cache),
    clear: cache.clear.bind(cache),
    getStats: cache.getStats.bind(cache),
    invalidateByTag: cache.invalidateByTag.bind(cache)
  };
}