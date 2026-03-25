/**
 * Cache Key Generator
 *
 * Centralised cache key generation for consistent naming across the application.
 * Standardised format: {prefix}:{feature}:{entity}[:{id}][:{variant}][:{meta=val}…]
 */

import { logger } from '../observability';
import type { CacheKeyGenerator } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_SEPARATOR  = ':';
const MAX_KEY_LENGTH = 250;
const HASH_MAX_LEN   = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyComponents {
  feature:   string;
  entity:    string;
  id?:       string | number;
  variant?:  string;
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

/**
 * Base-64 encode a string and truncate to `HASH_MAX_LEN` characters.
 * Used to keep variable-length user input (queries, filters, params)
 * within the key length budget.
 */
function hashSegment(value: string): string {
  if (value.length <= HASH_MAX_LEN) return value;
  return Buffer.from(value).toString('base64').slice(0, HASH_MAX_LEN);
}

// ---------------------------------------------------------------------------
// CacheKeys
// ---------------------------------------------------------------------------

export class CacheKeys implements CacheKeyGenerator {
  private static instance: CacheKeys | undefined;

  constructor(private readonly keyPrefix: string = 'app') {}

  // -------------------------------------------------------------------------
  // Singleton
  // -------------------------------------------------------------------------

  /**
   * Return the process-wide singleton.
   *
   * @throws If called a second time with a *different* prefix — prevents silent
   *         misconfiguration that would generate keys under the wrong namespace.
   */
  static getInstance(keyPrefix = 'app'): CacheKeys {
    if (CacheKeys.instance) {
      if (CacheKeys.instance.keyPrefix !== keyPrefix) {
        throw new Error(
          `CacheKeys singleton already initialised with prefix "${CacheKeys.instance.keyPrefix}". ` +
          `Cannot re-initialise with "${keyPrefix}".`,
        );
      }
      return CacheKeys.instance;
    }
    CacheKeys.instance = new CacheKeys(keyPrefix);
    return CacheKeys.instance;
  }

  /** Reset the singleton — intended for testing only. */
  static resetInstance(): void {
    CacheKeys.instance = undefined;
  }

  // -------------------------------------------------------------------------
  // Core builder
  // -------------------------------------------------------------------------

  /**
   * Build a standardised cache key from structured components.
   * Throws (and logs) when the assembled key exceeds `MAX_KEY_LENGTH` or
   * contains control characters.
   */
  buildKey(components: KeyComponents): string {
    const parts = [this.keyPrefix, components.feature, components.entity];

    if (components.id !== undefined)  parts.push(String(components.id));
    if (components.variant)           parts.push(components.variant);
    if (components.metadata) {
      for (const [k, v] of Object.entries(components.metadata)) {
        parts.push(`${k}=${v}`);
      }
    }

    const key = parts.join(KEY_SEPARATOR);

    if (!this.validateKey(key)) {
      logger.warn({ key, components }, 'Generated invalid cache key');
      throw new Error(`Invalid cache key generated: "${key}"`);
    }

    return key;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private fmt(path: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${KEY_SEPARATOR}${path}` : path;
  }

  // -------------------------------------------------------------------------
  // Property keys
  // -------------------------------------------------------------------------

  property(id: number):             string { return this.fmt(`property:${id}`); }
  propertyDetails(id: number):      string { return this.fmt(`property:details:${id}`); }
  propertyImages(id: number):       string { return this.fmt(`property:images:${id}`); }
  propertyVerification(id: number): string { return this.fmt(`property:verification:${id}`); }

  properties(filters: string): string {
    return this.fmt(`properties:${hashSegment(filters)}`);
  }

  // -------------------------------------------------------------------------
  // User keys
  // -------------------------------------------------------------------------

  user(id: number):                 string { return this.fmt(`user:${id}`); }
  userProfile(id: number):          string { return this.fmt(`user:profile:${id}`); }
  user_profiles(id: number):        string { return this.fmt(`user:profile:${id}`); }
  userByUsername(username: string): string { return this.fmt(`user:username:${username}`); }
  userSession(sessionId: string):   string { return this.fmt(`user:session:${sessionId}`); }
  userPermissions(id: number):      string { return this.fmt(`user:permissions:${id}`); }
  userSettings(id: number):         string { return this.fmt(`settings:${id}`); }
  settings(user_id: number):        string { return this.fmt(`settings:${user_id}`); }

  // Legacy aliases — kept for backward compatibility; prefer the camelCase equivalents above.
  /** @deprecated Use {@link userProfile} */
  USER_PROFILE(id: number | string): string { return this.fmt(`user:profile:${id}`); }
  /** @deprecated Use a dedicated `billDetails` key once the billing module is introduced. */
  BILL_DETAILS(id: number | string): string { return this.fmt(`bill:details:${id}`); }

  // -------------------------------------------------------------------------
  // Review keys
  // -------------------------------------------------------------------------

  reviews(propertyId: number):    string { return this.fmt(`reviews:property:${propertyId}`); }
  reviewsByUser(userId: number):  string { return this.fmt(`reviews:user:${userId}`); }
  reviewStats(propertyId: number): string { return this.fmt(`reviews:stats:${propertyId}`); }

  // -------------------------------------------------------------------------
  // Search keys
  // -------------------------------------------------------------------------

  searchResults(query: string):       string { return this.fmt(`search:${hashSegment(query)}`); }
  searchSuggestions(query: string):   string { return this.fmt(`search:suggestions:${hashSegment(query)}`); }
  searchFilters(category: string):    string { return this.fmt(`search:filters:${category}`); }

  // -------------------------------------------------------------------------
  // Trust & security keys
  // -------------------------------------------------------------------------

  trustScore(userId: string):           string { return this.fmt(`trust:score:${userId}`); }
  riskAssessment(userId: string):       string { return this.fmt(`risk:assessment:${userId}`); }
  fraudDetection(propertyId: number):   string { return this.fmt(`fraud:detection:${propertyId}`); }
  securityEvent(eventId: string):       string { return this.fmt(`security:event:${eventId}`); }

  // -------------------------------------------------------------------------
  // API keys
  // -------------------------------------------------------------------------

  apiResponse(endpoint: string, params: string): string {
    return this.fmt(`api:${endpoint}:${hashSegment(params)}`);
  }

  apiRateLimit(identifier: string, endpoint: string): string {
    return this.fmt(`rate_limit:${identifier}:${endpoint}`);
  }

  // -------------------------------------------------------------------------
  // Land verification keys
  // -------------------------------------------------------------------------

  landVerification(propertyId: number): string { return this.fmt(`land:verification:${propertyId}`); }
  landDocuments(propertyId: number):    string { return this.fmt(`land:documents:${propertyId}`); }
  landOwnership(propertyId: number):    string { return this.fmt(`land:ownership:${propertyId}`); }

  // -------------------------------------------------------------------------
  // Analytics keys
  // -------------------------------------------------------------------------

  analytics(metric: string, period: string):       string { return this.fmt(`analytics:${metric}:${period}`); }
  dashboardData(userId: number, dashboard: string): string { return this.fmt(`dashboard:${dashboard}:${userId}`); }
  reportData(reportId: string):                    string { return this.fmt(`report:${reportId}`); }

  // -------------------------------------------------------------------------
  // Configuration keys
  // -------------------------------------------------------------------------

  config(section: string):       string { return this.fmt(`config:${section}`); }
  featureFlag(flagName: string): string { return this.fmt(`feature:${flagName}`); }

  // -------------------------------------------------------------------------
  // Notification keys
  // -------------------------------------------------------------------------

  notifications(userId: number):            string { return this.fmt(`notifications:${userId}`); }
  notificationPreferences(userId: number):  string { return this.fmt(`notifications:preferences:${userId}`); }

  // -------------------------------------------------------------------------
  // Messaging keys
  // -------------------------------------------------------------------------

  messages(conversationId: string):   string { return this.fmt(`messages:${conversationId}`); }
  messageThread(threadId: string):    string { return this.fmt(`messages:thread:${threadId}`); }

  /** Returns a stable key for the shared comment-votes collection. */
  commentVotes(): string { return this.fmt('comment_votes'); }

  // -------------------------------------------------------------------------
  // File & media keys
  // -------------------------------------------------------------------------

  fileMetadata(fileId: string):                       string { return this.fmt(`file:metadata:${fileId}`); }
  imageProcessing(imageId: string, variant: string):  string { return this.fmt(`image:${variant}:${imageId}`); }

  // -------------------------------------------------------------------------
  // Geolocation keys
  // -------------------------------------------------------------------------

  geocoding(address: string): string {
    return this.fmt(`geo:coding:${hashSegment(address)}`);
  }

  reverseGeocoding(lat: number, lng: number): string {
    return this.fmt(`geo:reverse:${lat}:${lng}`);
  }

  // -------------------------------------------------------------------------
  // External API keys
  // -------------------------------------------------------------------------

  externalApi(service: string, endpoint: string, params: string): string {
    return this.fmt(`external:${service}:${endpoint}:${hashSegment(params)}`);
  }

  // -------------------------------------------------------------------------
  // Misc domain keys
  // -------------------------------------------------------------------------

  validationResult(schema: string, dataHash: string): string {
    return this.fmt(`validation:${schema}:${dataHash}`);
  }

  healthCheck(service: string): string {
    return this.fmt(`health:${service}`);
  }

  // -------------------------------------------------------------------------
  // Key composition utilities
  // -------------------------------------------------------------------------

  /**
   * Pair a key with a set of invalidation tags.
   * Tags are namespaced under the current prefix so they don't collide
   * across environments.
   */
  withTags(baseKey: string, tags: string[]): { key: string; tags: string[] } {
    return {
      key:  baseKey,
      tags: tags.map(tag => this.fmt(`tag:${tag}`)),
    };
  }

  /**
   * Append a time-bucket suffix so the key naturally expires on a fixed
   * cadence without needing an explicit TTL change.
   *
   * @param intervalMinutes - Bucket size in minutes (default: 5)
   */
  withTimestamp(baseKey: string, intervalMinutes = 5): string {
    const bucket = Math.floor(Date.now() / (intervalMinutes * 60_000));
    return `${baseKey}${KEY_SEPARATOR}${bucket}`;
  }

  /** Scope a key to a specific user. */
  withUser(baseKey: string, userId: number): string {
    return `${baseKey}${KEY_SEPARATOR}user${KEY_SEPARATOR}${userId}`;
  }

  /** Scope a key to a deployment environment. */
  withEnvironment(baseKey: string, environment: string): string {
    return `${baseKey}${KEY_SEPARATOR}env${KEY_SEPARATOR}${environment}`;
  }

  /** Append a version suffix for schema-versioned caches. */
  withVersion(baseKey: string, version: string): string {
    return `${baseKey}${KEY_SEPARATOR}v${version}`;
  }

  // -------------------------------------------------------------------------
  // Validation & parsing
  // -------------------------------------------------------------------------

  /**
   * Return `true` if `key` is a well-formed cache key:
   * - Within the allowed length
   * - Free of control characters
   * - Contains at least one separator (i.e. has meaningful structure)
   */
  validateKey(key: string): boolean {
    if (key.length > MAX_KEY_LENGTH)      return false;
    if (/[\r\n\t\f\v\0]/.test(key))       return false;
    if (!key.includes(KEY_SEPARATOR))     return false;
    return true;
  }

  /**
   * Decompose a key back into its logical segments.
   *
   * Metadata segments are expected to follow the `key=value` encoding used
   * by {@link buildKey}.
   */
  parseKey(key: string): {
    prefix:    string | undefined;
    type:      string;
    identifier: string;
    metadata:  Record<string, string> | undefined;
  } {
    const parts = key.split(KEY_SEPARATOR);
    const hasPrefix = this.keyPrefix && parts[0] === this.keyPrefix;

    if (hasPrefix) parts.shift();

    const [type = 'unknown', identifier = 'unknown', ...rest] = parts;

    const metadata: Record<string, string> = {};
    for (const segment of rest) {
      const eq = segment.indexOf('=');
      if (eq !== -1) {
        metadata[segment.slice(0, eq)] = segment.slice(eq + 1);
      }
    }

    return {
      prefix:     hasPrefix ? this.keyPrefix : undefined,
      type,
      identifier,
      metadata:   Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Build a Redis-style glob pattern for bulk invalidation.
   *
   * @example cacheKeys.pattern('property') // → "app:property:*"
   */
  pattern(type: string, wildcard = '*'): string {
    return this.fmt(`${type}${KEY_SEPARATOR}${wildcard}`);
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

export const cacheKeys = CacheKeys.getInstance();