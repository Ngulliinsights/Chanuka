/**
 * Cache Tag Manager
 *
 * Manages cache invalidation by tags with support for hierarchical tags,
 * tag patterns, and efficient storage in various cache backends
 */

import { CacheAdapter } from '/core/interfaces';

export interface TagEntry {
  key: string;
  tags: string[];
  timestamp: number;
}

export interface TagInvalidationResult {
  invalidatedKeys: number;
  tagsProcessed: number;
  errors: string[];
}

export class CacheTagManager {
  private readonly adapter: CacheAdapter;
  private readonly tagPrefix: string;
  private readonly keyPrefix: string;

  constructor(adapter: CacheAdapter, tagPrefix = 'tag:', keyPrefix = '') {
    this.adapter = adapter;
    this.tagPrefix = tagPrefix;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Add tags to a cache key
   */
  async addTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    try {
      const operations = tags.map(tag => this.addKeyToTag(key, tag));
      await Promise.all(operations);

      // Store tag metadata for the key
      const metadataKey = this.getMetadataKey(key);
      const existingTags = await this.getTagsForKey(key);
      const allTags = [...new Set([...existingTags, ...tags])];

      await this.adapter.set(metadataKey, {
        key,
        tags: allTags,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Failed to add tags:', error);
    }
  }

  /**
   * Remove tags from a cache key
   */
  async removeTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    try {
      const operations = tags.map(tag => this.removeKeyFromTag(key, tag));
      await Promise.all(operations);

      // Update tag metadata for the key
      const metadataKey = this.getMetadataKey(key);
      const existingTags = await this.getTagsForKey(key);
      const remainingTags = existingTags.filter(tag => !tags.includes(tag));

      if (remainingTags.length > 0) {
        await this.adapter.set(metadataKey, {
          key,
          tags: remainingTags,
          timestamp: Date.now(),
        });
      } else {
        await this.adapter.del(metadataKey);
      }
    } catch (error) {
      console.warn('Failed to remove tags:', error);
    }
  }

  /**
   * Get all tags for a cache key
   */
  async getTagsForKey(key: string): Promise<string[]> {
    try {
      const metadataKey = this.getMetadataKey(key);
      const metadata = await this.adapter.get<TagEntry>(metadataKey);
      return metadata?.tags || [];
    } catch (error) {
      console.warn('Failed to get tags for key:', error);
      return [];
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<TagInvalidationResult> {
    const result: TagInvalidationResult = {
      invalidatedKeys: 0,
      tagsProcessed: tags.length,
      errors: [],
    };

    for (const tag of tags) {
      try {
        const keys = await this.getKeysForTag(tag);
        if (keys.length > 0) {
          // Delete all keys with this tag
          const deletePromises = keys.map(key => this.adapter.del(key));
          await Promise.all(deletePromises);

          // Clean up tag set
          await this.clearTag(tag);

          result.invalidatedKeys += keys.length;
        }
      } catch (error) {
        result.errors.push(`Failed to invalidate tag '${tag}': ${error}`);
      }
    }

    return result;
  }

  /**
   * Invalidate cache by tag pattern (supports wildcards)
   */
  async invalidateByTagPattern(pattern: string): Promise<TagInvalidationResult> {
    const result: TagInvalidationResult = {
      invalidatedKeys: 0,
      tagsProcessed: 0,
      errors: [],
    };

    try {
      // Get all tag keys that match the pattern
      const tagKeys = await this.adapter.keys?.(`${this.tagPrefix}${pattern}`) || [];

      for (const tagKey of tagKeys) {
        const tag = tagKey.replace(this.tagPrefix, '');
        const tagResult = await this.invalidateByTags([tag]);
        result.invalidatedKeys += tagResult.invalidatedKeys;
        result.tagsProcessed += 1;
        result.errors.push(...tagResult.errors);
      }
    } catch (error) {
      result.errors.push(`Failed to invalidate by pattern '${pattern}': ${error}`);
    }

    return result;
  }

  /**
   * Clear all tags for a key when the key is deleted
   */
  async clearTagsForKey(key: string): Promise<void> {
    try {
      const tags = await this.getTagsForKey(key);
      if (tags.length > 0) {
        await this.removeTags(key, tags);
      }
    } catch (error) {
      console.warn('Failed to clear tags for key:', error);
    }
  }

  /**
   * Get all keys associated with a tag
   */
  async getKeysForTag(tag: string): Promise<string[]> {
    try {
      const tagKey = this.getTagKey(tag);
      const keys = await this.adapter.get<string[]>(tagKey);
      return keys || [];
    } catch (error) {
      console.warn('Failed to get keys for tag:', error);
      return [];
    }
  }

  /**
   * Get tag statistics
   */
  async getTagStats(): Promise<{
    totalTags: number;
    totalTaggedKeys: number;
    averageKeysPerTag: number;
  }> {
    try {
      const tagKeys = await this.adapter.keys?.(`${this.tagPrefix}*`) || [];
      let totalTaggedKeys = 0;

      for (const tagKey of tagKeys) {
        const keys = await this.adapter.get<string[]>(tagKey);
        totalTaggedKeys += keys?.length || 0;
      }

      return {
        totalTags: tagKeys.length,
        totalTaggedKeys,
        averageKeysPerTag: tagKeys.length > 0 ? totalTaggedKeys / tagKeys.length : 0,
      };
    } catch (error) {
      console.warn('Failed to get tag stats:', error);
      return {
        totalTags: 0,
        totalTaggedKeys: 0,
        averageKeysPerTag: 0,
      };
    }
  }

  /**
   * Clean up orphaned tags (tags with no keys)
   */
  async cleanupOrphanedTags(): Promise<number> {
    try {
      const tagKeys = await this.adapter.keys?.(`${this.tagPrefix}*`) || [];
      let cleaned = 0;

      for (const tagKey of tagKeys) {
        const keys = await this.adapter.get<string[]>(tagKey);
        if (!keys || keys.length === 0) {
          await this.adapter.del(tagKey);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.warn('Failed to cleanup orphaned tags:', error);
      return 0;
    }
  }

  // Private helper methods

  private getTagKey(tag: string): string {
    return `${this.tagPrefix}${tag}`;
  }

  private getMetadataKey(key: string): string {
    return `${this.keyPrefix}tag_meta:${key}`;
  }

  private async addKeyToTag(key: string, tag: string): Promise<void> {
    const tagKey = this.getTagKey(tag);
    const existingKeys = await this.getKeysForTag(tag);
    const updatedKeys = [...new Set([...existingKeys, key])];
    await this.adapter.set(tagKey, updatedKeys);
  }

  private async removeKeyFromTag(key: string, tag: string): Promise<void> {
    const tagKey = this.getTagKey(tag);
    const existingKeys = await this.getKeysForTag(tag);
    const updatedKeys = existingKeys.filter(k => k !== key);

    if (updatedKeys.length > 0) {
      await this.adapter.set(tagKey, updatedKeys);
    } else {
      await this.adapter.del(tagKey);
    }
  }

  private async clearTag(tag: string): Promise<void> {
    const tagKey = this.getTagKey(tag);
    await this.adapter.del(tagKey);
  }
}

/**
 * Factory function for creating tag managers
 */
export function createCacheTagManager(
  adapter: CacheAdapter,
  tagPrefix = 'tag:',
  keyPrefix = ''
): CacheTagManager {
  return new CacheTagManager(adapter, tagPrefix, keyPrefix);
}

/**
 * Hierarchical tag utilities
 */
export class HierarchicalTagManager {
  private readonly tagManager: CacheTagManager;

  constructor(tagManager: CacheTagManager) {
    this.tagManager = tagManager;
  }

  /**
   * Add hierarchical tags (e.g., 'user:123:profile' implies 'user:123' and 'user')
   */
  async addHierarchicalTags(key: string, tagPath: string): Promise<void> {
    const tags = this.expandTagHierarchy(tagPath);
    await this.tagManager.addTags(key, tags);
  }

  /**
   * Invalidate by hierarchical tag (invalidates all sub-tags)
   */
  async invalidateHierarchicalTag(tagPath: string): Promise<TagInvalidationResult> {
    const allTags = this.getAllSubTags(tagPath);
    return await this.tagManager.invalidateByTags(allTags);
  }

  private expandTagHierarchy(tagPath: string): string[] {
    const parts = tagPath.split(':');
    const tags: string[] = [];

    for (let i = 1; i <= parts.length; i++) {
      tags.push(parts.slice(0, i).join(':'));
    }

    return tags;
  }

  private getAllSubTags(tagPath: string): string[] {
    const tags: string[] = [tagPath];
    // This is a simplified version - in practice, you'd need to query
    // for all tags that start with the given path
    return tags;
  }
}


