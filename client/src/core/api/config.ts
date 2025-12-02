/**
 * Centralized Configuration Management System
 * 
 * This module provides a robust configuration management system with support for:
 * - Environment-based configuration loading
 * - Runtime configuration updates with validation
 * - Configuration observers for reactive updates
 * - Type-safe nested configuration access
 * - Multiple validators for different configuration domains
 * 
 * The configuration system ensures that all parts of the application have access
 * to consistent, validated configuration values that can be updated at runtime
 * while maintaining system integrity.
 */

import {
  ServiceConfig,
  ConfigValidator,
  ConfigObserver,
  LogLevel
} from './types';
import { logger } from '../../utils/logger';

// ============================================================================
// Configuration Service Implementation
// ============================================================================

/**
 * ConfigurationService is the central hub for managing application configuration.
 * It provides type-safe access to configuration values, validates changes,
 * and notifies observers when configuration is updated.
 * 
 * The service merges environment variables with default values and ensures
 * that all configuration changes pass validation before being applied.
 */
export class ConfigurationService {
  private config: ServiceConfig;
  private readonly configValidators: ConfigValidator[] = [];
  private readonly configObservers: ConfigObserver[] = [];
  private readonly configHistory: ConfigSnapshot[] = [];
  private readonly maxHistorySize = 10;

  constructor(initialConfig: Partial<ServiceConfig>) {
    this.config = this.mergeWithDefaults(initialConfig);
    this.validateConfig();
    this.recordSnapshot('initialization');

    logger.info('Configuration service initialized', {
      component: 'ConfigurationService',
      baseUrl: this.config.api.baseUrl,
      logLevel: this.config.monitoring.logLevel
    });
  }

  /**
   * Gets a top-level configuration value by key.
   * This is type-safe and ensures you can only access valid configuration keys.
   */
  get<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] {
    return this.config[key];
  }

  /**
   * Gets a nested configuration value using dot notation.
   * For example: getNested<number>('api.timeout') returns the API timeout value.
   * 
   * This is useful when you need to access deeply nested configuration
   * without traversing the entire object structure.
   */
  getNested<T>(path: string): T | undefined {
    const result = path.split('.').reduce((obj: any, key) => obj?.[key], this.config);
    return result as T | undefined;
  }

  /**
   * Sets a top-level configuration value.
   * The new value is validated before being applied, and observers are notified
   * of the change if validation passes.
   */
  set<K extends keyof ServiceConfig>(key: K, value: ServiceConfig[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    try {
      this.validateConfig();
      this.recordSnapshot(`set:${String(key)}`);
      this.notifyObservers(String(key), value, oldValue);

      logger.debug('Configuration updated', {
        component: 'ConfigurationService',
        key,
        hasOldValue: oldValue !== undefined
      });
    } catch (error) {
      // Rollback on validation failure
      this.config[key] = oldValue;
      throw error;
    }
  }

  /**
   * Updates multiple configuration values at once.
   * This is more efficient than calling set() multiple times, as validation
   * and observer notification happen only once after all updates are applied.
   */
  update(updates: Partial<ServiceConfig>): void {
    const oldConfig = { ...this.config };

    try {
      this.config = this.mergeWithDefaults({ ...this.config, ...updates });
      this.validateConfig();
      this.recordSnapshot('bulk-update');
      this.notifyObservers('config', this.config, oldConfig);

      logger.info('Configuration bulk update completed', {
        component: 'ConfigurationService',
        updatedKeys: Object.keys(updates).length
      });
    } catch (error) {
      // Rollback entire update on failure
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * Loads configuration from environment variables.
   * This is typically called during application startup to override default
   * configuration with environment-specific values.
   * 
   * Environment variables are prefixed with REACT_APP_ for Create React App
   * compatibility, but this can be adapted for other build systems.
   */
  loadFromEnvironment(): void {
    const envConfig = EnvironmentConfigLoader.load();
    
    logger.info('Loading configuration from environment', {
      component: 'ConfigurationService',
      hasApiUrl: !!envConfig.api?.baseUrl,
      hasWsUrl: !!envConfig.websocket?.url
    });

    this.update(envConfig);
  }

  /**
   * Exports the current configuration as a read-only snapshot.
   * This is useful for debugging, logging, or creating backups.
   */
  export(): Readonly<ServiceConfig> {
    return Object.freeze(JSON.parse(JSON.stringify(this.config)));
  }

  /**
   * Registers a validator that will be called whenever configuration changes.
   * Validators should return an array of error messages (empty if valid).
   */
  registerValidator(validator: ConfigValidator): void {
    this.configValidators.push(validator);
    logger.debug('Configuration validator registered', {
      component: 'ConfigurationService',
      validatorCount: this.configValidators.length
    });
  }

  /**
   * Registers an observer that will be notified of configuration changes.
   * Observers can react to changes by updating dependent systems.
   */
  registerObserver(observer: ConfigObserver): void {
    this.configObservers.push(observer);
    logger.debug('Configuration observer registered', {
      component: 'ConfigurationService',
      observerCount: this.configObservers.length
    });
  }

  /**
   * Gets the configuration change history.
   * This is useful for debugging and auditing configuration changes.
   */
  getHistory(): ReadonlyArray<ConfigSnapshot> {
    return [...this.configHistory];
  }

  /**
   * Resets configuration to default values.
   * Use with caution - this will discard all customizations!
   */
  resetToDefaults(): void {
    logger.warn('Resetting configuration to defaults', {
      component: 'ConfigurationService'
    });

    const defaultConfig = this.mergeWithDefaults({});
    this.config = defaultConfig;
    this.validateConfig();
    this.recordSnapshot('reset');
    this.notifyObservers('config', this.config, undefined);
  }

  /**
   * Merges partial configuration with default values.
   * This ensures that all required configuration keys have values,
   * even if they weren't provided in the partial config.
   */
  private mergeWithDefaults(partialConfig: Partial<ServiceConfig>): ServiceConfig {
    const defaults: ServiceConfig = {
      api: {
        baseUrl: this.getDefaultApiUrl(),
        timeout: 10000,
        retry: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
        },
        cache: {
          defaultTTL: 5 * 60 * 1000, // 5 minutes
          maxSize: 100,
          storage: 'memory',
          compression: false,
          encryption: false,
          evictionPolicy: 'lru'
        },
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000, // 1 minute
          strategy: 'sliding'
        }
      },
      websocket: {
        url: this.getDefaultWebSocketUrl(),
        protocols: [],
        reconnect: {
          enabled: true,
          maxAttempts: 5,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2
        },
        heartbeat: {
          enabled: true,
          interval: 30000,
          timeout: 5000
        },
        message: {
          compression: false,
          batching: true,
          batchSize: 10,
          batchInterval: 1000,
          maxMessageSize: 1024 * 1024 // 1MB
        },
        authentication: {
          type: 'session'
        }
      },
      features: {
        offlineMode: true,
        realTimeUpdates: true,
        analytics: true,
        errorReporting: true,
        performanceMonitoring: true,
        experimentalFeatures: false
      },
      limits: {
        maxConcurrentRequests: 10,
        maxCacheSize: 100,
        maxWebSocketSubscriptions: 50,
        maxRetryAttempts: 3
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: false,
        logLevel: 'info',
        sampleRate: 1.0
      }
    };

    return this.deepMerge(defaults, partialConfig);
  }

  /**
   * Determines the default API URL based on environment.
   * In development, defaults to localhost. In production, uses the current origin.
   */
  private getDefaultApiUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3000';
    }

    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    return isDevelopment 
      ? 'http://localhost:3000' 
      : `${window.location.protocol}//${window.location.host}/api`;
  }

  /**
   * Determines the default WebSocket URL based on environment and API URL.
   */
  private getDefaultWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:8080';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    return isDevelopment 
      ? 'ws://localhost:8080' 
      : `${protocol}//${window.location.host}/ws`;
  }

  /**
   * Deep merges two objects, with the source taking precedence over the target.
   * This preserves nested objects and arrays while allowing selective overrides.
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue as any);
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue as T[typeof key];
        }
      }
    }

    return result;
  }

  /**
   * Type guard to check if a value is a plain object (not an array or null).
   */
  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Validates the current configuration using all registered validators.
   * Throws an error if any validation fails.
   */
  private validateConfig(): void {
    const allErrors: string[] = [];

    for (const validator of this.configValidators) {
      const errors = validator.validate(this.config);
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${allErrors.join('\n')}`;
      
      logger.error('Configuration validation failed', {
        component: 'ConfigurationService',
        errors: allErrors
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Notifies all registered observers of a configuration change.
   * If an observer throws an error, it's caught and logged but doesn't
   * prevent other observers from being notified.
   */
  private notifyObservers(key: string, newValue: any, oldValue: any): void {
    for (const observer of this.configObservers) {
      try {
        observer.onConfigChange(key, newValue, oldValue);
      } catch (error) {
        logger.error('Configuration observer error', {
          component: 'ConfigurationService',
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Records a configuration snapshot for history tracking.
   */
  private recordSnapshot(reason: string): void {
    const snapshot: ConfigSnapshot = {
      config: JSON.parse(JSON.stringify(this.config)),
      timestamp: new Date(),
      reason
    };

    this.configHistory.push(snapshot);

    // Maintain history size limit
    if (this.configHistory.length > this.maxHistorySize) {
      this.configHistory.shift();
    }
  }
}

// ============================================================================
// Configuration Snapshot Type
// ============================================================================

interface ConfigSnapshot {
  readonly config: ServiceConfig;
  readonly timestamp: Date;
  readonly reason: string;
}

// ============================================================================
// Configuration Validators
// ============================================================================

/**
 * Validator for API-related configuration.
 * Ensures that API settings are valid and meet minimum requirements.
 */
export class ApiConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];

    // Validate base URL
    if (!config.api.baseUrl) {
      errors.push('API base URL is required');
    } else {
      try {
        new URL(config.api.baseUrl);
      } catch {
        errors.push(`Invalid API base URL: ${config.api.baseUrl}`);
      }
    }

    // Validate timeout
    if (config.api.timeout <= 0) {
      errors.push('API timeout must be positive');
    }
    if (config.api.timeout > 300000) { // 5 minutes max
      errors.push('API timeout exceeds maximum (300000ms)');
    }

    // Validate retry configuration
    const retry = config.api.retry;
    if (retry.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }
    if (retry.maxRetries > 10) {
      errors.push('Max retries exceeds reasonable limit (10)');
    }
    if (retry.baseDelay <= 0) {
      errors.push('Base delay must be positive');
    }
    if (retry.maxDelay < retry.baseDelay) {
      errors.push('Max delay must be greater than or equal to base delay');
    }
    if (retry.backoffMultiplier <= 1) {
      errors.push('Backoff multiplier must be greater than 1');
    }

    // Validate cache configuration
    const cache = config.api.cache;
    if (cache.defaultTTL <= 0) {
      errors.push('Cache TTL must be positive');
    }
    if (cache.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }
    if (!['memory', 'localStorage', 'indexedDB'].includes(cache.storage)) {
      errors.push(`Invalid cache storage type: ${cache.storage}`);
    }
    if (!['lru', 'lfu', 'fifo', 'ttl'].includes(cache.evictionPolicy)) {
      errors.push(`Invalid cache eviction policy: ${cache.evictionPolicy}`);
    }

    // Validate rate limit if present
    if (config.api.rateLimit) {
      const rateLimit = config.api.rateLimit;
      if (rateLimit.maxRequests <= 0) {
        errors.push('Rate limit max requests must be positive');
      }
      if (rateLimit.windowMs <= 0) {
        errors.push('Rate limit window must be positive');
      }
      if (!['fixed', 'sliding'].includes(rateLimit.strategy)) {
        errors.push(`Invalid rate limit strategy: ${rateLimit.strategy}`);
      }
    }

    return errors;
  }
}

/**
 * Validator for WebSocket configuration.
 * Ensures WebSocket settings are valid and compatible with the server.
 */
export class WebSocketConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];
    const ws = config.websocket;

    // Validate WebSocket URL
    if (!ws.url) {
      errors.push('WebSocket URL is required');
    } else {
      if (!ws.url.startsWith('ws://') && !ws.url.startsWith('wss://')) {
        errors.push(`Invalid WebSocket URL protocol: ${ws.url}`);
      }
    }

    // Validate reconnect configuration
    const reconnect = ws.reconnect;
    if (reconnect.maxAttempts < 0) {
      errors.push('Max reconnect attempts cannot be negative');
    }
    if (reconnect.baseDelay <= 0) {
      errors.push('Reconnect base delay must be positive');
    }
    if (reconnect.maxDelay < reconnect.baseDelay) {
      errors.push('Reconnect max delay must be greater than or equal to base delay');
    }
    if (reconnect.backoffMultiplier <= 1) {
      errors.push('Reconnect backoff multiplier must be greater than 1');
    }

    // Validate heartbeat configuration
    const heartbeat = ws.heartbeat;
    if (heartbeat.interval <= 0) {
      errors.push('Heartbeat interval must be positive');
    }
    if (heartbeat.timeout <= 0) {
      errors.push('Heartbeat timeout must be positive');
    }
    if (heartbeat.timeout >= heartbeat.interval) {
      errors.push('Heartbeat timeout must be less than interval');
    }

    // Validate message configuration
    const message = ws.message;
    if (message.batchSize <= 0) {
      errors.push('Message batch size must be positive');
    }
    if (message.batchInterval <= 0) {
      errors.push('Message batch interval must be positive');
    }
    if (message.maxMessageSize && message.maxMessageSize <= 0) {
      errors.push('Max message size must be positive if specified');
    }

    // Validate authentication if present
    if (ws.authentication) {
      const auth = ws.authentication;
      if (!['token', 'session'].includes(auth.type)) {
        errors.push(`Invalid WebSocket authentication type: ${auth.type}`);
      }
      if (auth.type === 'token' && !auth.tokenProvider) {
        errors.push('Token provider is required when using token authentication');
      }
    }

    return errors;
  }
}

/**
 * Validator for service limits configuration.
 * Ensures limits are reasonable and prevent resource exhaustion.
 */
export class LimitsConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];
    const limits = config.limits;

    if (limits.maxConcurrentRequests <= 0) {
      errors.push('Max concurrent requests must be positive');
    }
    if (limits.maxConcurrentRequests > 100) {
      errors.push('Max concurrent requests exceeds reasonable limit (100)');
    }

    if (limits.maxCacheSize <= 0) {
      errors.push('Max cache size must be positive');
    }

    if (limits.maxWebSocketSubscriptions <= 0) {
      errors.push('Max WebSocket subscriptions must be positive');
    }
    if (limits.maxWebSocketSubscriptions > 1000) {
      errors.push('Max WebSocket subscriptions exceeds reasonable limit (1000)');
    }

    if (limits.maxRetryAttempts < 0) {
      errors.push('Max retry attempts cannot be negative');
    }

    return errors;
  }
}

/**
 * Validator for monitoring configuration.
 * Ensures monitoring settings are valid.
 */
export class MonitoringConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];
    const monitoring = config.monitoring;

    const validLogLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(monitoring.logLevel)) {
      errors.push(`Invalid log level: ${monitoring.logLevel}`);
    }

    if (monitoring.sampleRate < 0 || monitoring.sampleRate > 1) {
      errors.push('Sample rate must be between 0 and 1');
    }

    return errors;
  }
}

// ============================================================================
// Configuration Observers
// ============================================================================

/**
 * Observer that reacts to cache configuration changes.
 * In a real implementation, this would reconfigure the cache manager.
 */
export class CacheConfigObserver implements ConfigObserver {
  constructor() {}

  onConfigChange(key: string, newValue: any, oldValue: any): void {
    if (key === 'api' || key === 'config') {
      const newCacheConfig = key === 'api' ? newValue.cache : newValue.api?.cache;
      const oldCacheConfig = key === 'api' ? oldValue?.cache : oldValue?.api?.cache;

      if (newCacheConfig && this.hasChanged(newCacheConfig, oldCacheConfig)) {
        logger.info('Cache configuration updated', {
          component: 'CacheConfigObserver',
          newTTL: newCacheConfig.defaultTTL,
          newStorage: newCacheConfig.storage
        });

        // In a real implementation, reconfigure the cache manager here
        // this.cacheManager?.configure(newCacheConfig);
      }
    }
  }

  private hasChanged(newConfig: any, oldConfig: any): boolean {
    return JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
  }
}

/**
 * Observer that reacts to WebSocket configuration changes.
 * In a real implementation, this would reconnect or reconfigure the WebSocket manager.
 */
export class WebSocketConfigObserver implements ConfigObserver {
  constructor() {}

  onConfigChange(key: string, newValue: any, oldValue: any): void {
    if (key === 'websocket' || key === 'config') {
      const newWsConfig = key === 'websocket' ? newValue : newValue.websocket;
      const oldWsConfig = key === 'websocket' ? oldValue : oldValue?.websocket;

      if (newWsConfig && this.hasChanged(newWsConfig, oldWsConfig)) {
        logger.info('WebSocket configuration updated', {
          component: 'WebSocketConfigObserver',
          urlChanged: newWsConfig.url !== oldWsConfig?.url
        });

        // In a real implementation, handle reconnection here
        // if (newWsConfig.url !== oldWsConfig?.url) {
        //   this.wsManager?.reconnect(newWsConfig);
        // }
      }
    }
  }

  private hasChanged(newConfig: any, oldConfig: any): boolean {
    return JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
  }
}

// ============================================================================
// Environment Configuration Loader
// ============================================================================

/**
 * Loads configuration from environment variables.
 * This follows the twelve-factor app methodology where configuration
 * is stored in the environment rather than in code.
 */
export class EnvironmentConfigLoader {
  static load(): Partial<ServiceConfig> {
    return {
      api: {
        baseUrl: this.getEnvString('VITE_API_URL') || 'http://localhost:3000',
        timeout: this.getEnvNumber('VITE_API_TIMEOUT') || 10000,
        retry: {
          maxRetries: this.getEnvNumber('VITE_API_MAX_RETRIES') || 3,
          baseDelay: this.getEnvNumber('VITE_API_RETRY_BASE_DELAY') || 1000,
          maxDelay: this.getEnvNumber('VITE_API_RETRY_MAX_DELAY') || 10000,
          backoffMultiplier: this.getEnvNumber('VITE_API_RETRY_BACKOFF') || 2,
          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
        },
        cache: {
          defaultTTL: this.getEnvNumber('VITE_CACHE_TTL') || 5 * 60 * 1000,
          maxSize: this.getEnvNumber('VITE_CACHE_MAX_SIZE') || 100,
          storage: (this.getEnvString('REACT_APP_CACHE_STORAGE') || 'memory') as any,
          compression: this.getEnvBoolean('REACT_APP_CACHE_COMPRESSION', false),
          encryption: this.getEnvBoolean('REACT_APP_CACHE_ENCRYPTION', false),
          evictionPolicy: (this.getEnvString('REACT_APP_CACHE_EVICTION') || 'lru') as any
        }
      },
      websocket: {
        url: this.getEnvString('REACT_APP_WS_URL') || 'ws://localhost:8080',
        reconnect: {
          enabled: this.getEnvBoolean('REACT_APP_WS_RECONNECT_ENABLED', true),
          maxAttempts: this.getEnvNumber('REACT_APP_WS_RECONNECT_MAX_ATTEMPTS') || 5,
          baseDelay: this.getEnvNumber('REACT_APP_WS_RECONNECT_BASE_DELAY') || 1000,
          maxDelay: this.getEnvNumber('REACT_APP_WS_RECONNECT_MAX_DELAY') || 30000,
          backoffMultiplier: this.getEnvNumber('REACT_APP_WS_RECONNECT_BACKOFF') || 2
        },
        heartbeat: {
          enabled: this.getEnvBoolean('REACT_APP_WS_HEARTBEAT_ENABLED', true),
          interval: this.getEnvNumber('REACT_APP_WS_HEARTBEAT_INTERVAL') || 30000,
          timeout: this.getEnvNumber('REACT_APP_WS_HEARTBEAT_TIMEOUT') || 5000
        },
        message: {
          compression: this.getEnvBoolean('REACT_APP_WS_MESSAGE_COMPRESSION', false),
          batching: this.getEnvBoolean('REACT_APP_WS_MESSAGE_BATCHING', true),
          batchSize: this.getEnvNumber('REACT_APP_WS_MESSAGE_BATCH_SIZE') || 10,
          batchInterval: this.getEnvNumber('REACT_APP_WS_MESSAGE_BATCH_INTERVAL') || 1000
        }
      },
      features: {
        offlineMode: this.getEnvBoolean('REACT_APP_OFFLINE_MODE', true),
        realTimeUpdates: this.getEnvBoolean('REACT_APP_REALTIME_UPDATES', true),
        analytics: this.getEnvBoolean('REACT_APP_ANALYTICS', true),
        errorReporting: this.getEnvBoolean('REACT_APP_ERROR_REPORTING', true),
        performanceMonitoring: this.getEnvBoolean('REACT_APP_PERFORMANCE_MONITORING', true),
        experimentalFeatures: this.getEnvBoolean('REACT_APP_EXPERIMENTAL_FEATURES', false)
      },
      limits: {
        maxConcurrentRequests: this.getEnvNumber('REACT_APP_MAX_CONCURRENT_REQUESTS') || 10,
        maxCacheSize: this.getEnvNumber('REACT_APP_MAX_CACHE_SIZE') || 100,
        maxWebSocketSubscriptions: this.getEnvNumber('REACT_APP_MAX_WS_SUBSCRIPTIONS') || 50,
        maxRetryAttempts: this.getEnvNumber('REACT_APP_MAX_RETRY_ATTEMPTS') || 3
      },
      monitoring: {
        enableMetrics: this.getEnvBoolean('REACT_APP_ENABLE_METRICS', true),
        enableTracing: this.getEnvBoolean('REACT_APP_ENABLE_TRACING', false),
        logLevel: (this.getEnvString('REACT_APP_LOG_LEVEL') || 'info') as LogLevel,
        sampleRate: this.getEnvNumber('REACT_APP_SAMPLE_RATE') || 1.0
      }
    };
  }

  private static getEnvString(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  private static getEnvNumber(key: string, defaultValue?: number): number | undefined {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private static getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }
}

// ============================================================================
// Global Configuration Instance
// ============================================================================

/**
 * Global configuration instance that's used throughout the application.
 * This is initialized with environment variables and can be reconfigured at runtime.
 */
export const globalConfig = new ConfigurationService(EnvironmentConfigLoader.load());

// Register default validators
globalConfig.registerValidator(new ApiConfigValidator());
globalConfig.registerValidator(new WebSocketConfigValidator());
globalConfig.registerValidator(new LimitsConfigValidator());
globalConfig.registerValidator(new MonitoringConfigValidator());