/**
 * Configuration Schema Definitions
 * 
 * Comprehensive Zod schemas for validating application configuration
 * Based on enhanced patterns from refined_cross_cutting.ts
 */

import { z } from 'zod';
import { logger } from '../observability/logging';

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












































