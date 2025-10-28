// Test environment configuration
// This file contains test-specific configuration values

import { AppConfig } from './index.js';

export const testConfig: AppConfig = {
  server: {
    port: 5001,
    nodeEnv: 'test',
    host: 'localhost',
    enableHttps: false,
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/chanuka_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'chanuka_test',
    user: process.env.DB_USER || 'test',
    password: process.env.DB_PASSWORD || 'test',
    ssl: false,
    maxConnections: 5,
    minConnections: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    queryTimeoutMillis: 10000,
  },

  auth: {
    jwtSecret: 'test-jwt-secret-for-testing-only',
    jwtExpiresIn: '1h',
    sessionSecret: 'test-session-secret-for-testing-only',
    sessionMaxAge: 3600000, // 1 hour for tests
    refreshTokenExpiresIn: '1d',
    bcryptRounds: 1, // Fast hashing for tests
    enablePasswordReset: false,
    passwordResetTokenExpiresIn: '1h',
  },

  email: {
    smtpHost: undefined,
    smtpPort: 587,
    smtpUser: undefined,
    smtpPass: undefined,
    smtpSecure: false,
    fromEmail: 'test@chanuka.app',
    fromName: 'Chanuka Test',
    enableEmailVerification: false,
    enableNotifications: false,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379/1',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 1, // Use different DB for tests
    keyPrefix: 'chanuka:test:',
    ttl: 300, // Shorter TTL for tests
    enableClustering: false,
  },

  externalApi: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      timeout: 5000,
      maxRetries: 0, // No retries in tests
      models: {
        gpt4: 'gpt-4',
        gpt35: 'gpt-3.5-turbo',
      },
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      baseUrl: 'https://api.anthropic.com',
      timeout: 5000,
      maxRetries: 0,
      models: {
        claude3: 'claude-3-sonnet-20240229',
      },
    },
    governmentData: {
      congressApiKey: process.env.CONGRESS_API_KEY || 'test-key',
      congressBaseUrl: 'https://api.congress.gov/v3',
      timeout: 5000,
      maxRetries: 0,
      rateLimitPerMinute: 1000,
    },
  },

  features: {
    enableAiAnalysis: false, // Disable AI in tests
    enableExpertVerification: false,
    enableConflictDetection: true,
    enableRealTimeUpdates: false, // Disable real-time in tests
    enableSearchIndexing: false,
    enableCaching: false,
    enableMonitoring: false,
    enableSecurityAuditing: false,
    enablePrivacyScheduler: false,
    enableNotificationScheduler: false,
  },

  logging: {
    level: 'error',
    enableConsole: false,
    enableFile: false,
    logDirectory: './test-logs',
    maxFileSize: '1m',
    maxFiles: '1d',
    enableStructuredLogging: false,
  },

  cors: {
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization',
      'Cache-Control', 'X-CSRF-Token', 'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count', 'X-RateLimit-Remaining', 'X-Request-ID', 'ETag'
    ],
    credentials: true,
    maxAge: 86400,
  },

  rateLimit: {
    windowMs: 60000, // 1 minute for tests
    maxRequests: 1000, // High limit for tests
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  security: {
    enableHelmet: false, // Disable helmet in tests
    enableCsrfProtection: false,
    enableRateLimiting: false,
    enableSecurityMonitoring: false,
    enableIntrusionDetection: false,
    sessionCookieSecure: false,
    sessionCookieHttpOnly: true,
    sessionCookieSameSite: 'lax',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: false,
    },
  },

  monitoring: {
    enablePerformanceMonitoring: false,
    enableErrorTracking: false,
    enableAuditLogging: false,
    enableHealthChecks: false,
    healthCheckInterval: 60000,
    metricsRetentionDays: 1,
    alertThresholds: {
      responseTimeMs: 10000,
      errorRatePercent: 50,
      memoryUsagePercent: 95,
    },
  },

  cache: {
    defaultTtl: 60, // Short TTL for tests
    maxMemory: '50mb',
    enableCompression: false,
    enableSerialization: true,
  },

  websocket: {
    enableWebSocket: false, // Disable WebSocket in tests
    heartbeatInterval: 30000,
    maxConnections: 10,
    enableAuthentication: false,
    enableRateLimiting: false,
  },

  notification: {
    enablePushNotifications: false,
    enableEmailNotifications: false,
    enableSmsNotifications: false,
    maxRetries: 0,
    retryDelayMs: 1000,
    batchSize: 10,
  },

  privacy: {
    enableDataRetention: false,
    dataRetentionDays: 1,
    enableAnonymization: false,
    enableAuditTrail: false,
    gdprCompliance: false,
    cookieConsentRequired: false,
  },

  search: {
    enableFullTextSearch: false,
    enableFuzzySearch: false,
    maxResults: 10,
    searchTimeoutMs: 1000,
    indexUpdateInterval: 60000,
  },

  analytics: {
    enableUserAnalytics: false,
    enableBillAnalytics: false,
    enableSponsorAnalytics: false,
    enableConflictDetection: false,
    enableTransparencyMetrics: false,
    dataRetentionDays: 1,
  },

  governmentData: {
    enableCongressApi: false,
    enableRegulatoryMonitoring: false,
    enableBillTracking: false,
    updateIntervalMinutes: 60,
    maxConcurrentRequests: 1,
    cacheTtlMinutes: 5,
  },

  coverage: {
    enableCoverageAnalysis: false,
    enableGapDetection: false,
    enableReporting: false,
    analysisIntervalHours: 24,
    reportRetentionDays: 7,
  },

  admin: {
    enableAdminPanel: false,
    enableSystemMonitoring: false,
    enableUserManagement: false,
    enableContentModeration: false,
    enableExternalApiManagement: false,
    maxLoginAttempts: 10,
    lockoutDurationMinutes: 1,
  },
};

// Test suite for test configuration (commented out to avoid Jest type errors)
// describe('Test Config', () => {
//   it('should export testConfig', () => {
//     expect(testConfig).toBeDefined();
//   });
//
//   it('should have test environment settings', () => {
//     expect(testConfig.server.nodeEnv).toBe('test');
//     expect(testConfig.database.name).toBe('chanuka_test');
//   });
// });








































