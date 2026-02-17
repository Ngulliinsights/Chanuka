/**
 * Storage System Types
 *
 * Comprehensive type definitions for the storage system including
 * secure storage, session management, token handling, and caching.
 */

/**
 * Storage configuration options
 */
export interface StorageOptions {
  /** Enable AES-GCM encryption for stored data */
  encrypt?: boolean;
  /** Time to live in milliseconds - data expires after this duration */
  ttl?: number;
  /** Logical grouping namespace for storage keys */
  namespace?: string;
  /** Whether to compress data before storage */
  compress?: boolean;
  /** Storage backend to use */
  backend?: StorageBackend;
}

/**
 * Available storage backends
 */
export type StorageBackend = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';

/**
 * Session information structure
 */
export interface SessionInfo {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  refreshToken?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  lastAccessedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Authentication token information
 */
export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer' | 'Basic';
  scope?: string[];
  issuedAt?: Date;
  issuer?: string;
  audience?: string;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number | undefined;
  accessCount?: number | undefined;
  lastAccessed?: number | undefined;
  size?: number | undefined;
  tags?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Internal stored data structure
 */
export interface StoredData {
  data: unknown;
  timestamp: number;
  ttl?: number;
  namespace?: string;
  encrypted?: boolean;
  compressed?: boolean;
  version?: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalEntries: number;
  totalSize: number;
  namespaces: string[];
  oldestEntry?: Date;
  newestEntry?: Date;
  encryptedEntries: number;
  expiredEntries: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  memoryEntries: number;
  persistedEntries: number;
  totalSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Session validation result
 */
export interface SessionValidation {
  isValid: boolean;
  reason?: 'expired' | 'not_found' | 'invalid_format' | 'corrupted';
  expiresIn?: number;
  warnings?: string[];
}

/**
 * Token validation result
 */
export interface TokenValidation {
  isValid: boolean;
  reason?: 'expired' | 'not_found' | 'invalid_format' | 'corrupted';
  expiresIn?: number;
  needsRefresh?: boolean;
}

/**
 * Storage cleanup options
 */
export interface CleanupOptions {
  /** Remove expired entries */
  removeExpired?: boolean;
  /** Remove entries older than specified milliseconds */
  removeOlderThan?: number;
  /** Specific namespaces to clean */
  namespaces?: string[];
  /** Maximum number of entries to keep per namespace */
  maxEntriesPerNamespace?: number;
  /** Dry run - don't actually delete, just report what would be deleted */
  dryRun?: boolean;
}

/**
 * Storage migration options
 */
export interface MigrationOptions {
  fromVersion: string;
  toVersion: string;
  backupBeforeMigration?: boolean;
  validateAfterMigration?: boolean;
}

/**
 * Storage backup information
 */
export interface BackupInfo {
  timestamp: Date;
  version: string;
  entryCount: number;
  totalSize: number;
  namespaces: string[];
}

/**
 * Storage error types
 */
export type StorageErrorCode =
  | 'STORAGE_NOT_AVAILABLE'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_DATA'
  | 'NAMESPACE_NOT_FOUND'
  | 'ENTRY_NOT_FOUND'
  | 'ENTRY_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'CORRUPTION_DETECTED'
  | 'MIGRATION_FAILED';

/**
 * Storage error with context
 */
export interface StorageError extends Error {
  code: StorageErrorCode;
  context?: Record<string, unknown>;
  recoverable?: boolean;
}

/**
 * Storage event types
 */
export type StorageEventType =
  | 'item_set'
  | 'item_get'
  | 'item_removed'
  | 'namespace_cleared'
  | 'storage_cleared'
  | 'cleanup_completed'
  | 'migration_completed'
  | 'quota_warning'
  | 'encryption_key_rotated';

/**
 * Storage event data
 */
export interface StorageEvent {
  type: StorageEventType;
  key?: string;
  namespace?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  ivLength?: number;
  tagLength?: number;
  keyRotationInterval?: number;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level?: number;
  threshold?: number; // Minimum size to compress
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  defaultBackend: StorageBackend;
  defaultNamespace: string;
  encryption: EncryptionConfig;
  compression?: CompressionConfig;
  cleanup: {
    interval: number;
    maxAge: number;
    maxEntries: number;
  };
  quota: {
    warning: number;
    limit: number;
    maxAge?: number;
  };
  versioning: {
    enabled: boolean;
    currentVersion: string;
  };
}

// Legacy type aliases for backward compatibility
export type JWTTokens = TokenInfo;
export type StorageEntry<T> = CacheEntry<T>;
