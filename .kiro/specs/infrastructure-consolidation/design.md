# Infrastructure Consolidation - Design Document

## Architecture Overview

This consolidation effort focuses on eliminating duplicate implementations and thin wrappers while maintaining backward compatibility and all existing functionality.

## Design Principles

1. **Single Source of Truth**: Each capability should have one canonical implementation
2. **Backward Compatibility**: Maintain all public APIs during transition
3. **Gradual Migration**: Use deprecation warnings before removal
4. **Type Safety**: Preserve and enhance TypeScript type safety
5. **Minimal Disruption**: Changes should be transparent to consumers

## Module-by-Module Design

### 1. Cache Module Consolidation

#### Current State
```
server/infrastructure/cache/
├── cache.ts (2 lines - empty stub)
├── cache-factory.ts (1048 lines - advanced factory)
├── simple-factory.ts (60 lines - basic factory)
├── factory.ts (150 lines - intermediate factory)
├── icaching-service.ts (100 lines - interface)
├── caching-service.ts (300 lines - implementation)
├── simple-cache-service.ts (80 lines - lightweight)
└── [other adapter files]
```

#### Target State
```
server/infrastructure/cache/
├── factory.ts (200 lines - unified factory)
├── cache-factory.ts (1048 lines - advanced features)
├── caching-service.ts (350 lines - unified service)
├── simple-cache-service.ts (80 lines - lightweight)
└── [other adapter files]
```

#### Consolidation Strategy

**factory.ts (Unified Factory)**
```typescript
/**
 * Unified Cache Factory
 * Combines simple-factory.ts and factory.ts functionality
 */

import { MemoryAdapter } from './adapters/memory-adapter';
import { MultiTierAdapter } from './adapters/multi-tier-adapter';
import type { CacheService, CacheConfig } from './core/interfaces';

// CacheManager class (from factory.ts)
export class CacheManager {
  constructor(private cache: CacheService) {}
  
  async warmUp(entries: Array<{...}>): Promise<void> { /* ... */ }
  getStats() { /* ... */ }
  async getHealth() { /* ... */ }
  async clear(): Promise<void> { /* ... */ }
  async maintenance(): Promise<void> { /* ... */ }
}

// Factory functions (merged from both files)
export function createCacheService(config: CacheConfig): CacheService {
  // Implementation from factory.ts with enhancements from simple-factory.ts
}

export function createSimpleCacheService(config?: Partial<CacheConfig>): CacheService {
  // Simple memory-only factory from simple-factory.ts
  return createCacheService({
    provider: 'memory',
    defaultTtlSec: config?.defaultTtlSec || 3600,
    maxMemoryMB: config?.maxMemoryMB || 100,
    ...config
  });
}

// Singleton management
let defaultCacheInstance: CacheService | null = null;

export function getDefaultCache(): CacheService { /* ... */ }
export function initializeDefaultCache(config: CacheConfig): CacheService { /* ... */ }
export function resetDefaultCache(): void { /* ... */ }
export function createCacheManager(cache?: CacheService): CacheManager { /* ... */ }
```

**caching-service.ts (Unified Service)**
```typescript
/**
 * Unified Caching Service
 * Combines icaching-service.ts interface and caching-service.ts implementation
 */

// Interface (from icaching-service.ts)
export interface ICachingService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  // ... other methods
}

// Implementation (from caching-service.ts)
export class CachingService implements ICachingService {
  constructor(private adapter: CacheAdapter) {}
  
  async get<T>(key: string): Promise<T | null> { /* ... */ }
  async set<T>(key: string, value: T, ttl?: number): Promise<void> { /* ... */ }
  // ... other methods
}

// Factory function
export function createCachingService(adapter: CacheAdapter): ICachingService {
  return new CachingService(adapter);
}
```

**Deprecation Path**
```typescript
// cache.ts (deprecated, will be removed)
/**
 * @deprecated Use './factory' instead
 * This file will be removed in v2.0.0
 */
export * from './factory';
console.warn('cache.ts is deprecated. Import from ./factory instead.');

// simple-factory.ts (deprecated, will be removed)
/**
 * @deprecated Merged into './factory'
 * Use createSimpleCacheService from './factory' instead
 */
export { createSimpleCacheService as createSimpleCache } from './factory';
console.warn('simple-factory.ts is deprecated. Import from ./factory instead.');
```

---

### 2. Config Module Consolidation

#### Current State
```
server/infrastructure/config/
├── index.ts (400 lines - ConfigManager with watchFile)
├── manager.ts (600 lines - ConfigurationManager with Result types)
├── schema.ts (Zod schemas)
├── types.ts (TypeScript types)
└── utilities.ts (Utility config provider)
```

#### Target State
```
server/infrastructure/config/
├── manager.ts (700 lines - unified ConfigurationManager)
├── schema.ts (unchanged)
├── types.ts (unchanged)
├── utilities.ts (unchanged)
└── index.ts (10 lines - re-exports only)
```

#### Consolidation Strategy

**manager.ts (Unified Configuration Manager)**
```typescript
/**
 * Unified Configuration Manager
 * Combines best features from both implementations
 */

import { EventEmitter } from 'events';
import { existsSync, watchFile } from 'fs';
import { resolve } from 'path';
import * as chokidar from 'chokidar';
import * as dotenvExpand from 'dotenv-expand';
import { config as dotenvConfig } from 'dotenv';

import { BaseError, ErrorDomain, ErrorSeverity } from '../observability/error-management';
import { ObservabilityStack } from '../observability/stack';
import { Result, err, ok } from '../primitives/types/result';

import { configSchema, type AppConfig, envMapping, defaultFeatures } from './schema';
import type {
  ConfigLoadOptions,
  ConfigChangeEvent,
  ConfigChange,
  FeatureFlagContext,
  FeatureFlagResult,
  ConfigValidationResult,
  DependencyValidationResult,
  ConfigManagerState,
  HotReloadConfig,
} from './types';

// Error classes (from manager.ts)
export class ConfigurationError extends BaseError { /* ... */ }
export class ConfigurationValidationError extends ConfigurationError { /* ... */ }
export class ConfigurationEncryptionError extends ConfigurationError { /* ... */ }

/**
 * Configuration Manager
 * Features:
 * - Result type pattern for error handling
 * - Hot reload with both watchFile and chokidar
 * - Feature flags with rollout support
 * - Encryption/decryption for sensitive values
 * - Observability integration
 * - Dependency validation
 */
export class ConfigurationManager extends EventEmitter {
  private _config: AppConfig | null = null;
  private _state: ConfigManagerState = { /* ... */ };
  private _validationCache = new Map<string, boolean>();
  private hotReloadConfig: HotReloadConfig = { /* ... */ };
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
    
    if (this.observability) {
      this.setupObservabilityIntegration();
    }
  }

  // Core methods with Result types
  async load(): Promise<Result<AppConfig, ConfigurationError>> { /* ... */ }
  
  get config(): AppConfig { /* ... */ }
  get state(): ConfigManagerState { /* ... */ }
  
  isFeatureEnabled(featureName: string, context?: FeatureFlagContext): FeatureFlagResult { /* ... */ }
  
  configure(overrides: Partial<AppConfig>): Result<void, ConfigurationError> { /* ... */ }
  validate(): Result<ConfigValidationResult, ConfigurationError> { /* ... */ }
  
  // Encryption methods (from manager.ts)
  setEncryptionKey(key: string): Result<void, ConfigurationEncryptionError> { /* ... */ }
  encryptValue(path: string, value: string): Result<string, ConfigurationEncryptionError> { /* ... */ }
  decryptValue(encryptedValue: string): Result<string, ConfigurationEncryptionError> { /* ... */ }
  
  async reload(): Promise<Result<AppConfig, ConfigurationError>> { /* ... */ }
  destroy(): void { /* ... */ }

  // Private methods (merged from both implementations)
  private setupObservabilityIntegration(): void { /* from manager.ts */ }
  private loadEnvironmentFiles(): void { /* merged logic */ }
  private buildConfiguration(): Result<Partial<AppConfig>, ConfigurationError> { /* from manager.ts */ }
  private validateConfiguration(config: Record<string, any>): Result<AppConfig, ConfigurationValidationError> { /* from manager.ts */ }
  
  // Hot reload with both strategies
  private setupHotReload(): void {
    if (this.hotReloadConfig.enabled) return;

    const envFiles = this.getEnvFilePaths();

    // Use chokidar for better file watching (from manager.ts)
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

        (this as any)[`_watcher_${file}`] = watcher;
      }
    }

    this.hotReloadConfig.enabled = true;
  }

  // Other private methods...
  private getEnvFilePaths(): string[] { /* ... */ }
  private envVarToConfigPath(envVar: string): string | null { /* ... */ }
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void { /* ... */ }
  private async validateRuntimeDependencies(): Promise<Result<void, ConfigurationError>> { /* ... */ }
  private async validateRedisConnection(redisUrl: string): Promise<DependencyValidationResult> { /* ... */ }
  private async validateDatabaseConnection(databaseUrl: string): Promise<DependencyValidationResult> { /* ... */ }
  private async validateSentryDsn(sentryDsn: string): Promise<DependencyValidationResult> { /* ... */ }
  private detectChanges(previous: AppConfig, current: AppConfig): ConfigChange[] { /* ... */ }
  private addConfigurationWarnings(result: ConfigValidationResult): void { /* ... */ }
  private hashString(str: string): number { /* ... */ }
  private deepMerge(target: any, source: any): any { /* ... */ }
}

// Singleton instance
export const configManager = new ConfigurationManager();

// Convenience exports
export const getConfig = (): AppConfig => configManager.config;

// Re-export types and schema
export * from './types';
export * from './schema';
export { configSchema, defaultFeatures };
export * from './utilities';

export default configManager;
```

**index.ts (Minimal Re-export)**
```typescript
/**
 * Configuration Module Entry Point
 * Re-exports from manager.ts for backward compatibility
 */

export {
  ConfigurationManager,
  ConfigurationError,
  ConfigurationValidationError,
  ConfigurationEncryptionError,
  configManager,
  getConfig,
  configSchema,
  defaultFeatures
} from './manager';

export * from './types';
export * from './schema';
export * from './utilities';

export { configManager as default } from './manager';

// Legacy export for backward compatibility
export { ConfigurationManager as ConfigManager } from './manager';
```

---

### 3. Error Handling Consolidation

#### Current State
```
server/infrastructure/errors/
├── error-adapter.ts (300 lines - Boom adapter)
├── error-standardization.ts (400 lines - StandardizedError)
├── result-adapter.ts (300 lines - Result integration)
└── error-configuration.ts (150 lines - config wrapper)
```

#### Target State
```
server/infrastructure/errors/
├── error-standardization.ts (600 lines - unified)
├── result-adapter.ts (300 lines - unchanged)
└── index.ts (re-exports)
```

#### Consolidation Strategy

**error-standardization.ts (Unified Error Handler)**
```typescript
/**
 * Unified Error Standardization System
 * Combines Boom integration with standardized error handling
 */

import Boom from '@hapi/boom';
import { logger } from '@shared/core';
import { err, ok, Result } from 'neverthrow';

// Enums and interfaces
export enum ErrorCategory { /* ... */ }
export enum ErrorSeverity { /* ... */ }
export interface ErrorContext { /* ... */ }
export interface StandardizedError { /* ... */ }
export interface ErrorResponse { /* ... */ }

/**
 * Unified Error Handler
 * Features:
 * - Boom error integration
 * - Result type support
 * - Error tracking and metrics
 * - Standardized error responses
 * - Configuration-driven behavior
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private errorCounts = new Map<string, number>();
  private readonly MAX_ERROR_HISTORY = 1000;
  private config: ErrorHandlerConfig;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      includeStackTrace: config?.includeStackTrace ?? false,
      reportToSentry: config?.reportToSentry ?? false,
      logLevel: config?.logLevel ?? 'error',
      ...config
    };
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler(config);
    }
    return UnifiedErrorHandler.instance;
  }

  // Boom-based error creation (from error-adapter.ts)
  createValidationError(
    validationErrors: Array<{ field: string; message: string; value?: any }>,
    context: Partial<ErrorContext>
  ): Result<never, Boom.Boom> {
    const message = `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
    
    const boomError = Boom.badRequest(message);
    boomError.data = {
      validationErrors,
      category: ErrorCategory.VALIDATION,
      context: this.buildContext(context),
      errorId: this.generateErrorId(),
      retryable: false
    };

    this.trackError(boomError);
    return err(boomError);
  }

  // Additional Boom error creators...
  createAuthenticationError(...): Result<never, Boom.Boom> { /* ... */ }
  createAuthorizationError(...): Result<never, Boom.Boom> { /* ... */ }
  createNotFoundError(...): Result<never, Boom.Boom> { /* ... */ }
  createConflictError(...): Result<never, Boom.Boom> { /* ... */ }
  createRateLimitError(...): Result<never, Boom.Boom> { /* ... */ }
  createExternalServiceError(...): Result<never, Boom.Boom> { /* ... */ }
  createDatabaseError(...): Result<never, Boom.Boom> { /* ... */ }
  createBusinessLogicError(...): Result<never, Boom.Boom> { /* ... */ }

  // StandardizedError creation (from error-standardization.ts)
  createError(
    error: Error | string,
    category: ErrorCategory,
    context: Partial<ErrorContext>,
    options?: { /* ... */ }
  ): StandardizedError { /* ... */ }

  // Conversion methods
  toErrorResponse(boomError: Boom.Boom): ErrorResponse { /* ... */ }
  toStandardizedError(boomError: Boom.Boom): StandardizedError { /* ... */ }
  boomToStandardized(boomError: Boom.Boom): StandardizedError { /* ... */ }
  standardizedToBoom(error: StandardizedError): Boom.Boom { /* ... */ }

  // Utility methods
  wrapFunction<T, E = Boom.Boom>(
    fn: () => T | Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> { /* ... */ }

  shouldAlert(error: Boom.Boom | StandardizedError): boolean { /* ... */ }
  getErrorStatistics(): { /* ... */ } { /* ... */ }

  // Configuration
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private methods (merged from both implementations)
  private buildContext(context: Partial<ErrorContext>): ErrorContext { /* ... */ }
  private generateErrorId(): string { /* ... */ }
  private mapBoomToErrorCode(boomError: Boom.Boom, category: ErrorCategory): string { /* ... */ }
  private getUserMessage(boomError: Boom.Boom, category: ErrorCategory): string { /* ... */ }
  private mapCategoryToSeverity(category: ErrorCategory): ErrorSeverity { /* ... */ }
  private trackError(boomError: Boom.Boom): void { /* ... */ }
  private logError(boomError: Boom.Boom, category: ErrorCategory): void { /* ... */ }
  private getLogLevel(severity: ErrorSeverity): string { /* ... */ }
  private determineSeverity(category: ErrorCategory): ErrorSeverity { /* ... */ }
  private generateUserMessage(category: ErrorCategory): string { /* ... */ }
  private isRetryable(category: ErrorCategory, error: Error): boolean { /* ... */ }
  private getHttpStatusCode(category: ErrorCategory): number { /* ... */ }
  private trackErrorFrequency(errorCode: string): void { /* ... */ }
}

// Configuration interface (from error-configuration.ts)
export interface ErrorHandlerConfig {
  includeStackTrace: boolean;
  reportToSentry: boolean;
  sentryDsn?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxErrorHistory?: number;
  alertThreshold?: number;
}

// Singleton instance
export const errorHandler = UnifiedErrorHandler.getInstance();

// Convenience functions
export const createValidationError = (
  validationErrors: Array<{ field: string; message: string; value?: any }>,
  context: Partial<ErrorContext>
) => errorHandler.createValidationError(validationErrors, context);

export const createAuthenticationError = (...) => errorHandler.createAuthenticationError(...);
export const createAuthorizationError = (...) => errorHandler.createAuthorizationError(...);
export const createNotFoundError = (...) => errorHandler.createNotFoundError(...);
export const createBusinessLogicError = (...) => errorHandler.createBusinessLogicError(...);

// Legacy exports for backward compatibility
export { UnifiedErrorHandler as ErrorAdapter };
export { UnifiedErrorHandler as StandardizedErrorHandler };
```

---

### 4. External API Cleanup

#### Current State
```
server/infrastructure/external-api/
└── error-handler.ts (8 lines - stub with comments only)
```

#### Target State
```
server/infrastructure/external-api/
[directory removed or empty]
```

#### Strategy
- Delete `error-handler.ts` entirely
- Error handling for external APIs already exists in `external-data/external-api-manager.ts`
- No migration needed (file contains no actual code)

---

### 5. Observability Wrapper Reduction

#### Current State
```
server/infrastructure/observability/
└── index.ts (200 lines - thin wrappers around shared/core)
```

#### Target State
```
server/infrastructure/observability/
└── index.ts (50 lines - server-specific utilities only)
```

#### Strategy

**index.ts (Reduced)**
```typescript
/**
 * Server-Specific Observability Utilities
 * Minimal wrappers for Express middleware and server-specific features
 */

// Re-export core observability (no wrapping)
export * from '@shared/core/observability';

// Server-specific Express middleware
import { Request, Response, NextFunction } from 'express';
import { logger, metrics } from '@shared/core/observability';

/**
 * Express request logging middleware
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent')
      });
      
      metrics.histogram('http.request.duration', duration, {
        method: req.method,
        status: String(res.statusCode)
      });
    });
    
    next();
  };
}

/**
 * Express error logging middleware
 */
export function errorLoggingMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('HTTP Error', {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack
    });
    
    metrics.counter('http.errors', 1, {
      method: req.method,
      path: req.path
    });
    
    next(err);
  };
}

// Server-specific initialization
export function initializeServerObservability(config: {
  serviceName: string;
  environment: string;
}) {
  // Server-specific setup only
  logger.info('Server observability initialized', config);
}
```

---

## Migration Strategy

### Phase 1: Preparation
1. Create feature flag: `infrastructure_consolidation_enabled`
2. Add comprehensive tests for all modules
3. Document current import patterns
4. Create migration guide

### Phase 2: Implementation
1. **Week 1**: Cache module consolidation
   - Merge factories
   - Merge services
   - Add deprecation warnings
   - Update tests

2. **Week 2**: Config module consolidation
   - Merge managers
   - Update imports
   - Add deprecation warnings
   - Update tests

3. **Week 3**: Error handling consolidation
   - Merge error handlers
   - Update error creation patterns
   - Add deprecation warnings
   - Update tests

4. **Week 4**: Cleanup
   - Delete external-api stub
   - Reduce observability wrappers
   - Update documentation
   - Final testing

### Phase 3: Deprecation Period
- 2 weeks: Deprecation warnings active
- Update consuming code
- Monitor for issues

### Phase 4: Removal
- Remove deprecated files
- Remove deprecation warnings
- Update version to 2.0.0

## Testing Strategy

### Unit Tests
- Test all consolidated modules independently
- Verify all functionality preserved
- Test error paths

### Integration Tests
- Test module interactions
- Verify backward compatibility
- Test deprecation warnings

### Regression Tests
- Run full test suite before and after
- Compare results
- Verify no functionality lost

## Rollback Plan

1. Keep git history clean with atomic commits
2. Tag before each major change
3. Feature flag allows instant rollback
4. Maintain deprecated files during transition period

## Documentation Updates

### Code Documentation
- Update JSDoc comments
- Add migration examples
- Document deprecations

### Developer Guide
- Update import patterns
- Add consolidation rationale
- Provide migration guide

### API Documentation
- Mark deprecated exports
- Document new patterns
- Provide examples

## Success Criteria

1. All tests passing
2. No breaking changes to public APIs
3. 1,500+ lines of code removed
4. 8 files eliminated
5. Import complexity reduced
6. Documentation updated
7. Zero production issues during rollout
