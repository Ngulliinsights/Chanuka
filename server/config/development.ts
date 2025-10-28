// Development environment configuration overrides
// This file contains development-specific configuration values

import { AppConfig } from './index.js';

export const developmentConfig: Partial<AppConfig> = {
  // Development-specific overrides go here
  // These will be merged with the base configuration

  server: {
    port: 4200, // Different port for development
    enableHttps: false,
    nodeEnv: 'development',
    host: '0.0.0.0',
  },

  database: {
    // Development database settings
    ssl: false,
    host: 'localhost',
    port: 5432,
    name: 'chanuka',
    user: 'postgres',
    password: '',
    maxConnections: 20,
    minConnections: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    queryTimeoutMillis: 60000,
  },

  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false,
    logDirectory: './logs',
    maxFileSize: '10m',
    maxFiles: '5d',
    enableStructuredLogging: true,
  },

  features: {
    // Enable all features in development for testing
    enableAiAnalysis: false, // Keep AI disabled by default for cost reasons
    enableRealTimeUpdates: true,
    enableSearchIndexing: true,
    enableExpertVerification: false,
    enableConflictDetection: true,
    enableCaching: true,
    enableMonitoring: true,
    enableSecurityAuditing: true,
    enablePrivacyScheduler: true,
    enableNotificationScheduler: true,
  },

  security: {
    // Relaxed security for development
    sessionCookieSecure: false,
    enableCsrfProtection: true, // Keep CSRF enabled for testing
    enableHelmet: true,
    enableRateLimiting: true,
    enableSecurityMonitoring: true,
    enableIntrusionDetection: true,
    sessionCookieHttpOnly: true,
    sessionCookieSameSite: 'lax',
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
    // Development monitoring settings
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    enableAuditLogging: true,
    enableHealthChecks: true,
    healthCheckInterval: 30000,
    metricsRetentionDays: 30,
    alertThresholds: {
      responseTimeMs: 5000,
      errorRatePercent: 5,
      memoryUsagePercent: 80,
    },
  },
};












































