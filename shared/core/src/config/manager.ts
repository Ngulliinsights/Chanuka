/**
 * Configuration Manager for Capability Instantiation
 *
 * Provides unified configuration system for all shared/core capabilities
 * with environment validation, service construction, and observability integration.
 */

import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import * as dotenvExpand from 'dotenv-expand';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { configSchema, type AppConfig, envMapping, defaultFeatures } from './schema';
import { Result, Ok, Err, ok, err } from '../primitives/types';
import { BaseError, ErrorDomain, ErrorSeverity } from '../observability/error-management';
import { ObservabilityStack } from '../observability/stack';
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

// Configuration Manager Error Classes
export class ConfigurationError extends BaseError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
      cause,
      details: metadata,
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
    });
  }
}

export class ConfigurationValidationError extends ConfigurationError {
  constructor(message: string, validationErrors: any[]) {
    super(message, undefined, { validationErrors });
  }
}

export class ConfigurationEncryptionError extends ConfigurationError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Configuration Manager for unified capability instantiation
 */
export class ConfigurationManager extends EventEmitter {
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
  private observability?: ObservabilityStack;
  private encryptionKey?: string;
  private encryptedValues = new Set<string>();

  constructor(
    private options: ConfigLoadOptions = {},
    observability?: ObservabilityStack
  ) {
    super();
    this.setMaxListeners(20);
    this.observability = observability;

    // Set up observability integration
    if (this.observability) {
      this.setupObservabilityIntegration();
    }
  }

  /**
   * Load and validate configuration from multiple sources
   */
  async load(): Promise<Result<AppConfig, ConfigurationError>> {
    try {
      const startTime = Date.now();

      // Load environment variables with cascading priority
      this.loadEnvironmentFiles();

      // Build configuration from multiple sources
      const rawConfig = this.buildConfiguration();

      // Validate configuration with Result types
      const validationResult = this.validateConfiguration(rawConfig);
      if (validationResult.isErr()) {
        const error = validationResult.unwrap();
        this.emit('config:error', error);
        this.observability?.getMetrics()?.counter('config.validation.failed', 1);
        return err(error);
      }

      const config = validationResult.unwrap();

      // Store validated configuration
      const previousConfig = this._config;
      this._config = config;

      // Update state
      this._state.loaded = true;
      this._state.valid = true;
      this._state.lastLoaded = new Date();
      this._state.lastValidated = new Date();

      // Emit events and track metrics
      this.emit('config:loaded', this._config);
      this.observability?.getMetrics()?.counter('config.loaded', 1);
      this.observability?.getMetrics()?.histogram('config.load.duration', Date.now() - startTime);

      // Detect and emit configuration changes
      if (previousConfig) {
        const changes = this.detectChanges(previousConfig, this._config);
        if (changes.length > 0) {
          const changeEvent: ConfigChangeEvent = {
            previous: previousConfig,
            current: this._config,
            changes,
            timestamp: new Date(),
          };
          this.emit('config:changed', changeEvent);
          this.observability?.getMetrics()?.counter('config.changes.detected', changes.length);
        }
      }

      // Validate runtime dependencies
      if (this.options.validateDependencies !== false) {
        const dependencyResult = await this.validateRuntimeDependencies();
        if (dependencyResult.isErr()) {
          // Log warning but don't fail loading
          this.observability?.getLogger()?.warn('Dependency validation failed', {
            error: (dependencyResult.unwrap() as ConfigurationError).message
          });
        }
      }

      // Set up hot reloading in development
      if (this._config.app.environment === 'development' && this.options.enableHotReload !== false) {
        this.setupHotReload();
      }

      return ok(this._config);
    } catch (error) {
      const configError = new ConfigurationError(
        `Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
      this.emit('config:error', configError);
      this.observability?.getMetrics()?.counter('config.load.failed', 1);
      return err(configError);
    }
  }

  /**
   * Get current configuration (throws if not loaded)
   */
  get config(): AppConfig {
    if (!this._config) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
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
  configure(overrides: Partial<AppConfig>): Result<void, ConfigurationError> {
    if (!this._config) {
      return err(new ConfigurationError('Configuration not loaded. Call load() first.'));
    }

    try {
      const merged = this.deepMerge(this._config, overrides);
      const parsed = configSchema.safeParse(merged);

      if (!parsed.success) {
        const errors = parsed.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return err(new ConfigurationValidationError(
          `Configuration update failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
          errors
        ));
      }

      const previousConfig = this._config;
      this._config = parsed.data;

      const changes = this.detectChanges(previousConfig, this._config);
      const changeEvent: ConfigChangeEvent = {
        previous: previousConfig,
        current: this._config,
        changes,
        timestamp: new Date(),
      };
      this.emit('config:changed', changeEvent);
      this.observability?.getMetrics()?.counter('config.updated', 1);

      return ok(undefined);
    } catch (error) {
      return err(new ConfigurationError(
        `Configuration update failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Validate current configuration
   */
  validate(): Result<ConfigValidationResult, ConfigurationError> {
    if (!this._config) {
      return ok({
        valid: false,
        errors: [{ path: 'root', message: 'Configuration not loaded', code: 'NOT_LOADED' }],
        warnings: [],
      });
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
    this.observability?.getMetrics()?.counter('config.validated', 1);

    return ok(result);
  }

  /**
   * Set encryption key for sensitive configuration values
   */
  setEncryptionKey(key: string): Result<void, ConfigurationEncryptionError> {
    try {
      // Validate key strength (basic check)
      if (key.length < 32) {
        return err(new ConfigurationEncryptionError('Encryption key must be at least 32 characters long'));
      }

      this.encryptionKey = key;
      this.observability?.getLogger()?.info('Configuration encryption key set');
      return ok(undefined);
    } catch (error) {
      return err(new ConfigurationEncryptionError(
        'Failed to set encryption key',
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Encrypt a configuration value
   */
  encryptValue(path: string, value: string): Result<string, ConfigurationEncryptionError> {
    if (!this.encryptionKey) {
      return err(new ConfigurationEncryptionError('Encryption key not set'));
    }

    try {
      // Simple encryption using crypto module (in real implementation, use proper encryption)
      const crypto = require('crypto');
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      this.encryptedValues.add(path);
      this.observability?.getMetrics()?.counter('config.value.encrypted', 1);

      return ok(`ENC:${encrypted}`);
    } catch (error) {
      return err(new ConfigurationEncryptionError(
        `Failed to encrypt value at path ${path}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Decrypt a configuration value
   */
  decryptValue(encryptedValue: string): Result<string, ConfigurationEncryptionError> {
    if (!this.encryptionKey) {
      return err(new ConfigurationEncryptionError('Encryption key not set'));
    }

    if (!encryptedValue.startsWith('ENC:')) {
      return ok(encryptedValue); // Not encrypted
    }

    try {
      const crypto = require('crypto');
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      const encrypted = encryptedValue.slice(4); // Remove 'ENC:' prefix
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      this.observability?.getMetrics()?.counter('config.value.decrypted', 1);

      return ok(decrypted);
    } catch (error) {
      return err(new ConfigurationEncryptionError(
        'Failed to decrypt value',
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Reload configuration (for hot reloading)
   */
  async reload(): Promise<Result<AppConfig, ConfigurationError>> {
    this.observability?.getLogger()?.info('Reloading configuration');
    this.observability?.getMetrics()?.counter('config.reload.attempted', 1);

    // Reset state
    this._state.loaded = false;
    this._state.valid = false;

    return this.load();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this._state.watchingFiles = [];
    this.hotReloadConfig.enabled = false;
    this.validationCache.clear();
    this.encryptedValues.clear();

    this.observability?.getLogger()?.info('Configuration manager destroyed');
  }

  // ==================== Private Methods ====================

  private setupObservabilityIntegration(): void {
    if (!this.observability) return;

    const logger = this.observability.getLogger();
    const metrics = this.observability.getMetrics();

    // Log configuration events
    this.on('config:loaded', (config) => {
      logger.info('Configuration loaded successfully', {
        environment: config.app.environment,
        features: Object.keys(config.features).length
      });
    });

    this.on('config:changed', (event) => {
      logger.info('Configuration changed', {
        changes: event.changes.length,
        timestamp: event.timestamp
      });
    });

    this.on('config:error', (error) => {
      logger.error('Configuration error', {
        error: error.message,
        code: error.errorCode
      });
    });

    // Track feature flag evaluations
    this.on('feature:evaluated', (flag, result, context) => {
      metrics.counter('feature.flag.evaluated', 1, {
        flag,
        enabled: String(result.enabled),
        reason: result.reason
      });
    });
  }

  private loadEnvironmentFiles(): void {
    const envFiles = this.getEnvFilePaths();

    for (const file of envFiles) {
      try {
        const result = dotenvExpand.expand({
          parsed: require('dotenv').config({ path: file }).parsed || {}
        });

        if (result.error) {
          this.observability?.getLogger()?.warn(`Warning: Could not load ${file}`, {
            error: result.error.message
          });
        }
      } catch (error) {
        this.observability?.getLogger()?.warn(`Warning: Error loading ${file}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private buildConfiguration(): Result<Partial<AppConfig>, ConfigurationError> {
    try {
      const config: Record<string, any> = {};

      // Apply environment variable mappings
      for (const [envVar, configPath] of Object.entries(envMapping)) {
        const value = process.env[envVar];
        if (value !== undefined) {
          // Decrypt if encrypted
          const finalValue = value.startsWith('ENC:') ?
            this.decryptValue(value).unwrapOr(value) : value;
          this.setNestedValue(config, configPath, finalValue);
        }
      }

      // Add any additional environment variables that follow naming conventions
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && !envMapping[key as keyof typeof envMapping]) {
          const configPath = this.envVarToConfigPath(key);
          if (configPath) {
            const finalValue = value.startsWith('ENC:') ?
              this.decryptValue(value).unwrapOr(value) : value;
            this.setNestedValue(config, configPath, finalValue);
          }
        }
      }

      return ok(config);
    } catch (error) {
      return err(new ConfigurationError(
        `Failed to build configuration: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  private validateConfiguration(config: Record<string, any>): Result<AppConfig, ConfigurationValidationError> {
    const parsed = configSchema.safeParse(config);

    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined,
      }));

      return err(new ConfigurationValidationError(
        `Configuration validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
        errors
      ));
    }

    return ok(parsed.data);
  }

  private getEnvFilePaths(): string[] {
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

  private envVarToConfigPath(envVar: string): string | null {
    const parts = envVar.toLowerCase().split('_');
    if (parts.length < 2) return null;

    const camelCased = parts.map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');

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

  private async validateRuntimeDependencies(): Promise<Result<void, ConfigurationError>> {
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

    try {
      const results = await Promise.allSettled(validations);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          this._state.dependencyStatus[result.value.dependency] = result.value;
          this.emit('dependency:validated', result.value);

          if (result.value.status === 'unhealthy') {
            this.observability?.getLogger()?.warn(`Dependency validation warning: ${result.value.dependency}`, {
              message: result.value.message
            });
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(new ConfigurationError(
        'Dependency validation failed',
        error instanceof Error ? error : undefined
      ));
    }
  }

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

  private setupHotReload(): void {
    if (this.hotReloadConfig.enabled) return;

    const envFiles = this.getEnvFilePaths();

    for (const file of envFiles) {
      if (!this._state.watchingFiles.includes(file)) {
        this._state.watchingFiles.push(file);

        let debounceTimer: NodeJS.Timeout;

        const watcher = chokidar.watch(file, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: { stabilityThreshold: 100 },
        });

        watcher.on('change', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              this.observability?.getLogger()?.info(`Configuration file ${file} changed, reloading...`);
              await this.reload();
            } catch (error) {
              this.emit('config:error', error);
            }
          }, this.hotReloadConfig.debounceMs);
        });

        // Store watcher reference for cleanup
        (this as any)[`_watcher_${file}`] = watcher;
      }
    }

    this.hotReloadConfig.enabled = true;
    this.observability?.getLogger()?.info('Hot reload enabled for configuration files');
  }

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

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

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
}

// Create and export singleton instance
export const configManager = new ConfigurationManager();

// Export configuration getter
export const getConfig = (): AppConfig => configManager.config;

// Export types and schema
export * from './types';
export * from './schema';
export { configSchema, defaultFeatures };

// Export default instance for convenience
export default configManager;
