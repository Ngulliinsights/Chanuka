/**
 * Hooks System Error Middleware
 *
 * Handles React hooks error boundaries, error recovery, and hook-specific
 * error patterns with specialized recovery strategies and state management.
 */

import React from 'react';
import {
  AppError,
  ErrorDomain,
  ErrorSeverity,
  ErrorReporter,
  ErrorTransformer,
  RecoveryStrategy,
  RecoveryAction,
  coreErrorHandler,
  ErrorAnalyticsService,
} from '../index';

/**
 * Hook-specific error codes
 */
export enum HookErrorCode {
  HOOK_ERROR = 'HOOK_ERROR',
  HOOK_DEPENDENCY_ERROR = 'HOOK_DEPENDENCY_ERROR',
  HOOK_STATE_ERROR = 'HOOK_STATE_ERROR',
  HOOK_EFFECT_ERROR = 'HOOK_EFFECT_ERROR',
  HOOK_CALLBACK_ERROR = 'HOOK_CALLBACK_ERROR',
  HOOK_CLEANUP_ERROR = 'HOOK_CLEANUP_ERROR',
  HOOK_CONCURRENT_UPDATE = 'HOOK_CONCURRENT_UPDATE',
  HOOK_MEMORY_LEAK = 'HOOK_MEMORY_LEAK',
  HOOK_PERFORMANCE_DEGRADATION = 'HOOK_PERFORMANCE_DEGRADATION',
}

/**
 * Hook error context
 */
interface HookErrorContext {
  hookName?: string;
  componentName?: string;
  hookType?: 'useState' | 'useEffect' | 'useCallback' | 'useMemo' | 'useRef' | 'custom';
  dependencyArray?: unknown[];
  renderCount?: number;
  effectPhase?: 'mount' | 'update' | 'unmount';
  stateUpdates?: number;
  memoryUsage?: number;
  performanceMetrics?: {
    renderTime?: number;
    effectTime?: number;
    updateFrequency?: number;
  };
}

/**
 * Hooks middleware configuration
 */
interface HooksMiddlewareConfig {
  enableHookBoundary: boolean;
  enableStateRecovery: boolean;
  enableEffectRecovery: boolean;
  maxRenderRetries: number;
  memoryThreshold: number;
  performanceThreshold: number;
  enableConcurrentUpdateDetection: boolean;
  enableDependencyTracking: boolean;
}

/**
 * Hook Error Boundary Component
 */
interface HookErrorBoundaryProps {
  children: React.ReactNode;
  hookName?: string;
  fallback?: React.ComponentType<HookErrorFallbackProps>;
  onError?: (error: Error, hookContext: HookErrorContext) => void;
  enableRecovery?: boolean;
}

interface HookErrorFallbackProps {
  error: Error;
  hookContext: HookErrorContext;
  resetError: () => void;
  retryCount: number;
}

/**
 * Hook Error Boundary State
 */
interface HookErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  hookContext: HookErrorContext | null;
  retryCount: number;
}

/**
 * Hook Error Boundary Component
 */
export class HookErrorBoundary extends React.Component<
  HookErrorBoundaryProps,
  HookErrorBoundaryState
> {
  private recoveryTimeout: NodeJS.Timeout | null = null;

  constructor(props: HookErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      hookContext: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<HookErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const hookContext: HookErrorContext = {
      hookName: this.props.hookName,
      componentName: errorInfo.componentStack.split('\n')[1]?.trim(),
    };

    this.setState({
      hookContext,
    });

    // Report to hooks middleware
    hooksErrorMiddleware.handleHookError(error, hookContext);

    // Call custom error handler
    this.props.onError?.(error, hookContext);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      hookContext: null,
      retryCount: 0,
    });
  };

  retryWithDelay = (delay: number = 1000) => {
    this.recoveryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        hookContext: null,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);
  };

  componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultHookErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          hookContext={this.state.hookContext || {}}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Hook Error Fallback Component
 */
const DefaultHookErrorFallback: React.FC<HookErrorFallbackProps> = ({
  error,
  hookContext,
  resetError,
  retryCount,
}) => (
  <div className="hook-error-fallback" role="alert">
    <h3>Hook Error Occurred</h3>
    <p>
      An error occurred in the {hookContext.hookName || 'hook'}.
      {retryCount > 0 && ` (Retry attempt: ${retryCount})`}
    </p>
    <details>
      <summary>Error Details</summary>
      <pre>{error.message}</pre>
    </details>
    <button onClick={resetError}>Try Again</button>
  </div>
);

/**
 * Hooks Error Middleware
 *
 * Handles React hooks errors with specialized processing, recovery strategies,
 * and performance monitoring.
 */
export class HooksErrorMiddleware implements ErrorReporter, ErrorTransformer {
  private config: HooksMiddlewareConfig;
  private analyticsService: ErrorAnalyticsService;
  private hookErrorCounts = new Map<string, number>();
  private hookPerformanceMetrics = new Map<string, HookErrorContext['performanceMetrics']>();
  private activeBoundaries = new Set<HookErrorBoundary>();

  constructor(config: Partial<HooksMiddlewareConfig> = {}) {
    this.config = {
      enableHookBoundary: true,
      enableStateRecovery: true,
      enableEffectRecovery: true,
      maxRenderRetries: 3,
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      performanceThreshold: 16, // 16ms (60fps)
      enableConcurrentUpdateDetection: true,
      enableDependencyTracking: true,
      ...config,
    };

    this.analyticsService = ErrorAnalyticsService.getInstance();

    // Register with core error handler
    coreErrorHandler.addReporter(this);
  }

  /**
   * Handle hook-specific errors
   */
  handleHookError(error: Error, hookContext: HookErrorContext): void {
    const appError = this.createHookAppError(error, hookContext);
    coreErrorHandler.handleError(appError);
  }

  /**
   * Report hook errors with enhanced context
   */
  async report(error: AppError): Promise<void> {
    if (!this.isHookError(error)) {
      return;
    }

    const hookContext = this.extractHookContext(error);

    // Track hook error frequency
    this.trackHookErrorFrequency(hookContext);

    // Monitor performance degradation
    if (this.config.enableDependencyTracking) {
      await this.monitorHookPerformance(error, hookContext);
    }

    // Detect memory leaks
    await this.detectMemoryLeaks(error, hookContext);

    // Concurrent update detection
    if (this.config.enableConcurrentUpdateDetection) {
      await this.detectConcurrentUpdates(error, hookContext);
    }

    // Analytics tracking
    await this.trackHookAnalytics(error, hookContext);
  }

  /**
   * Transform hook errors with recovery strategies
   */
  transform(error: AppError): AppError {
    if (!this.isHookError(error)) {
      return error;
    }

    const hookContext = this.extractHookContext(error);
    const recoveryStrategies = this.getHookRecoveryStrategies(error, hookContext);

    return new AppError(
      error.message,
      error.code,
      error.type,
      error.severity,
      {
        ...error,
        context: {
          ...error.context,
          ...hookContext,
        },
        recoveryStrategies,
        recoverable: this.isRecoverableHookError(error),
        retryable: this.isRetryableHookError(error),
      }
    );
  }

  /**
   * Check if error is hook-related
   */
  private isHookError(error: AppError): boolean {
    return (
      error.type === ErrorDomain.UI ||
      Object.values(HookErrorCode).includes(error.code as HookErrorCode) ||
      error.message.toLowerCase().includes('hook') ||
      error.message.toLowerCase().includes('use') ||
      error.context?.hookName ||
      error.context?.componentName
    );
  }

  /**
   * Extract hook-specific context from error
   */
  private extractHookContext(error: AppError): HookErrorContext {
    const context: HookErrorContext = {
      hookName: error.context?.hookName as string,
      componentName: error.context?.componentName as string,
      hookType: error.context?.hookType as HookErrorContext['hookType'],
      dependencyArray: error.context?.dependencyArray as unknown[],
      renderCount: error.context?.renderCount as number,
      effectPhase: error.context?.effectPhase as HookErrorContext['effectPhase'],
      stateUpdates: error.context?.stateUpdates as number,
      memoryUsage: error.context?.memoryUsage as number,
      performanceMetrics: error.context?.performanceMetrics as HookErrorContext['performanceMetrics'],
    };

    return context;
  }

  /**
   * Create AppError from hook error
   */
  private createHookAppError(error: Error, hookContext: HookErrorContext): AppError {
    const errorCode = this.determineHookErrorCode(error, hookContext);
    const severity = this.determineHookErrorSeverity(errorCode, hookContext);

    return new AppError(
      error.message,
      errorCode,
      ErrorDomain.UI,
      severity,
      {
        context: hookContext,
        cause: error,
        recoverable: true,
        retryable: this.isRetryableHookErrorCode(errorCode),
      }
    );
  }

  /**
   * Determine hook error code based on context
   */
  private determineHookErrorCode(error: Error, context: HookErrorContext): string {
    if (context.hookType === 'useEffect' && context.effectPhase === 'unmount') {
      return HookErrorCode.HOOK_CLEANUP_ERROR;
    }

    if (context.stateUpdates && context.stateUpdates > 10) {
      return HookErrorCode.HOOK_CONCURRENT_UPDATE;
    }

    if (context.memoryUsage && context.memoryUsage > this.config.memoryThreshold) {
      return HookErrorCode.HOOK_MEMORY_LEAK;
    }

    if (context.performanceMetrics?.renderTime && context.performanceMetrics.renderTime > this.config.performanceThreshold) {
      return HookErrorCode.HOOK_PERFORMANCE_DEGRADATION;
    }

    if (context.dependencyArray) {
      return HookErrorCode.HOOK_DEPENDENCY_ERROR;
    }

    return HookErrorCode.HOOK_ERROR;
  }

  /**
   * Determine error severity based on hook context
   */
  private determineHookErrorSeverity(errorCode: string, context: HookErrorContext): ErrorSeverity {
    switch (errorCode) {
      case HookErrorCode.HOOK_MEMORY_LEAK:
      case HookErrorCode.HOOK_CONCURRENT_UPDATE:
        return ErrorSeverity.HIGH;
      case HookErrorCode.HOOK_PERFORMANCE_DEGRADATION:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Check if hook error code is retryable
   */
  private isRetryableHookErrorCode(errorCode: string): boolean {
    const retryableCodes = [
      HookErrorCode.HOOK_DEPENDENCY_ERROR,
      HookErrorCode.HOOK_STATE_ERROR,
      HookErrorCode.HOOK_EFFECT_ERROR,
    ];

    return retryableCodes.includes(errorCode as HookErrorCode);
  }

  /**
   * Get recovery strategies for hook errors
   */
  private getHookRecoveryStrategies(
    error: AppError,
    context: HookErrorContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (error.code) {
      case HookErrorCode.HOOK_DEPENDENCY_ERROR:
        strategies.push({
          id: 'hook-dependency-fix',
          type: RecoveryAction.RETRY,
          name: 'Fix Dependencies',
          description: 'Attempt to stabilize hook dependencies',
          automatic: true,
          priority: 1,
          maxRetries: 2,
          asyncAction: async () => {
            // Implementation would stabilize dependencies
            return false; // Placeholder
          },
        });
        break;

      case HookErrorCode.HOOK_STATE_ERROR:
        strategies.push({
          id: 'hook-state-reset',
          type: RecoveryAction.RESET,
          name: 'Reset Hook State',
          description: 'Reset hook state to initial values',
          automatic: false,
          priority: 1,
        });
        break;

      case HookErrorCode.HOOK_EFFECT_ERROR:
        strategies.push({
          id: 'hook-effect-retry',
          type: RecoveryAction.RETRY,
          name: 'Retry Effect',
          description: 'Retry the failed effect execution',
          automatic: true,
          priority: 1,
          maxRetries: 1,
        });
        break;

      case HookErrorCode.HOOK_MEMORY_LEAK:
        strategies.push({
          id: 'hook-memory-cleanup',
          type: RecoveryAction.CLEANUP,
          name: 'Memory Cleanup',
          description: 'Force garbage collection and cleanup',
          automatic: true,
          priority: 2,
        });
        break;
    }

    return strategies;
  }

  /**
   * Check if hook error is recoverable
   */
  private isRecoverableHookError(error: AppError): boolean {
    const recoverableCodes = [
      HookErrorCode.HOOK_DEPENDENCY_ERROR,
      HookErrorCode.HOOK_STATE_ERROR,
      HookErrorCode.HOOK_EFFECT_ERROR,
      HookErrorCode.HOOK_CALLBACK_ERROR,
    ];

    return recoverableCodes.includes(error.code as HookErrorCode);
  }

  /**
   * Check if hook error is retryable
   */
  private isRetryableHookError(error: AppError): boolean {
    return this.isRetryableHookErrorCode(error.code);
  }

  /**
   * Track hook error frequency
   */
  private trackHookErrorFrequency(context: HookErrorContext): void {
    const key = `${context.hookName || 'unknown'}:${context.componentName || 'unknown'}`;
    const count = this.hookErrorCounts.get(key) || 0;
    this.hookErrorCounts.set(key, count + 1);
  }

  /**
   * Monitor hook performance
   */
  private async monitorHookPerformance(
    error: AppError,
    context: HookErrorContext
  ): Promise<void> {
    if (!context.performanceMetrics) return;

    const key = `${context.hookName || 'unknown'}:${context.componentName || 'unknown'}`;
    this.hookPerformanceMetrics.set(key, context.performanceMetrics);

    // Check for performance degradation
    if (context.performanceMetrics.renderTime && context.performanceMetrics.renderTime > this.config.performanceThreshold * 2) {
      const perfError = new AppError(
        `Hook performance degradation detected: ${context.hookName}`,
        HookErrorCode.HOOK_PERFORMANCE_DEGRADATION,
        ErrorDomain.UI,
        ErrorSeverity.MEDIUM,
        {
          context,
        }
      );

      await coreErrorHandler.handleError(perfError);
    }
  }

  /**
   * Detect memory leaks in hooks
   */
  private async detectMemoryLeaks(
    error: AppError,
    context: HookErrorContext
  ): Promise<void> {
    if (!context.memoryUsage || context.memoryUsage < this.config.memoryThreshold) {
      return;
    }

    const memoryError = new AppError(
      `Potential memory leak detected in hook: ${context.hookName}`,
      HookErrorCode.HOOK_MEMORY_LEAK,
      ErrorDomain.UI,
      ErrorSeverity.HIGH,
      {
        context,
      }
    );

    await coreErrorHandler.handleError(memoryError);
  }

  /**
   * Detect concurrent state updates
   */
  private async detectConcurrentUpdates(
    error: AppError,
    context: HookErrorContext
  ): Promise<void> {
    if (!context.stateUpdates || context.stateUpdates < 5) {
      return;
    }

    const concurrentError = new AppError(
      `Concurrent state updates detected in hook: ${context.hookName}`,
      HookErrorCode.HOOK_CONCURRENT_UPDATE,
      ErrorDomain.UI,
      ErrorSeverity.MEDIUM,
      {
        context,
      }
    );

    await coreErrorHandler.handleError(concurrentError);
  }

  /**
   * Track hook analytics
   */
  private async trackHookAnalytics(
    error: AppError,
    context: HookErrorContext
  ): Promise<void> {
    await this.analyticsService.track(error, {
      hook: {
        name: context.hookName,
        type: context.hookType,
        component: context.componentName,
        renderCount: context.renderCount,
        errorFrequency: this.hookErrorCounts.get(`${context.hookName}:${context.componentName}`),
        performanceMetrics: context.performanceMetrics,
      },
    });
  }

  /**
   * Register a hook error boundary
   */
  registerBoundary(boundary: HookErrorBoundary): void {
    this.activeBoundaries.add(boundary);
  }

  /**
   * Unregister a hook error boundary
   */
  unregisterBoundary(boundary: HookErrorBoundary): void {
    this.activeBoundaries.delete(boundary);
  }

  /**
   * Get hook error metrics
   */
  getHookMetrics() {
    return {
      totalHookErrors: Array.from(this.hookErrorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByHook: Object.fromEntries(this.hookErrorCounts),
      performanceMetrics: Object.fromEntries(this.hookPerformanceMetrics),
      activeBoundaries: this.activeBoundaries.size,
    };
  }

  /**
   * Reset hook error tracking
   */
  resetTracking(): void {
    this.hookErrorCounts.clear();
    this.hookPerformanceMetrics.clear();
  }
}

// Export singleton instance
export const hooksErrorMiddleware = new HooksErrorMiddleware();

// Export components and types
export type { HookErrorContext, HooksMiddlewareConfig, HookErrorBoundaryProps, HookErrorFallbackProps };
