/**
 * Configuration Schema Definitions
 * 
 * Comprehensive Zod schemas for validating application configuration
 * Based on enhanced patterns from refined_cross_cutting.ts
 */

import { z } from 'zod';
// import { logger } from '../observability/logging'; // Unused import

// Enhanced schema with comprehensive validation
export const configSchema = z.object({
  // Environment and application settings
  app: z.object({
    name: z.string().default('Chanuka'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    port: z.coerce.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }),

  // Cache configuration with validation
  cache: z.object({
    provider: z.enum(['redis', 'memory', 'multi-tier']).default('redis'),
    defaultTtlSec: z.coerce.number().min(1).max(86400).default(300), // Max 24 hours
    redisUrl: z.string().url().default('redis://localhost:6379'),
    legacyCompression: z.coerce.boolean().default(true),
    legacyPrefixing: z.coerce.boolean().default(true),
    maxMemoryMB: z.coerce.number().min(1).max(1000).default(100), // Max 1GB
    compressionThreshold: z.coerce.number().min(100).default(1024), // Compress if > 1KB
    l1MaxSizeMB: z.coerce.number().min(1).max(500).default(50), // L1 cache size for multi-tier
  }),
  
  // Enhanced logging configuration  
  log: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
    redactPaths: z.array(z.string()).default(['*.password', '*.token', '*.ssn', '*.creditCard']),
    asyncTransport: z.coerce.boolean().default(true),
    maxFileSize: z.string().regex(/^\d+[kmg]b?$/i).default('10mb'), // e.g., "10mb", "1gb"
    maxFiles: z.coerce.number().min(1).default(5),
    enableMetrics: z.coerce.boolean().default(true),
  }),
  
  // Enhanced rate limiting with algorithm selection
  rateLimit: z.object({
    provider: z.enum(['redis', 'memory']).default('redis'),
    defaultMax: z.coerce.number().min(1).max(10000).default(100),
    defaultWindowMs: z.coerce.number().min(1000).max(3600000).default(60000), // 1s to 1h
    legacyResponseBody: z.coerce.boolean().default(true),
    algorithm: z.enum(['sliding-window', 'token-bucket', 'fixed-window']).default('sliding-window'),
    burstAllowance: z.coerce.number().min(0).max(1).default(0.2), // 20% burst
    enableDistributedMode: z.coerce.boolean().default(false),
  }),
  
  // Error handling with enhanced options
  errors: z.object({
    includeStack: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
    logErrors: z.coerce.boolean().default(true),
    reportToSentry: z.coerce.boolean().default(false),
    sentryDsn: z.string().url().optional(),
    maxStackTraceDepth: z.coerce.number().min(5).max(50).default(20),
    enableCircuitBreaker: z.coerce.boolean().default(true),
    circuitBreakerThreshold: z.coerce.number().min(1).max(20).default(5),
    circuitBreakerTimeout: z.coerce.number().min(1000).max(300000).default(60000),
  }),
  
  // Enhanced security configuration
  security: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiryHours: z.coerce.number().min(1).max(168).default(24), // Max 1 week
    jwtRefreshExpiryHours: z.coerce.number().min(24).max(720).default(168), // Default 1 week
    bcryptRounds: z.coerce.number().min(10).max(15).default(12),
    corsOrigins: z.array(z.string().url()).default(['http://localhost:3000']),
    rateLimitByIp: z.coerce.boolean().default(true),
    enableCsrf: z.coerce.boolean().default(true),
    sessionSecret: z.string().min(32).optional(),
    maxRequestSize: z.string().regex(/^\d+[kmg]b?$/i).default('10mb'),
  }),
  
  // Enhanced storage configuration
  storage: z.object({
    provider: z.enum(['local', 's3', 'cloudflare-r2', 'gcs']).default('local'),
    localPath: z.string().default('./uploads'),
    maxFileSizeMB: z.coerce.number().min(1).max(100).default(10),
    allowedMimeTypes: z.array(z.string()).default([
      'image/jpeg', 'image/png', 'image/webp', 
      'application/pdf', 'text/plain', 'application/json'
    ]),
    enableVirusScanning: z.coerce.boolean().default(false),
    compressionQuality: z.coerce.number().min(1).max(100).default(85),
  }),

  // Database configuration
  database: z.object({
    url: z.string().url(),
    maxConnections: z.coerce.number().min(1).max(100).default(10),
    connectionTimeout: z.coerce.number().min(1000).max(30000).default(5000),
    enableQueryLogging: z.coerce.boolean().default(false),
    enableSlowQueryLogging: z.coerce.boolean().default(true),
    slowQueryThreshold: z.coerce.number().min(100).default(1000),
  }),
  
  // Feature flags with metadata
  features: z.record(z.object({
    enabled: z.coerce.boolean(),
    description: z.string().optional(),
    rolloutPercentage: z.coerce.number().min(0).max(100).default(100),
    enabledForUsers: z.array(z.string()).default([]),
  })).default({
    newAuth: { enabled: false, description: 'New authentication system' },
    advancedSearch: { enabled: false, description: 'Enhanced search capabilities' },
    imageOptimization: { enabled: true, description: 'Automatic image optimization' },
  }),

  // Monitoring and observability
  monitoring: z.object({
    enableHealthCheck: z.coerce.boolean().default(true),
    healthCheckPath: z.string().default('/health'),
    enableMetrics: z.coerce.boolean().default(true),
    metricsPath: z.string().default('/metrics'),
    enableTracing: z.coerce.boolean().default(false),
    tracingSampleRate: z.coerce.number().min(0).max(1).default(0.1),
  }),

  // Validation configuration
  validation: z.object({
    enableCaching: z.coerce.boolean().default(true),
    cacheTimeout: z.coerce.number().min(1000).max(3600000).default(300000), // 5 minutes
    enablePreprocessing: z.coerce.boolean().default(true),
    strictMode: z.coerce.boolean().default(true),
  }),

  // Utilities configuration - centralized settings for all utility modules
  utilities: z.object({
    // API utilities configuration
    api: z.object({
      timeout: z.coerce.number().min(1000).max(300000).default(10000), // 10 seconds
      retries: z.coerce.number().min(0).max(10).default(3),
      retryDelay: z.coerce.number().min(100).max(30000).default(1000), // 1 second
      circuitBreaker: z.object({
        enabled: z.coerce.boolean().default(true),
        threshold: z.coerce.number().min(1).max(20).default(5),
        timeout: z.coerce.number().min(1000).max(300000).default(60000), // 1 minute
        resetTimeout: z.coerce.number().min(1000).max(300000).default(30000), // 30 seconds
      }),
      batch: z.object({
        maxConcurrent: z.coerce.number().min(1).max(20).default(5),
        maxBatchSize: z.coerce.number().min(1).max(100).default(10),
      }),
    }),

    // Asset loading configuration
    assets: z.object({
      critical: z.object({
        maxRetries: z.coerce.number().min(0).max(10).default(3),
        retryDelay: z.coerce.number().min(100).max(10000).default(1000),
        timeout: z.coerce.number().min(1000).max(60000).default(10000),
        priority: z.enum(['high', 'medium', 'low']).default('high'),
        connectionAware: z.coerce.boolean().default(true),
      }),
      script: z.object({
        maxRetries: z.coerce.number().min(0).max(10).default(2),
        retryDelay: z.coerce.number().min(100).max(10000).default(1500),
        timeout: z.coerce.number().min(1000).max(60000).default(15000),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
        connectionAware: z.coerce.boolean().default(true),
      }),
      style: z.object({
        maxRetries: z.coerce.number().min(0).max(10).default(2),
        retryDelay: z.coerce.number().min(100).max(10000).default(1000),
        timeout: z.coerce.number().min(1000).max(60000).default(8000),
        priority: z.enum(['high', 'medium', 'low']).default('high'),
        connectionAware: z.coerce.boolean().default(false),
      }),
      image: z.object({
        maxRetries: z.coerce.number().min(0).max(10).default(1),
        retryDelay: z.coerce.number().min(100).max(10000).default(2000),
        timeout: z.coerce.number().min(1000).max(60000).default(12000),
        priority: z.enum(['high', 'medium', 'low']).default('low'),
        connectionAware: z.coerce.boolean().default(true),
      }),
      font: z.object({
        maxRetries: z.coerce.number().min(0).max(10).default(2),
        retryDelay: z.coerce.number().min(100).max(10000).default(1000),
        timeout: z.coerce.number().min(1000).max(60000).default(8000),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
        connectionAware: z.coerce.boolean().default(true),
      }),
      connection: z.object({
        slowThreshold: z.coerce.number().min(0.1).max(10).default(1.5), // Mbps
        fastThreshold: z.coerce.number().min(1).max(100).default(5), // Mbps
        slowRetryMultiplier: z.coerce.number().min(1).max(5).default(1.5),
        slowTimeoutMultiplier: z.coerce.number().min(1).max(3).default(1.5),
      }),
      performance: z.object({
        slowLoadThreshold: z.coerce.number().min(1000).max(30000).default(3000), // 3 seconds
        cacheExpiryMs: z.coerce.number().min(30000).max(86400000).default(1800000), // 30 minutes
        preloadOnInteraction: z.coerce.boolean().default(true),
      }),
    }),

    // Token management configuration
    tokens: z.object({
      metadataKey: z.string().default('chanuka_token_metadata'),
      userDataKey: z.string().default('chanuka_user_data'),
      refreshBufferMinutes: z.coerce.number().min(1).max(60).default(5),
      maxRefreshRetries: z.coerce.number().min(1).max(10).default(3),
      refreshRetryDelay: z.coerce.number().min(100).max(10000).default(1000),
      tokenValidationInterval: z.coerce.number().min(1000).max(60000).default(30000), // 30 seconds
      enableSilentRefresh: z.coerce.boolean().default(true),
      enableAutoCleanup: z.coerce.boolean().default(true),
    }),

    // Error handling and recovery configuration
    errors: z.object({
      recovery: z.object({
        enabled: z.coerce.boolean().default(true),
        maxRecoveryAttempts: z.coerce.number().min(1).max(10).default(3),
        recoveryTimeout: z.coerce.number().min(1000).max(60000).default(10000),
      }),
      strategies: z.object({
        networkRetry: z.object({
          enabled: z.coerce.boolean().default(true),
          maxRetries: z.coerce.number().min(1).max(10).default(3),
          baseDelay: z.coerce.number().min(100).max(5000).default(1000),
          maxDelay: z.coerce.number().min(1000).max(30000).default(10000),
          backoffMultiplier: z.coerce.number().min(1).max(3).default(2),
        }),
        authRefresh: z.object({
          enabled: z.coerce.boolean().default(true),
          maxRetries: z.coerce.number().min(1).max(5).default(2),
          retryDelay: z.coerce.number().min(100).max(5000).default(500),
        }),
        cacheClear: z.object({
          enabled: z.coerce.boolean().default(true),
          clearLocalStorage: z.coerce.boolean().default(true),
          clearSessionStorage: z.coerce.boolean().default(true),
        }),
      }),
      logging: z.object({
        includeContext: z.coerce.boolean().default(true),
        includeStack: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
        maxContextDepth: z.coerce.number().min(1).max(10).default(3),
        enableMetrics: z.coerce.boolean().default(true),
      }),
    }),

    // Performance monitoring configuration
    performance: z.object({
      renderTracker: z.object({
        enabled: z.coerce.boolean().default(true),
        sampleRate: z.coerce.number().min(0).max(1).default(0.1),
        maxTrackedComponents: z.coerce.number().min(10).max(1000).default(100),
        slowRenderThreshold: z.coerce.number().min(10).max(1000).default(16), // 16ms
        enableMemoryTracking: z.coerce.boolean().default(true),
      }),
      assetTracker: z.object({
        enabled: z.coerce.boolean().default(true),
        trackLoadTimes: z.coerce.boolean().default(true),
        trackCacheHits: z.coerce.boolean().default(true),
        slowAssetThreshold: z.coerce.number().min(1000).max(30000).default(3000),
      }),
    }),

    // Storage and caching configuration
    storage: z.object({
      secureStorage: z.object({
        prefix: z.string().default('chanuka_secure_'),
        enableEncryption: z.coerce.boolean().default(false),
        encryptionKey: z.string().optional(),
        maxItems: z.coerce.number().min(10).max(1000).default(100),
        ttlMs: z.coerce.number().min(60000).max(86400000).default(3600000), // 1 hour
      }),
      cache: z.object({
        enableFallback: z.coerce.boolean().default(true),
        maxFallbackSize: z.coerce.number().min(1).max(100).default(10), // MB
        enableCompression: z.coerce.boolean().default(true),
        compressionThreshold: z.coerce.number().min(100).max(10000).default(1024), // 1KB
      }),
    }),
  }).default({
    api: {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000,
      },
      batch: {
        maxConcurrent: 5,
        maxBatchSize: 10,
      },
    },
    assets: {
      critical: {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 10000,
        priority: 'high',
        connectionAware: true,
      },
      script: {
        maxRetries: 2,
        retryDelay: 1500,
        timeout: 15000,
        priority: 'medium',
        connectionAware: true,
      },
      style: {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 8000,
        priority: 'high',
        connectionAware: false,
      },
      image: {
        maxRetries: 1,
        retryDelay: 2000,
        timeout: 12000,
        priority: 'low',
        connectionAware: true,
      },
      font: {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 8000,
        priority: 'medium',
        connectionAware: true,
      },
      connection: {
        slowThreshold: 1.5,
        fastThreshold: 5,
        slowRetryMultiplier: 1.5,
        slowTimeoutMultiplier: 1.5,
      },
      performance: {
        slowLoadThreshold: 3000,
        cacheExpiryMs: 1800000,
        preloadOnInteraction: true,
      },
    },
    tokens: {
      metadataKey: 'chanuka_token_metadata',
      userDataKey: 'chanuka_user_data',
      refreshBufferMinutes: 5,
      maxRefreshRetries: 3,
      refreshRetryDelay: 1000,
      tokenValidationInterval: 30000,
      enableSilentRefresh: true,
      enableAutoCleanup: true,
    },
    errors: {
      recovery: {
        enabled: true,
        maxRecoveryAttempts: 3,
        recoveryTimeout: 10000,
      },
      strategies: {
        networkRetry: {
          enabled: true,
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        authRefresh: {
          enabled: true,
          maxRetries: 2,
          retryDelay: 500,
        },
        cacheClear: {
          enabled: true,
          clearLocalStorage: true,
          clearSessionStorage: true,
        },
      },
      logging: {
        includeContext: true,
        includeStack: process.env.NODE_ENV !== 'production',
        maxContextDepth: 3,
        enableMetrics: true,
      },
    },
    performance: {
      renderTracker: {
        enabled: true,
        sampleRate: 0.1,
        maxTrackedComponents: 100,
        slowRenderThreshold: 16,
        enableMemoryTracking: true,
      },
      assetTracker: {
        enabled: true,
        trackLoadTimes: true,
        trackCacheHits: true,
        slowAssetThreshold: 3000,
      },
    },
    storage: {
      secureStorage: {
        prefix: 'chanuka_secure_',
        enableEncryption: false,
        maxItems: 100,
        ttlMs: 3600000,
      },
      cache: {
        enableFallback: true,
        maxFallbackSize: 10,
        enableCompression: true,
        compressionThreshold: 1024,
      },
    },
  }),
});

// Type inference for better TypeScript support
export type AppConfig = z.infer<typeof configSchema>;

// Environment variable mapping for common patterns
export const envMapping = {
  // App settings
  'NODE_ENV': 'app.environment',
  'PORT': 'app.port',
  'HOST': 'app.host',
  'APP_NAME': 'app.name',
  'APP_VERSION': 'app.version',
  
  // Cache settings
  'REDIS_URL': 'cache.redisUrl',
  'CACHE_PROVIDER': 'cache.provider',
  'CACHE_TTL': 'cache.defaultTtlSec',
  'CACHE_MAX_MEMORY': 'cache.maxMemoryMB',
  
  // Database settings
  'DATABASE_URL': 'database.url',
  'DB_MAX_CONNECTIONS': 'database.maxConnections',
  'DB_CONNECTION_TIMEOUT': 'database.connectionTimeout',
  
  // Security settings
  'JWT_SECRET': 'security.jwtSecret',
  'JWT_EXPIRY_HOURS': 'security.jwtExpiryHours',
  'SESSION_SECRET': 'security.sessionSecret',
  
  // Logging settings
  'LOG_LEVEL': 'log.level',
  'LOG_PRETTY': 'log.pretty',
  'LOG_MAX_FILES': 'log.maxFiles',
  
  // Rate limiting settings
  'RATE_LIMIT_MAX': 'rateLimit.defaultMax',
  'RATE_LIMIT_WINDOW': 'rateLimit.defaultWindowMs',
  'RATE_LIMIT_ALGORITHM': 'rateLimit.algorithm',
  
  // Error handling settings
  'SENTRY_DSN': 'errors.sentryDsn',
  'ENABLE_CIRCUIT_BREAKER': 'errors.enableCircuitBreaker',
  
  // Monitoring settings
  'ENABLE_HEALTH_CHECK': 'monitoring.enableHealthCheck',
  'HEALTH_CHECK_PATH': 'monitoring.healthCheckPath',

  // Utilities - API settings
  'UTILITIES_API_TIMEOUT': 'utilities.api.timeout',
  'UTILITIES_API_RETRIES': 'utilities.api.retries',
  'UTILITIES_API_RETRY_DELAY': 'utilities.api.retryDelay',
  'UTILITIES_API_CIRCUIT_BREAKER_ENABLED': 'utilities.api.circuitBreaker.enabled',
  'UTILITIES_API_CIRCUIT_BREAKER_THRESHOLD': 'utilities.api.circuitBreaker.threshold',
  'UTILITIES_API_CIRCUIT_BREAKER_TIMEOUT': 'utilities.api.circuitBreaker.timeout',

  // Utilities - Asset loading settings
  'UTILITIES_ASSETS_CRITICAL_MAX_RETRIES': 'utilities.assets.critical.maxRetries',
  'UTILITIES_ASSETS_CRITICAL_TIMEOUT': 'utilities.assets.critical.timeout',
  'UTILITIES_ASSETS_SCRIPT_MAX_RETRIES': 'utilities.assets.script.maxRetries',
  'UTILITIES_ASSETS_SCRIPT_TIMEOUT': 'utilities.assets.script.timeout',
  'UTILITIES_ASSETS_IMAGE_MAX_RETRIES': 'utilities.assets.image.maxRetries',
  'UTILITIES_ASSETS_IMAGE_TIMEOUT': 'utilities.assets.image.timeout',
  'UTILITIES_ASSETS_CONNECTION_SLOW_THRESHOLD': 'utilities.assets.connection.slowThreshold',
  'UTILITIES_ASSETS_CONNECTION_FAST_THRESHOLD': 'utilities.assets.connection.fastThreshold',

  // Utilities - Token management settings
  'UTILITIES_TOKENS_METADATA_KEY': 'utilities.tokens.metadataKey',
  'UTILITIES_TOKENS_REFRESH_BUFFER_MINUTES': 'utilities.tokens.refreshBufferMinutes',
  'UTILITIES_TOKENS_MAX_REFRESH_RETRIES': 'utilities.tokens.maxRefreshRetries',
  'UTILITIES_TOKENS_ENABLE_SILENT_REFRESH': 'utilities.tokens.enableSilentRefresh',

  // Utilities - Error handling settings
  'UTILITIES_ERRORS_RECOVERY_ENABLED': 'utilities.errors.recovery.enabled',
  'UTILITIES_ERRORS_RECOVERY_MAX_ATTEMPTS': 'utilities.errors.recovery.maxRecoveryAttempts',
  'UTILITIES_ERRORS_STRATEGIES_NETWORK_RETRY_ENABLED': 'utilities.errors.strategies.networkRetry.enabled',
  'UTILITIES_ERRORS_STRATEGIES_AUTH_REFRESH_ENABLED': 'utilities.errors.strategies.authRefresh.enabled',

  // Utilities - Performance settings
  'UTILITIES_PERFORMANCE_RENDER_TRACKER_ENABLED': 'utilities.performance.renderTracker.enabled',
  'UTILITIES_PERFORMANCE_RENDER_TRACKER_SAMPLE_RATE': 'utilities.performance.renderTracker.sampleRate',
  'UTILITIES_PERFORMANCE_ASSET_TRACKER_ENABLED': 'utilities.performance.assetTracker.enabled',

  // Utilities - Storage settings
  'UTILITIES_STORAGE_SECURE_STORAGE_PREFIX': 'utilities.storage.secureStorage.prefix',
  'UTILITIES_STORAGE_SECURE_STORAGE_ENABLE_ENCRYPTION': 'utilities.storage.secureStorage.enableEncryption',
  'UTILITIES_STORAGE_CACHE_ENABLE_FALLBACK': 'utilities.storage.cache.enableFallback',
} as const;

// Default feature flags
export const defaultFeatures = {
  coreUtilities: {
    enabled: true,
    description: 'Core utilities consolidation',
    rolloutPercentage: 100,
    enabledForUsers: [],
  },
  enhancedLogging: {
    enabled: true,
    description: 'Enhanced structured logging with context preservation',
    rolloutPercentage: 100,
    enabledForUsers: [],
  },
  multiTierCache: {
    enabled: true,
    description: 'Multi-tier cache with L1/L2 support',
    rolloutPercentage: 100,
    enabledForUsers: [],
  },
  advancedRateLimit: {
    enabled: true,
    description: 'Advanced rate limiting with multiple algorithms',
    rolloutPercentage: 100,
    enabledForUsers: [],
  },
  circuitBreaker: {
    enabled: true,
    description: 'Circuit breaker pattern for resilience',
    rolloutPercentage: 100,
    enabledForUsers: [],
  },
} as const;















































