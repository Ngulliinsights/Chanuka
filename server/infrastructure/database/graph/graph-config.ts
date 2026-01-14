/**
 * Graph Database Configuration
 * 
 * Centralized configuration for all graph database operations.
 * All values can be overridden via environment variables.
 * 
 * @module config/graph-config
 */

// ============================================================================
// NEO4J CONNECTION
// ============================================================================

export const NEO4J_CONFIG = {
  URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
  USER: process.env.NEO4J_USER || 'neo4j',
  PASSWORD: process.env.NEO4J_PASSWORD || 'password',
  
  // Connection pool settings
  MAX_CONNECTION_POOL_SIZE: parseInt(
    process.env.NEO4J_MAX_POOL_SIZE || '50',
    10
  ),
  CONNECTION_TIMEOUT_MS: parseInt(
    process.env.NEO4J_CONNECTION_TIMEOUT_MS || '30000',
    10
  ),
  MAX_CONNECTION_LIFETIME_MS: parseInt(
    process.env.NEO4J_MAX_LIFETIME_MS || '3600000',
    10
  ), // 1 hour
} as const;

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

export const SYNC_CONFIG = {
  // Sync intervals
  INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10), // 5 minutes
  TIMEOUT_MS: parseInt(process.env.SYNC_TIMEOUT_MS || '30000', 10), // 30 seconds
  
  // Batch processing
  BATCH_SIZE: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
  MAX_BATCH_SIZE: parseInt(process.env.SYNC_MAX_BATCH_SIZE || '1000', 10),
  
  // Retry configuration
  MAX_RETRIES: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
  RETRY_BASE_DELAY_MS: parseInt(process.env.SYNC_RETRY_BASE_DELAY_MS || '1000', 10),
  RETRY_MAX_DELAY_MS: parseInt(process.env.SYNC_RETRY_MAX_DELAY_MS || '10000', 10),
  
  // Auto-sync
  ENABLE_AUTO_SYNC: process.env.ENABLE_AUTO_SYNC !== 'false',
  
  // Conflict resolution
  CONFLICT_RESOLUTION_STRATEGY: (process.env.CONFLICT_RESOLUTION_STRATEGY || 'POSTGRES_WINS') as 'POSTGRES_WINS' | 'NEO4J_WINS' | 'MANUAL',
} as const;

// ============================================================================
// QUERY CONFIGURATION
// ============================================================================

export const QUERY_CONFIG = {
  // Default pagination
  DEFAULT_LIMIT: parseInt(process.env.QUERY_DEFAULT_LIMIT || '100', 10),
  MAX_LIMIT: parseInt(process.env.QUERY_MAX_LIMIT || '10000', 10),
  
  // Query timeouts
  READ_TIMEOUT_MS: parseInt(process.env.QUERY_READ_TIMEOUT_MS || '10000', 10),
  WRITE_TIMEOUT_MS: parseInt(process.env.QUERY_WRITE_TIMEOUT_MS || '30000', 10),
  
  // Path queries
  MAX_PATH_HOPS: parseInt(process.env.QUERY_MAX_PATH_HOPS || '5', 10),
  MAX_PATH_RESULTS: parseInt(process.env.QUERY_MAX_PATH_RESULTS || '10', 10),
} as const;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_CONFIG = {
  // TTL (Time To Live) in seconds
  DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10), // 1 hour
  SHORT_TTL: parseInt(process.env.CACHE_SHORT_TTL || '300', 10), // 5 minutes
  LONG_TTL: parseInt(process.env.CACHE_LONG_TTL || '86400', 10), // 24 hours
  
  // Cache sizes
  MAX_CACHE_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  
  // Stampede protection
  ENABLE_STAMPEDE_PROTECTION: process.env.CACHE_STAMPEDE_PROTECTION !== 'false',
  STAMPEDE_LOCK_TTL_MS: parseInt(process.env.CACHE_STAMPEDE_LOCK_TTL_MS || '5000', 10),
} as const;

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

export const PERFORMANCE_CONFIG = {
  // Batch operations
  BULK_INSERT_BATCH_SIZE: parseInt(process.env.BULK_INSERT_BATCH_SIZE || '1000', 10),
  BULK_UPDATE_BATCH_SIZE: parseInt(process.env.BULK_UPDATE_BATCH_SIZE || '500', 10),
  
  // Concurrency
  MAX_CONCURRENT_QUERIES: parseInt(process.env.MAX_CONCURRENT_QUERIES || '10', 10),
  MAX_CONCURRENT_SYNCS: parseInt(process.env.MAX_CONCURRENT_SYNCS || '5', 10),
  
  // Thresholds
  SLOW_QUERY_THRESHOLD_MS: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10),
  LARGE_RESULT_SET_THRESHOLD: parseInt(process.env.LARGE_RESULT_THRESHOLD || '1000', 10),
} as const;

// ============================================================================
// MONITORING CONFIGURATION
// ============================================================================

export const MONITORING_CONFIG = {
  // Health checks
  HEALTH_CHECK_INTERVAL_MS: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000', 10),
  HEALTH_CHECK_TIMEOUT_MS: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000', 10),
  
  // Metrics
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
  METRICS_INTERVAL_MS: parseInt(process.env.METRICS_INTERVAL_MS || '60000', 10),
  
  // Logging
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  LOG_SLOW_QUERIES: process.env.LOG_SLOW_QUERIES !== 'false',
  LOG_QUERY_PARAMS: process.env.LOG_QUERY_PARAMS === 'true', // Disabled by default for security
} as const;

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

export const SECURITY_CONFIG = {
  // Input validation
  ENABLE_STRICT_VALIDATION: process.env.ENABLE_STRICT_VALIDATION !== 'false',
  MAX_QUERY_LENGTH: parseInt(process.env.MAX_QUERY_LENGTH || '10000', 10),
  MAX_PARAM_SIZE_BYTES: parseInt(process.env.MAX_PARAM_SIZE_BYTES || '1048576', 10), // 1MB
  
  // Rate limiting
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Encryption
  ENCRYPT_CONNECTIONS: process.env.NEO4J_ENCRYPTED === 'true',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_ENGAGEMENT_SYNC: process.env.ENABLE_ENGAGEMENT_SYNC !== 'false',
  ENABLE_ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS !== 'false',
  ENABLE_PATTERN_DISCOVERY: process.env.ENABLE_PATTERN_DISCOVERY !== 'false',
  ENABLE_RECOMMENDATIONS: process.env.ENABLE_RECOMMENDATIONS !== 'false',
  ENABLE_SAFEGUARDS: process.env.ENABLE_SAFEGUARDS !== 'false',
  
  // Experimental features
  ENABLE_EXPERIMENTAL_FEATURES: process.env.ENABLE_EXPERIMENTAL === 'true',
} as const;

// ============================================================================
// DATA CONSISTENCY
// ============================================================================

export const CONSISTENCY_CONFIG = {
  // Conflict detection
  ENABLE_CONFLICT_DETECTION: process.env.ENABLE_CONFLICT_DETECTION !== 'false',
  CONFLICT_CHECK_INTERVAL_MS: parseInt(process.env.CONFLICT_CHECK_INTERVAL_MS || '3600000', 10), // 1 hour
  
  // Data validation
  ENABLE_DATA_VALIDATION: process.env.ENABLE_DATA_VALIDATION !== 'false',
  STRICT_MODE: process.env.STRICT_MODE === 'true',
  
  // Stale data thresholds
  STALE_DATA_THRESHOLD_MS: parseInt(process.env.STALE_DATA_THRESHOLD_MS || '86400000', 10), // 24 hours
} as const;

// ============================================================================
// ENGAGEMENT CONFIGURATION
// ============================================================================

export const ENGAGEMENT_CONFIG = {
  // Scoring
  VOTE_POINTS: parseInt(process.env.ENGAGEMENT_VOTE_POINTS || '10', 10),
  COMMENT_POINTS: parseInt(process.env.ENGAGEMENT_COMMENT_POINTS || '5', 10),
  BOOKMARK_POINTS: parseInt(process.env.ENGAGEMENT_BOOKMARK_POINTS || '3', 10),
  FOLLOW_POINTS: parseInt(process.env.ENGAGEMENT_FOLLOW_POINTS || '2', 10),
  
  // Community detection
  MIN_COALITION_SIZE: parseInt(process.env.MIN_COALITION_SIZE || '3', 10),
  COALITION_AGREEMENT_THRESHOLD: parseFloat(process.env.COALITION_AGREEMENT_THRESHOLD || '0.75'),
  
  // Influence thresholds
  MIN_INFLUENCE_SCORE: parseInt(process.env.MIN_INFLUENCE_SCORE || '50', 10),
  INFLUENTIAL_USER_THRESHOLD: parseInt(process.env.INFLUENTIAL_USER_THRESHOLD || '100', 10),
} as const;

// ============================================================================
// RECOMMENDATION CONFIGURATION
// ============================================================================

export const RECOMMENDATION_CONFIG = {
  // Algorithm weights
  COLLABORATIVE_FILTERING_WEIGHT: parseFloat(process.env.COLLAB_FILTER_WEIGHT || '0.4'),
  CONTENT_SIMILARITY_WEIGHT: parseFloat(process.env.CONTENT_SIM_WEIGHT || '0.3'),
  TRUST_NETWORK_WEIGHT: parseFloat(process.env.TRUST_NETWORK_WEIGHT || '0.2'),
  EXPERTISE_WEIGHT: parseFloat(process.env.EXPERTISE_WEIGHT || '0.1'),
  
  // Result limits
  MAX_RECOMMENDATIONS: parseInt(process.env.MAX_RECOMMENDATIONS || '20', 10),
  MIN_RECOMMENDATION_SCORE: parseFloat(process.env.MIN_RECOMMENDATION_SCORE || '0.5'),
  
  // Diversity
  ENABLE_DIVERSITY_BOOST: process.env.ENABLE_DIVERSITY_BOOST !== 'false',
  DIVERSITY_FACTOR: parseFloat(process.env.DIVERSITY_FACTOR || '0.2'),
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate all configuration values are within acceptable ranges.
 * 
 * @throws {Error} If any configuration value is invalid
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate positive integers
  if (SYNC_CONFIG.BATCH_SIZE <= 0) {
    errors.push('SYNC_BATCH_SIZE must be positive');
  }

  if (SYNC_CONFIG.BATCH_SIZE > SYNC_CONFIG.MAX_BATCH_SIZE) {
    errors.push('SYNC_BATCH_SIZE cannot exceed SYNC_MAX_BATCH_SIZE');
  }

  if (QUERY_CONFIG.DEFAULT_LIMIT > QUERY_CONFIG.MAX_LIMIT) {
    errors.push('QUERY_DEFAULT_LIMIT cannot exceed QUERY_MAX_LIMIT');
  }

  // Validate weights sum to 1.0
  const totalWeight =
    RECOMMENDATION_CONFIG.COLLABORATIVE_FILTERING_WEIGHT +
    RECOMMENDATION_CONFIG.CONTENT_SIMILARITY_WEIGHT +
    RECOMMENDATION_CONFIG.TRUST_NETWORK_WEIGHT +
    RECOMMENDATION_CONFIG.EXPERTISE_WEIGHT;

  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push('Recommendation weights must sum to 1.0');
  }

  // Validate thresholds
  if (ENGAGEMENT_CONFIG.COALITION_AGREEMENT_THRESHOLD < 0 ||
      ENGAGEMENT_CONFIG.COALITION_AGREEMENT_THRESHOLD > 1) {
    errors.push('COALITION_AGREEMENT_THRESHOLD must be between 0 and 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration summary for logging/debugging.
 * Excludes sensitive values like passwords.
 * 
 * @returns Configuration summary object
 */
export function getConfigSummary(): Record<string, any> {
  return {
    neo4j: {
      uri: NEO4J_CONFIG.URI,
      user: NEO4J_CONFIG.USER,
      maxPoolSize: NEO4J_CONFIG.MAX_CONNECTION_POOL_SIZE,
    },
    sync: {
      intervalMs: SYNC_CONFIG.INTERVAL_MS,
      batchSize: SYNC_CONFIG.BATCH_SIZE,
      autoSyncEnabled: SYNC_CONFIG.ENABLE_AUTO_SYNC,
    },
    query: {
      defaultLimit: QUERY_CONFIG.DEFAULT_LIMIT,
      maxLimit: QUERY_CONFIG.MAX_LIMIT,
    },
    features: FEATURE_FLAGS,
    environment: process.env.NODE_ENV || 'development',
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  NEO4J_CONFIG,
  SYNC_CONFIG,
  QUERY_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_CONFIG,
  MONITORING_CONFIG,
  SECURITY_CONFIG,
  FEATURE_FLAGS,
  CONSISTENCY_CONFIG,
  ENGAGEMENT_CONFIG,
  RECOMMENDATION_CONFIG,
  validateConfig,
  getConfigSummary,
};
