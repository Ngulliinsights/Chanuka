/**
 * Cache Key Generator
 *
 * Utility for generating consistent cache keys across the application
 */

export class CacheKeyGenerator {
  /**
   * Generate property-related cache keys
   */
  property(id: number): string {
    return `property:${id}`;
  }

  properties(filters: string): string {
    return `properties:${filters}`;
  }

  /**
   * Generate user-related cache keys
   */
  user(id: number): string {
    return `user:${id}`;
  }

  userByUsername(username: string): string {
    return `user:username:${username}`;
  }

  /**
   * Generate review-related cache keys
   */
  reviews(propertyId: number): string {
    return `reviews:property:${propertyId}`;
  }

  /**
   * Generate search-related cache keys
   */
  searchResults(query: string): string {
    return `search:${query}`;
  }

  /**
   * Generate trust score cache keys
   */
  trustScore(userId: string): string {
    return `trust_score:${userId}`;
  }

  /**
   * Generate fraud detection cache keys
   */
  fraudDetection(propertyId: number): string {
    return `fraud_detection:${propertyId}`;
  }

  /**
   * Generate API response cache keys
   */
  apiResponse(endpoint: string, params: string): string {
    return `api:${endpoint}:${params}`;
  }

  /**
   * Generate custom cache key with prefix
   */
  custom(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Generate cache key for method calls
   */
  method(className: string, methodName: string, ...args: any[]): string {
    const argsHash = this.hashArguments(args);
    return `method:${className}:${methodName}:${argsHash}`;
  }

  /**
   * Generate cache key for database queries
   */
  query(table: string, conditions: Record<string, any>): string {
    const conditionsStr = JSON.stringify(conditions, Object.keys(conditions).sort());
    return `query:${table}:${this.hashString(conditionsStr)}`;
  }

  /**
   * Generate cache key for paginated results
   */
  paginated(
    baseKey: string,
    page: number,
    limit: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): string {
    const parts = [baseKey, `page:${page}`, `limit:${limit}`];
    if (sortBy) {
      parts.push(`sort:${sortBy}:${sortOrder || 'asc'}`);
    }
    return parts.join(':');
  }

  /**
   * Generate cache key for time-based data
   */
  timeBased(baseKey: string, timeRange: string): string {
    return `${baseKey}:time:${timeRange}`;
  }

  /**
   * Generate cache key for versioned data
   */
  versioned(baseKey: string, version: string | number): string {
    return `${baseKey}:v${version}`;
  }

  /**
   * Generate cache key for tagged data
   */
  tagged(baseKey: string, tags: string[]): string {
    const sortedTags = [...tags].sort();
    return `${baseKey}:tags:${sortedTags.join(',')}`;
  }

  /**
   * Hash arguments for cache key generation
   */
  private hashArguments(args: any[]): string {
    const serialized = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, Object.keys(arg).sort());
      }
      return String(arg);
    }).join('|');

    return this.hashString(serialized);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Default cache key generator instance
 */
export const cacheKeyGenerator = new CacheKeyGenerator();





































