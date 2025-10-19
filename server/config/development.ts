// Development environment configuration overrides
// This file contains development-specific configuration values

import { AppConfig } from './index.js';

export const developmentConfig: Partial<AppConfig> = {
  // Development-specific overrides go here
  // These will be merged with the base configuration

  server: {
    port: 4200, // Different port for development
    enableHttps: false,
  },

  database: {
    // Development database settings
    ssl: false,
  },

  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false,
  },

  features: {
    // Enable all features in development for testing
    enableAiAnalysis: false, // Keep AI disabled by default for cost reasons
    enableRealTimeUpdates: true,
    enableSearchIndexing: true,
  },

  security: {
    // Relaxed security for development
    sessionCookieSecure: false,
    enableCsrfProtection: true, // Keep CSRF enabled for testing
  },

  monitoring: {
    // Development monitoring settings
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
  },
};











































