/**
 * Cache Tag Manager
 * Manages cache entry tags for bulk invalidation
 */

export class CacheTagManager {
  private tagToKeys = new Map<string, Set<string>>();
  private keyToTags = new Map<string, Set<string>>();

  /**
   * Add tags to a cache key
   */
  addTags(cacheName: string, key: string, tags: string[]): void {
    const fullKey = `${cacheName}:${key}`;
    
    if (!this.keyToTags.has(fullKey)) {
      this.keyToTags.set(fullKey, new Set());
    }

    const keyTags = this.keyToTags.get(fullKey)!;
    
    for (const tag of tags) {
      keyTags.add(tag);
      
      if (!this.tagToKeys.has(tag)) {
        this.tagToKeys.set(tag, new Set());
      }
      
      this.tagToKeys.get(tag)!.add(fullKey);
    }
  }

  /**
   * Remove tags from a cache key
   */
  removeTags(cacheName: string, key: string, tags: string[]): void {
    const fullKey = `${cacheName}:${key}`;
    const keyTags = this.keyToTags.get(fullKey);
    
    if (!keyTags) return;

    for (const tag of tags) {
      keyTags.delete(tag);
      
      const tagKeys = this.tagToKeys.get(tag);
      if (tagKeys) {
        tagKeys.delete(fullKey);
        
        // Clean up empty tag sets
        if (tagKeys.size === 0) {
          this.tagToKeys.delete(tag);
        }
      }
    }

    // Clean up empty key tag sets
    if (keyTags.size === 0) {
      this.keyToTags.delete(fullKey);
    }
  }

  /**
   * Get all keys associated with given tags
   */
  getKeysByTags(tags: string[]): string[] {
    if (tags.length === 0) return [];

    let result: Set<string> | undefined;

    for (const tag of tags) {
      const tagKeys = this.tagToKeys.get(tag);
      
      if (!tagKeys || tagKeys.size === 0) {
        return []; // If any tag has no keys, intersection is empty
      }

      if (!result) {
        result = new Set(tagKeys);
      } else {
        // Intersection: keep only keys that exist in both sets
        const resultArray = Array.from(result).filter(key => tagKeys.has(key));
        result = new Set(resultArray);
      }

      // Early exit if intersection becomes empty
      if (result.size === 0) {
        return [];
      }
    }

    return result ? Array.from(result) : [];
  }

  /**
   * Get all tags for a cache key
   */
  getTagsForKey(cacheName: string, key: string): string[] {
    const fullKey = `${cacheName}:${key}`;
    const keyTags = this.keyToTags.get(fullKey);
    return keyTags ? Array.from(keyTags) : [];
  }

  /**
   * Remove all tags for a cache key
   */
  removeKey(cacheName: string, key: string): void {
    const fullKey = `${cacheName}:${key}`;
    const keyTags = this.keyToTags.get(fullKey);
    
    if (!keyTags) return;

    // Remove key from all its tags
    const tags = Array.from(keyTags);
    for (const tag of tags) {
      const tagKeys = this.tagToKeys.get(tag);
      if (tagKeys) {
        tagKeys.delete(fullKey);
        
        // Clean up empty tag sets
        if (tagKeys.size === 0) {
          this.tagToKeys.delete(tag);
        }
      }
    }

    // Remove key entry
    this.keyToTags.delete(fullKey);
  }

  /**
   * Get all tags
   */
  getAllTags(): string[] {
    return Array.from(this.tagToKeys.keys());
  }

  /**
   * Get statistics
   */
  getStats(): { totalTags: number; totalKeys: number; avgKeysPerTag: number } {
    const totalTags = this.tagToKeys.size;
    const totalKeys = this.keyToTags.size;
    
    let totalKeyCount = 0;
    const allKeySets = Array.from(this.tagToKeys.values());
    for (const keys of allKeySets) {
      totalKeyCount += keys.size;
    }
    
    const avgKeysPerTag = totalTags > 0 ? totalKeyCount / totalTags : 0;

    return {
      totalTags,
      totalKeys,
      avgKeysPerTag,
    };
  }

  /**
   * Clear all tags
   */
  clear(): void {
    this.tagToKeys.clear();
    this.keyToTags.clear();
  }
}

