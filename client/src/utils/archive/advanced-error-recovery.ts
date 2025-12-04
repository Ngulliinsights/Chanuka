/**
 * Advanced Error Recovery System
 * 
 * Provides intelligent error recovery strategies with machine learning-like
 * adaptation, circuit breakers, and contextual recovery decisions.
 */

import { AppError, ErrorDomain, ErrorSeverity, ErrorRecoveryStrategy } from './errors';

// Recovery strategy with success tracking
export interface SmartRecoveryStrategy extends ErrorRecoveryStrategy {
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  lastUsed: number;
  adaptiveThreshold: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  circuitBreakerFailures: number;
  circuitBreakerLastFailure: number;
}

// Recovery context with environmental factors
export interface RecoveryContext {
  networkCondition: 'good' | 'poor' | 'offline';
  userBehavior: 'active' | 'idle' | 'frustrated';
  systemLoad: 'low' | 'medium' | 'high';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  errorFrequency: 'low' | 'medium' | 'high';
  userType: 'new' | 'returning' | 'power';
}

// Recovery decision engine
export class SmartRecoveryEngine {
  private strategies: Map<string, SmartRecoveryStrategy> = new Map();
  private recoveryHistory: Array<{
    errorId: string;
    strategyId: string;
    success: boolean;
    timestamp: number;
    context: RecoveryContext;
  }> = [];
  private maxHistorySize = 1000;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 30000; // 30 seconds

  constructor() {
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies(): void {
    // Network retry with exponential backoff
    this.addStrategy({
      id: 'smart-network-retry',
      name: 'Smart Network Retry',
      description: 'Adaptive network retry with circuit breaker',
      canRecover: (error) => error.type === ErrorDomain.NETWORK,
      recover: async (error) => {
        const delay = Math.min(1000 * Math.pow(2, error.retryCount || 0), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return false; // Let caller retry
      },
      priority: 1,
      successRate: 0.7,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastUsed: 0,
      adaptiveThreshold: 0.5,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
      circuitBreakerLastFailure: 0,
    });

    // Authentication token refresh
    this.addStrategy({
      id: 'smart-auth-refresh',
      name: 'Smart Auth Refresh',
      description: 'Intelligent token refresh with user context',
      canRecover: (error) => error.type === ErrorDomain.AUTHENTICATION,
      recover: async (_error) => {
        try {
          // Attempt token refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) return false;

          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { accessToken } = await response.json();
            localStorage.setItem('accessToken', accessToken);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      priority: 2,
      successRate: 0.8,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastUsed: 0,
      adaptiveThreshold: 0.6,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
      circuitBreakerLastFailure: 0,
    });

    // Cache fallback strategy
    this.addStrategy({
      id: 'cache-fallback',
      name: 'Cache Fallback',
      description: 'Use cached data when network fails',
      canRecover: (error) => error.type === ErrorDomain.NETWORK,
      recover: async (error) => {
        try {
          const cacheKey = error.context?.cacheKey;
          if (!cacheKey) return false;

          const cached = localStorage.getItem(`cache_${cacheKey}`);
          if (cached) {
            // Emit cached data event
            window.dispatchEvent(new CustomEvent('cached-data-used', {
              detail: { cacheKey, data: JSON.parse(cached) }
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      priority: 3,
      successRate: 0.6,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastUsed: 0,
      adaptiveThreshold: 0.4,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
      circuitBreakerLastFailure: 0,
    });

    // User guidance strategy
    this.addStrategy({
      id: 'user-guidance',
      name: 'User Guidance',
      description: 'Provide contextual help to users',
      canRecover: (error) => error.severity !== ErrorSeverity.CRITICAL,
      recover: async (error) => {
        // Show contextual help based on error type
        const guidance = this.getContextualGuidance(error);
        if (guidance) {
          window.dispatchEvent(new CustomEvent('show-user-guidance', {
            detail: { error, guidance }
          }));
          return true;
        }
        return false;
      },
      priority: 4,
      successRate: 0.9,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastUsed: 0,
      adaptiveThreshold: 0.8,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
      circuitBreakerLastFailure: 0,
    });
  }

  addStrategy(strategy: SmartRecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  async attemptRecovery(error: AppError, context?: RecoveryContext): Promise<boolean> {
    const applicableStrategies = this.getApplicableStrategies(error, context);
    
    for (const strategy of applicableStrategies) {
      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(strategy)) {
        continue;
      }

      try {
        const startTime = Date.now();
        const success = await strategy.recover(error);
        
        // Update strategy metrics
        this.updateStrategyMetrics(strategy, success, startTime);
        
        // Record recovery attempt
        this.recordRecoveryAttempt(error.id, strategy.id, success, context);
        
        if (success) {
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.id} failed:`, recoveryError);
        this.updateStrategyMetrics(strategy, false, Date.now());
        this.updateCircuitBreaker(strategy, false);
      }
    }

    return false;
  }

  private getApplicableStrategies(error: AppError, context?: RecoveryContext): SmartRecoveryStrategy[] {
    const strategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canRecover(error))
      .filter(strategy => this.shouldUseStrategy(strategy, error, context))
      .sort((a, b) => {
        // Sort by adaptive priority (success rate + base priority)
        const aPriority = a.priority + (a.successRate * 2);
        const bPriority = b.priority + (b.successRate * 2);
        return bPriority - aPriority;
      });

    return strategies;
  }

  private shouldUseStrategy(strategy: SmartRecoveryStrategy, _error: AppError, context?: RecoveryContext): boolean {
    // Don't use strategy if success rate is too low
    if (strategy.totalAttempts > 10 && strategy.successRate < strategy.adaptiveThreshold) {
      return false;
    }

    // Context-based decisions
    if (context) {
      // Don't retry network operations if offline
      if (context.networkCondition === 'offline' && strategy.id === 'smart-network-retry') {
        return false;
      }

      // Use cache fallback more aggressively for frustrated users
      if (context.userBehavior === 'frustrated' && strategy.id === 'cache-fallback') {
        return true;
      }

      // Limit retries during high system load
      if (context.systemLoad === 'high' && strategy.id.includes('retry')) {
        return strategy.successRate > 0.8;
      }
    }

    return true;
  }

  private isCircuitBreakerClosed(strategy: SmartRecoveryStrategy): boolean {
    const now = Date.now();
    
    switch (strategy.circuitBreakerState) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        // Check if timeout has passed
        if (now - strategy.circuitBreakerLastFailure > this.circuitBreakerTimeout) {
          strategy.circuitBreakerState = 'HALF_OPEN';
          return true;
        }
        return false;
      case 'HALF_OPEN':
        return true;
      default:
        return true;
    }
  }

  private updateCircuitBreaker(strategy: SmartRecoveryStrategy, success: boolean): void {
    if (success) {
      if (strategy.circuitBreakerState === 'HALF_OPEN') {
        strategy.circuitBreakerState = 'CLOSED';
        strategy.circuitBreakerFailures = 0;
      }
    } else {
      strategy.circuitBreakerFailures++;
      strategy.circuitBreakerLastFailure = Date.now();
      
      if (strategy.circuitBreakerFailures >= this.circuitBreakerThreshold) {
        strategy.circuitBreakerState = 'OPEN';
      }
    }
  }

  private updateStrategyMetrics(strategy: SmartRecoveryStrategy, success: boolean, startTime: number): void {
    strategy.totalAttempts++;
    strategy.lastUsed = startTime;
    
    if (success) {
      strategy.successfulAttempts++;
    }
    
    strategy.successRate = strategy.successfulAttempts / strategy.totalAttempts;
  }

  private recordRecoveryAttempt(
    errorId: string,
    strategyId: string,
    success: boolean,
    context?: RecoveryContext
  ): void {
    this.recoveryHistory.push({
      errorId,
      strategyId,
      success,
      timestamp: Date.now(),
      context: context || this.getDefaultContext(),
    });

    // Maintain history size
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.maxHistorySize);
    }
  }

  private getDefaultContext(): RecoveryContext {
    return {
      networkCondition: navigator.onLine ? 'good' : 'offline',
      userBehavior: 'active',
      systemLoad: 'medium',
      timeOfDay: this.getTimeOfDay(),
      errorFrequency: 'low',
      userType: 'returning',
    };
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getContextualGuidance(error: AppError): string | null {
    switch (error.type) {
      case ErrorDomain.NETWORK:
        return 'Check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.';
      case ErrorDomain.AUTHENTICATION:
        return 'Your session may have expired. Please try logging in again.';
      case ErrorDomain.VALIDATION:
        return 'Please check your input and make sure all required fields are filled correctly.';
      case ErrorDomain.AUTHORIZATION:
        return 'You may not have permission to perform this action. Contact your administrator if you believe this is an error.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem continues.';
    }
  }

  // Analytics and insights
  getStrategyPerformance(): Array<{
    id: string;
    name: string;
    successRate: number;
    totalAttempts: number;
    averageResponseTime: number;
    circuitBreakerState: string;
  }> {
    return Array.from(this.strategies.values()).map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      successRate: strategy.successRate,
      totalAttempts: strategy.totalAttempts,
      averageResponseTime: this.calculateAverageResponseTime(strategy.id),
      circuitBreakerState: strategy.circuitBreakerState,
    }));
  }

  private calculateAverageResponseTime(strategyId: string): number {
    const attempts = this.recoveryHistory.filter(h => h.strategyId === strategyId);
    if (attempts.length === 0) return 0;
    
    // This is a simplified calculation - in practice, you'd track actual response times
    return attempts.reduce((sum, attempt) => sum + (attempt.success ? 100 : 500), 0) / attempts.length;
  }

  getRecoveryInsights(): {
    totalRecoveries: number;
    successRate: number;
    mostSuccessfulStrategy: string;
    commonFailurePatterns: Array<{ pattern: string; count: number }>;
  } {
    const totalRecoveries = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(h => h.success).length;
    const successRate = totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0;

    // Find most successful strategy
    const strategySuccesses = new Map<string, number>();
    this.recoveryHistory.forEach(h => {
      if (h.success) {
        strategySuccesses.set(h.strategyId, (strategySuccesses.get(h.strategyId) || 0) + 1);
      }
    });

    const mostSuccessfulStrategy = Array.from(strategySuccesses.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Analyze failure patterns (simplified)
    const failurePatterns = new Map<string, number>();
    this.recoveryHistory.filter(h => !h.success).forEach(h => {
      const pattern = `${h.context.networkCondition}-${h.context.userBehavior}`;
      failurePatterns.set(pattern, (failurePatterns.get(pattern) || 0) + 1);
    });

    const commonFailurePatterns = Array.from(failurePatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRecoveries,
      successRate,
      mostSuccessfulStrategy,
      commonFailurePatterns,
    };
  }

  // Configuration
  configure(options: {
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
    maxHistorySize?: number;
  }): void {
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? this.circuitBreakerThreshold;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout ?? this.circuitBreakerTimeout;
    this.maxHistorySize = options.maxHistorySize ?? this.maxHistorySize;
  }

  reset(): void {
    this.recoveryHistory = [];
    this.strategies.forEach(strategy => {
      strategy.totalAttempts = 0;
      strategy.successfulAttempts = 0;
      strategy.successRate = 0;
      strategy.circuitBreakerState = 'CLOSED';
      strategy.circuitBreakerFailures = 0;
    });
  }
}

// Global smart recovery engine
export const smartRecoveryEngine = new SmartRecoveryEngine();

// React hook for smart recovery
export function useSmartRecovery() {
  return {
    attemptRecovery: smartRecoveryEngine.attemptRecovery.bind(smartRecoveryEngine),
    getStrategyPerformance: smartRecoveryEngine.getStrategyPerformance.bind(smartRecoveryEngine),
    getRecoveryInsights: smartRecoveryEngine.getRecoveryInsights.bind(smartRecoveryEngine),
    addStrategy: smartRecoveryEngine.addStrategy.bind(smartRecoveryEngine),
    removeStrategy: smartRecoveryEngine.removeStrategy.bind(smartRecoveryEngine),
  };
}