/**
 * Loading utilities and performance monitoring
 * Consolidated from multiple implementations
 */

import { LoadingOperation, LoadingConfig } from '@client/lib/types';

// Loading scenario type definition
export interface LoadingScenario {
  id: string;
  name: string;
  description: string;
  defaultTimeout: number;
  retryStrategy: 'exponential' | 'linear' | 'none';
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  connectionAware: boolean;
  progressTracking: boolean;
  stages?: Array<{ id: string; message: string; duration?: number }> | undefined;
}

// Predefined loading scenarios - mapped to LoadingConfig
export const LOADING_SCENARIOS: Record<string, LoadingConfig> = {
  PAGE_INITIAL: {
    timeout: 15000,
    retryDelay: 1000,
    maxRetries: 2,
    showProgress: true,
    enableCaching: false,
    priority: 'high',
  },

  PAGE_NAVIGATION: {
    timeout: 10000,
    retryDelay: 1000,
    maxRetries: 2,
    showProgress: false,
    enableCaching: true,
    priority: 'high',
  },

  COMPONENT_LAZY: {
    timeout: 8000,
    retryDelay: 500,
    maxRetries: 1,
    showProgress: false,
    enableCaching: true,
    priority: 'normal',
  },

  API_REQUEST: {
    timeout: 12000,
    retryDelay: 1000,
    maxRetries: 3,
    showProgress: false,
    enableCaching: true,
    priority: 'normal',
  },

  FILE_UPLOAD: {
    timeout: 60000,
    retryDelay: 1000,
    maxRetries: 2,
    showProgress: true,
    enableCaching: false,
    priority: 'high',
  },

  SEARCH_QUERY: {
    timeout: 8000,
    retryDelay: 500,
    maxRetries: 2,
    showProgress: false,
    enableCaching: true,
    priority: 'normal',
  },

  BACKGROUND_SYNC: {
    timeout: 30000,
    retryDelay: 2000,
    maxRetries: 5,
    showProgress: false,
    enableCaching: true,
    priority: 'low',
  },

  ASSET_PRELOAD: {
    timeout: 20000,
    retryDelay: 1000,
    maxRetries: 1,
    showProgress: true,
    enableCaching: true,
    priority: 'low',
  },
};

// Utility for creating loading operations from scenarios
export function createOperationFromScenario(
  scenario: LoadingScenario,
  instanceId: string
): LoadingOperation {
  const adjustedTimeout = getAdjustedTimeout(
    scenario.defaultTimeout,
    scenario.priority === 'high' ? 'high' : scenario.priority === 'low' ? 'low' : 'normal'
  );

  return {
    id: `${scenario.id}-${instanceId}`,
    type: scenario.id.includes('page')
      ? 'page'
      : scenario.id.includes('component')
        ? 'component'
        : scenario.id.includes('api')
          ? 'api'
          : 'asset',
    startTime: Date.now(),
    state: 'idle',
    retryCount: 0,
    maxRetries: scenario.maxRetries,
    priority: scenario.priority === 'high' ? 'high' : scenario.priority === 'low' ? 'low' : 'medium',
    retryStrategy: scenario.retryStrategy,
    retryDelay: 1000,
    connectionAware: scenario.connectionAware,
    timeoutWarningShown: false,
    cancelled: false,
    timeout: adjustedTimeout,
    metadata: {
      priority: scenario.priority,
      timeout: adjustedTimeout,
      retryStrategy: scenario.retryStrategy,
      connectionAware: scenario.connectionAware,
    },
  };
}

// Create loading operation from config
export function createOperationFromConfig(
  config: LoadingConfig,
  operationId: string
): LoadingOperation {
  return {
    id: operationId,
    type: 'data',
    startTime: Date.now(),
    state: 'idle',
    retryCount: 0,
    maxRetries: config.maxRetries,
    priority: config.priority === 'high' || config.priority === 'critical' ? 'high' : config.priority === 'low' ? 'low' : 'medium',
    retryStrategy: 'exponential',
    retryDelay: config.retryDelay,
    connectionAware: true,
    timeoutWarningShown: false,
    cancelled: false,
    timeout: config.timeout,
    metadata: {
      timeout: config.timeout,
      retryDelay: config.retryDelay,
      priority: config.priority,
      showProgress: config.showProgress,
    },
  };
}

// Create loading operation
export function createLoadingOperation(
  operationId: string,
  options: Partial<LoadingConfig> = {}
): LoadingOperation {
  const config: LoadingConfig = {
    timeout: options.timeout || 30000,
    retryDelay: options.retryDelay || 1000,
    maxRetries: options.maxRetries || 3,
    priority: options.priority || 'normal',
    showProgress: options.showProgress ?? false,
    enableCaching: options.enableCaching ?? false,
    cacheTimeout: options.cacheTimeout,
  };

  return {
    id: operationId,
    type: 'data',
    startTime: Date.now(),
    state: 'idle',
    retryCount: 0,
    maxRetries: config.maxRetries,
    priority: config.priority === 'high' || config.priority === 'critical' ? 'high' : config.priority === 'low' ? 'low' : 'medium',
    retryStrategy: 'exponential',
    retryDelay: config.retryDelay,
    connectionAware: true,
    timeoutWarningShown: false,
    cancelled: false,
    timeout: config.timeout,
    metadata: {
      timeout: config.timeout,
      retryDelay: config.retryDelay,
      priority: config.priority,
      showProgress: config.showProgress,
    },
  };
}

// Loading scenario builder
export class LoadingScenarioBuilder {
  private config: Partial<LoadingConfig> = {};

  static create(): LoadingScenarioBuilder {
    return new LoadingScenarioBuilder();
  }

  timeout(timeout: number): LoadingScenarioBuilder {
    this.config.timeout = timeout;
    return this;
  }

  retryDelay(delay: number): LoadingScenarioBuilder {
    this.config.retryDelay = delay;
    return this;
  }

  maxRetries(maxRetries: number): LoadingScenarioBuilder {
    this.config.maxRetries = maxRetries;
    return this;
  }

  priority(priority: 'low' | 'normal' | 'high' | 'critical'): LoadingScenarioBuilder {
    this.config.priority = priority;
    return this;
  }

  showProgress(show: boolean = true): LoadingScenarioBuilder {
    this.config.showProgress = show;
    return this;
  }

  enableCaching(enable: boolean = true): LoadingScenarioBuilder {
    this.config.enableCaching = enable;
    return this;
  }

  cacheTimeout(timeout: number): LoadingScenarioBuilder {
    this.config.cacheTimeout = timeout;
    return this;
  }

  build(): LoadingConfig {
    return {
      timeout: this.config.timeout || 10000,
      retryDelay: this.config.retryDelay || 1000,
      maxRetries: this.config.maxRetries || 2,
      priority: this.config.priority || 'normal',
      showProgress: this.config.showProgress ?? false,
      enableCaching: this.config.enableCaching ?? false,
      cacheTimeout: this.config.cacheTimeout,
    };
  }
}

// Check if operation has timed out
export function hasOperationTimedOut(
  operation: LoadingOperation,
  timeoutMs: number = 30000,
  currentTime?: Date
): boolean {
  const now = currentTime ? currentTime.getTime() : Date.now();
  const startTime = operation.startTime;
  const elapsed = now - startTime;
  return elapsed > timeoutMs;
}

// Calculate retry delay with exponential backoff
export function calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
}

// Get adjusted timeout based on priority
export function getAdjustedTimeout(
  baseTimeout: number,
  priority: 'low' | 'normal' | 'high' | 'critical'
): number {
  switch (priority) {
    case 'critical':
      return baseTimeout;
    case 'high':
      return baseTimeout * 1.25;
    case 'normal':
      return baseTimeout * 1.5;
    case 'low':
      return baseTimeout * 2;
    default:
      return baseTimeout;
  }
}

// Performance monitoring
export class LoadingPerformanceMonitor {
  private metrics: Array<{
    operationId: string;
    startTime: number;
    endTime?: number;
    success?: boolean;
    error?: string;
    retryCount: number;
    connectionType?: string;
  }> = [];

  startTracking(operationId: string, connectionType?: string): void {
    this.metrics.push({
      operationId,
      startTime: Date.now(),
      retryCount: 0,
      connectionType,
    });
  }

  endTracking(operationId: string, success: boolean, error?: string): void {
    const metric = this.metrics.find(m => m.operationId === operationId);
    if (metric) {
      metric.endTime = Date.now();
      metric.success = success;
      metric.error = error;
    }
  }

  recordRetry(operationId: string): void {
    const metric = this.metrics.find(m => m.operationId === operationId);
    if (metric) {
      metric.retryCount++;
    }
  }

  getMetrics() {
    return [...this.metrics];
  }

  getAverageLoadTime(): number {
    const completedMetrics = this.metrics.filter(m => m.endTime !== undefined);
    if (completedMetrics.length === 0) return 0;

    const totalTime = completedMetrics.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0);
    return totalTime / completedMetrics.length;
  }

  getSuccessRate(): number {
    const completedMetrics = this.metrics.filter(m => m.endTime !== undefined);
    if (completedMetrics.length === 0) return 0;

    const successfulMetrics = completedMetrics.filter(m => m.success === true);
    return successfulMetrics.length / completedMetrics.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const globalLoadingMonitor = new LoadingPerformanceMonitor();
