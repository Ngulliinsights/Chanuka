/**
 * Loading utilities and performance monitoring
 * Consolidated from multiple implementations
 */

import { LoadingOperation, LoadingType, LoadingPriority, LoadingScenario, ProgressiveStage, RetryStrategy } from '@client/types';

// Predefined loading scenarios
export const LOADING_SCENARIOS: Record<string, LoadingScenario> = {
  PAGE_INITIAL: {
    id: 'page-initial',
    name: 'Initial Page Load',
    description: 'Loading the main page content and critical resources',
    defaultTimeout: 15000,
    retryStrategy: 'exponential',
    maxRetries: 2,
    priority: 'high',
    connectionAware: true,
    progressTracking: true,
    stages: [
      { id: 'html', message: 'Loading page structure...', duration: 2000 },
      { id: 'css', message: 'Loading styles...', duration: 1500 },
      { id: 'js', message: 'Loading scripts...', duration: 3000 },
      { id: 'data', message: 'Loading initial data...', duration: 2500 },
    ],
  },

  PAGE_NAVIGATION: {
    id: 'page-navigation',
    name: 'Page Navigation',
    description: 'Loading content when navigating between pages',
    defaultTimeout: 10000,
    retryStrategy: 'exponential',
    maxRetries: 2,
    priority: 'high',
    connectionAware: true,
    progressTracking: false,
  },

  COMPONENT_LAZY: {
    id: 'component-lazy',
    name: 'Lazy Component Loading',
    description: 'Loading components on demand',
    defaultTimeout: 8000,
    retryStrategy: 'linear',
    maxRetries: 1,
    priority: 'medium',
    connectionAware: true,
    progressTracking: false,
  },

  API_REQUEST: {
    id: 'api-request',
    name: 'API Request',
    description: 'Loading data from API endpoints',
    defaultTimeout: 12000,
    retryStrategy: 'exponential',
    maxRetries: 3,
    priority: 'medium',
    connectionAware: true,
    progressTracking: false,
  },

  FILE_UPLOAD: {
    id: 'file-upload',
    name: 'File Upload',
    description: 'Uploading files to the server',
    defaultTimeout: 60000,
    retryStrategy: 'linear',
    maxRetries: 2,
    priority: 'high',
    connectionAware: true,
    progressTracking: true,
    stages: [
      { id: 'prepare', message: 'Preparing file...', duration: 1000 },
      { id: 'upload', message: 'Uploading...', duration: 30000 },
      { id: 'process', message: 'Processing...', duration: 5000 },
      { id: 'complete', message: 'Finalizing...', duration: 1000 },
    ],
  },

  SEARCH_QUERY: {
    id: 'search-query',
    name: 'Search Query',
    description: 'Performing search operations',
    defaultTimeout: 8000,
    retryStrategy: 'linear',
    maxRetries: 2,
    priority: 'medium',
    connectionAware: true,
    progressTracking: false,
  },

  BACKGROUND_SYNC: {
    id: 'background-sync',
    name: 'Background Sync',
    description: 'Syncing data in the background',
    defaultTimeout: 30000,
    retryStrategy: 'exponential',
    maxRetries: 5,
    priority: 'low',
    connectionAware: true,
    progressTracking: false,
  },

  ASSET_PRELOAD: {
    id: 'asset-preload',
    name: 'Asset Preloading',
    description: 'Preloading assets for better performance',
    defaultTimeout: 20000,
    retryStrategy: 'linear',
    maxRetries: 1,
    priority: 'low',
    connectionAware: true,
    progressTracking: true,
  },
};

// Loading scenario builder
export class LoadingScenarioBuilder {
  private scenario: Partial<LoadingScenario> = {};

  static create(id: string): LoadingScenarioBuilder {
    const builder = new LoadingScenarioBuilder();
    builder.scenario.id = id;
    return builder;
  }

  name(name: string): LoadingScenarioBuilder {
    this.scenario.name = name;
    return this;
  }

  description(description: string): LoadingScenarioBuilder {
    this.scenario.description = description;
    return this;
  }

  timeout(timeout: number): LoadingScenarioBuilder {
    this.scenario.defaultTimeout = timeout;
    return this;
  }

  retryStrategy(strategy: RetryStrategy): LoadingScenarioBuilder {
    this.scenario.retryStrategy = strategy;
    return this;
  }

  maxRetries(maxRetries: number): LoadingScenarioBuilder {
    this.scenario.maxRetries = maxRetries;
    return this;
  }

  priority(priority: LoadingPriority): LoadingScenarioBuilder {
    this.scenario.priority = priority;
    return this;
  }

  connectionAware(aware: boolean = true): LoadingScenarioBuilder {
    this.scenario.connectionAware = aware;
    return this;
  }

  progressTracking(tracking: boolean = true): LoadingScenarioBuilder {
    this.scenario.progressTracking = tracking;
    return this;
  }

  stages(stages: ProgressiveStage[]): LoadingScenarioBuilder {
    this.scenario.stages = stages;
    return this;
  }

  build(): LoadingScenario {
    if (!this.scenario.id) {
      throw new Error('Scenario ID is required');
    }

    return {
      id: this.scenario.id,
      name: this.scenario.name || this.scenario.id,
      description: this.scenario.description || '',
      defaultTimeout: this.scenario.defaultTimeout || 10000,
      retryStrategy: this.scenario.retryStrategy || 'exponential',
      maxRetries: this.scenario.maxRetries || 2,
      priority: this.scenario.priority || 'medium',
      connectionAware: this.scenario.connectionAware ?? true,
      progressTracking: this.scenario.progressTracking ?? false,
      stages: this.scenario.stages,
    };
  }
}

// Create loading operation from scenario
export function createOperationFromScenario(
  scenario: LoadingScenario,
  instanceId: string,
  connectionInfo?: any
): Omit<LoadingOperation, 'startTime' | 'retryCount'> {
  const adjustedTimeout = connectionInfo
    ? getAdjustedTimeout(scenario.defaultTimeout, connectionInfo.connectionType)
    : scenario.defaultTimeout;

  const stageId = scenario.stages?.[0]?.id;

  return {
    id: `${scenario.id}-${instanceId}`,
    type: scenario.id.includes('page') ? 'page' :
          scenario.id.includes('component') ? 'component' :
          scenario.id.includes('api') ? 'api' : 'asset',
    message: scenario.description,
    priority: scenario.priority,
    timeout: adjustedTimeout,
    maxRetries: scenario.maxRetries,
    connectionAware: scenario.connectionAware,
    retryStrategy: scenario.retryStrategy,
    retryDelay: 1000,
    stage: stageId,
  };
}

// Create loading operation
export function createLoadingOperation(
  type: LoadingType,
  message: string,
  options: Partial<LoadingOperation> = {}
): LoadingOperation {
  const now = Date.now();

  return {
    id: options.id || `${type}_${now}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    priority: options.priority || 'medium',
    timeout: options.timeout || 30000,
    retryCount: 0,
    maxRetries: options.maxRetries || 3,
    startTime: now,
    connectionAware: options.connectionAware ?? true,
    retryStrategy: options.retryStrategy || 'exponential',
    retryDelay: options.retryDelay || 1000,
    error: options.error,
    progress: options.progress,
    stage: options.stage,
    estimatedTime: options.estimatedTime,
    timeoutWarningShown: false,
    cancelled: false,
    metadata: options.metadata,
  };
}

// Generate unique operation ID
export function generateOperationId(type: LoadingType, identifier: string): string {
  return `${type}-${identifier}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if operation has timed out
export function hasOperationTimedOut(operation: LoadingOperation, currentTime?: number): boolean {
  const now = currentTime || Date.now();
  const timeout = operation.timeout || 30000;
  return now - operation.startTime > timeout;
}

// Check if operation can retry
export function canRetryOperation(operation: LoadingOperation): boolean {
  return operation.retryCount < operation.maxRetries;
}

// Calculate retry delay
export function calculateRetryDelay(retryCount: number, strategy: RetryStrategy = 'exponential', baseDelay: number = 1000): number {
  switch (strategy) {
    case 'exponential':
      return baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
    case 'linear':
      return baseDelay * (retryCount + 1);
    case 'none':
      return 0;
    default:
      return baseDelay;
  }
}

// Get adjusted timeout based on connection
export function getAdjustedTimeout(baseTimeout: number, connectionType: string): number {
  switch (connectionType) {
    case 'slow':
      return baseTimeout * 2;
    case 'offline':
      return baseTimeout * 3;
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