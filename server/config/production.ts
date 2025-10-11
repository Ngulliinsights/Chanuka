// Production environment configuration
// This file contains production-specific configuration values

import { AppConfig } from './index.js';

export const productionConfig: AppConfig = {
  server: {
    port: 5000,
    nodeEnv: 'production',
    host: '0.0.0.0',
    enableHttps: true,
    sslKeyPath: process.env.SSL_KEY_PATH,
    sslCertPath: process.env.SSL_CERT_PATH,
  },

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'chanuka',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: true,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    queryTimeoutMillis: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    sessionSecret: process.env.SESSION_SECRET || '',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    enablePasswordReset: true,
    passwordResetTokenExpiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1h',
  },

  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpSecure: false,
    fromEmail: process.env.FROM_EMAIL || 'noreply@chanuka.app',
    fromName: process.env.FROM_NAME || 'Chanuka Platform',
    enableEmailVerification: true,
    enableNotifications: true,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'chanuka:',
    ttl: parseInt(process.env.REDIS_TTL || '3600'),
    enableClustering: false,
  },

  externalApi: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      models: {
        gpt4: process.env.OPENAI_GPT4_MODEL || 'gpt-4',
        gpt35: process.env.OPENAI_GPT35_MODEL || 'gpt-3.5-turbo',
      },
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3'),
      models: {
        claude3: process.env.ANTHROPIC_CLAUDE3_MODEL || 'claude-3-sonnet-20240229',
      },
    },
    governmentData: {
      congressApiKey: process.env.CONGRESS_API_KEY,
      congressBaseUrl: process.env.CONGRESS_BASE_URL || 'https://api.congress.gov/v3',
      timeout: parseInt(process.env.GOVERNMENT_DATA_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.GOVERNMENT_DATA_MAX_RETRIES || '3'),
      rateLimitPerMinute: parseInt(process.env.GOVERNMENT_DATA_RATE_LIMIT || '1000'),
    },
  },

  features: {
    enableAiAnalysis: process.env.ENABLE_AI_ANALYSIS === 'true',
    enableExpertVerification: process.env.ENABLE_EXPERT_VERIFICATION === 'true',
    enableConflictDetection: true,
    enableRealTimeUpdates: true,
    enableSearchIndexing: true,
    enableCaching: true,
    enableMonitoring: true,
    enableSecurityAuditing: true,
    enablePrivacyScheduler: true,
    enableNotificationScheduler: true,
  },

  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'warn',
    enableConsole: true,
    enableFile: true,
    logDirectory: process.env.LOG_DIRECTORY || './logs',
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    enableStructuredLogging: true,
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [process.env.FRONTEND_URL || ''],
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
    credentials: true,
    maxAge: 86400,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  security: {
    enableHelmet: true,
    enableCsrfProtection: true,
    enableRateLimiting: true,
    enableSecurityMonitoring: true,
    enableIntrusionDetection: true,
    sessionCookieSecure: true,
    sessionCookieHttpOnly: true,
    sessionCookieSameSite: 'strict',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: true,
    },
  },

  monitoring: {
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    enableAuditLogging: true,
    enableHealthChecks: true,
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
    metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '90'),
    alertThresholds: {
      responseTimeMs: parseInt(process.env.ALERT_RESPONSE_TIME_MS || '2000'),
      errorRatePercent: parseInt(process.env.ALERT_ERROR_RATE_PERCENT || '1'),
      memoryUsagePercent: parseInt(process.env.ALERT_MEMORY_USAGE_PERCENT || '85'),
    },
  },

  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
    maxMemory: process.env.CACHE_MAX_MEMORY || '256mb',
    enableCompression: true,
    enableSerialization: true,
  },

  websocket: {
    enableWebSocket: true,
    heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '30000'),
    maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '1000'),
    enableAuthentication: true,
    enableRateLimiting: true,
  },

  notification: {
    enablePushNotifications: true,
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || '5000'),
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50'),
  },

  privacy: {
    enableDataRetention: true,
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555'),
    enableAnonymization: true,
    enableAuditTrail: true,
    gdprCompliance: true,
    cookieConsentRequired: true,
  },

  search: {
    enableFullTextSearch: true,
    enableFuzzySearch: true,
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '100'),
    searchTimeoutMs: parseInt(process.env.SEARCH_TIMEOUT_MS || '5000'),
    indexUpdateInterval: parseInt(process.env.SEARCH_INDEX_UPDATE_INTERVAL || '300000'),
  },

  analytics: {
    enableUserAnalytics: true,
    enableBillAnalytics: true,
    enableSponsorAnalytics: true,
    enableConflictDetection: true,
    enableTransparencyMetrics: true,
    dataRetentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365'),
  },

  governmentData: {
    enableCongressApi: true,
    enableRegulatoryMonitoring: true,
    enableBillTracking: true,
    updateIntervalMinutes: parseInt(process.env.GOVERNMENT_DATA_UPDATE_INTERVAL || '60'),
    maxConcurrentRequests: parseInt(process.env.GOVERNMENT_DATA_MAX_CONCURRENT || '10'),
    cacheTtlMinutes: parseInt(process.env.GOVERNMENT_DATA_CACHE_TTL || '15'),
  },

  coverage: {
    enableCoverageAnalysis: true,
    enableGapDetection: true,
    enableReporting: true,
    analysisIntervalHours: parseInt(process.env.COVERAGE_ANALYSIS_INTERVAL || '24'),
    reportRetentionDays: parseInt(process.env.COVERAGE_REPORT_RETENTION || '90'),
  },

  admin: {
    enableAdminPanel: true,
    enableSystemMonitoring: true,
    enableUserManagement: true,
    enableContentModeration: true,
    enableExternalApiManagement: true,
    maxLoginAttempts: parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDurationMinutes: parseInt(process.env.ADMIN_LOCKOUT_DURATION || '15'),
  },
};






