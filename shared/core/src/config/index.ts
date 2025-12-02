/**
 * Configuration Manager
 * 
 * Enhanced configuration management with Zod validation, hot reloading,
 * and feature flag support based on refined_cross_cutting.ts patterns
 */

import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import { config as dotenvConfig } from 'dotenv';
import { existsSync, readFileSync, watchFile } from 'fs';
import { resolve } from 'path';
import { configSchema, type AppConfig, envMapping, defaultFeatures } from './schema';
// import { logger } from '../observability/logging'; // Unused import
import type {
  ConfigLoadOptions,
  ConfigChangeEvent,
  ConfigChange,
  FeatureFlagContext,
  FeatureFlagResult,
  ConfigValidationResult,
  DependencyValidationResult,
  ConfigManagerEvents,
  ConfigManagerState,
  HotReloadConfig,
} from './types';

export class ConfigManager extends EventEmitter {
  private _config: AppConfig | null = null;
  private _state: ConfigManagerState = {
    loaded: false,
    valid: false,
    lastLoaded: null,
    lastValidated: null,
    watchingFiles: [],
    dependencyStatus: {},
  };
  private validationCache = new Map<string, boolean>();
  private hotReloadConfig: HotReloadConfig = {
    enabled: false,
    debounceMs: 1000,
    watchPaths: ['.env', '.env.local'],
    excludePatterns: ['node_modules/**', 'dist/**'],
  };

  constructor(private options: ConfigLoadOptions = {}) {
    super();
    this.setMaxListeners(20); // Allow multiple listeners for different modules
  }

  /**
   * Load and validate configuration from environment
   */
  async load(): Promise<AppConfig> {
    try {
      // Load environment variables with cascading priority
      this.loadEnvironmentFiles();
      
      // Parse and validate configuration
      const parsed = configSchema.safeParse(this.buildConfigFromEnv());
      
      if (!parsed.success) {
        const errors = parsed.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
        }));
        
        const errorMessage = `Configuration validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`;
        const error = new Error(errorMessage) as any;
        error.validationErrors = errors;
        
        this.emit('config:error', error);
        
        if (this.options.failFast !== false) {
          throw error;
        }
      }
      
      const previousConfig = this._config;
      this._config = parsed.success ? parsed.data : this.getDefaultConfig();
      
      // Update state
      this._state.loaded = true;
      this._state.valid = parsed.success;
      this._state.lastLoaded = new Date();
      this._state.lastValidated = new Date();
      
      // Emit events
      this.emit('config:loaded', this._config);
      
      if (previousConfig) {
        const changes = this.detectChanges(previousConfig, this._config);
        if (changes.length > 0) {
          this.emit('config:changed', {
            previous: previousConfig,
            current: this._config,
            changes,
            timestamp: new Date(),
          });
        }
      }
      
      // Validate runtime dependencies if enabled
      if (this.options.validateDependencies !== false) {
        await this.validateRuntimeDependencies();
      }
      
      // Set up hot reloading in development
      if (this._config.app.environment === 'development' && this.options.enableHotReload !== false) {
        this.setupHotReload();
      }
      
      return this._config;
    } catch (error) {
      this.emit('config:error', error);
      throw error;
    }
  }

  /**
   * Get current configuration (throws if not loaded)
   */
  get config(): AppConfig {
    if (!this._config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this._config;
  }

  /**
   * Get configuration manager state
   */
  get state(): ConfigManagerState {
    return { ...this._state };
  }

  /**
   * Check if a feature flag is enabled with rollout support
   */
  isFeatureEnabled(featureName: string, context?: FeatureFlagContext): FeatureFlagResult {
    const config = this._config;
    if (!config) {
      return { enabled: false, reason: 'not_found' };
    }

    const feature = config.features[featureName];
    if (!feature) {
      return { enabled: false, reason: 'not_found' };
    }

    if (!feature.enabled) {
      return { enabled: false, reason: 'disabled' };
    }
    
    // Check if user is specifically enabled
    if (context?.user_id && feature.enabledForUsers.includes(context.user_id)) {
      const result = { enabled: true, reason: 'user_targeting' as const, rolloutPercentage: 100 };
      this.emit('feature:evaluated', featureName, result, context);
      return result;
    }
    
    // Check rollout percentage
    if (feature.rolloutPercentage < 100) {
      const hash = this.hashString(`${featureName}-${context?.user_id || context?.session_id || 'anonymous'}`);
      const enabled = (hash % 100) < feature.rolloutPercentage;
      const result = { 
        enabled, 
        reason: 'rollout' as const, 
        rolloutPercentage: feature.rolloutPercentage 
      };
      this.emit('feature:evaluated', featureName, result, context);
      return result;
    }
    
    const result = { enabled: true, reason: 'enabled' as const, rolloutPercentage: 100 };
    this.emit('feature:evaluated', featureName, result, context);
    return result;
  }

  /**
   * Update configuration with overrides
   */
  configure(overrides: Partial<AppConfig>): void {
    if (!this._config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const merged = this.deepMerge(this._config, overrides);
    const parsed = configSchema.safeParse(merged);
    
    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      throw new Error(`Configuration update failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
    }
    
    const previousConfig = this._config;
    this._config = parsed.data;
    
    const changes = this.detectChanges(previousConfig, this._config);
    this.emit('config:changed', {
      previous: previousConfig,
      current: this._config,
      changes,
      timestamp: new Date(),
    });
  }

  /**
   * Validate current configuration
   */
  validate(): ConfigValidationResult {
    if (!this._config) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'Configuration not loaded', code: 'NOT_LOADED' }],
        warnings: [],
      };
    }

    const parsed = configSchema.safeParse(this._config);
    const result: ConfigValidationResult = {
      valid: parsed.success,
      errors: [],
      warnings: [],
    };

    if (!parsed.success) {
      result.errors = parsed.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined,
      }));
    }

    // Add configuration-specific warnings
    this.addConfigurationWarnings(result);

    this.emit('config:validated', result);
    return result;
  }

  /**
   * Get environment file path with priority
   */
  private getEnvFilePath(): string[] {
    const env = process.env.NODE_ENV || 'development';
    const envFiles = [
      '.env',
      `.env.${env}`,
      '.env.local',
    ];
    
    return envFiles.filter(file => {
      const fullPath = resolve(process.cwd(), file);
      return existsSync(fullPath);
    });
  }

  /**
   * Load environment files with cascading priority
   */
  private loadEnvironmentFiles(): void {
    const envFiles = this.getEnvFilePath();
    
    for (const file of envFiles) {
      try {
        const result = dotenvConfig({ path: file });
        if (result.error) {
          console.warn(`Warning: Could not load ${file}:`, result.error.message);
        }
      } catch (error) {
        console.warn(`Warning: Error loading ${file}:`, error);
      }
    }
  }

  /**
   * Build configuration object from environment variables
   */
  private buildConfigFromEnv(): Record<string, any> {
    const config: Record<string, any> = {};
    
    // Apply environment variable mappings
    for (const [envVar, configPath] of Object.entries(envMapping)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(config, configPath, value);
      }
    }
    
    // Add any additional environment variables that follow naming conventions
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && !envMapping[key as keyof typeof envMapping]) {
        // Convert SCREAMING_SNAKE_CASE to nested object paths
        const configPath = this.envVarToConfigPath(key);
        if (configPath) {
          this.setNestedValue(config, configPath, value);
        }
      }
    }
    
    return config;
  }

  /**
   * Convert environment variable name to config path
   */
  private envVarToConfigPath(envVar: string): string | null {
    // Convert common patterns like CACHE_REDIS_URL to cache.redisUrl
    const parts = envVar.toLowerCase().split('_');
    if (parts.length < 2) return null;
    
    // Convert to camelCase
    const camelCased = parts.map((part, index) => 
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
    
    // Map to known config sections
    const sectionMappings: Record<string, string> = {
      cache: 'cache',
      log: 'log',
      rate: 'rateLimit',
      error: 'errors',
      security: 'security',
      storage: 'storage',
      database: 'database',
      db: 'database',
      feature: 'features',
      monitoring: 'monitoring',
      validation: 'validation',
    };
    
    const firstPart = parts[0];
    if (!firstPart) return null;
    
    const section = sectionMappings[firstPart];
    if (!section) return null;
    
    const property = parts.slice(1).map((part, index) => 
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
    
    return `${section}.${property}`;
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return configSchema.parse({});
  }

  /**
   * Validate runtime dependencies
   */
  private async validateRuntimeDependencies(): Promise<void> {
    const config = this._config!;
    const validations: Promise<DependencyValidationResult>[] = [];
    
    // Validate Redis connection if using Redis
    if (config.cache.provider === 'redis' || config.rateLimit.provider === 'redis') {
      validations.push(this.validateRedisConnection(config.cache.redisUrl));
    }
    
    // Validate database connection
    validations.push(this.validateDatabaseConnection(config.database.url));
    
    // Validate Sentry DSN if configured
    if (config.errors.reportToSentry && config.errors.sentryDsn) {
      validations.push(this.validateSentryDsn(config.errors.sentryDsn));
    }
    
    const results = await Promise.allSettled(validations);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        this._state.dependencyStatus[result.value.dependency] = result.value;
        this.emit('dependency:validated', result.value);
        
        if (result.value.status === 'unhealthy') {
          console.warn(`Dependency validation warning: ${result.value.dependency} - ${result.value.message}`);
        }
      }
    }
  }

  /**
   * Validate Redis connection
   */
  private async validateRedisConnection(redisUrl: string): Promise<DependencyValidationResult> {
    try {
      new URL(redisUrl);
      return {
        dependency: 'redis',
        status: 'healthy',
        message: 'Redis URL format is valid',
      };
    } catch (error) {
      return {
        dependency: 'redis',
        status: 'unhealthy',
        message: 'Invalid Redis URL format',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Validate database connection
   */
  private async validateDatabaseConnection(databaseUrl: string): Promise<DependencyValidationResult> {
    try {
      new URL(databaseUrl);
      return {
        dependency: 'database',
        status: 'healthy',
        message: 'Database URL format is valid',
      };
    } catch (error) {
      return {
        dependency: 'database',
        status: 'unhealthy',
        message: 'Invalid database URL format',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Validate Sentry DSN
   */
  private async validateSentryDsn(sentryDsn: string): Promise<DependencyValidationResult> {
    try {
      new URL(sentryDsn);
      return {
        dependency: 'sentry',
        status: 'healthy',
        message: 'Sentry DSN format is valid',
      };
    } catch (error) {
      return {
        dependency: 'sentry',
        status: 'unhealthy',
        message: 'Invalid Sentry DSN format',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Setup hot reloading for development
   */
  private setupHotReload(): void {
    if (this.hotReloadConfig.enabled) return;
    
    const envFiles = this.getEnvFilePath();
    
    for (const file of envFiles) {
      if (!this._state.watchingFiles.includes(file)) {
        this._state.watchingFiles.push(file);
        
        let debounceTimer: NodeJS.Timeout;
        
        watchFile(file, () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              console.log(`Configuration file ${file} changed, reloading...`);
              await this.load();
            } catch (error) {
              this.emit('config:error', error);
            }
          }, this.hotReloadConfig.debounceMs);
        });
      }
    }
    
    this.hotReloadConfig.enabled = true;
  }

  /**
   * Detect changes between configurations
   */
  private detectChanges(previous: AppConfig, current: AppConfig): ConfigChange[] {
    const changes: ConfigChange[] = [];
    
    const compareObjects = (prev: any, curr: any, path: string = '') => {
      const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
      
      for (const key of Array.from(allKeys)) {
        const currentPath = path ? `${path}.${key}` : key;
        const prevValue = prev?.[key];
        const currValue = curr?.[key];
        
        if (prevValue === undefined && currValue !== undefined) {
          changes.push({
            path: currentPath,
            previousValue: undefined,
            currentValue: currValue,
            type: 'added',
          });
        } else if (prevValue !== undefined && currValue === undefined) {
          changes.push({
            path: currentPath,
            previousValue: prevValue,
            currentValue: undefined,
            type: 'removed',
          });
        } else if (typeof prevValue === 'object' && typeof currValue === 'object') {
          compareObjects(prevValue, currValue, currentPath);
        } else if (prevValue !== currValue) {
          changes.push({
            path: currentPath,
            previousValue: prevValue,
            currentValue: currValue,
            type: 'modified',
          });
        }
      }
    };
    
    compareObjects(previous, current);
    return changes;
  }

  /**
   * Add configuration-specific warnings
   */
  private addConfigurationWarnings(result: ConfigValidationResult): void {
    const config = this._config!;
    
    // Warn about development settings in production
    if (config.app.environment === 'production') {
      if (config.log.pretty) {
        result.warnings.push({
          path: 'log.pretty',
          message: 'Pretty logging is enabled in production',
          suggestion: 'Consider disabling pretty logging for better performance',
        });
      }
      
      if (config.errors.includeStack) {
        result.warnings.push({
          path: 'errors.includeStack',
          message: 'Stack traces are included in production error responses',
          suggestion: 'Consider disabling stack traces in production for security',
        });
      }
    }
    
    // Warn about weak security settings
    if (config.security.bcryptRounds < 12) {
      result.warnings.push({
        path: 'security.bcryptRounds',
        message: 'BCrypt rounds are below recommended minimum (12)',
        suggestion: 'Consider increasing BCrypt rounds for better security',
      });
    }
    
    // Warn about cache configuration
    if (config.cache.provider === 'memory' && config.app.environment === 'production') {
      result.warnings.push({
        path: 'cache.provider',
        message: 'Memory cache is not recommended for production',
        suggestion: 'Consider using Redis for production caching',
      });
    }
  }

  /**
   * Hash string for consistent feature flag evaluation
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this._state.watchingFiles = [];
    this.hotReloadConfig.enabled = false;
  }
}

// Create and export singleton instance
export const configManager = new ConfigManager();

// Export configuration getter
export const getConfig = (): AppConfig => configManager.config;

// Export types and schema
export * from './types';
export * from './schema';
export { configSchema, defaultFeatures };

// Export default instance for convenience
export default configManager;















































