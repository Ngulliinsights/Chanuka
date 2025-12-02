import { z } from 'zod';
import { logger  } from '@shared/core';
import { errorTracker } from '@/core/errors/error-tracker.js';

/**
 * Analytics Configuration Interface
 * Defines all configurable settings for the analytics feature module
 */
export interface AnalyticsConfig {
  /** Cache configuration for different data types */
  cache: {
    /** TTL for user engagement metrics in seconds */
    userEngagementTtl: number;
    /** TTL for bill engagement metrics in seconds */
    bill_engagementTtl: number;
    /** TTL for engagement trends in seconds */
    trendsTtl: number;
    /** TTL for leaderboard data in seconds */
    leaderboardTtl: number;
    /** TTL for ML analysis results in seconds */
    mlAnalysisTtl: number;
    /** TTL for financial disclosure data in seconds */
    financialDisclosureTtl: number;
    /** Maximum cache size in entries */
    maxSize: number;
  };

  /** Database configuration */
  database: {
    /** Query timeout in milliseconds */
    queryTimeout: number;
    /** Connection pool size */
    poolSize: number;
    /** Idle timeout in milliseconds */
    idleTimeout: number;
    /** Maximum retry attempts for failed queries */
    maxRetries: number;
  };

  /** Feature flags for gradual rollout */
  features: {
    /** Enable ML analysis features */
    enableMlAnalysis: boolean;
    /** Enable real-time analytics updates */
    enableRealTimeUpdates: boolean;
    /** Enable advanced caching */
    enableAdvancedCaching: boolean;
    /** Enable performance monitoring */
    enablePerformanceMonitoring: boolean;
    /** Enable error tracking integration */
    enableErrorTracking: boolean;
  };

  /** Performance thresholds */
  performance: {
    /** Slow request threshold in milliseconds */
    slowRequestThreshold: number;
    /** Maximum concurrent analytics operations */
    maxConcurrentOperations: number;
    /** Memory usage warning threshold in MB */
    memoryWarningThreshold: number;
    /** CPU usage warning threshold percentage */
    cpuWarningThreshold: number;
  };

  /** Logging configuration */
  logging: {
    /** Log level for analytics operations */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Enable structured logging */
    enableStructuredLogging: boolean;
    /** Enable performance logging */
    enablePerformanceLogging: boolean;
    /** Maximum log retention days */
    maxRetentionDays: number;
  };

  /** Analytics-specific settings */
  analytics: {
    /** Default timeframe for engagement metrics */
    defaultTimeframe: '7d' | '30d' | '90d';
    /** Maximum results per page */
    maxResultsPerPage: number;
    /** Enable data export features */
    enableDataExport: boolean;
    /** Enable advanced visualizations */
    enableAdvancedVisualizations: boolean;
  };
}

/**
 * Zod schema for analytics configuration validation
 */
export const analyticsConfigSchema = z.object({
  cache: z.object({
    userEngagementTtl: z.number().int().min(60).max(86400), // 1min to 24hrs
    bill_engagementTtl: z.number().int().min(60).max(86400),
    trendsTtl: z.number().int().min(60).max(86400),
    leaderboardTtl: z.number().int().min(60).max(86400),
    mlAnalysisTtl: z.number().int().min(60).max(86400),
    financialDisclosureTtl: z.number().int().min(60).max(86400),
    maxSize: z.number().int().min(100).max(10000)
  }),

  database: z.object({
    queryTimeout: z.number().int().min(1000).max(30000), // 1s to 30s
    poolSize: z.number().int().min(1).max(20),
    idleTimeout: z.number().int().min(1000).max(300000), // 1s to 5min
    maxRetries: z.number().int().min(0).max(5)
  }),

  features: z.object({
    enableMlAnalysis: z.boolean(),
    enableRealTimeUpdates: z.boolean(),
    enableAdvancedCaching: z.boolean(),
    enablePerformanceMonitoring: z.boolean(),
    enableErrorTracking: z.boolean()
  }),

  performance: z.object({
    slowRequestThreshold: z.number().int().min(100).max(10000), // 100ms to 10s
    maxConcurrentOperations: z.number().int().min(1).max(50),
    memoryWarningThreshold: z.number().int().min(50).max(1000), // MB
    cpuWarningThreshold: z.number().min(1).max(100) // percentage
  }),

  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    enableStructuredLogging: z.boolean(),
    enablePerformanceLogging: z.boolean(),
    maxRetentionDays: z.number().int().min(1).max(365)
  }),

  analytics: z.object({
    defaultTimeframe: z.enum(['7d', '30d', '90d']),
    maxResultsPerPage: z.number().int().min(10).max(1000),
    enableDataExport: z.boolean(),
    enableAdvancedVisualizations: z.boolean()
  })
});

/**
 * Default analytics configuration values
 */
export const defaultAnalyticsConfig: AnalyticsConfig = {
  cache: {
    userEngagementTtl: 1800, // 30 minutes
    bill_engagementTtl: 900,  // 15 minutes
    trendsTtl: 3600,         // 1 hour
    leaderboardTtl: 1800,    // 30 minutes
    mlAnalysisTtl: 7200,     // 2 hours
    financialDisclosureTtl: 3600, // 1 hour
    maxSize: 1000
  },

  database: {
    queryTimeout: 10000,     // 10 seconds
    poolSize: 5,
    idleTimeout: 30000,      // 30 seconds
    maxRetries: 2
  },

  features: {
    enableMlAnalysis: false,
    enableRealTimeUpdates: true,
    enableAdvancedCaching: true,
    enablePerformanceMonitoring: true,
    enableErrorTracking: true
  },

  performance: {
    slowRequestThreshold: 2000, // 2 seconds
    maxConcurrentOperations: 10,
    memoryWarningThreshold: 200, // 200 MB
    cpuWarningThreshold: 80     // 80%
  },

  logging: {
    level: 'info',
    enableStructuredLogging: true,
    enablePerformanceLogging: true,
    maxRetentionDays: 30
  },

  analytics: {
    defaultTimeframe: '30d',
    maxResultsPerPage: 100,
    enableDataExport: true,
    enableAdvancedVisualizations: false
  }
};

/**
 * Load analytics configuration from environment variables
 */
export function loadAnalyticsConfig(): AnalyticsConfig {
  const config = { ...defaultAnalyticsConfig };

  // Load cache configuration
  if (process.env.ANALYTICS_CACHE_USER_ENGAGEMENT_TTL) {
    config.cache.userEngagementTtl = parseInt(process.env.ANALYTICS_CACHE_USER_ENGAGEMENT_TTL);
  }
  if (process.env.ANALYTICS_CACHE_BILL_ENGAGEMENT_TTL) {
    config.cache.bill_engagementTtl = parseInt(process.env.ANALYTICS_CACHE_BILL_ENGAGEMENT_TTL);
  }
  if (process.env.ANALYTICS_CACHE_TRENDS_TTL) {
    config.cache.trendsTtl = parseInt(process.env.ANALYTICS_CACHE_TRENDS_TTL);
  }
  if (process.env.ANALYTICS_CACHE_LEADERBOARD_TTL) {
    config.cache.leaderboardTtl = parseInt(process.env.ANALYTICS_CACHE_LEADERBOARD_TTL);
  }
  if (process.env.ANALYTICS_CACHE_ML_ANALYSIS_TTL) {
    config.cache.mlAnalysisTtl = parseInt(process.env.ANALYTICS_CACHE_ML_ANALYSIS_TTL);
  }
  if (process.env.ANALYTICS_CACHE_FINANCIAL_DISCLOSURE_TTL) {
    config.cache.financialDisclosureTtl = parseInt(process.env.ANALYTICS_CACHE_FINANCIAL_DISCLOSURE_TTL);
  }
  if (process.env.ANALYTICS_CACHE_MAX_SIZE) {
    config.cache.maxSize = parseInt(process.env.ANALYTICS_CACHE_MAX_SIZE);
  }

  // Load database configuration
  if (process.env.ANALYTICS_DB_QUERY_TIMEOUT) {
    config.database.queryTimeout = parseInt(process.env.ANALYTICS_DB_QUERY_TIMEOUT);
  }
  if (process.env.ANALYTICS_DB_POOL_SIZE) {
    config.database.poolSize = parseInt(process.env.ANALYTICS_DB_POOL_SIZE);
  }
  if (process.env.ANALYTICS_DB_IDLE_TIMEOUT) {
    config.database.idleTimeout = parseInt(process.env.ANALYTICS_DB_IDLE_TIMEOUT);
  }
  if (process.env.ANALYTICS_DB_MAX_RETRIES) {
    config.database.maxRetries = parseInt(process.env.ANALYTICS_DB_MAX_RETRIES);
  }

  // Load feature flags
  if (process.env.ANALYTICS_ENABLE_ML_ANALYSIS) {
    config.features.enableMlAnalysis = process.env.ANALYTICS_ENABLE_ML_ANALYSIS === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_REAL_TIME_UPDATES) {
    config.features.enableRealTimeUpdates = process.env.ANALYTICS_ENABLE_REAL_TIME_UPDATES === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_ADVANCED_CACHING) {
    config.features.enableAdvancedCaching = process.env.ANALYTICS_ENABLE_ADVANCED_CACHING === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_PERFORMANCE_MONITORING) {
    config.features.enablePerformanceMonitoring = process.env.ANALYTICS_ENABLE_PERFORMANCE_MONITORING === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_ERROR_TRACKING) {
    config.features.enableErrorTracking = process.env.ANALYTICS_ENABLE_ERROR_TRACKING === 'true';
  }

  // Load performance thresholds
  if (process.env.ANALYTICS_SLOW_REQUEST_THRESHOLD) {
    config.performance.slowRequestThreshold = parseInt(process.env.ANALYTICS_SLOW_REQUEST_THRESHOLD);
  }
  if (process.env.ANALYTICS_MAX_CONCURRENT_OPERATIONS) {
    config.performance.maxConcurrentOperations = parseInt(process.env.ANALYTICS_MAX_CONCURRENT_OPERATIONS);
  }
  if (process.env.ANALYTICS_MEMORY_WARNING_THRESHOLD) {
    config.performance.memoryWarningThreshold = parseInt(process.env.ANALYTICS_MEMORY_WARNING_THRESHOLD);
  }
  if (process.env.ANALYTICS_CPU_WARNING_THRESHOLD) {
    config.performance.cpuWarningThreshold = parseFloat(process.env.ANALYTICS_CPU_WARNING_THRESHOLD);
  }

  // Load logging configuration
  if (process.env.ANALYTICS_LOG_LEVEL) {
    const level = process.env.ANALYTICS_LOG_LEVEL as AnalyticsConfig['logging']['level'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logging.level = level;
    }
  }
  if (process.env.ANALYTICS_ENABLE_STRUCTURED_LOGGING) {
    config.logging.enableStructuredLogging = process.env.ANALYTICS_ENABLE_STRUCTURED_LOGGING === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_PERFORMANCE_LOGGING) {
    config.logging.enablePerformanceLogging = process.env.ANALYTICS_ENABLE_PERFORMANCE_LOGGING === 'true';
  }
  if (process.env.ANALYTICS_LOG_MAX_RETENTION_DAYS) {
    config.logging.maxRetentionDays = parseInt(process.env.ANALYTICS_LOG_MAX_RETENTION_DAYS);
  }

  // Load analytics settings
  if (process.env.ANALYTICS_DEFAULT_TIMEFRAME) {
    const timeframe = process.env.ANALYTICS_DEFAULT_TIMEFRAME as AnalyticsConfig['analytics']['defaultTimeframe'];
    if (['7d', '30d', '90d'].includes(timeframe)) {
      config.analytics.defaultTimeframe = timeframe;
    }
  }
  if (process.env.ANALYTICS_MAX_RESULTS_PER_PAGE) {
    config.analytics.maxResultsPerPage = parseInt(process.env.ANALYTICS_MAX_RESULTS_PER_PAGE);
  }
  if (process.env.ANALYTICS_ENABLE_DATA_EXPORT) {
    config.analytics.enableDataExport = process.env.ANALYTICS_ENABLE_DATA_EXPORT === 'true';
  }
  if (process.env.ANALYTICS_ENABLE_ADVANCED_VISUALIZATIONS) {
    config.analytics.enableAdvancedVisualizations = process.env.ANALYTICS_ENABLE_ADVANCED_VISUALIZATIONS === 'true';
  }

  return config;
}

/**
 * Validate analytics configuration
 * @throws Error if configuration is invalid
 */
export function validateAnalyticsConfig(config: AnalyticsConfig): AnalyticsConfig {
  try {
    return analyticsConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Analytics configuration validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Load and validate analytics configuration
 * This function should be called during application startup
 */
export function initializeAnalyticsConfig(): AnalyticsConfig {
  try {
    const config = loadAnalyticsConfig();
    const validatedConfig = validateAnalyticsConfig(config);
    return validatedConfig;
  } catch (error) {
    logger.error('Failed to initialize analytics configuration', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    try {
      if ((errorTracker as any)?.capture) {
        (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), { component: 'analytics-config' });
      }
    } catch (reportErr) {
      logger.warn('Failed to report analytics config initialization error to errorTracker', { reportErr });
    }
    throw new Error(`Analytics configuration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export validated configuration singleton
let _analyticsConfig: AnalyticsConfig | null = null;

export const analyticsConfig = (() => {
  if (!_analyticsConfig) {
    _analyticsConfig = initializeAnalyticsConfig();
  }
  return _analyticsConfig;
})();

// Export function to reset config for testing
export const resetAnalyticsConfig = () => {
  _analyticsConfig = null;
};







































