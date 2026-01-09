/**
 * Error Recovery Strategies
 *
 * Implementation of consistent retry, fallback, circuit breaker, and fail-fast patterns
 * across all four client systems: Security, Hooks, Library Services, and Service Architecture.
 */

import {
  CrossSystemError,
  ErrorRecoveryStrategy,
  ErrorRecoveryStrategyConfig,
  ErrorRecoveryStrategyType,
  RecoveryCondition,
  RecoveryResult,
  RetryConfig,
  FallbackConfig,
  CircuitBreakerConfig,
  FailFastConfig,
  ErrorRecoveryAction,
} from './types';
import {
  ErrorRecoveryStrategyType as StrategyType,
  RecoveryConditionOperator,
  RecoveryAction as Action,
  RECOVERY_STRATEGY_PRIORITIES,
} from './constants';

// ============================================================================
// Base Recovery Strategy
// ============================================================================

export abstract class BaseRecoveryStrategy implements ErrorRecoveryStrategy {
  protected config: ErrorRecoveryStrategyConfig;

  constructor(config: ErrorRecoveryStrategyConfig) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get type(): ErrorRecoveryStrategyType {
    return this.config.type;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  getPriority(): number {
    return this.config.priority || RECOVERY_STRATEGY_PRIORITIES[this.config.type as string] || 100;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getTimeout(): number {
    return this.config.timeout || 5000;
  }

  getMaxRetries(): number {
    return this.config.maxRetries || 3;
  }

  abstract canRecover(error: CrossSystemError): boolean;
  abstract recover(error: CrossSystemError): Promise<RecoveryResult>;
}

// ============================================================================
// Retry Strategy
// ============================================================================

export class RetryStrategy extends BaseRecoveryStrategy {
  private retryConfig: RetryConfig;

  constructor(config: ErrorRecoveryStrategyConfig, retryConfig: RetryConfig) {
    super(config);
    this.retryConfig = retryConfig;
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled() || !(error as any).retryable) {
      return false;
    }

    // Check if error type is retryable
    const isRetryableError = this.retryConfig.retryableErrors.includes(error.code);
    const isNonRetryableError = this.retryConfig.nonRetryableErrors.includes(error.code);

    if (isNonRetryableError) {
      return false;
    }

    if (!isRetryableError && this.retryConfig.retryableErrors.length > 0) {
      return false;
    }

    // Check retry count
    return error.recoveryAttempts < this.retryConfig.maxRetries;
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    const delay = this.calculateDelay(error.recoveryAttempts);

    try {
      await this.sleep(delay);

      // For now, return success to indicate retry was attempted
      // Actual retry logic would be implemented by the calling system
      return {
        success: true,
        action: Action.RETRY as any,
        message: `Retry attempted after ${delay}ms`,
        nextAction: Action.IGNORE as any,
      };
    } catch (recoveryError) {
      return {
        success: false,
        action: Action.IGNORE as any,
        message: `Retry failed: ${recoveryError}`,
      };
    }
  }

  private calculateDelay(attempt: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);

    if (delay > this.retryConfig.maxDelay) {
      delay = this.retryConfig.maxDelay;
    }

    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Fallback Strategy
// ============================================================================

export class FallbackStrategy extends BaseRecoveryStrategy {
  private fallbackConfig: FallbackConfig;

  constructor(config: ErrorRecoveryStrategyConfig, fallbackConfig: FallbackConfig) {
    super(config);
    this.fallbackConfig = fallbackConfig;
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    // Check if fallback data is available
    return !!(this.fallbackConfig.fallbackData || this.fallbackConfig.fallbackFunction);
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    try {
      let fallbackData: unknown;

      if (this.fallbackConfig.fallbackFunction) {
        fallbackData = await this.fallbackConfig.fallbackFunction();
      } else {
        fallbackData = this.fallbackConfig.fallbackData;
      }

      // Cache fallback data if configured
      if (this.fallbackConfig.cacheFallback && fallbackData) {
        this.cacheFallbackData(error, fallbackData);
      }

      return {
        success: true,
        action: Action.FALLBACK as any,
        message: 'Fallback data provided',
        nextAction: Action.IGNORE as any,
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: Action.IGNORE as any,
        message: `Fallback failed: ${fallbackError}`,
      };
    }
  }

  private cacheFallbackData(error: CrossSystemError, data: unknown): void {
    // Implementation would depend on caching mechanism
    console.log(`Caching fallback data for error ${error.id}`);
  }
}

// ============================================================================
// Circuit Breaker Strategy
// ============================================================================

export class CircuitBreakerStrategy extends BaseRecoveryStrategy {
  private circuitBreakerConfig: CircuitBreakerConfig;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(config: ErrorRecoveryStrategyConfig, circuitBreakerConfig: CircuitBreakerConfig) {
    super(config);
    this.circuitBreakerConfig = circuitBreakerConfig;
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        return Date.now() >= this.nextAttemptTime;
      case 'half-open':
        return this.failureCount < this.circuitBreakerConfig.halfOpenMaxCalls;
      default:
        return false;
    }
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    switch (this.state) {
      case 'closed':
        return this.handleClosedState(error);
      case 'open':
        return this.handleOpenState(error);
      case 'half-open':
        return this.handleHalfOpenState(error);
      default:
        return {
          success: false,
          action: Action.IGNORE as any,
          message: 'Circuit breaker in unknown state',
        };
    }
  }

  private handleClosedState(error: CrossSystemError): RecoveryResult {
    this.failureCount++;

    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.circuitBreakerConfig.recoveryTimeout;
      this.lastFailureTime = Date.now();

      return {
        success: false,
        action: Action.CIRCUIT_BREAKER as any,
        message: 'Circuit breaker opened due to failures',
      };
    }

    return {
      success: true,
      action: Action.IGNORE as any,
      message: 'Circuit breaker closed, allowing request',
    };
  }

  private handleOpenState(error: CrossSystemError): RecoveryResult {
    if (Date.now() >= this.nextAttemptTime) {
      this.state = 'half-open';
      this.failureCount = 0;

      return {
        success: true,
        action: Action.CIRCUIT_BREAKER as any,
        message: 'Circuit breaker transitioning to half-open',
      };
    }

    return {
      success: false,
      action: Action.CIRCUIT_BREAKER as any,
      message: 'Circuit breaker open, blocking request',
    };
  }

  private handleHalfOpenState(error: CrossSystemError): RecoveryResult {
    this.failureCount++;

    if (this.failureCount >= this.circuitBreakerConfig.halfOpenMaxCalls) {
      this.state = 'closed';
      this.failureCount = 0;

      return {
        success: true,
        action: Action.CIRCUIT_BREAKER as any,
        message: 'Circuit breaker closed, service recovered',
      };
    }

    return {
      success: true,
      action: Action.CIRCUIT_BREAKER as any,
      message: 'Circuit breaker half-open, testing service',
    };
  }

  // Method to be called when a request succeeds
  onSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
    }
  }

  // Method to be called when a request fails
  onFailure(): void {
    if (this.state === 'closed') {
      this.failureCount++;
      if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        this.state = 'open';
        this.nextAttemptTime = Date.now() + this.circuitBreakerConfig.recoveryTimeout;
      }
    }
  }
}

// ============================================================================
// Fail-Fast Strategy
// ============================================================================

export class FailFastStrategy extends BaseRecoveryStrategy {
  private failFastConfig: FailFastConfig;
  private failureCount = 0;
  private lastFailureWindow = 0;

  constructor(config: ErrorRecoveryStrategyConfig, failFastConfig: FailFastConfig) {
    super(config);
    this.failFastConfig = failFastConfig;
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    const now = Date.now();
    const windowStart = now - this.failFastConfig.monitoringWindow;

    // Reset window if needed
    if (windowStart > this.lastFailureWindow) {
      this.failureCount = 0;
      this.lastFailureWindow = windowStart;
    }

    // Check if we should fail fast
    return this.failureCount < this.failFastConfig.maxFailuresPerMinute;
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    const now = Date.now();
    const windowStart = now - this.failFastConfig.monitoringWindow;

    // Reset window if needed
    if (windowStart > this.lastFailureWindow) {
      this.failureCount = 0;
      this.lastFailureWindow = windowStart;
    }

    this.failureCount++;

    if (this.failureCount >= this.failFastConfig.failureThreshold) {
      return {
        success: false,
        action: Action.FAIL_FAST as any,
        message: 'Fail-fast triggered due to high failure rate',
      };
    }

    return {
      success: true,
      action: Action.IGNORE as any,
      message: 'Request allowed through fail-fast check',
    };
  }
}

// ============================================================================
// Cache Fallback Strategy
// ============================================================================

export class CacheFallbackStrategy extends BaseRecoveryStrategy {
  private fallbackConfig: FallbackConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();

  constructor(config: ErrorRecoveryStrategyConfig, fallbackConfig: FallbackConfig) {
    super(config);
    this.fallbackConfig = fallbackConfig;
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    // Check if we have cached fallback data
    const cacheKey = this.getCacheKey(error);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      return age < this.fallbackConfig.cacheTTL;
    }

    return false;
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    const cacheKey = this.getCacheKey(error);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return {
        success: true,
        action: Action.FALLBACK as any,
        message: 'Cache fallback data provided',
        nextAction: Action.IGNORE as any,
      };
    }

    return {
      success: false,
      action: Action.IGNORE as any,
      message: 'No cached fallback data available',
    };
  }

  private getCacheKey(error: CrossSystemError): string {
    return `${error.type}_${error.code}_${error.context?.component || 'unknown'}`;
  }

  public setFallbackData(error: CrossSystemError, data: unknown): void {
    const cacheKey = this.getCacheKey(error);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Graceful Degradation Strategy
// ============================================================================

export class GracefulDegradationStrategy extends BaseRecoveryStrategy {
  private degradationLevels: Map<string, string[]> = new Map();

  constructor(config: ErrorRecoveryStrategyConfig) {
    super(config);
    this.setupDegradationLevels();
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    // Check if degradation is available for this error type
    return this.degradationLevels.has(error.type);
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    const degradationLevel = this.degradationLevels.get(error.type);

    if (degradationLevel) {
      return {
        success: true,
        action: Action.DEGRADED_MODE as any,
        message: `System degraded: ${degradationLevel.join(', ')}`,
        nextAction: Action.IGNORE as any,
      };
    }

    return {
      success: false,
      action: Action.IGNORE as any,
      message: 'No degradation available for this error type',
    };
  }

  private setupDegradationLevels(): void {
    this.degradationLevels.set('network', ['Reduced functionality', 'Cached data only']);
    this.degradationLevels.set('performance', ['Slower response times', 'Limited features']);
    this.degradationLevels.set('database', ['Read-only mode', 'Limited queries']);
    this.degradationLevels.set('cache', ['Direct database access', 'No caching']);
  }
}

// ============================================================================
// Offline Mode Strategy
// ============================================================================

export class OfflineModeStrategy extends BaseRecoveryStrategy {
  private offlineData: Map<string, unknown> = new Map();

  constructor(config: ErrorRecoveryStrategyConfig) {
    super(config);
  }

  canRecover(error: CrossSystemError): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    // Check if we have offline data for this error type
    return this.offlineData.has(error.type);
  }

  async recover(error: CrossSystemError): Promise<RecoveryResult> {
    const offlineData = this.offlineData.get(error.type);

    if (offlineData) {
      return {
        success: true,
        action: Action.OFFLINE_MODE as any,
        message: 'Offline mode activated with cached data',
        nextAction: Action.IGNORE as any,
      };
    }

    return {
      success: false,
      action: Action.IGNORE as any,
      message: 'No offline data available',
    };
  }

  public setOfflineData(errorType: string, data: unknown): void {
    this.offlineData.set(errorType, data);
  }

  public clearOfflineData(): void {
    this.offlineData.clear();
  }
}

// ============================================================================
// Recovery Strategy Factory
// ============================================================================

export class RecoveryStrategyFactory {
  private static strategies: Map<ErrorRecoveryStrategyType, ErrorRecoveryStrategy> = new Map();

  static createStrategy(
    type: ErrorRecoveryStrategyType,
    config: ErrorRecoveryStrategyConfig,
    parameters?: Record<string, unknown>
  ): ErrorRecoveryStrategy | null {
    switch (type) {
      case StrategyType.RETRY:
        return new RetryStrategy(config, parameters as RetryConfig);
      case StrategyType.FALLBACK:
        return new FallbackStrategy(config, parameters as FallbackConfig);
      case StrategyType.CIRCUIT_BREAKER:
        return new CircuitBreakerStrategy(config, parameters as CircuitBreakerConfig);
      case StrategyType.FAIL_FAST:
        return new FailFastStrategy(config, parameters as FailFastConfig);
      case StrategyType.CACHE_FALLBACK:
        return new CacheFallbackStrategy(config, parameters as FallbackConfig);
      case StrategyType.DEGRADED_MODE:
        return new GracefulDegradationStrategy(config);
      case StrategyType.OFFLINE_MODE:
        return new OfflineModeStrategy(config);
      default:
        return null;
    }
  }

  static registerStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  static getStrategy(type: ErrorRecoveryStrategyType): ErrorRecoveryStrategy | undefined {
    return this.strategies.get(type);
  }

  static getAllStrategies(): ErrorRecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  static clearStrategies(): void {
    this.strategies.clear();
  }
}

// ============================================================================
// Error Recovery Orchestrator
// ============================================================================

export class ErrorRecoveryOrchestrator {
  private strategies: ErrorRecoveryStrategy[] = [];
  private strategyPriorities: Map<ErrorRecoveryStrategyType, number> = new Map();

  constructor() {
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies(): void {
    // Setup default strategy priorities
    this.strategyPriorities.set(StrategyType.RETRY, 1);
    this.strategyPriorities.set(StrategyType.CACHE_FALLBACK, 2);
    this.strategyPriorities.set(StrategyType.FALLBACK, 3);
    this.strategyPriorities.set(StrategyType.GRACEFUL_DEGRADATION, 4);
    this.strategyPriorities.set(StrategyType.OFFLINE_MODE, 5);
    this.strategyPriorities.set(StrategyType.REDUCED_FUNCTIONALITY, 6);
    this.strategyPriorities.set(StrategyType.PAGE_RELOAD, 7);
    this.strategyPriorities.set(StrategyType.AUTH_REFRESH, 8);
    this.strategyPriorities.set(StrategyType.CACHE_CLEAR, 9);
    this.strategyPriorities.set(StrategyType.MANUAL_RECOVERY, 10);
    this.strategyPriorities.set(StrategyType.SYSTEM_RESTART, 11);
  }

  addStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  removeStrategy(strategyType: ErrorRecoveryStrategyType): boolean {
    const index = this.strategies.findIndex(s => s.type === strategyType);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  async attemptRecovery(error: CrossSystemError): Promise<RecoveryResult> {
    // Sort strategies by priority
    const sortedStrategies = this.strategies
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.getPriority() - b.getPriority());

    for (const strategy of sortedStrategies) {
      try {
        const result = await strategy.recover(error);
        if (result.success) {
          return {
            success: true,
            action: result.action,
            message: result.message,
            nextAction: result.nextAction,
          };
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      action: Action.IGNORE,
      message: 'No recovery strategy succeeded',
    };
  }

  getStrategyByType(type: ErrorRecoveryStrategyType): ErrorRecoveryStrategy | undefined {
    return this.strategies.find(s => s.type === type);
  }

  getStrategiesForError(error: CrossSystemError): ErrorRecoveryStrategy[] {
    return this.strategies
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.getPriority() - b.getPriority());
  }

  clearStrategies(): void {
    this.strategies = [];
  }
}

// ============================================================================
// System-Specific Recovery Strategies
// ============================================================================

export class SecurityRecoveryStrategies {
  static createAuthRefreshStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.AUTH_REFRESH, {
      id: 'auth-refresh',
      type: StrategyType.AUTH_REFRESH,
      name: 'Authentication Refresh',
      description: 'Refresh authentication tokens',
      enabled: true,
      priority: 1,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'authentication',
        },
      ],
      parameters: {},
    })!;
  }

  static createAuthLogoutStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.MANUAL_RECOVERY, {
      id: 'auth-logout',
      type: StrategyType.MANUAL_RECOVERY,
      name: 'Authentication Logout',
      description: 'Logout user and redirect to login',
      enabled: true,
      priority: 2,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'authentication',
        },
      ],
      parameters: {},
    })!;
  }
}

export class HooksRecoveryStrategies {
  static createNetworkRetryStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.RETRY, {
      id: 'hooks-network-retry',
      type: StrategyType.RETRY,
      name: 'Hooks Network Retry',
      description: 'Retry network requests for hooks',
      enabled: true,
      priority: 1,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'network',
        },
      ],
      parameters: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true,
      },
    })!;
  }
}

export class LibraryServicesRecoveryStrategies {
  static createCacheClearStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.CACHE_CLEAR, {
      id: 'library-cache-clear',
      type: StrategyType.CACHE_CLEAR,
      name: 'Library Cache Clear',
      description: 'Clear library cache and retry',
      enabled: true,
      priority: 1,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'cache',
        },
      ],
      parameters: {},
    })!;
  }

  static createCacheFallbackStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.CACHE_FALLBACK, {
      id: 'library-cache-fallback',
      type: StrategyType.CACHE_FALLBACK,
      name: 'Library Cache Fallback',
      description: 'Use cached data as fallback',
      enabled: true,
      priority: 2,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'cache',
        },
      ],
      parameters: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
    })!;
  }
}

export class ServiceArchitectureRecoveryStrategies {
  static createPageReloadStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.PAGE_RELOAD, {
      id: 'service-page-reload',
      type: StrategyType.PAGE_RELOAD,
      name: 'Service Page Reload',
      description: 'Reload page to recover from service errors',
      enabled: true,
      priority: 1,
      conditions: [
        {
          field: 'severity',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'critical',
        },
      ],
      parameters: {},
    })!;
  }

  static createCircuitBreakerStrategy(): ErrorRecoveryStrategy {
    return RecoveryStrategyFactory.createStrategy(StrategyType.CIRCUIT_BREAKER, {
      id: 'service-circuit-breaker',
      type: StrategyType.CIRCUIT_BREAKER,
      name: 'Service Circuit Breaker',
      description: 'Implement circuit breaker for service calls',
      enabled: true,
      priority: 1,
      conditions: [
        {
          field: 'type',
          operator: RecoveryConditionOperator.EQUALS,
          value: 'network',
        },
      ],
      parameters: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
    })!;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  BaseRecoveryStrategy,
  RetryStrategy,
  FallbackStrategy,
  CircuitBreakerStrategy,
  FailFastStrategy,
  CacheFallbackStrategy,
  GracefulDegradationStrategy,
  OfflineModeStrategy,
  RecoveryStrategyFactory,
  ErrorRecoveryOrchestrator,
  SecurityRecoveryStrategies,
  HooksRecoveryStrategies,
  LibraryServicesRecoveryStrategies,
  ServiceArchitectureRecoveryStrategies,
};
