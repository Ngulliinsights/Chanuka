// Server Configuration Management
// Comprehensive, type-safe configuration for all server services

import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration utilities (defined early to avoid initialization issues)
export const isDev = (): boolean => {
  try {
    return (process.env?.NODE_ENV || 'development') === 'development';
  } catch {
    return true; // Default to development
  }
};

export const isProd = (): boolean => {
  try {
    return (process.env?.NODE_ENV || 'development') === 'production';
  } catch {
    return false;
  }
};

export const isTesting = (): boolean => {
  try {
    return (process.env?.NODE_ENV || 'development') === 'test';
  } catch {
    return false;
  }
};

// Environment detection with comprehensive fallback logic
const isDevEnvironment = (): boolean => {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
  } catch {
    // process might not be available in some environments
  }
  return false;
};

const isTestEnvironment = (): boolean => {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return true;
    }
  } catch {
    // process might not be available in some environments
  }
  return false;
};

const isProdEnvironment = (): boolean => {
  return !isDevEnvironment() && !isTestEnvironment();
};

// Safe environment variable accessor with type safety
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    const value = process.env[key];
    if (value !== undefined) return value;
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

// Parse environment variable as number with fallback
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  if (value) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
};

// Parse environment variable as boolean with fallback
const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key);
  if (value) {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return defaultValue;
};

// Parse environment variable as array with fallback
const getEnvArray = (key: string, defaultValue: string[] = []): string[] => {
  const value = getEnvVar(key);
  if (value) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return defaultValue;
};

// Configuration validation schemas using Zod
const serverConfigSchema = z.object({
  port: z.number().int().positive().default(5000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  host: z.string().default('0.0.0.0'),
  frontendUrl: z.string().optional(),
  enableHttps: z.boolean().default(false),
  sslKeyPath: z.string().optional(),
  sslCertPath: z.string().optional(),
});

const databaseConfigSchema = z.object({
  url: z.string().optional(),
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(5432),
  name: z.string().default('chanuka'),
  user: z.string().default('postgres'),
  password: z.string().default(''),
  ssl: z.boolean().default(false),
  maxConnections: z.number().int().positive().default(20),
  minConnections: z.number().int().min(0).default(2),
  connectionTimeoutMillis: z.number().int().positive().default(10000),
  idleTimeoutMillis: z.number().int().positive().default(30000),
  queryTimeoutMillis: z.number().int().positive().default(60000),
});

const authConfigSchema = z.object({
  jwtSecret: z.string().min(32).default('development-jwt-secret-change-in-production'),
  jwtExpiresIn: z.string().default('24h'),
  sessionSecret: z.string().min(32).default('development-session-secret-change-in-production'),
  sessionMaxAge: z.number().int().positive().default(86400000), // 24 hours
  refreshTokenExpiresIn: z.string().default('7d'),
  bcryptRounds: z.number().int().min(8).max(16).default(12),
  enablePasswordReset: z.boolean().default(true),
  passwordResetTokenExpiresIn: z.string().default('1h'),
});

const emailConfigSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().default(587),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().default(false),
  fromEmail: z.string().email().default('noreply@chanuka.app'),
  fromName: z.string().default('Chanuka Platform'),
  enableEmailVerification: z.boolean().default(true),
  enableNotifications: z.boolean().default(true),
});

const redisConfigSchema = z.object({
  url: z.string().default('redis://localhost:6379'),
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).default(0),
  keyPrefix: z.string().default('chanuka:'),
  ttl: z.number().int().positive().default(3600), // 1 hour
  enableClustering: z.boolean().default(false),
});

const externalApiConfigSchema = z.object({
  openai: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().default('https://api.openai.com/v1'),
    timeout: z.number().int().positive().default(30000),
    maxRetries: z.number().int().min(0).default(3),
    models: z.object({
      gpt4: z.string().default('gpt-4'),
      gpt35: z.string().default('gpt-3.5-turbo'),
    }),
  }),
  anthropic: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().default('https://api.anthropic.com'),
    timeout: z.number().int().positive().default(30000),
    maxRetries: z.number().int().min(0).default(3),
    models: z.object({
      claude3: z.string().default('claude-3-sonnet-20240229'),
    }),
  }),
  governmentData: z.object({
    congressApiKey: z.string().optional(),
    congressBaseUrl: z.string().default('https://api.congress.gov/v3'),
    timeout: z.number().int().positive().default(30000),
    maxRetries: z.number().int().min(0).default(3),
    rateLimitPerMinute: z.number().int().positive().default(1000),
  }),
});

const featuresConfigSchema = z.object({
  enableAiAnalysis: z.boolean().default(false),
  enableExpertVerification: z.boolean().default(false),
  enableConflictDetection: z.boolean().default(true),
  enableRealTimeUpdates: z.boolean().default(true),
  enableSearchIndexing: z.boolean().default(true),
  enableCaching: z.boolean().default(true),
  enableMonitoring: z.boolean().default(true),
  enableSecurityAuditing: z.boolean().default(true),
  enablePrivacyScheduler: z.boolean().default(true),
  enableNotificationScheduler: z.boolean().default(true),
});

const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'critical']).default('info'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(false),
  logDirectory: z.string().default('./logs'),
  maxFileSize: z.string().default('10m'),
  maxFiles: z.string().default('5d'),
  enableStructuredLogging: z.boolean().default(true),
});

const corsConfigSchema = z.object({
  allowedOrigins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:5173']),
  allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']),
  allowedHeaders: z.array(z.string()).default([
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization',
    'Cache-Control', 'X-CSRF-Token', 'X-Request-ID', 'X-Admin-Request',
    'If-None-Match', 'If-Modified-Since'
  ]),
  exposedHeaders: z.array(z.string()).default([
    'X-Total-Count', 'X-Page-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining',
    'X-RateLimit-Reset', 'X-Request-ID', 'ETag', 'Last-Modified'
  ]),
  credentials: z.boolean().default(true),
  maxAge: z.number().int().positive().default(86400), // 24 hours
});

const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().positive().default(900000), // 15 minutes
  maxRequests: z.number().int().positive().default(100),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  keyGenerator: z.function().optional(),
});

const securityConfigSchema = z.object({
  enableHelmet: z.boolean().default(true),
  enableCsrfProtection: z.boolean().default(true),
  enableRateLimiting: z.boolean().default(true),
  enableSecurityMonitoring: z.boolean().default(true),
  enableIntrusionDetection: z.boolean().default(true),
  sessionCookieSecure: z.boolean().default(false), // false for development
  sessionCookieHttpOnly: z.boolean().default(true),
  sessionCookieSameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
  contentSecurityPolicy: z.object({
    defaultSrc: z.array(z.string()).default(["'self'"]),
    styleSrc: z.array(z.string()).default(["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]),
    fontSrc: z.array(z.string()).default(["'self'", "https://fonts.gstatic.com"]),
    imgSrc: z.array(z.string()).default(["'self'", "data:", "https:"]),
    scriptSrc: z.array(z.string()).default(["'self'"]),
    connectSrc: z.array(z.string()).default(["'self'"]),
    objectSrc: z.array(z.string()).default(["'none'"]),
    upgradeInsecureRequests: z.boolean().default(false),
  }),
});

const monitoringConfigSchema = z.object({
  enablePerformanceMonitoring: z.boolean().default(true),
  enableErrorTracking: z.boolean().default(true),
  enableAuditLogging: z.boolean().default(true),
  enableHealthChecks: z.boolean().default(true),
  healthCheckInterval: z.number().int().positive().default(30000), // 30 seconds
  metricsRetentionDays: z.number().int().positive().default(30),
  alertThresholds: z.object({
    responseTimeMs: z.number().int().positive().default(5000),
    errorRatePercent: z.number().int().min(0).max(100).default(5),
    memoryUsagePercent: z.number().int().min(0).max(100).default(80),
  }),
});

const cacheConfigSchema = z.object({
  defaultTtl: z.number().int().positive().default(3600), // 1 hour
  maxMemory: z.string().default('100mb'),
  enableCompression: z.boolean().default(true),
  enableSerialization: z.boolean().default(true),
});

const websocketConfigSchema = z.object({
  enableWebSocket: z.boolean().default(true),
  port: z.number().int().positive().optional(), // Uses same port as server
  heartbeatInterval: z.number().int().positive().default(30000), // 30 seconds
  maxConnections: z.number().int().positive().default(1000),
  enableAuthentication: z.boolean().default(true),
  enableRateLimiting: z.boolean().default(true),
});

const notificationConfigSchema = z.object({
  enablePushNotifications: z.boolean().default(true),
  enableEmailNotifications: z.boolean().default(true),
  enableSmsNotifications: z.boolean().default(false),
  maxRetries: z.number().int().min(0).default(3),
  retryDelayMs: z.number().int().positive().default(5000),
  batchSize: z.number().int().positive().default(50),
});

const privacyConfigSchema = z.object({
  enableDataRetention: z.boolean().default(true),
  dataRetentionDays: z.number().int().positive().default(2555), // 7 years
  enableAnonymization: z.boolean().default(true),
  enableAuditTrail: z.boolean().default(true),
  gdprCompliance: z.boolean().default(true),
  cookieConsentRequired: z.boolean().default(true),
});

const searchConfigSchema = z.object({
  enableFullTextSearch: z.boolean().default(true),
  enableFuzzySearch: z.boolean().default(true),
  maxResults: z.number().int().positive().default(100),
  searchTimeoutMs: z.number().int().positive().default(5000),
  indexUpdateInterval: z.number().int().positive().default(300000), // 5 minutes
});

const analyticsConfigSchema = z.object({
  enableUserAnalytics: z.boolean().default(true),
  enableBillAnalytics: z.boolean().default(true),
  enableSponsorAnalytics: z.boolean().default(true),
  enableConflictDetection: z.boolean().default(true),
  enableTransparencyMetrics: z.boolean().default(true),
  dataRetentionDays: z.number().int().positive().default(365),
});

const governmentDataConfigSchema = z.object({
  enableCongressApi: z.boolean().default(true),
  enableRegulatoryMonitoring: z.boolean().default(true),
  enableBillTracking: z.boolean().default(true),
  updateIntervalMinutes: z.number().int().positive().default(60),
  maxConcurrentRequests: z.number().int().positive().default(10),
  cacheTtlMinutes: z.number().int().positive().default(15),
});

const coverageConfigSchema = z.object({
  enableCoverageAnalysis: z.boolean().default(true),
  enableGapDetection: z.boolean().default(true),
  enableReporting: z.boolean().default(true),
  analysisIntervalHours: z.number().int().positive().default(24),
  reportRetentionDays: z.number().int().positive().default(90),
});

const adminConfigSchema = z.object({
  enableAdminPanel: z.boolean().default(true),
  enableSystemMonitoring: z.boolean().default(true),
  enableUserManagement: z.boolean().default(true),
  enableContentModeration: z.boolean().default(true),
  enableExternalApiManagement: z.boolean().default(true),
  maxLoginAttempts: z.number().int().positive().default(5),
  lockoutDurationMinutes: z.number().int().positive().default(15),
});

// Main configuration schema
const configSchema = z.object({
  server: serverConfigSchema,
  database: databaseConfigSchema,
  auth: authConfigSchema,
  email: emailConfigSchema,
  redis: redisConfigSchema,
  externalApi: externalApiConfigSchema,
  features: featuresConfigSchema,
  logging: loggingConfigSchema,
  cors: corsConfigSchema,
  rateLimit: rateLimitConfigSchema,
  security: securityConfigSchema,
  monitoring: monitoringConfigSchema,
  cache: cacheConfigSchema,
  websocket: websocketConfigSchema,
  notification: notificationConfigSchema,
  privacy: privacyConfigSchema,
  search: searchConfigSchema,
  analytics: analyticsConfigSchema,
  governmentData: governmentDataConfigSchema,
  coverage: coverageConfigSchema,
  admin: adminConfigSchema,
});

// Type exports for enhanced TypeScript integration
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type RedisConfig = z.infer<typeof redisConfigSchema>;
export type ExternalApiConfig = z.infer<typeof externalApiConfigSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type CorsConfig = z.infer<typeof corsConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;
export type CacheConfig = z.infer<typeof cacheConfigSchema>;
export type WebSocketConfig = z.infer<typeof websocketConfigSchema>;
export type NotificationConfig = z.infer<typeof notificationConfigSchema>;
export type PrivacyConfig = z.infer<typeof privacyConfigSchema>;
export type SearchConfig = z.infer<typeof searchConfigSchema>;
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;
export type GovernmentDataConfig = z.infer<typeof governmentDataConfigSchema>;
export type CoverageConfig = z.infer<typeof coverageConfigSchema>;
export type AdminConfig = z.infer<typeof adminConfigSchema>;
export type AppConfig = z.infer<typeof configSchema>;

// Utility function to merge configurations
function mergeConfigs(base: AppConfig, overrides: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...overrides,
    server: { ...base.server, ...overrides.server },
    database: { ...base.database, ...overrides.database },
    auth: { ...base.auth, ...overrides.auth },
    email: { ...base.email, ...overrides.email },
    redis: { ...base.redis, ...overrides.redis },
    externalApi: {
      ...base.externalApi,
      ...overrides.externalApi,
      openai: { ...base.externalApi.openai, ...overrides.externalApi?.openai },
      anthropic: { ...base.externalApi.anthropic, ...overrides.externalApi?.anthropic },
      governmentData: { ...base.externalApi.governmentData, ...overrides.externalApi?.governmentData },
    },
    features: { ...base.features, ...overrides.features },
    logging: { ...base.logging, ...overrides.logging },
    cors: { ...base.cors, ...overrides.cors },
    rateLimit: { ...base.rateLimit, ...overrides.rateLimit },
    security: { ...base.security, ...overrides.security },
    monitoring: { ...base.monitoring, ...overrides.monitoring },
    cache: { ...base.cache, ...overrides.cache },
    websocket: { ...base.websocket, ...overrides.websocket },
    notification: { ...base.notification, ...overrides.notification },
    privacy: { ...base.privacy, ...overrides.privacy },
    search: { ...base.search, ...overrides.search },
    analytics: { ...base.analytics, ...overrides.analytics },
    governmentData: { ...base.governmentData, ...overrides.governmentData },
    coverage: { ...base.coverage, ...overrides.coverage },
    admin: { ...base.admin, ...overrides.admin },
  };
}

// Load configuration based on environment
function loadEnvironmentConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';

  // For now, use the base config with environment-specific overrides
  // TODO: Load from separate config files when needed
  return createBaseConfig();
}

// Create base configuration
function createBaseConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig: AppConfig = {
    server: {
      port: getEnvNumber('PORT', 5000),
      nodeEnv: env as 'development' | 'production' | 'test',
      host: getEnvVar('HOST', '0.0.0.0'),
      frontendUrl: getEnvVar('FRONTEND_URL'),
      enableHttps: getEnvBoolean('ENABLE_HTTPS', false),
      sslKeyPath: getEnvVar('SSL_KEY_PATH'),
      sslCertPath: getEnvVar('SSL_CERT_PATH'),
    },
    database: {
      url: getEnvVar('DATABASE_URL'),
      host: getEnvVar('DB_HOST', 'localhost'),
      port: getEnvNumber('DB_PORT', 5432),
      name: getEnvVar('DB_NAME', 'chanuka'),
      user: getEnvVar('DB_USER', 'postgres'),
      password: getEnvVar('DB_PASSWORD', ''),
      ssl: getEnvBoolean('DB_SSL', false),
      maxConnections: getEnvNumber('DB_MAX_CONNECTIONS', 20),
      minConnections: getEnvNumber('DB_MIN_CONNECTIONS', 2),
      connectionTimeoutMillis: getEnvNumber('DB_CONNECTION_TIMEOUT', 10000),
      idleTimeoutMillis: getEnvNumber('DB_IDLE_TIMEOUT', 30000),
      queryTimeoutMillis: getEnvNumber('DB_QUERY_TIMEOUT', 60000),
    },
    auth: {
  jwtSecret: getEnvVar('JWT_SECRET', 'development-jwt-secret-change-in-production-please-change-in-production-2025'),
      jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  sessionSecret: getEnvVar('SESSION_SECRET', 'development-session-secret-change-in-production-please-change-2025'),
      sessionMaxAge: getEnvNumber('SESSION_MAX_AGE', 86400000),
      refreshTokenExpiresIn: getEnvVar('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
      enablePasswordReset: getEnvBoolean('ENABLE_PASSWORD_RESET', true),
      passwordResetTokenExpiresIn: getEnvVar('PASSWORD_RESET_TOKEN_EXPIRES_IN', '1h'),
    },
    email: {
      smtpHost: getEnvVar('SMTP_HOST'),
      smtpPort: getEnvNumber('SMTP_PORT', 587),
      smtpUser: getEnvVar('SMTP_USER'),
      smtpPass: getEnvVar('SMTP_PASS'),
      smtpSecure: getEnvBoolean('SMTP_SECURE', false),
      fromEmail: getEnvVar('FROM_EMAIL', 'noreply@chanuka.app'),
      fromName: getEnvVar('FROM_NAME', 'Chanuka Platform'),
      enableEmailVerification: getEnvBoolean('ENABLE_EMAIL_VERIFICATION', true),
      enableNotifications: getEnvBoolean('ENABLE_EMAIL_NOTIFICATIONS', true),
    },
    redis: {
      url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      host: getEnvVar('REDIS_HOST', 'localhost'),
      port: getEnvNumber('REDIS_PORT', 6379),
      password: getEnvVar('REDIS_PASSWORD'),
      db: getEnvNumber('REDIS_DB', 0),
      keyPrefix: getEnvVar('REDIS_KEY_PREFIX', 'chanuka:'),
      ttl: getEnvNumber('REDIS_TTL', 3600),
      enableClustering: getEnvBoolean('REDIS_CLUSTERING', false),
    },
    externalApi: {
      openai: {
        apiKey: getEnvVar('OPENAI_API_KEY'),
        baseUrl: getEnvVar('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        timeout: getEnvNumber('OPENAI_TIMEOUT', 30000),
        maxRetries: getEnvNumber('OPENAI_MAX_RETRIES', 3),
        models: {
          gpt4: getEnvVar('OPENAI_GPT4_MODEL', 'gpt-4'),
          gpt35: getEnvVar('OPENAI_GPT35_MODEL', 'gpt-3.5-turbo'),
        },
      },
      anthropic: {
        apiKey: getEnvVar('ANTHROPIC_API_KEY'),
        baseUrl: getEnvVar('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
        timeout: getEnvNumber('ANTHROPIC_TIMEOUT', 30000),
        maxRetries: getEnvNumber('ANTHROPIC_MAX_RETRIES', 3),
        models: {
          claude3: getEnvVar('ANTHROPIC_CLAUDE3_MODEL', 'claude-3-sonnet-20240229'),
        },
      },
      governmentData: {
        congressApiKey: getEnvVar('CONGRESS_API_KEY'),
        congressBaseUrl: getEnvVar('CONGRESS_BASE_URL', 'https://api.congress.gov/v3'),
        timeout: getEnvNumber('GOVERNMENT_DATA_TIMEOUT', 30000),
        maxRetries: getEnvNumber('GOVERNMENT_DATA_MAX_RETRIES', 3),
        rateLimitPerMinute: getEnvNumber('GOVERNMENT_DATA_RATE_LIMIT', 1000),
      },
    },
    features: {
      enableAiAnalysis: getEnvBoolean('ENABLE_AI_ANALYSIS', false),
      enableExpertVerification: getEnvBoolean('ENABLE_EXPERT_VERIFICATION', false),
      enableConflictDetection: getEnvBoolean('ENABLE_CONFLICT_DETECTION', true),
      enableRealTimeUpdates: getEnvBoolean('ENABLE_REAL_TIME_UPDATES', true),
      enableSearchIndexing: getEnvBoolean('ENABLE_SEARCH_INDEXING', true),
      enableCaching: getEnvBoolean('ENABLE_CACHING', true),
      enableMonitoring: getEnvBoolean('ENABLE_MONITORING', true),
      enableSecurityAuditing: getEnvBoolean('ENABLE_SECURITY_AUDITING', true),
      enablePrivacyScheduler: getEnvBoolean('ENABLE_PRIVACY_SCHEDULER', true),
      enableNotificationScheduler: getEnvBoolean('ENABLE_NOTIFICATION_SCHEDULER', true),
    },
    logging: {
      level: (getEnvVar('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug'),
      enableConsole: getEnvBoolean('LOG_CONSOLE', true),
      enableFile: getEnvBoolean('LOG_FILE', false),
      logDirectory: getEnvVar('LOG_DIRECTORY', './logs'),
      maxFileSize: getEnvVar('LOG_MAX_FILE_SIZE', '10m'),
      maxFiles: getEnvVar('LOG_MAX_FILES', '5d'),
      enableStructuredLogging: getEnvBoolean('LOG_STRUCTURED', true),
    },
    cors: {
      allowedOrigins: getEnvArray('ALLOWED_ORIGINS', ['http://localhost:3000', 'http://localhost:5173']),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization',
        'Cache-Control', 'X-CSRF-Token', 'X-Request-ID', 'X-Admin-Request',
        'If-None-Match', 'If-Modified-Since'
      ],
      exposedHeaders: [
        'X-Total-Count', 'X-Page-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining',
        'X-RateLimit-Reset', 'X-Request-ID', 'ETag', 'Last-Modified'
      ],
      credentials: getEnvBoolean('CORS_CREDENTIALS', true),
      maxAge: getEnvNumber('CORS_MAX_AGE', 86400),
    },
    rateLimit: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    security: {
      enableHelmet: getEnvBoolean('ENABLE_HELMET', true),
      enableCsrfProtection: getEnvBoolean('ENABLE_CSRF', true),
      enableRateLimiting: getEnvBoolean('ENABLE_RATE_LIMITING', true),
      enableSecurityMonitoring: getEnvBoolean('ENABLE_SECURITY_MONITORING', true),
      enableIntrusionDetection: getEnvBoolean('ENABLE_INTRUSION_DETECTION', true),
      sessionCookieSecure: getEnvBoolean('SESSION_COOKIE_SECURE', false),
      sessionCookieHttpOnly: getEnvBoolean('SESSION_COOKIE_HTTP_ONLY', true),
      sessionCookieSameSite: (getEnvVar('SESSION_COOKIE_SAME_SITE', 'lax') as 'strict' | 'lax' | 'none'),
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: false,
      },
    },
    monitoring: {
      enablePerformanceMonitoring: getEnvBoolean('ENABLE_PERFORMANCE_MONITORING', true),
      enableErrorTracking: getEnvBoolean('ENABLE_ERROR_TRACKING', true),
      enableAuditLogging: getEnvBoolean('ENABLE_AUDIT_LOGGING', true),
      enableHealthChecks: getEnvBoolean('ENABLE_HEALTH_CHECKS', true),
      healthCheckInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
      metricsRetentionDays: getEnvNumber('METRICS_RETENTION_DAYS', 30),
      alertThresholds: {
        responseTimeMs: getEnvNumber('ALERT_RESPONSE_TIME_MS', 5000),
        errorRatePercent: getEnvNumber('ALERT_ERROR_RATE_PERCENT', 5),
        memoryUsagePercent: getEnvNumber('ALERT_MEMORY_USAGE_PERCENT', 80),
      },
    },
    cache: {
      defaultTtl: getEnvNumber('CACHE_DEFAULT_TTL', 3600),
      maxMemory: getEnvVar('CACHE_MAX_MEMORY', '100mb'),
      enableCompression: getEnvBoolean('CACHE_COMPRESSION', true),
      enableSerialization: getEnvBoolean('CACHE_SERIALIZATION', true),
    },
    websocket: {
      enableWebSocket: getEnvBoolean('ENABLE_WEBSOCKET', true),
      heartbeatInterval: getEnvNumber('WEBSOCKET_HEARTBEAT_INTERVAL', 30000),
      maxConnections: getEnvNumber('WEBSOCKET_MAX_CONNECTIONS', 1000),
      enableAuthentication: getEnvBoolean('WEBSOCKET_AUTHENTICATION', true),
      enableRateLimiting: getEnvBoolean('WEBSOCKET_RATE_LIMITING', true),
    },
    notification: {
      enablePushNotifications: getEnvBoolean('ENABLE_PUSH_NOTIFICATIONS', true),
      enableEmailNotifications: getEnvBoolean('ENABLE_EMAIL_NOTIFICATIONS', true),
      enableSmsNotifications: getEnvBoolean('ENABLE_SMS_NOTIFICATIONS', false),
      maxRetries: getEnvNumber('NOTIFICATION_MAX_RETRIES', 3),
      retryDelayMs: getEnvNumber('NOTIFICATION_RETRY_DELAY_MS', 5000),
      batchSize: getEnvNumber('NOTIFICATION_BATCH_SIZE', 50),
    },
    privacy: {
      enableDataRetention: getEnvBoolean('ENABLE_DATA_RETENTION', true),
      dataRetentionDays: getEnvNumber('DATA_RETENTION_DAYS', 2555),
      enableAnonymization: getEnvBoolean('ENABLE_ANONYMIZATION', true),
      enableAuditTrail: getEnvBoolean('ENABLE_AUDIT_TRAIL', true),
      gdprCompliance: getEnvBoolean('GDPR_COMPLIANCE', true),
      cookieConsentRequired: getEnvBoolean('COOKIE_CONSENT_REQUIRED', true),
    },
    search: {
      enableFullTextSearch: getEnvBoolean('ENABLE_FULL_TEXT_SEARCH', true),
      enableFuzzySearch: getEnvBoolean('ENABLE_FUZZY_SEARCH', true),
      maxResults: getEnvNumber('SEARCH_MAX_RESULTS', 100),
      searchTimeoutMs: getEnvNumber('SEARCH_TIMEOUT_MS', 5000),
      indexUpdateInterval: getEnvNumber('SEARCH_INDEX_UPDATE_INTERVAL', 300000),
    },
    analytics: {
      enableUserAnalytics: getEnvBoolean('ENABLE_USER_ANALYTICS', true),
      enableBillAnalytics: getEnvBoolean('ENABLE_BILL_ANALYTICS', true),
      enableSponsorAnalytics: getEnvBoolean('ENABLE_SPONSOR_ANALYTICS', true),
      enableConflictDetection: getEnvBoolean('ENABLE_CONFLICT_DETECTION', true),
      enableTransparencyMetrics: getEnvBoolean('ENABLE_TRANSPARENCY_METRICS', true),
      dataRetentionDays: getEnvNumber('ANALYTICS_RETENTION_DAYS', 365),
    },
    governmentData: {
      enableCongressApi: getEnvBoolean('ENABLE_CONGRESS_API', true),
      enableRegulatoryMonitoring: getEnvBoolean('ENABLE_REGULATORY_MONITORING', true),
      enableBillTracking: getEnvBoolean('ENABLE_BILL_TRACKING', true),
      updateIntervalMinutes: getEnvNumber('GOVERNMENT_DATA_UPDATE_INTERVAL', 60),
      maxConcurrentRequests: getEnvNumber('GOVERNMENT_DATA_MAX_CONCURRENT', 10),
      cacheTtlMinutes: getEnvNumber('GOVERNMENT_DATA_CACHE_TTL', 15),
    },
    coverage: {
      enableCoverageAnalysis: getEnvBoolean('ENABLE_COVERAGE_ANALYSIS', true),
      enableGapDetection: getEnvBoolean('ENABLE_GAP_DETECTION', true),
      enableReporting: getEnvBoolean('ENABLE_COVERAGE_REPORTING', true),
      analysisIntervalHours: getEnvNumber('COVERAGE_ANALYSIS_INTERVAL', 24),
      reportRetentionDays: getEnvNumber('COVERAGE_REPORT_RETENTION', 90),
    },
    admin: {
      enableAdminPanel: getEnvBoolean('ENABLE_ADMIN_PANEL', true),
      enableSystemMonitoring: getEnvBoolean('ENABLE_SYSTEM_MONITORING', true),
      enableUserManagement: getEnvBoolean('ENABLE_USER_MANAGEMENT', true),
      enableContentModeration: getEnvBoolean('ENABLE_CONTENT_MODERATION', true),
      enableExternalApiManagement: getEnvBoolean('ENABLE_EXTERNAL_API_MANAGEMENT', true),
      maxLoginAttempts: getEnvNumber('ADMIN_MAX_LOGIN_ATTEMPTS', 5),
      lockoutDurationMinutes: getEnvNumber('ADMIN_LOCKOUT_DURATION', 15),
    },
  };

  // Environment-specific overrides
  if (isDevEnvironment()) {
    return {
      ...baseConfig,
      server: {
        ...baseConfig.server,
        port: getEnvNumber('PORT', 4200), // Different default port for dev
      },
      cors: {
        ...baseConfig.cors,
        allowedOrigins: getEnvArray('ALLOWED_ORIGINS', [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:4200',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://127.0.0.1:4200',
        ]),
      },
      security: {
        ...baseConfig.security,
        sessionCookieSecure: false, // Allow insecure cookies in development
      },
      logging: {
        ...baseConfig.logging,
        level: 'debug' as const,
      },
    };
  }

  if (isProdEnvironment()) {
    return {
      ...baseConfig,
      security: {
        ...baseConfig.security,
        sessionCookieSecure: true, // Require secure cookies in production
      },
      logging: {
        ...baseConfig.logging,
        level: 'warn' as const,
        enableFile: true,
      },
    };
  }

  if (isTestEnvironment()) {
    return {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        name: getEnvVar('DB_NAME', 'chanuka_test'),
      },
      logging: {
        ...baseConfig.logging,
        level: 'error' as const,
        enableConsole: false,
      },
      features: {
        ...baseConfig.features,
        enableAiAnalysis: false, // Disable AI in tests
        enableRealTimeUpdates: false, // Disable real-time in tests
      },
    };
  }

  return baseConfig;
}

// Validate and create configuration
function createConfig(): AppConfig {
  try {
    const rawConfig = loadEnvironmentConfig();
    // Normalize secrets for non-production environments to avoid
    // failing Zod min-length checks during tests/dev when env vars
    // may not be set or are intentionally short.
    if (!isProd()) {
      rawConfig.auth = rawConfig.auth || ({} as any);
      const safeJwt = getEnvVar('JWT_SECRET', 'development-jwt-secret-change-in-production-please-change-in-production-2025');
      const safeSession = getEnvVar('SESSION_SECRET', 'development-session-secret-change-in-production-please-change-2025');
      if (!rawConfig.auth.jwtSecret || String(rawConfig.auth.jwtSecret).length < 32) {
        rawConfig.auth.jwtSecret = safeJwt;
      }
      if (!rawConfig.auth.sessionSecret || String(rawConfig.auth.sessionSecret).length < 32) {
        rawConfig.auth.sessionSecret = safeSession;
      }
    }
    const validatedConfig = configSchema.parse(rawConfig);

    // Additional validation for required secrets in production
    if (isProd()) {
      if (!validatedConfig.auth.jwtSecret || validatedConfig.auth.jwtSecret.includes('development')) {
        throw new Error('JWT_SECRET must be set to a secure value in production');
      }
      if (!validatedConfig.auth.sessionSecret || validatedConfig.auth.sessionSecret.includes('development')) {
        throw new Error('SESSION_SECRET must be set to a secure value in production');
      }
      if (!validatedConfig.database.password) {
        throw new Error('DB_PASSWORD must be set in production');
      }
    }

    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

// Create and export the configuration
export const config: AppConfig = createConfig();

// Configuration utilities (defined above)

// Hot reload functionality for development
let configWatcher: NodeJS.Timeout | null = null;

export function enableHotReload(intervalMs: number = 5000): void {
  if (!isDev() || configWatcher) return;

  configWatcher = setInterval(() => {
    try {
      const newConfig = createConfig();
      // In a real implementation, you'd compare and update the config object
      // For now, we'll just validate that the config can be reloaded
      // Validation passed (silent)
    } catch (error) {
      console.error('❌ Configuration hot reload failed:', error);
    }
  }, intervalMs);
}

export function disableHotReload(): void {
  if (configWatcher) {
    clearInterval(configWatcher);
    configWatcher = null;
  }
}

// Initialize hot reload in development
if (isDev()) {
  enableHotReload();
}






