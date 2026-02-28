/**
 * Tagging Strategy
 *
 * Handles tag-based cache invalidation, allowing groups of cache entries
 * to be invalidated together. Extracted from cache-factory.ts wrapper classes.
 */

import { CacheTagManager } from '../tagging/tag-manager';

export interface TaggingStrategyConfig {
  enableTagging?: boolean;
  maxTagsPerKey?: number;
}

/**
 * TaggingStrategy
 *
 * Provides tag management capabilities for cache entries, enabling
 * group-based invalidation and organization of cached data.
 *
 * @example
 * ```typescript
 * const strategy = new TaggingStrategy(tagManager, 'myCache');
 * await strategy.addTags('user:123', ['user', 'active']);
 * const keys = await strategy.invalidateByTags(['user']);
 * ```
 */
export class TaggingStrategy {
  constructor(
    private tagManager: CacheTagManager,
    private cacheName: string
  ) {}

  /**
   * Add tags to a cache key
   *
   * @param key - The cache key
   * @param tags - Array of tags to associate with the key
   */
  addTags(key: string, tags: string[]): void {
    if (!tags || tags.length === 0) {
      return;
    }

    try {
      this.tagManager.addTags(this.cacheName, key, tags);
    } catch (error) {
      console.warn(`Failed to add tags to key ${key}:`, error);
    }
  }

  /**
   * Remove a key from all its tags
   *
   * @param key - The cache key to remove
   */
  removeKey(key: string): void {
    try {
      this.tagManager.removeKey(this.cacheName, key);
    } catch (error) {
      console.warn(`Failed to remove key ${key} from tags:`, error);
    }
  }

  /**
   * Get all keys associated with specific tags
   *
   * @param tags - Array of tags to query
   * @returns Array of cache keys associated with the tags
   */
  async getKeysByTags(tags: string[]): Promise<string[]> {
    try {
      const keys = this.tagManager.getKeysByTags(tags);
      // Filter keys for this cache instance
      return keys.filter(key => key.startsWith(`${this.cacheName}:`))
        .map(key => key.substring(this.cacheName.length + 1));
    } catch (error) {
      console.warn('Failed to get keys by tags:', error);
      return [];
    }
  }

  /**
   * Invalidate all keys associated with specific tags
   *
   * @param tags - Array of tags to invalidate
   * @returns Array of invalidated cache keys
   */
  async invalidateByTags(tags: string[]): Promise<string[]> {
    try {
      const keys = this.tagManager.getKeysByTags(tags);
      // Filter keys for this cache instance and remove cache name prefix
      return keys.filter(key => key.startsWith(`${this.cacheName}:`))
        .map(key => key.substring(this.cacheName.length + 1));
    } catch (error) {
      console.warn('Failed to invalidate by tags:', error);
      return [];
    }
  }

  /**
   * Get all tags for a specific key
   *
   * @param key - The cache key
   * @returns Array of tags associated with the key
   */
  async getTagsForKey(key: string): Promise<string[]> {
    try {
      return this.tagManager.getTagsForKey(this.cacheName, key);
    } catch (error) {
      console.warn(`Failed to get tags for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Clear all tags for this cache instance
   */
  async clearAllTags(): Promise<void> {
    try {
      // Get all tags and remove keys for this cache
      const allTags = this.tagManager.getAllTags();
      const keys = this.tagManager.getKeysByTags(allTags);
      
      for (const key of keys) {
        if (key.startsWith(`${this.cacheName}:`)) {
          const shortKey = key.substring(this.cacheName.length + 1);
          this.tagManager.removeKey(this.cacheName, shortKey);
        }
      }
    } catch (error) {
      console.warn('Failed to clear all tags:', error);
    }
  }

  /**
   * Get tagging statistics
   *
   * @returns Statistics about tag usage
   */
  getStats(): {
    totalTags: number;
    totalKeys: number;
    avgKeysPerTag: number;
  } | null {
    try {
      return this.tagManager.getStats();
    } catch (error) {
      console.warn('Failed to get tagging stats:', error);
      return null;
    }
  }
}
