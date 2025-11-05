/**
 * Cache Key Generator
 * 
 * Centralized cache key generation for consistent naming across the application
 * Based on existing patterns from server/cache/CacheService.ts
 */

import type { CacheKeyGenerator } from './types';
import { logger } from '../observability/logging';

export class CacheKeys implements CacheKeyGenerator {
  private static instance: CacheKeys;
  private keyPrefix: string;

  constructor(keyPrefix: string = '') {
    this.keyPrefix = keyPrefix;
  }

  static getInstance(keyPrefix?: string): CacheKeys {
    if (!CacheKeys.instance) {
      CacheKeys.instance = new CacheKeys(keyPrefix);
    }
    return CacheKeys.instance;
  }

  /**
   * Format key with optional prefix
   */
  private formatKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  /**
   * Property-related cache keys
   */
  property(id: number): string {
    return this.formatKey(`property:${id}`);
  }

  properties(filters: string): string {
    const filterHash = Buffer.from(filters).toString('base64');
    return this.formatKey(`properties:${filterHash}`);
  }

  propertyDetails(id: number): string {
    return this.formatKey(`property:details:${id}`);
  }

  propertyImages(id: number): string {
    return this.formatKey(`property:images:${id}`);
  }

  propertyVerification(id: number): string {
    return this.formatKey(`property:verification:${id}`);
  }

  /**
   * User-related cache keys
   */
  user(id: number): string {
    return this.formatKey(`user:${id}`);
  }

  userByUsername(username: string): string {
    return this.formatKey(`user:username:${username}`);
  }

  user_profiles(id: number): string {
    return this.formatKey(`user:profile:${id}`);
  }

  userSession(session_id: string): string {
    return this.formatKey(`user:session:${session_id}`);
  }

  userPermissions(id: number): string {
    return this.formatKey(`user:permissions:${id}`);
  }

  /**
   * Review-related cache keys
   */
  reviews(propertyId: number): string {
    return this.formatKey(`reviews:property:${propertyId}`);
  }

  reviewsByUser(user_id: number): string { return this.formatKey(`reviews:user:${user_id }`);
  }

  reviewStats(propertyId: number): string {
    return this.formatKey(`reviews:stats:${propertyId}`);
  }

  /**
   * Search-related cache keys
   */
  searchResults(query: string): string {
    const queryHash = Buffer.from(query).toString('base64');
    return this.formatKey(`search:${queryHash}`);
  }

  searchSuggestions(query: string): string {
    const queryHash = Buffer.from(query).toString('base64');
    return this.formatKey(`search:suggestions:${queryHash}`);
  }

  searchFilters(category: string): string {
    return this.formatKey(`search:filters:${category}`);
  }

  /**
   * Trust and security cache keys
   */
  trustScore(user_id: string): string { return this.formatKey(`trust:score:${user_id }`);
  }

  fraudDetection(propertyId: number): string {
    return this.formatKey(`fraud:detection:${propertyId}`);
  }

  riskAssessment(user_id: string): string { return this.formatKey(`risk:assessment:${user_id }`);
  }

  securityEvent(eventId: string): string {
    return this.formatKey(`security:event:${eventId}`);
  }

  /**
   * API response cache keys
   */
  apiResponse(endpoint: string, params: string): string {
    const paramsHash = Buffer.from(params).toString('base64');
    return this.formatKey(`api:${endpoint}:${paramsHash}`);
  }

  apiRateLimit(identifier: string, endpoint: string): string {
    return this.formatKey(`rate_limit:${identifier}:${endpoint}`);
  }

  /**
   * Land verification cache keys
   */
  landVerification(propertyId: number): string {
    return this.formatKey(`land:verification:${propertyId}`);
  }

  landDocuments(propertyId: number): string {
    return this.formatKey(`land:documents:${propertyId}`);
  }

  landOwnership(propertyId: number): string {
    return this.formatKey(`land:ownership:${propertyId}`);
  }

  /**
   * Analytics and metrics cache keys
   */
  analytics(metric: string, period: string): string {
    return this.formatKey(`analytics:${metric}:${period}`);
  }

  dashboardData(user_id: number, dashboard: string): string {
    return this.formatKey(`dashboard:${dashboard}:${ user_id }`);
  }

  reportData(report_id: string): string {
    return this.formatKey(`report:${report_id}`);
  }

  /**
   * Configuration and settings cache keys
   */
  config(section: string): string {
    return this.formatKey(`config:${section}`);
  }

  featureFlag(flagName: string): string {
    return this.formatKey(`feature:${flagName}`);
  }

  settings(user_id: number): string { return this.formatKey(`settings:${user_id }`);
  }

  /**
   * Notification cache keys
   */
  notifications(user_id: number): string { return this.formatKey(`notifications:${user_id }`);
  }

  notificationPreferences(user_id: number): string { return this.formatKey(`notifications:preferences:${user_id }`);
  }

  /**
   * Communication cache keys
   */
  messages(conversationId: string): string {
    return this.formatKey(`messages:${conversationId}`);
  }

  messageThread(threadId: string): string {
    return this.formatKey(`messages:thread:${threadId}`);
  }

  /**
   * File and media cache keys
   */
  fileMetadata(fileId: string): string {
    return this.formatKey(`file:metadata:${fileId}`);
  }

  imageProcessing(imageId: string, variant: string): string {
    return this.formatKey(`image:${variant}:${imageId}`);
  }

  /**
   * Geolocation cache keys
   */
  geocoding(address: string): string {
    const addressHash = Buffer.from(address).toString('base64');
    return this.formatKey(`geo:coding:${addressHash}`);
  }

  reverseGeocoding(lat: number, lng: number): string {
    return this.formatKey(`geo:reverse:${lat}:${lng}`);
  }

  /**
   * External API cache keys
   */
  externalApi(service: string, endpoint: string, params: string): string {
    const paramsHash = Buffer.from(params).toString('base64');
    return this.formatKey(`external:${service}:${endpoint}:${paramsHash}`);
  }

  /**
   * Validation cache keys
   */
  validationResult(schema: string, dataHash: string): string {
    return this.formatKey(`validation:${schema}:${dataHash}`);
  }

  /**
   * Health check cache keys
   */
  healthCheck(service: string): string {
    return this.formatKey(`health:${service}`);
  }

  /**
   * Utility methods for cache key management
   */

  /**
   * Generate cache key with tags for invalidation
   */
  withTags(baseKey: string, tags: string[]): { key: string; tags: string[] } {
    return {
      key: baseKey,
      tags: tags.map(tag => this.formatKey(`tag:${tag}`)),
    };
  }

  /**
   * Generate time-based cache key
   */
  withTimestamp(baseKey: string, intervalMinutes: number = 5): string {
    const now = new Date();
    const interval = Math.floor(now.getTime() / (intervalMinutes * 60 * 1000));
    return `${baseKey}:${interval}`;
  }

  /**
   * Generate user-specific cache key
   */
  withUser(baseKey: string, user_id: number): string {
    return `${baseKey}:user:${ user_id }`;
  }

  /**
   * Generate environment-specific cache key
   */
  withEnvironment(baseKey: string, environment: string): string {
    return `${baseKey}:env:${environment}`;
  }

  /**
   * Generate versioned cache key
   */
  withVersion(baseKey: string, version: string): string {
    return `${baseKey}:v${version}`;
  }

  /**
   * Parse cache key to extract components
   */
  parseKey(key: string): {
    prefix?: string | undefined;
    type: string;
    identifier: string;
    metadata?: Record<string, string> | undefined;
  } {
    const parts = key.split(':');
    
    if (this.keyPrefix && parts[0] === this.keyPrefix) {
      parts.shift(); // Remove prefix
    }

    const [type = 'default', identifier = 'unknown', ...metadata] = parts;
    
    const metadataObj: Record<string, string> = {};
    for (let i = 0; i < metadata.length; i += 2) {
      const key = metadata[i];
      const value = metadata[i + 1];
      if (key && value) {
        metadataObj[key] = value;
      }
    }

    return {
      prefix: this.keyPrefix,
      type,
      identifier,
      metadata: Object.keys(metadataObj).length > 0 ? metadataObj : undefined,
    };
  }

  /**
   * Validate cache key format
   */
  validateKey(key: string): boolean {
    try {
      // Check length
      if (key.length > 250) return false;
      
      // Check for invalid characters
      if (/[\r\n\t\f\v\0]/.test(key)) return false;
      
      // Check structure
      const parts = key.split(':');
      if (parts.length < 2) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate cache key pattern for invalidation
   */
  pattern(type: string, wildcard: string = '*'): string {
    return this.formatKey(`${type}:${wildcard}`);
  }
}

// Export singleton instance
export const cacheKeys = CacheKeys.getInstance();












































