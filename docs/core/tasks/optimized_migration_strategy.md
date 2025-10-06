# Task 9 – Refined Migration Strategy & Backward Compatibility
*Zero-downtime, production-ready migration with comprehensive monitoring*

---

## 📁 Enhanced Project Structure

```
core/src/migration/
├── index.ts                        # Central export hub
├── adapters/
│   ├── BaseAdapter.ts              # Abstract base with common patterns
│   ├── CacheAdapter.ts             # Dual-write cache strategy
│   ├── AuthAdapter.ts              # Authentication bridging
│   ├── ValidationAdapter.ts        # Validation rule mapping
│   └── LoggerAdapter.ts           # Structured logging bridge
├── feature-flags/
│   ├── FeatureFlags.ts            # Type-safe flag definitions
│   ├── FlagManager.ts             # Runtime flag management
│   └── types.ts                   # Flag type definitions
├── monitoring/
│   ├── MigrationMetrics.ts        # Performance & error tracking
│   ├── HealthChecker.ts           # System health validation
│   └── RollbackDetector.ts        # Automatic rollback triggers
├── scripts/
│   ├── migrate-imports.ts         # Enhanced codemod with validation
│   ├── migrate-config.ts          # Configuration migration
│   ├── validate-migration.ts      # Pre-flight checks
│   └── rollback-plan.ts           # Automated rollback
└── __tests__/
    ├── adapters/                  # Comprehensive adapter tests
    ├── integration/               # End-to-end migration tests
    └── performance/               # Load testing scenarios
```

---

## 🏗️ Enhanced Base Architecture

### BaseAdapter.ts - Foundation with Observability
```typescript
import { Logger } from '@core/logging';
import { MigrationMetrics } from '../monitoring/MigrationMetrics';

export abstract class BaseAdapter {
  protected readonly logger: Logger;
  protected readonly metrics: MigrationMetrics;
  protected readonly adapterName: string;

  constructor(adapterName: string) {
    this.adapterName = adapterName;
    this.logger = new Logger({ context: `Migration:${adapterName}` });
    this.metrics = new MigrationMetrics(adapterName);
  }

  /**
   * Execute operation with both legacy and new systems
   * Includes automatic fallback and error handling
   */
  protected async dualOperation<T>(
    operation: string,
    legacyFn: () => Promise<T>,
    newFn: () => Promise<T>,
    options: {
      preferNew?: boolean;
      fallbackOnError?: boolean;
      compareResults?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    const { preferNew = false, fallbackOnError = true, compareResults = false } = options;

    try {
      // Choose primary operation based on preference
      const [primaryFn, fallbackFn, primaryLabel, fallbackLabel] = preferNew 
        ? [newFn, legacyFn, 'new', 'legacy']
        : [legacyFn, newFn, 'legacy', 'new'];

      let primaryResult: T;
      let fallbackResult: T | undefined;

      try {
        primaryResult = await primaryFn();
        this.metrics.recordSuccess(operation, primaryLabel);
        
        // Optionally run both for comparison
        if (compareResults) {
          try {
            fallbackResult = await fallbackFn();
            this.compareResults(operation, primaryResult, fallbackResult);
          } catch (error) {
            this.logger.warn('Comparison operation failed', { operation, error });
          }
        }
        
        return primaryResult;
      } catch (primaryError) {
        this.metrics.recordError(operation, primaryLabel, primaryError);
        
        if (!fallbackOnError) throw primaryError;
        
        this.logger.warn('Primary operation failed, falling back', {
          operation,
          primaryLabel,
          error: primaryError
        });

        try {
          const result = await fallbackFn();
          this.metrics.recordFallback(operation, fallbackLabel);
          return result;
        } catch (fallbackError) {
          this.metrics.recordError(operation, fallbackLabel, fallbackError);
          throw new AggregateError(
            [primaryError, fallbackError],
            `Both ${primaryLabel} and ${fallbackLabel} operations failed for ${operation}`
          );
        }
      }
    } finally {
      this.metrics.recordDuration(operation, Date.now() - startTime);
    }
  }

  private compareResults<T>(operation: string, primary: T, fallback: T): void {
    const matches = JSON.stringify(primary) === JSON.stringify(fallback);
    this.metrics.recordComparison(operation, matches);
    
    if (!matches) {
      this.logger.warn('Result mismatch detected', {
        operation,
        primaryResult: primary,
        fallbackResult: fallback
      });
    }
  }
}
```

### Enhanced CacheAdapter.ts - Production-Ready Caching
```typescript
import { CacheService as LegacyCache } from '../../../server/cache/CacheService';
import { CacheService as NewCache } from '../../cache';
import { BaseAdapter } from './BaseAdapter';
import { featureFlags } from '../feature-flags/FeatureFlags';

export class CacheAdapter extends BaseAdapter {
  private readonly legacyCache: LegacyCache;
  private readonly newCache: NewCache;
  private readonly useNewCache: boolean;

  constructor() {
    super('Cache');
    this.legacyCache = new LegacyCache();
    this.newCache = new NewCache();
    this.useNewCache = featureFlags.cache.useNew();
  }

  async get<T>(key: string): Promise<T | null> {
    return this.dualOperation(
      'get',
      () => this.legacyCache.get<T>(key),
      () => this.newCache.get<T>(key),
      {
        preferNew: this.useNewCache,
        fallbackOnError: true,
        compareResults: featureFlags.cache.compareResults()
      }
    );
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Always write to both systems during migration
    return this.dualOperation(
      'set',
      async () => {
        await this.legacyCache.set(key, value, ttl);
        if (featureFlags.cache.dualWrite()) {
          await this.newCache.set(key, value, ttl);
        }
      },
      async () => {
        await this.newCache.set(key, value, ttl);
        if (featureFlags.cache.dualWrite()) {
          await this.legacyCache.set(key, value, ttl);
        }
      },
      { preferNew: this.useNewCache, fallbackOnError: false }
    );
  }

  async del(key: string): Promise<void> {
    // Delete from both systems regardless of preference
    const results = await Promise.allSettled([
      this.legacyCache.del(key),
      this.newCache.del(key)
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error('Cache deletion partial failure', { key, failures });
    }
  }

  /**
   * Migration-specific method to sync data between caches
   */
  async syncKey(key: string): Promise<boolean> {
    try {
      const legacyValue = await this.legacyCache.get(key);
      if (legacyValue !== null) {
        await this.newCache.set(key, legacyValue);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Cache sync failed', { key, error });
      return false;
    }
  }
}
```

---

## 🚩 Type-Safe Feature Flag System

### FeatureFlags.ts - Centralized Flag Management
```typescript
import { FlagConfig, FeatureFlagState } from './types';

class FeatureFlagManager {
  private readonly flags: Map<string, FlagConfig> = new Map();
  private readonly overrides: Map<string, boolean> = new Map();

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags(): void {
    const flagConfigs: Record<string, FlagConfig> = {
      'cache.useNew': {
        envVar: 'FF_UNIFIED_CACHE',
        defaultValue: false,
        description: 'Use new cache implementation'
      },
      'cache.dualWrite': {
        envVar: 'FF_CACHE_DUAL_WRITE',
        defaultValue: true,
        description: 'Write to both cache systems'
      },
      'cache.compareResults': {
        envVar: 'FF_CACHE_COMPARE',
        defaultValue: false,
        description: 'Compare results between cache systems'
      },
      'auth.useNew': {
        envVar: 'FF_UNIFIED_AUTH',
        defaultValue: false,
        description: 'Use new auth middleware'
      },
      'validation.useNew': {
        envVar: 'FF_UNIFIED_VALIDATION',
        defaultValue: false,
        description: 'Use new validation system'
      }
    };

    Object.entries(flagConfigs).forEach(([key, config]) => {
      this.flags.set(key, config);
    });
  }

  isEnabled(flagKey: string): boolean {
    // Check runtime overrides first
    if (this.overrides.has(flagKey)) {
      return this.overrides.get(flagKey)!;
    }

    const config = this.flags.get(flagKey);
    if (!config) {
      console.warn(`Unknown feature flag: ${flagKey}`);
      return false;
    }

    const envValue = process.env[config.envVar];
    if (envValue !== undefined) {
      return envValue.toLowerCase() === 'true';
    }

    return config.defaultValue;
  }

  override(flagKey: string, value: boolean): void {
    this.overrides.set(flagKey, value);
  }

  getState(): FeatureFlagState {
    const state: FeatureFlagState = {};
    this.flags.forEach((config, key) => {
      state[key] = {
        enabled: this.isEnabled(key),
        source: this.overrides.has(key) ? 'override' : 
               process.env[config.envVar] ? 'env' : 'default',
        description: config.description
      };
    });
    return state;
  }
}

// Export typed flag accessors
const flagManager = new FeatureFlagManager();

export const featureFlags = {
  cache: {
    useNew: () => flagManager.isEnabled('cache.useNew'),
    dualWrite: () => flagManager.isEnabled('cache.dualWrite'),
    compareResults: () => flagManager.isEnabled('cache.compareResults')
  },
  auth: {
    useNew: () => flagManager.isEnabled('auth.useNew')
  },
  validation: {
    useNew: () => flagManager.isEnabled('validation.useNew')
  },
  
  // Management functions
  override: (key: string, value: boolean) => flagManager.override(key, value),
  getState: () => flagManager.getState()
};
```

---

## 📊 Comprehensive Monitoring System

### MigrationMetrics.ts - Observability & Analytics
```typescript
interface MetricEvent {
  timestamp: number;
  adapter: string;
  operation: string;
  type: 'success' | 'error' | 'fallback' | 'comparison';
  duration?: number;
  metadata?: Record<string, any>;
}

export class MigrationMetrics {
  private readonly events: MetricEvent[] = [];
  private readonly adapterName: string;

  constructor(adapterName: string) {
    this.adapterName = adapterName;
  }

  recordSuccess(operation: string, system: string): void {
    this.addEvent({
      type: 'success',
      operation,
      metadata: { system }
    });
  }

  recordError(operation: string, system: string, error: any): void {
    this.addEvent({
      type: 'error',
      operation,
      metadata: { 
        system, 
        errorMessage: error.message,
        errorType: error.constructor.name
      }
    });
  }

  recordFallback(operation: string, system: string): void {
    this.addEvent({
      type: 'fallback',
      operation,
      metadata: { system }
    });
  }

  recordComparison(operation: string, matches: boolean): void {
    this.addEvent({
      type: 'comparison',
      operation,
      metadata: { matches }
    });
  }

  recordDuration(operation: string, duration: number): void {
    const lastEvent = this.events[this.events.length - 1];
    if (lastEvent && lastEvent.operation === operation) {
      lastEvent.duration = duration;
    }
  }

  private addEvent(event: Omit<MetricEvent, 'timestamp' | 'adapter'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
      adapter: this.adapterName
    });

    // Keep only last 1000 events to prevent memory leaks
    if (this.events.length > 1000) {
      this.events.splice(0, this.events.length - 1000);
    }
  }

  generateReport(): MigrationReport {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => now - e.timestamp < oneHour);

    return {
      adapter: this.adapterName,
      timeWindow: '1h',
      totalOperations: recentEvents.length,
      successRate: this.calculateSuccessRate(recentEvents),
      errorRate: this.calculateErrorRate(recentEvents),
      fallbackRate: this.calculateFallbackRate(recentEvents),
      avgDuration: this.calculateAvgDuration(recentEvents),
      comparisonMismatchRate: this.calculateMismatchRate(recentEvents)
    };
  }

  private calculateSuccessRate(events: MetricEvent[]): number {
    const total = events.filter(e => ['success', 'error'].includes(e.type)).length;
    const successes = events.filter(e => e.type === 'success').length;
    return total > 0 ? successes / total : 1;
  }

  private calculateErrorRate(events: MetricEvent[]): number {
    return 1 - this.calculateSuccessRate(events);
  }

  private calculateFallbackRate(events: MetricEvent[]): number {
    const total = events.length;
    const fallbacks = events.filter(e => e.type === 'fallback').length;
    return total > 0 ? fallbacks / total : 0;
  }

  private calculateAvgDuration(events: MetricEvent[]): number {
    const durationsMs = events
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);
    
    return durationsMs.length > 0 
      ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
      : 0;
  }

  private calculateMismatchRate(events: MetricEvent[]): number {
    const comparisons = events.filter(e => e.type === 'comparison');
    const mismatches = comparisons.filter(e => !e.metadata?.matches);
    return comparisons.length > 0 ? mismatches.length / comparisons.length : 0;
  }
}
```

---

## 🔧 Enhanced Migration Scripts

### validate-migration.ts - Pre-flight Validation
```typescript
#!/usr/bin/env ts-node
/**
 * Comprehensive pre-migration validation
 * Run: npx ts-node core/src/migration/scripts/validate-migration.ts
 */

import { CacheAdapter } from '../adapters/CacheAdapter';
import { featureFlags } from '../feature-flags/FeatureFlags';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

class MigrationValidator {
  private results: ValidationResult[] = [];

  async validateSystem(): Promise<boolean> {
    console.log('🔍 Starting migration validation...\n');

    await this.validateEnvironment();
    await this.validateDependencies();
    await this.validateAdapters();
    await this.validateFeatureFlags();

    this.printResults();
    return this.results.every(r => r.status !== 'fail');
  }

  private async validateEnvironment(): Promise<void> {
    const requiredEnvVars = ['NODE_ENV', 'DATABASE_URL', 'REDIS_URL'];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addResult('Environment', 'pass', `${envVar} is set`);
      } else {
        this.addResult('Environment', 'warn', `${envVar} is not set`);
      }
    }
  }

  private async validateDependencies(): Promise<void> {
    try {
      // Test basic imports
      const { CacheService: LegacyCache } = await import('../../../server/cache/CacheService');
      const { CacheService: NewCache } = await import('../../cache');
      
      this.addResult('Dependencies', 'pass', 'All required imports available');
    } catch (error) {
      this.addResult('Dependencies', 'fail', 'Import validation failed', error);
    }
  }

  private async validateAdapters(): Promise<void> {
    try {
      const cacheAdapter = new CacheAdapter();
      
      // Test basic operations
      await cacheAdapter.set('test-key', 'test-value', 60);
      const value = await cacheAdapter.get('test-key');
      
      if (value === 'test-value') {
        this.addResult('Cache Adapter', 'pass', 'Basic operations working');
      } else {
        this.addResult('Cache Adapter', 'fail', 'Value mismatch in basic test');
      }
      
      await cacheAdapter.del('test-key');
    } catch (error) {
      this.addResult('Cache Adapter', 'fail', 'Adapter validation failed', error);
    }
  }

  private async validateFeatureFlags(): Promise<void> {
    const state = featureFlags.getState();
    
    Object.entries(state).forEach(([key, flagState]) => {
      this.addResult(
        'Feature Flags',
        'pass',
        `${key}: ${flagState.enabled} (${flagState.source})`
      );
    });
  }

  private addResult(component: string, status: ValidationResult['status'], message: string, details?: any): void {
    this.results.push({ component, status, message, details });
  }

  private printResults(): void {
    console.log('📋 Validation Results:\n');
    
    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} [${result.component}] ${result.message}`);
      
      if (result.details && result.status === 'fail') {
        console.log(`   Details: ${result.details.message || result.details}`);
      }
    });

    const summary = this.results.reduce((acc, r) => {
      acc[r.status]++;
      return acc;
    }, { pass: 0, warn: 0, fail: 0 });

    console.log(`\n📊 Summary: ${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed`);
  }
}

// Run validation
new MigrationValidator().validateSystem().then(success => {
  process.exit(success ? 0 : 1);
});
```

---

## 🎯 Enhanced Usage & Rollout Strategy

### Progressive Rollout Plan
```typescript
// Phase 1: Dual-write, read from legacy (safety mode)
FF_CACHE_DUAL_WRITE=true
FF_UNIFIED_CACHE=false

// Phase 2: Dual-write, read from new with fallback
FF_CACHE_DUAL_WRITE=true
FF_UNIFIED_CACHE=true
FF_CACHE_COMPARE=true

// Phase 3: New system only (legacy cleanup)
FF_UNIFIED_CACHE=true
FF_CACHE_DUAL_WRITE=false
FF_CACHE_COMPARE=false
```

### Command Sequence
```bash
# 1. Validate system readiness
npm run migrate:validate

# 2. Start with safety mode (dual-write, read legacy)
FF_CACHE_DUAL_WRITE=true npm start

# 3. Monitor metrics and gradually shift traffic
FF_UNIFIED_CACHE=true FF_CACHE_COMPARE=true npm start

# 4. Full migration with monitoring
npm run migrate:monitor
```

This refined approach provides comprehensive error handling, detailed monitoring, type safety, and a clear migration path that can be rolled back at any point. The system maintains backward compatibility while providing the observability needed for confident production migrations.