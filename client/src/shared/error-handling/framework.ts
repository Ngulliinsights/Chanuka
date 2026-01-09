/**
 * Unified Error Handling Framework
 *
 * Central error handling framework that provides consistent error handling
 * across all four client systems: Security, Hooks, Library Services, and Service Architecture.
 */

import {
  CrossSystemError,
  ErrorContext,
  ErrorMetadata,
  ErrorHandlingConfig,
  ErrorPropagationContext,
  ErrorRecoveryStrategy,
  RecoveryResult,
  ErrorPropagationResult,
  ErrorUserContext,
  ErrorSystemContext,
  ErrorHandlingMode,
  ErrorPropagationMode,
  ErrorRecoveryStrategyType,
} from './types';
import {
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
  SystemIdentifier,
  DEFAULT_ERROR_HANDLING_CONFIG,
} from './constants';

// ============================================================================
// Unified Error Handler
// ============================================================================

export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private config: ErrorHandlingConfig;
  private isInitialized = false;

  private constructor() {
    this.config = {
      ...DEFAULT_ERROR_HANDLING_CONFIG,
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler();
    }
    return UnifiedErrorHandler.instance;
  }

  /**
   * Initialize the unified error handler
   */
  initialize(config?: Partial<ErrorHandlingConfig>): void {
    if (this.isInitialized) {
      console.warn('UnifiedErrorHandler already initialized');
      return;
    }

    this.config = { ...this.config, ...config };
    this.isInitialized = true;
  }

  /**
   * Handle an error through the unified error handling pipeline
   */
  async handleError(
    error: Error | CrossSystemError,
    context?: Partial<ErrorContext>,
    system?: string
  ): Promise<CrossSystemError> {
    // Create or enhance error with cross-system context
    const crossSystemError = this.createCrossSystemError(error, context, system);

    // Handle error based on configuration mode
    switch (this.config.mode) {
      case ErrorHandlingMode.STRICT:
        return this.handleStrictMode(crossSystemError);
      case ErrorHandlingMode.RECOVERABLE:
        return this.handleRecoverableMode(crossSystemError);
      case ErrorHandlingMode.GRACEFUL:
        return this.handleGracefulMode(crossSystemError);
      case ErrorHandlingMode.MONITORING_ONLY:
        return this.handleMonitoringOnlyMode(crossSystemError);
      case ErrorHandlingMode.DISABLED:
        return crossSystemError;
      default:
        return this.handleRecoverableMode(crossSystemError);
    }
  }

  /**
   * Create a cross-system error from a standard error
   */
  private createCrossSystemError(
    error: Error | CrossSystemError,
    context?: Partial<ErrorContext>,
    system?: string
  ): CrossSystemError {
    const now = Date.now();
    const correlationId = context?.correlationId || this.generateCorrelationId();

    // Type guard to check if error is already a CrossSystemError
    const isCrossSystemError = (err: any): err is CrossSystemError => {
      return 'id' in err && 'type' in err && 'severity' in err;
    };

    const crossSystemError: CrossSystemError = {
      id: isCrossSystemError(error) ? error.id : this.generateErrorId(),
      name: error.name || 'UnknownError',
      message: error.message || 'An unknown error occurred',
      stack: error.stack,
      type: isCrossSystemError(error) ? error.type : ErrorDomain.SYSTEM,
      severity: isCrossSystemError(error) ? error.severity : ErrorSeverity.MEDIUM,
      code: isCrossSystemError(error) ? error.code : 'UNKNOWN_ERROR',
      statusCode: isCrossSystemError(error) ? error.statusCode : undefined,
      timestamp: now,
      context: {
        ...context,
        correlationId,
        system: system || SystemIdentifier.CLIENT,
        timestamp: now,
      },
      metadata: {
        domain: isCrossSystemError(error) ? error.metadata.domain : ErrorDomain.SYSTEM,
        severity: isCrossSystemError(error) ? error.metadata.severity : ErrorSeverity.MEDIUM,
        timestamp: new Date(now),
        context: context || {},
        retryable: isCrossSystemError(error) ? error.metadata.retryable : true,
        recoverable: isCrossSystemError(error) ? error.metadata.recoverable : true,
        correlationId,
        cause: error,
        code: isCrossSystemError(error) ? error.metadata.code : 'UNKNOWN_ERROR',
        system: system || SystemIdentifier.CLIENT,
        version: this.config.systemContext.systemVersion,
        environment: this.config.systemContext.environment,
        tags: {},
      },
      system: system || SystemIdentifier.CLIENT,
      propagated: false,
      propagationPath: [system || SystemIdentifier.CLIENT],
      recoveryAttempts: 0,
      userMessage: undefined,
      technicalDetails: error.stack,
      suggestedActions: [],
    };

    return crossSystemError;
  }

  /**
   * Handle error in strict mode (no recovery, immediate failure)
   */
  private handleStrictMode(error: CrossSystemError): CrossSystemError {
    // Log error and throw immediately
    console.error('Strict mode error:', error);
    throw error;
  }

  /**
   * Handle error in recoverable mode (attempt recovery strategies)
   */
  private async handleRecoverableMode(error: CrossSystemError): Promise<CrossSystemError> {
    if (!this.config.recoveryEnabled) {
      console.error('Recoverable mode error:', error);
      return error;
    }

    // For now, just return the error without actual recovery logic
    // Recovery strategies will be implemented in separate modules
    console.log('Recoverable mode error handled:', error.id);
    return error;
  }

  /**
   * Handle error in graceful mode (degraded functionality)
   */
  private async handleGracefulMode(error: CrossSystemError): Promise<CrossSystemError> {
    // Implement graceful degradation
    const degradedError = {
      ...error,
      suggestedActions: [
        'System is operating in degraded mode',
        'Some features may be unavailable',
        'Please try again later',
      ],
    };

    console.log('Graceful mode error handled:', error.id);
    return degradedError;
  }

  /**
   * Handle error in monitoring-only mode (log and continue)
   */
  private handleMonitoringOnlyMode(error: CrossSystemError): CrossSystemError {
    console.log('Monitoring only mode error:', error);
    return error;
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = this.createCrossSystemError(event.error, {
        component: 'GlobalErrorHandler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, SystemIdentifier.CLIENT);

      this.handleError(error).catch(handleError => {
        console.error('Error handling failed:', handleError);
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createCrossSystemError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'GlobalErrorHandler',
          promise: event.promise,
        },
        SystemIdentifier.CLIENT
      );

      this.handleError(error).catch(handleError => {
        console.error('Error handling failed:', handleError);
      });
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ErrorHandlingConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Destroy the handler and clean up resources
   */
  destroy(): void {
    this.isInitialized = false;
  }
}

// ============================================================================
// Cross-System Error Handler
// ============================================================================

export class CrossSystemErrorHandler {
  private unifiedHandler: UnifiedErrorHandler;
  private systemName: string;

  constructor(systemName: string) {
    this.unifiedHandler = UnifiedErrorHandler.getInstance();
    this.systemName = systemName;
  }

  /**
   * Handle error specific to this system
   */
  async handleError(
    error: Error | CrossSystemError,
    context?: Partial<ErrorContext>
  ): Promise<CrossSystemError> {
    return this.unifiedHandler.handleError(error, context, this.systemName);
  }

  /**
   * Handle system-specific error with custom recovery strategies
   */
  async handleSystemError(
    error: Error | CrossSystemError,
    recoveryStrategies: ErrorRecoveryStrategyType[] = [],
    context?: Partial<ErrorContext>
  ): Promise<CrossSystemError> {
    const crossSystemError = this.createCrossSystemError(error, context, this.systemName);

    // Apply system-specific recovery strategies
    if (recoveryStrategies.length > 0) {
      // Recovery strategy logic would go here
      console.log('Applying recovery strategies:', recoveryStrategies);
    }

    return crossSystemError;
  }

  /**
   * Report error without throwing
   */
  async reportError(
    error: Error | CrossSystemError,
    context?: Partial<ErrorContext>
  ): Promise<void> {
    try {
      await this.handleError(error, context);
    } catch (handleError) {
      console.error('Error reporting failed:', handleError);
    }
  }

  /**
   * Create cross-system error (helper method)
   */
  private createCrossSystemError(
    error: Error | CrossSystemError,
    context?: Partial<ErrorContext>,
    system?: string
  ): CrossSystemError {
    const unifiedHandler = UnifiedErrorHandler.getInstance();
    return unifiedHandler['createCrossSystemError'](error, context, system || this.systemName);
  }

  /**
   * Get system-specific error statistics
   */
  getErrorStats(): any {
    return {
      totalErrors: 0,
      errorRate: 0,
      recoverySuccessRate: 0,
    };
  }

  /**
   * Clear system-specific errors
   */
  clearErrors(): void {
    // Clear logic would go here
  }
}

// ============================================================================
// Error Context Manager
// ============================================================================

export class ErrorContextManager {
  private config: ErrorHandlingConfig;
  private contextCache: Map<string, ErrorContext> = new Map();

  constructor() {
    this.config = {
      mode: ErrorHandlingMode.RECOVERABLE,
      propagationMode: ErrorPropagationMode.IMMEDIATE,
      recoveryEnabled: true,
      monitoringEnabled: true,
      userMessagesEnabled: true,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
        nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
        enabled: true,
      },
      fallback: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
      failFast: {
        enabled: true,
        failureThreshold: 10,
        monitoringWindow: 60000,
        recoveryCheckInterval: 30000,
        maxFailuresPerMinute: 20,
      },
      systems: [SystemIdentifier.CLIENT],
      defaultRecoveryStrategies: [ErrorRecoveryStrategyType.RETRY],
      errorReporting: {
        enabled: true,
        endpoints: [],
        batchSize: 10,
        flushInterval: 5000,
      },
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  initialize(config?: ErrorHandlingConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Build error context for a system
   */
  buildContext(system?: string): ErrorContext {
    const context: ErrorContext = {
      system: system || this.config.systemContext.systemName,
      subsystem: this.config.systemContext.systemName,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      correlationId: this.generateCorrelationId(),
      ...this.config.userContext,
      ...this.config.systemContext,
    };

    return context;
  }

  /**
   * Enhance context with additional information
   */
  enhanceContext(context: ErrorContext, additional: Partial<ErrorContext>): ErrorContext {
    return { ...context, ...additional };
  }

  /**
   * Cache context for correlation
   */
  cacheContext(correlationId: string, context: ErrorContext): void {
    this.contextCache.set(correlationId, context);
  }

  /**
   * Retrieve cached context
   */
  getCachedContext(correlationId: string): ErrorContext | undefined {
    return this.contextCache.get(correlationId);
  }

  /**
   * Clear cached contexts
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  private generateCorrelationId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  destroy(): void {
    this.clearCache();
  }
}

// ============================================================================
// Error Recovery Manager
// ============================================================================

export class ErrorRecoveryManager {
  private config: ErrorHandlingConfig;
  private strategies: Map<string, ErrorRecoveryStrategy> = new Map();

  constructor() {
    this.config = {
      mode: ErrorHandlingMode.RECOVERABLE,
      propagationMode: ErrorPropagationMode.IMMEDIATE,
      recoveryEnabled: true,
      monitoringEnabled: true,
      userMessagesEnabled: true,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
        nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
        enabled: true,
      },
      fallback: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
      failFast: {
        enabled: true,
        failureThreshold: 10,
        monitoringWindow: 60000,
        recoveryCheckInterval: 30000,
        maxFailuresPerMinute: 20,
      },
      systems: [SystemIdentifier.CLIENT],
      defaultRecoveryStrategies: [ErrorRecoveryStrategyType.RETRY],
      errorReporting: {
        enabled: true,
        endpoints: [],
        batchSize: 10,
        flushInterval: 5000,
      },
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  initialize(config?: ErrorHandlingConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.setupDefaultStrategies();
  }

  /**
   * Attempt recovery using registered strategies
   */
  async attemptRecovery(error: CrossSystemError): Promise<RecoveryResult> {
    const applicableStrategies = this.getApplicableStrategies(error);

    for (const strategy of applicableStrategies) {
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
        console.error(`Recovery strategy ${strategy.id} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      action: RecoveryAction.IGNORE as any,
      message: 'No recovery strategy succeeded',
    };
  }

  /**
   * Attempt recovery with specific strategies
   */
  async attemptRecoveryWithStrategies(
    error: CrossSystemError,
    strategyTypes: ErrorRecoveryStrategyType[]
  ): Promise<RecoveryResult> {
    const strategies = strategyTypes
      .map(type => this.strategies.get(type))
      .filter((strategy): strategy is ErrorRecoveryStrategy => strategy !== undefined);

    for (const strategy of strategies) {
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
        console.error(`Recovery strategy ${strategy.id} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      action: RecoveryAction.IGNORE as any,
      message: 'No recovery strategy succeeded',
    };
  }

  /**
   * Add a recovery strategy
   */
  addStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Remove a recovery strategy
   */
  removeStrategy(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  /**
   * Get applicable strategies for an error
   */
  private getApplicableStrategies(error: CrossSystemError): ErrorRecoveryStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * Set up default recovery strategies
   */
  private setupDefaultStrategies(): void {
    // Add default strategies based on configuration
    this.config.defaultRecoveryStrategies.forEach(strategyType => {
      // Strategy creation logic would go here
      console.log('Setting up strategy:', strategyType);
    });
  }

  destroy(): void {
    this.strategies.clear();
  }
}

// ============================================================================
// Error Propagation Manager
// ============================================================================

export class ErrorPropagationManager {
  private config: ErrorHandlingConfig;
  private propagationQueue: CrossSystemError[] = [];
  private propagationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      mode: ErrorHandlingMode.RECOVERABLE,
      propagationMode: ErrorPropagationMode.IMMEDIATE,
      recoveryEnabled: true,
      monitoringEnabled: true,
      userMessagesEnabled: true,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
        nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
        enabled: true,
      },
      fallback: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
      failFast: {
        enabled: true,
        failureThreshold: 10,
        monitoringWindow: 60000,
        recoveryCheckInterval: 30000,
        maxFailuresPerMinute: 20,
      },
      systems: [SystemIdentifier.CLIENT],
      defaultRecoveryStrategies: [ErrorRecoveryStrategyType.RETRY],
      errorReporting: {
        enabled: true,
        endpoints: [],
        batchSize: 10,
        flushInterval: 5000,
      },
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  initialize(config?: ErrorHandlingConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.setupPropagationTimer();
  }

  /**
   * Propagate error to other systems
   */
  async propagateError(
    error: CrossSystemError,
    context: ErrorPropagationContext
  ): Promise<ErrorPropagationResult> {
    const result: ErrorPropagationResult = {
      success: false,
      propagatedTo: [],
      failedSystems: [],
    };

    try {
      // Filter systems based on propagation mode
      const targetSystems = this.filterTargetSystems(error, context);

      // Propagate to each target system
      const propagationPromises = targetSystems.map(async (system) => {
        try {
          await this.propagateToSystem(error, system, context);
          result.propagatedTo.push(system);
        } catch (propagationError) {
          result.failedSystems.push(system);
          console.error(`Failed to propagate to ${system}:`, propagationError);
        }
      });

      await Promise.allSettled(propagationPromises);
      result.success = result.failedSystems.length === 0;

      return result;
    } catch (error) {
      console.error('Error propagation failed:', error);
      return result;
    }
  }

  /**
   * Propagate error to a specific system
   */
  private async propagateToSystem(
    error: CrossSystemError,
    system: string,
    context: ErrorPropagationContext
  ): Promise<void> {
    // Implementation would depend on system communication mechanism
    // This is a placeholder for the actual propagation logic
    console.log(`Propagating error ${error.id} to system ${system}`);
  }

  /**
   * Filter target systems based on propagation mode and filters
   */
  private filterTargetSystems(
    error: CrossSystemError,
    context: ErrorPropagationContext
  ): string[] {
    let targetSystems = context.targetSystems;

    // Apply filters based on propagation mode
    switch (context.propagationMode) {
      case ErrorPropagationMode.FILTERED:
        targetSystems = this.applyFilters(error, targetSystems, context.filters || []);
        break;
      case ErrorPropagationMode.THROTTLED:
        targetSystems = this.applyThrottling(error, targetSystems);
        break;
      case ErrorPropagationMode.BATCHED:
        this.addToBatch(error, context);
        return [];
      default:
        break;
    }

    return targetSystems;
  }

  /**
   * Apply filters to target systems
   */
  private applyFilters(
    error: CrossSystemError,
    systems: string[],
    filters: any[]
  ): string[] {
    return systems.filter(system => {
      return filters.every(filter => {
        // Apply filter logic
        return true; // Placeholder
      });
    });
  }

  /**
   * Apply throttling to target systems
   */
  private applyThrottling(error: CrossSystemError, systems: string[]): string[] {
    // Implement throttling logic
    return systems;
  }

  /**
   * Add error to batch for batched propagation
   */
  private addToBatch(error: CrossSystemError, context: ErrorPropagationContext): void {
    this.propagationQueue.push(error);

    if (this.propagationQueue.length >= this.config.errorReporting.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Set up propagation timer for batched propagation
   */
  private setupPropagationTimer(): void {
    if (this.config.propagationMode === ErrorPropagationMode.BATCHED) {
      this.propagationTimer = setInterval(() => {
        this.flushBatch();
      }, this.config.errorReporting.flushInterval);
    }
  }

  /**
   * Flush batched errors
   */
  private async flushBatch(): Promise<void> {
    if (this.propagationQueue.length === 0) return;

    const batch = [...this.propagationQueue];
    this.propagationQueue = [];

    // Process batch
    for (const error of batch) {
      // Batch processing logic
    }
  }

  destroy(): void {
    if (this.propagationTimer) {
      clearInterval(this.propagationTimer);
      this.propagationTimer = null;
    }
    this.propagationQueue = [];
  }
}

// ============================================================================
// Error Monitoring Service
// ============================================================================

export class ErrorMonitoringService {
  private config: ErrorHandlingConfig;
  private metrics: Map<string, any> = new Map();

  constructor() {
    this.config = {
      mode: ErrorHandlingMode.RECOVERABLE,
      propagationMode: ErrorPropagationMode.IMMEDIATE,
      recoveryEnabled: true,
      monitoringEnabled: true,
      userMessagesEnabled: true,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
        nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
        enabled: true,
      },
      fallback: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
      failFast: {
        enabled: true,
        failureThreshold: 10,
        monitoringWindow: 60000,
        recoveryCheckInterval: 30000,
        maxFailuresPerMinute: 20,
      },
      systems: [SystemIdentifier.CLIENT],
      defaultRecoveryStrategies: [ErrorRecoveryStrategyType.RETRY],
      errorReporting: {
        enabled: true,
        endpoints: [],
        batchSize: 10,
        flushInterval: 5000,
      },
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  initialize(config?: ErrorHandlingConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Log error for monitoring
   */
  logError(error: CrossSystemError): void {
    // Implementation would depend on monitoring backend
    console.log('Error logged:', error);
  }

  /**
   * Log recovery success
   */
  logRecoverySuccess(error: CrossSystemError, result: any): void {
    console.log('Recovery successful:', { errorId: error.id, strategy: result.strategy });
  }

  /**
   * Log recovery failure
   */
  logRecoveryFailure(error: CrossSystemError, result: any): void {
    console.log('Recovery failed:', { errorId: error.id, reason: result.message });
  }

  /**
   * Log propagation success
   */
  logPropagationSuccess(error: CrossSystemError, result: ErrorPropagationResult): void {
    console.log('Propagation successful:', {
      errorId: error.id,
      propagatedTo: result.propagatedTo,
    });
  }

  /**
   * Log propagation failure
   */
  logPropagationFailure(error: CrossSystemError, result: ErrorPropagationResult): void {
    console.log('Propagation failed:', {
      errorId: error.id,
      failedSystems: result.failedSystems,
    });
  }

  /**
   * Get error metrics
   */
  getMetrics(): any {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Update metrics
   */
  updateMetrics(key: string, value: any): void {
    this.metrics.set(key, value);
  }

  destroy(): void {
    this.metrics.clear();
  }
}

// ============================================================================
// User-Friendly Error Service
// ============================================================================

export class UserFriendlyErrorService {
  private config: ErrorHandlingConfig;

  constructor() {
    this.config = {
      mode: ErrorHandlingMode.RECOVERABLE,
      propagationMode: ErrorPropagationMode.IMMEDIATE,
      recoveryEnabled: true,
      monitoringEnabled: true,
      userMessagesEnabled: true,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 3,
        monitoringPeriod: 60000,
        errorThresholdPercentage: 50,
        enabled: true,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
        nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
        enabled: true,
      },
      fallback: {
        enabled: true,
        fallbackTimeout: 5000,
        cacheFallback: true,
        cacheTTL: 300000,
      },
      failFast: {
        enabled: true,
        failureThreshold: 10,
        monitoringWindow: 60000,
        recoveryCheckInterval: 30000,
        maxFailuresPerMinute: 20,
      },
      systems: [SystemIdentifier.CLIENT],
      defaultRecoveryStrategies: [ErrorRecoveryStrategyType.RETRY],
      errorReporting: {
        enabled: true,
        endpoints: [],
        batchSize: 10,
        flushInterval: 5000,
      },
      userContext: {
        userId: '',
        userName: '',
        userRole: '',
        userPreferences: {},
        sessionData: {},
        deviceInfo: {
          type: 'desktop',
          os: '',
          browser: '',
          screenSize: '',
        },
        location: {},
      },
      systemContext: {
        systemName: 'client',
        systemVersion: '1.0.0',
        environment: 'development',
        dependencies: [],
        configuration: {},
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        uptime: 0,
      },
    };
  }

  initialize(config?: ErrorHandlingConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Format error for user display
   */
  formatUserMessage(error: CrossSystemError): string {
    // Implementation would format error for user display
    return error.message;
  }

  /**
   * Get suggested actions for error
   */
  getSuggestedActions(error: CrossSystemError): string[] {
    // Implementation would provide suggested actions
    return error.suggestedActions || [];
  }

  /**
   * Get technical details for error
   */
  getTechnicalDetails(error: CrossSystemError): string {
    return error.technicalDetails || error.stack || '';
  }

  destroy(): void {
    // Cleanup logic
  }
}

// ============================================================================
// Default Exports
// ============================================================================

export default {
  UnifiedErrorHandler,
  CrossSystemErrorHandler,
  ErrorContextManager,
  ErrorRecoveryManager,
  ErrorPropagationManager,
  ErrorMonitoringService,
  UserFriendlyErrorService,
};
