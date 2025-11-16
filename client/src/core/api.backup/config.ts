// Centralized Configuration Management for Unified API Client
// Based on the consolidated API client design specifications

import {
  ServiceConfig,
  ConfigValidator,
  ConfigObserver,
  RetryConfig,
  CacheConfig,
  WebSocketConfig
} from './types';

// Configuration Service
export class ConfigurationService {
  private config: ServiceConfig;
  private configValidators: ConfigValidator[] = [];
  private configObservers: ConfigObserver[] = [];

  constructor(initialConfig: Partial<ServiceConfig>) {
    this.config = this.mergeWithDefaults(initialConfig);
    this.validateConfig();
  }

  get<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] {
    return this.config[key];
  }

  getNested<T>(path: string): T | undefined {
    return path.split('.').reduce((obj: any, key) => obj?.[key], this.config) as T;
  }

  set<K extends keyof ServiceConfig>(key: K, value: ServiceConfig[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    this.validateConfig();
    this.notifyObservers(key, value, oldValue);
  }

  update(updates: Partial<ServiceConfig>): void {
    const oldConfig = { ...this.config };

    this.config = this.mergeWithDefaults({ ...this.config, ...updates });

    this.validateConfig();
    this.notifyObservers('config', this.config, oldConfig);
  }

  registerValidator(validator: ConfigValidator): void {
    this.configValidators.push(validator);
  }

  registerObserver(observer: ConfigObserver): void {
    this.configObservers.push(observer);
  }

  loadFromEnvironment(): void {
    const envConfig: Partial<ServiceConfig> = {
      api: {
        baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
        timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
        retry: this.config.api.retry, // Keep existing retry config
        cache: this.config.api.cache   // Keep existing cache config
      },
      websocket: {
        url: process.env.REACT_APP_WS_URL || 'ws://localhost:8080',
        reconnect: this.config.websocket.reconnect,
        heartbeat: this.config.websocket.heartbeat,
        message: this.config.websocket.message
      },
      features: {
        offlineMode: process.env.REACT_APP_OFFLINE_MODE === 'true',
        realTimeUpdates: process.env.REACT_APP_REALTIME_UPDATES !== 'false',
        analytics: process.env.REACT_APP_ANALYTICS !== 'false',
        errorReporting: this.config.features.errorReporting,
        performanceMonitoring: this.config.features.performanceMonitoring
      },
      monitoring: {
        logLevel: (process.env.REACT_APP_LOG_LEVEL as any) || 'info',
        enableMetrics: this.config.monitoring.enableMetrics,
        enableTracing: this.config.monitoring.enableTracing
      },
      limits: this.config.limits // Keep existing limits
    };

    this.update(envConfig);
  }

  export(): ServiceConfig {
    return { ...this.config };
  }

  private mergeWithDefaults(partialConfig: Partial<ServiceConfig>): ServiceConfig {
    const defaults: ServiceConfig = {
      api: {
        baseUrl: 'http://localhost:5000',
        timeout: 10000,
        retry: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2
        },
        cache: {
          defaultTTL: 5 * 60 * 1000, // 5 minutes
          maxSize: 100,
          storage: 'memory',
          compression: false,
          encryption: false
        }
      },
      websocket: {
        url: 'ws://localhost:8080',
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
          batchInterval: 1000
        }
      },
      features: {
        offlineMode: true,
        realTimeUpdates: true,
        analytics: true,
        errorReporting: true,
        performanceMonitoring: true
      },
      limits: {
        maxConcurrentRequests: 10,
        maxCacheSize: 100,
        maxWebSocketSubscriptions: 50
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        logLevel: 'info'
      }
    };

    return this.deepMerge(defaults, partialConfig);
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue as any);
        } else {
          result[key] = sourceValue as T[typeof key];
        }
      }
    }

    return result;
  }

  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private validateConfig(): void {
    for (const validator of this.configValidators) {
      const errors = validator.validate(this.config);
      if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }
    }
  }

  private notifyObservers(key: string, newValue: any, oldValue: any): void {
    for (const observer of this.configObservers) {
      try {
        observer.onConfigChange(key, newValue, oldValue);
      } catch (error) {
        console.error('Config observer error:', error);
      }
    }
  }
}

// Configuration Validators
export class ApiConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];

    // Validate API configuration
    if (!config.api.baseUrl) {
      errors.push('API base URL is required');
    }

    if (config.api.timeout <= 0) {
      errors.push('API timeout must be positive');
    }

    if (config.api.retry.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }

    if (config.api.retry.baseDelay <= 0) {
      errors.push('Base delay must be positive');
    }

    if (config.api.retry.backoffMultiplier <= 1) {
      errors.push('Backoff multiplier must be greater than 1');
    }

    // Validate cache configuration
    if (config.api.cache.defaultTTL <= 0) {
      errors.push('Cache TTL must be positive');
    }

    if (config.api.cache.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }

    return errors;
  }
}

export class WebSocketConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];

    // Validate WebSocket configuration
    if (!config.websocket.url) {
      errors.push('WebSocket URL is required');
    }

    if (config.websocket.reconnect.maxAttempts < 0) {
      errors.push('Max reconnect attempts cannot be negative');
    }

    if (config.websocket.reconnect.baseDelay <= 0) {
      errors.push('Reconnect base delay must be positive');
    }

    if (config.websocket.heartbeat.interval <= 0) {
      errors.push('Heartbeat interval must be positive');
    }

    if (config.websocket.message.batchSize <= 0) {
      errors.push('Message batch size must be positive');
    }

    if (config.websocket.message.batchInterval <= 0) {
      errors.push('Message batch interval must be positive');
    }

    return errors;
  }
}

export class LimitsConfigValidator implements ConfigValidator {
  validate(config: ServiceConfig): string[] {
    const errors: string[] = [];

    // Validate limits configuration
    if (config.limits.maxConcurrentRequests <= 0) {
      errors.push('Max concurrent requests must be positive');
    }

    if (config.limits.maxCacheSize <= 0) {
      errors.push('Max cache size must be positive');
    }

    if (config.limits.maxWebSocketSubscriptions <= 0) {
      errors.push('Max WebSocket subscriptions must be positive');
    }

    return errors;
  }
}

// Configuration Observers
export class CacheConfigObserver implements ConfigObserver {
  constructor(private cacheManager: any) {} // Would be typed properly

  onConfigChange(key: string, newValue: any, oldValue: any): void {
    if (key === 'api.cache' || key === 'config') {
      // Reconfigure cache manager with new settings
      console.log('Cache configuration updated:', newValue);
      // Implementation would update cache manager settings
    }
  }
}

export class WebSocketConfigObserver implements ConfigObserver {
  constructor(private wsManager: any) {} // Would be typed properly

  onConfigChange(key: string, newValue: any, oldValue: any): void {
    if (key === 'websocket' || key === 'config') {
      // Reconfigure WebSocket manager with new settings
      console.log('WebSocket configuration updated:', newValue);
      // Implementation would update WebSocket manager settings
    }
  }
}

// Environment Configuration Loader
export class EnvironmentConfigLoader {
  static load(): Partial<ServiceConfig> {
    return {
      api: {
        baseUrl: this.getEnvString('REACT_APP_API_URL', 'http://localhost:5000'),
        timeout: this.getEnvNumber('REACT_APP_API_TIMEOUT', 10000),
        retry: {
          maxRetries: this.getEnvNumber('REACT_APP_API_MAX_RETRIES', 3),
          baseDelay: this.getEnvNumber('REACT_APP_API_RETRY_BASE_DELAY', 1000),
          maxDelay: this.getEnvNumber('REACT_APP_API_RETRY_MAX_DELAY', 10000),
          backoffMultiplier: this.getEnvNumber('REACT_APP_API_RETRY_BACKOFF', 2)
        },
        cache: {
          defaultTTL: this.getEnvNumber('REACT_APP_CACHE_TTL', 5 * 60 * 1000),
          maxSize: this.getEnvNumber('REACT_APP_CACHE_MAX_SIZE', 100),
          storage: this.getEnvString('REACT_APP_CACHE_STORAGE', 'memory') as any,
          compression: this.getEnvBoolean('REACT_APP_CACHE_COMPRESSION', false),
          encryption: this.getEnvBoolean('REACT_APP_CACHE_ENCRYPTION', false)
        }
      },
      websocket: {
        url: this.getEnvString('REACT_APP_WS_URL', 'ws://localhost:8080'),
        reconnect: {
          enabled: this.getEnvBoolean('REACT_APP_WS_RECONNECT_ENABLED', true),
          maxAttempts: this.getEnvNumber('REACT_APP_WS_RECONNECT_MAX_ATTEMPTS', 5),
          baseDelay: this.getEnvNumber('REACT_APP_WS_RECONNECT_BASE_DELAY', 1000),
          maxDelay: this.getEnvNumber('REACT_APP_WS_RECONNECT_MAX_DELAY', 30000),
          backoffMultiplier: this.getEnvNumber('REACT_APP_WS_RECONNECT_BACKOFF', 2)
        },
        heartbeat: {
          enabled: this.getEnvBoolean('REACT_APP_WS_HEARTBEAT_ENABLED', true),
          interval: this.getEnvNumber('REACT_APP_WS_HEARTBEAT_INTERVAL', 30000),
          timeout: this.getEnvNumber('REACT_APP_WS_HEARTBEAT_TIMEOUT', 5000)
        },
        message: {
          compression: this.getEnvBoolean('REACT_APP_WS_MESSAGE_COMPRESSION', false),
          batching: this.getEnvBoolean('REACT_APP_WS_MESSAGE_BATCHING', true),
          batchSize: this.getEnvNumber('REACT_APP_WS_MESSAGE_BATCH_SIZE', 10),
          batchInterval: this.getEnvNumber('REACT_APP_WS_MESSAGE_BATCH_INTERVAL', 1000)
        }
      },
      features: {
        offlineMode: this.getEnvBoolean('REACT_APP_OFFLINE_MODE', true),
        realTimeUpdates: this.getEnvBoolean('REACT_APP_REALTIME_UPDATES', true),
        analytics: this.getEnvBoolean('REACT_APP_ANALYTICS', true),
        errorReporting: this.getEnvBoolean('REACT_APP_ERROR_REPORTING', true),
        performanceMonitoring: this.getEnvBoolean('REACT_APP_PERFORMANCE_MONITORING', true)
      },
      limits: {
        maxConcurrentRequests: this.getEnvNumber('REACT_APP_MAX_CONCURRENT_REQUESTS', 10),
        maxCacheSize: this.getEnvNumber('REACT_APP_MAX_CACHE_SIZE', 100),
        maxWebSocketSubscriptions: this.getEnvNumber('REACT_APP_MAX_WS_SUBSCRIPTIONS', 50)
      },
      monitoring: {
        enableMetrics: this.getEnvBoolean('REACT_APP_ENABLE_METRICS', true),
        enableTracing: this.getEnvBoolean('REACT_APP_ENABLE_TRACING', true),
        logLevel: this.getEnvString('REACT_APP_LOG_LEVEL', 'info') as any
      }
    };
  }

  private static getEnvString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private static getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  private static getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }
}

// Global Configuration Instance
export const globalConfig = new ConfigurationService(EnvironmentConfigLoader.load());

// Register default validators
globalConfig.registerValidator(new ApiConfigValidator());
globalConfig.registerValidator(new WebSocketConfigValidator());
globalConfig.registerValidator(new LimitsConfigValidator());