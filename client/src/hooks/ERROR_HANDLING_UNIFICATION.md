# Error Handling Unification Strategy

## Overview

This document defines the unified error handling approach for all hooks in the SimpleTool project. The goal is to provide consistent, predictable, and recoverable error handling across the entire hooks architecture.

## Current Error Handling Analysis

### Existing Patterns

#### 1. Comprehensive Error Handling (Good Examples)
- **[`useErrorRecovery.ts`](client/src/hooks/useErrorRecovery.ts)** - Excellent error recovery with strategies
- **[`useOfflineDetection.tsx`](client/src/hooks/useOfflineDetection.tsx)** - Good network error handling
- **[`useToast.ts`](client/src/hooks/useToast.ts)** - Clean error-free implementation

#### 2. Minimal Error Handling (Needs Improvement)
- **[`useNotifications.ts`](client/src/hooks/useNotifications.ts)** - Basic error handling
- **[`useProgressiveDisclosure.ts`](client/src/hooks/useProgressiveDisclosure.ts)** - Limited error handling
- **[`useSafeEffect.ts`](client/src/hooks/useSafeEffect.ts)** - Minimal error handling

#### 3. No Error Handling (Needs Implementation)
- **[`useDebounce.ts`](client/src/hooks/useDebounce.ts)** - No error handling
- **[`useMediaQuery.ts`](client/src/hooks/useMediaQuery.ts)** - No error handling
- **[`useKeyboardFocus.ts`](client/src/hooks/useKeyboardFocus.ts)** - No error handling

## Unified Error Handling Architecture

### 1. Error Handling Utilities

Create `client/src/hooks/utils/error-handling.ts`:

```typescript
import { logger } from '@client/utils/logger';

export interface ErrorContext {
  hookName: string;
  operation?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface ErrorRecoveryStrategy {
  id: string;
  condition: (error: Error, context: ErrorContext) => boolean;
  action: (error: Error, context: ErrorContext) => Promise<boolean>;
  description: string;
  priority: number;
  maxAttempts: number;
}

export class HookErrorHandler {
  private strategies: ErrorRecoveryStrategy[] = [];
  private logger: typeof logger;
  
  constructor(loggerInstance: typeof logger) {
    this.logger = loggerInstance;
    this.initializeDefaultStrategies();
  }
  
  private initializeDefaultStrategies() {
    // Network error recovery
    this.addStrategy({
      id: 'network-retry',
      condition: (error) => this.isNetworkError(error),
      action: async (error, context) => {
        this.logger.warn(`Retrying network operation: ${context.operation}`, { 
          hook: context.hookName,
          error: error.message 
        });
        return true; // Allow retry
      },
      description: 'Retry network operations',
      priority: 1,
      maxAttempts: 3,
    });
    
    // Timeout recovery
    this.addStrategy({
      id: 'timeout-recovery',
      condition: (error) => this.isTimeoutError(error),
      action: async (error, context) => {
        this.logger.warn(`Handling timeout: ${context.operation}`, { 
          hook: context.hookName,
          error: error.message 
        });
        return true; // Allow retry with longer timeout
      },
      description: 'Handle timeout errors',
      priority: 2,
      maxAttempts: 2,
    });
    
    // Graceful degradation
    this.addStrategy({
      id: 'graceful-degradation',
      condition: () => true, // Always available
      action: async (error, context) => {
        this.logger.error(`Graceful degradation for: ${context.operation}`, { 
          hook: context.hookName,
          error: error.message 
        });
        return false; // No recovery, just log
      },
      description: 'Enable degraded functionality',
      priority: 10,
      maxAttempts: 1,
    });
  }
  
  addStrategy(strategy: ErrorRecoveryStrategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }
  
  removeStrategy(strategyId: string) {
    this.strategies = this.strategies.filter(s => s.id !== strategyId);
  }
  
  async handle(error: Error, context: ErrorContext): Promise<void> {
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.condition(error, context)
    );
    
    for (const strategy of applicableStrategies) {
      try {
        const success = await strategy.action(error, context);
        if (success) {
          this.logger.info(`Error recovery successful: ${strategy.description}`, {
            hook: context.hookName,
            operation: context.operation,
          });
          return;
        }
      } catch (recoveryError) {
        this.logger.error(`Error recovery failed: ${strategy.description}`, {
          hook: context.hookName,
          originalError: error.message,
          recoveryError: recoveryError.message,
        });
      }
    }
    
    // No recovery strategies worked
    this.logger.error(`No recovery strategy available for error`, {
      hook: context.hookName,
      operation: context.operation,
      error: error.message,
    });
  }
  
  private isNetworkError(error: Error): boolean {
    return error.message.includes('network') || 
           error.message.includes('fetch') ||
           error.message.includes('offline');
  }
  
  private isTimeoutError(error: Error): boolean {
    return error.message.includes('timeout') ||
           error.name === 'TimeoutError';
  }
}

// Global error handler instance
export const globalErrorHandler = new HookErrorHandler(logger);

// Hook-specific error handler factory
export function createErrorHandler(hookName: string) {
  return {
    async handle(error: Error, operation?: string): Promise<void> {
      await globalErrorHandler.handle(error, {
        hookName,
        operation,
        timestamp: Date.now(),
        userId: getCurrentUserId(),
        sessionId: getSessionId(),
      });
    },
    
    async retry<T>(
      operation: () => Promise<T>,
      retries: number = 3,
      delay: number = 1000
    ): Promise<T> {
      let lastError: Error;
      
      for (let i = 0; i < retries; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          if (i === retries - 1) {
            await this.handle(lastError, 'retry');
            throw lastError;
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
      
      throw lastError!;
    },
  };
}
```

### 2. Error Recovery Patterns

#### Pattern 1: Try-Catch with Recovery
```typescript
export function useExample() {
  const errorHandler = createErrorHandler('useExample');
  const [error, setError] = useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const operation = useCallback(async () => {
    try {
      setIsRecovering(false);
      const result = await asyncOperation();
      return result;
    } catch (err) {
      setError(err as Error);
      setIsRecovering(true);
      
      try {
        await errorHandler.handle(err as Error, 'operation');
        // Attempt recovery
        const recoveryResult = await recoveryOperation();
        setError(null);
        setIsRecovering(false);
        return recoveryResult;
      } catch (recoveryError) {
        setError(recoveryError as Error);
        setIsRecovering(false);
        throw recoveryError;
      }
    }
  }, [errorHandler]);
  
  return { operation, error, isRecovering };
}
```

#### Pattern 2: Graceful Degradation
```typescript
export function useExample() {
  const errorHandler = createErrorHandler('useExample');
  const [isDegraded, setIsDegraded] = useState(false);
  
  const operation = useCallback(async () => {
    try {
      return await asyncOperation();
    } catch (error) {
      await errorHandler.handle(error as Error, 'operation');
      
      // Enable degraded mode
      setIsDegraded(true);
      return getFallbackData();
    }
  }, [errorHandler]);
  
  return { operation, isDegraded };
}
```

#### Pattern 3: Circuit Breaker Pattern
```typescript
export function useExample() {
  const errorHandler = createErrorHandler('useExample');
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  
  const operation = useCallback(async () => {
    if (circuitOpen) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await asyncOperation();
      setFailureCount(0); // Reset on success
      return result;
    } catch (error) {
      setFailureCount(prev => prev + 1);
      
      if (failureCount >= 5) {
        setCircuitOpen(true);
        setTimeout(() => setCircuitOpen(false), 30000); // Open for 30 seconds
      }
      
      await errorHandler.handle(error as Error, 'operation');
      throw error;
    }
  }, [errorHandler, circuitOpen, failureCount]);
  
  return { operation, circuitOpen };
}
```

### 3. Error Types and Classification

#### Error Categories
```typescript
export enum ErrorCategory {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface HookError extends Error {
  category: ErrorCategory;
  code?: string;
  details?: Record<string, any>;
  recoverable: boolean;
}

export function createHookError(
  message: string,
  category: ErrorCategory,
  options?: { code?: string; details?: Record<string, any>; recoverable?: boolean }
): HookError {
  const error = new Error(message) as HookError;
  error.category = category;
  error.code = options?.code;
  error.details = options?.details;
  error.recoverable = options?.recoverable ?? true;
  return error;
}
```

### 4. Error Recovery Strategies

#### Strategy 1: Retry with Backoff
```typescript
export const retryStrategy: ErrorRecoveryStrategy = {
  id: 'retry-backoff',
  condition: (error) => error.category === ErrorCategory.NETWORK || 
                     error.category === ErrorCategory.TIMEOUT,
  action: async (error, context) => {
    // Implement retry logic with exponential backoff
    return true;
  },
  description: 'Retry with exponential backoff',
  priority: 1,
  maxAttempts: 3,
};
```

#### Strategy 2: Fallback Data
```typescript
export const fallbackStrategy: ErrorRecoveryStrategy = {
  id: 'fallback-data',
  condition: () => true, // Always applicable
  action: async (error, context) => {
    // Return cached or default data
    return true;
  },
  description: 'Use fallback data',
  priority: 5,
  maxAttempts: 1,
};
```

#### Strategy 3: User Notification
```typescript
export const notificationStrategy: ErrorRecoveryStrategy = {
  id: 'user-notification',
  condition: (error) => error.category === ErrorCategory.AUTHENTICATION ||
                     error.category === ErrorCategory.AUTHORIZATION,
  action: async (error, context) => {
    // Show user notification
    return true;
  },
  description: 'Notify user of error',
  priority: 3,
  maxAttempts: 1,
};
```

### 5. Integration with Existing Hooks

#### Updating [`useErrorRecovery.ts`](client/src/hooks/useErrorRecovery.ts)
```typescript
// Enhanced with unified error handling
export function useErrorRecovery(operationId: string) {
  const errorHandler = createErrorHandler('useErrorRecovery');
  
  const recover = useCallback(async (): Promise<boolean> => {
    try {
      // Existing recovery logic
      const success = await executeRecoveryStrategies();
      return success;
    } catch (error) {
      await errorHandler.handle(error as Error, 'recover');
      return false;
    }
  }, [operationId, errorHandler]);
  
  return { recover };
}
```

#### Updating [`useOfflineDetection.tsx`](client/src/hooks/useOfflineDetection.tsx)
```typescript
// Enhanced with unified error handling
export function useOfflineDetection() {
  const errorHandler = createErrorHandler('useOfflineDetection');
  
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await performConnectionCheck();
    } catch (error) {
      await errorHandler.handle(error as Error, 'checkConnection');
      return false;
    }
  }, [errorHandler]);
  
  return { checkConnection };
}
```

### 6. Testing Error Handling

#### Error Handling Tests
```typescript
// __tests__/error-handling.test.ts
describe('Error Handling', () => {
  it('should handle network errors with retry', async () => {
    const errorHandler = createErrorHandler('test');
    
    const mockOperation = jest.fn().mockRejectedValueOnce(
      createHookError('Network error', ErrorCategory.NETWORK)
    ).mockResolvedValue('success');
    
    const result = await errorHandler.retry(mockOperation, 3);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
  
  it('should apply recovery strategies in priority order', async () => {
    const errorHandler = createErrorHandler('test');
    
    // Test strategy priority
    const strategies = errorHandler.strategies;
    expect(strategies[0].priority).toBeLessThan(strategies[1].priority);
  });
});
```

#### Hook Error Handling Tests
```typescript
// __tests__/use-example-error-handling.test.ts
describe('useExample Error Handling', () => {
  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useExample());
    
    // Mock error scenario
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    await act(async () => {
      await result.current.operation();
    });
    
    expect(result.current.error).toBeDefined();
    expect(result.current.isRecovering).toBe(false);
  });
});
```

### 7. Monitoring and Analytics

#### Error Tracking
```typescript
// Enhanced error tracking
export function trackError(error: Error, context: ErrorContext) {
  // Send to monitoring service
  analytics.track('hook_error', {
    hook: context.hookName,
    operation: context.operation,
    error_message: error.message,
    error_category: getErrorCategory(error),
    timestamp: context.timestamp,
  });
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`Hook Error [${context.hookName}]:`, error);
  }
}
```

#### Performance Monitoring
```typescript
// Monitor error rates and recovery success
export function monitorErrorRates() {
  const errorMetrics = {
    totalErrors: 0,
    recoverySuccessRate: 0,
    averageRecoveryTime: 0,
  };
  
  // Track metrics over time
  setInterval(() => {
    analytics.track('error_metrics', errorMetrics);
  }, 60000); // Every minute
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create error handling utilities
- [ ] Define error types and categories
- [ ] Implement basic error recovery strategies

### Phase 2: Integration (Week 2)
- [ ] Update high-priority hooks with unified error handling
- [ ] Add error handling to hooks with minimal/no error handling
- [ ] Create error handling tests

### Phase 3: Optimization (Week 3)
- [ ] Implement advanced recovery strategies
- [ ] Add error monitoring and analytics
- [ ] Optimize error handling performance

### Phase 4: Documentation (Week 4)
- [ ] Document error handling patterns
- [ ] Create error handling examples
- [ ] Update hook documentation

## Success Criteria

### Functional Requirements
- [ ] All hooks have consistent error handling
- [ ] Error recovery strategies are configurable
- [ ] Error handling is testable and maintainable
- [ ] Error tracking provides actionable insights

### Non-Functional Requirements
- [ ] Error handling adds < 5ms overhead
- [ ] Memory usage remains stable
- [ ] Error recovery success rate > 80%
- [ ] Developer experience improved

This unified error handling strategy ensures that all hooks handle errors consistently, provide meaningful recovery options, and maintain system reliability.
