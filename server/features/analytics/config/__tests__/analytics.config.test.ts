import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyticsConfigSchema,
  defaultAnalyticsConfig,
  loadAnalyticsConfig,
  validateAnalyticsConfig,
  initializeAnalyticsConfig,
  resetAnalyticsConfig,
  AnalyticsConfig
} from '../analytics.config';

describe('Analytics Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };

    // Clear analytics-specific environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('ANALYTICS_')) {
        delete process.env[key];
      }
    });

    // Reset the analytics config singleton
    resetAnalyticsConfig();

    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Schema Validation', () => {
    it('should validate a correct configuration', () => {
      const validConfig = { ...defaultAnalyticsConfig };
      expect(() => analyticsConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid cache TTL values', () => {
      const invalidConfig = {
        ...defaultAnalyticsConfig,
        cache: {
          ...defaultAnalyticsConfig.cache,
          userEngagementTtl: 30 // Too low (minimum 60)
        }
      };

      expect(() => analyticsConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid log levels', () => {
      const invalidConfig = {
        ...defaultAnalyticsConfig,
        logging: {
          ...defaultAnalyticsConfig.logging,
          level: 'invalid' as any
        }
      };

      expect(() => analyticsConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid performance thresholds', () => {
      const invalidConfig = {
        ...defaultAnalyticsConfig,
        performance: {
          ...defaultAnalyticsConfig.performance,
          slowRequestThreshold: 50 // Too low (minimum 100)
        }
      };

      expect(() => analyticsConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('Configuration Loading', () => {
    it('should load default configuration when no environment variables are set', () => {
      const config = loadAnalyticsConfig();
      expect(config).toEqual(defaultAnalyticsConfig);
    });

    it('should load cache configuration from environment variables', () => {
      process.env.ANALYTICS_CACHE_USER_ENGAGEMENT_TTL = '3600';
      process.env.ANALYTICS_CACHE_MAX_SIZE = '2000';

      const config = loadAnalyticsConfig();
      expect(config.cache.userEngagementTtl).toBe(3600);
      expect(config.cache.maxSize).toBe(2000);
    });

    it('should load feature flags from environment variables', () => {
      process.env.ANALYTICS_ENABLE_ML_ANALYSIS = 'true';
      process.env.ANALYTICS_ENABLE_REAL_TIME_UPDATES = 'false';

      const config = loadAnalyticsConfig();
      expect(config.features.enableMlAnalysis).toBe(true);
      expect(config.features.enableRealTimeUpdates).toBe(false);
    });

    it('should load performance thresholds from environment variables', () => {
      process.env.ANALYTICS_SLOW_REQUEST_THRESHOLD = '3000';
      process.env.ANALYTICS_MAX_CONCURRENT_OPERATIONS = '20';

      const config = loadAnalyticsConfig();
      expect(config.performance.slowRequestThreshold).toBe(3000);
      expect(config.performance.maxConcurrentOperations).toBe(20);
    });

    it('should load logging configuration from environment variables', () => {
      process.env.ANALYTICS_LOG_LEVEL = 'debug';
      process.env.ANALYTICS_ENABLE_STRUCTURED_LOGGING = 'false';

      const config = loadAnalyticsConfig();
      expect(config.logging.level).toBe('debug');
      expect(config.logging.enableStructuredLogging).toBe(false);
    });

    it('should load analytics settings from environment variables', () => {
      process.env.ANALYTICS_DEFAULT_TIMEFRAME = '7d';
      process.env.ANALYTICS_MAX_RESULTS_PER_PAGE = '50';

      const config = loadAnalyticsConfig();
      expect(config.analytics.defaultTimeframe).toBe('7d');
      expect(config.analytics.maxResultsPerPage).toBe(50);
    });

    it('should ignore invalid environment variable values', () => {
      // Set invalid values
      process.env.ANALYTICS_LOG_LEVEL = 'invalid_level';
      process.env.ANALYTICS_DEFAULT_TIMEFRAME = 'invalid_timeframe';

      const config = loadAnalyticsConfig();
      expect(config.logging.level).toBe('info'); // default
      expect(config.analytics.defaultTimeframe).toBe('30d'); // default
    });
  });

  describe('Configuration Validation', () => {
    it('should validate a correct configuration without throwing', () => {
      const validConfig = { ...defaultAnalyticsConfig };
      expect(() => validateAnalyticsConfig(validConfig)).not.toThrow();
      const result = validateAnalyticsConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should throw an error for invalid configuration', () => {
      const invalidConfig = {
        ...defaultAnalyticsConfig,
        cache: {
          ...defaultAnalyticsConfig.cache,
          userEngagementTtl: 10 // Invalid: too low
        }
      };

      expect(() => validateAnalyticsConfig(invalidConfig)).toThrow();
    });

    it('should provide clear error messages for validation failures', () => {
      const invalidConfig = {
        ...defaultAnalyticsConfig,
        cache: {
          ...defaultAnalyticsConfig.cache,
          userEngagementTtl: 10,
          billEngagementTtl: 100000 // Invalid: too high
        },
        performance: {
          ...defaultAnalyticsConfig.performance,
          slowRequestThreshold: 50 // Invalid: too low
        }
      };

      expect(() => validateAnalyticsConfig(invalidConfig)).toThrow(
        expect.stringContaining('cache.userEngagementTtl')
      );
      expect(() => validateAnalyticsConfig(invalidConfig)).toThrow(
        expect.stringContaining('cache.billEngagementTtl')
      );
      expect(() => validateAnalyticsConfig(invalidConfig)).toThrow(
        expect.stringContaining('performance.slowRequestThreshold')
      );
    });
  });

  describe('Configuration Initialization', () => {
    it('should initialize configuration successfully with valid settings', () => {
      const config = initializeAnalyticsConfig();
      expect(config).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.analytics).toBeDefined();
    });

    it('should throw an error when configuration validation fails', () => {
      // Mock process.env to return invalid values
      const originalEnv = process.env;
      process.env.ANALYTICS_CACHE_USER_ENGAGEMENT_TTL = '10'; // Invalid: too low

      expect(() => initializeAnalyticsConfig()).toThrow(
        'Analytics configuration initialization failed'
      );

      // Restore
      process.env = originalEnv;
    });
  });

  describe('Default Configuration Values', () => {
    it('should have reasonable default values', () => {
      expect(defaultAnalyticsConfig.cache.userEngagementTtl).toBe(1800); // 30 min
      expect(defaultAnalyticsConfig.cache.maxSize).toBe(1000);
      expect(defaultAnalyticsConfig.database.queryTimeout).toBe(10000); // 10s
      expect(defaultAnalyticsConfig.performance.slowRequestThreshold).toBe(2000); // 2s
      expect(defaultAnalyticsConfig.logging.level).toBe('info');
      expect(defaultAnalyticsConfig.analytics.defaultTimeframe).toBe('30d');
    });

    it('should have all required feature flags with defaults', () => {
      expect(defaultAnalyticsConfig.features.enableMlAnalysis).toBe(false);
      expect(defaultAnalyticsConfig.features.enableRealTimeUpdates).toBe(true);
      expect(defaultAnalyticsConfig.features.enableAdvancedCaching).toBe(true);
      expect(defaultAnalyticsConfig.features.enablePerformanceMonitoring).toBe(true);
      expect(defaultAnalyticsConfig.features.enableErrorTracking).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for configuration interface', () => {
      const config: AnalyticsConfig = { ...defaultAnalyticsConfig };

      // These should compile without type errors
      expect(typeof config.cache.userEngagementTtl).toBe('number');
      expect(typeof config.features.enableMlAnalysis).toBe('boolean');
      expect(['debug', 'info', 'warn', 'error']).toContain(config.logging.level);
      expect(['7d', '30d', '90d']).toContain(config.analytics.defaultTimeframe);
    });
  });
});




































