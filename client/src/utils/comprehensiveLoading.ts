import { LoadingOperation } from '../contexts/LoadingContext';
import { logger } from '@shared/core';

// Utility functions for comprehensive loading management

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
  stages?: Array<{ id: string; message: string; duration?: number }>;
}

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

// Connection-aware timeout adjustments
export function getAdjustedTimeout(
  baseTimeout: number,
  connectionType: 'fast' | 'slow' | 'offline' | 'unknown'
): number {
  switch (connectionType) {
    case 'slow':
      return baseTimeout * 2;
    case 'offline':
      return baseTimeout * 3;
    case 'unknown':
      return baseTimeout * 1.5;
    default:
      return baseTimeout;
  }
}

// Retry delay calculation
export function calculateRetryDelay(
  retryCount: number,
  strategy: 'exponential' | 'linear' | 'none',
  baseDelay: number = 1000
): number {
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

// Priority-based operation sorting
export function sortOperationsByPriority(operations: LoadingOperation[]): LoadingOperation[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  return operations.sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by start time (older first)
    return a.startTime - b.startTime;
  });
}

// Connection-aware operation filtering
export function filterOperationsByConnection(
  operations: LoadingOperation[],
  connectionType: 'fast' | 'slow' | 'offline' | 'unknown',
  isOnline: boolean
): LoadingOperation[] {
  if (!isOnline) {
    // Only allow high priority operations when offline
    return operations.filter(op => op.priority === 'high');
  }
  
  if (connectionType === 'slow') {
    // Skip low priority operations on slow connections
    return operations.filter(op => op.priority !== 'low');
  }
  
  return operations;
}

// Loading state analysis
export interface LoadingAnalysis {
  totalOperations: number;
  operationsByType: Record<string, number>;
  operationsByPriority: Record<string, number>;
  averageLoadTime: number;
  longestRunningOperation: LoadingOperation | null;
  failedOperations: number;
  retryRate: number;
  connectionImpact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export function analyzeLoadingPerformance(
  operations: LoadingOperation[],
  completedOperations: Array<LoadingOperation & { completedAt: number; success: boolean }>,
  connectionInfo: any
): LoadingAnalysis {
  const now = Date.now();
  
  // Basic counts
  const totalOperations = operations.length;
  const operationsByType = operations.reduce((acc, op) => {
    acc[op.type] = (acc[op.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const operationsByPriority = operations.reduce((acc, op) => {
    acc[op.priority] = (acc[op.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Performance metrics
  const completedLoadTimes = completedOperations.map(op => op.completedAt - op.startTime);
  const averageLoadTime = completedLoadTimes.length > 0 
    ? completedLoadTimes.reduce((sum, time) => sum + time, 0) / completedLoadTimes.length
    : 0;
  
  const longestRunningOperation = operations.reduce((longest, current) => {
    const currentRunTime = now - current.startTime;
    const longestRunTime = longest ? now - longest.startTime : 0;
    return currentRunTime > longestRunTime ? current : longest;
  }, null as LoadingOperation | null);
  
  const failedOperations = completedOperations.filter(op => !op.success).length;
  const totalRetries = operations.reduce((sum, op) => sum + op.retryCount, 0);
  const retryRate = totalOperations > 0 ? totalRetries / totalOperations : 0;
  
  // Connection impact assessment
  let connectionImpact: 'high' | 'medium' | 'low' = 'low';
  if (connectionInfo?.connectionType === 'slow' || !connectionInfo?.isOnline) {
    connectionImpact = 'high';
  } else if (connectionInfo?.connectionType === '3g') {
    connectionImpact = 'medium';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (averageLoadTime > 5000) {
    recommendations.push('Consider optimizing loading times - average is above 5 seconds');
  }
  
  if (retryRate > 0.3) {
    recommendations.push('High retry rate detected - check network stability and error handling');
  }
  
  if (operationsByPriority.low > operationsByPriority.high * 2) {
    recommendations.push('Consider reducing low-priority operations during peak usage');
  }
  
  if (connectionImpact === 'high') {
    recommendations.push('Implement more aggressive connection-aware optimizations');
  }
  
  if (failedOperations > totalOperations * 0.1) {
    recommendations.push('High failure rate - review error handling and fallback strategies');
  }
  
  return {
    totalOperations,
    operationsByType,
    operationsByPriority,
    averageLoadTime,
    longestRunningOperation,
    failedOperations,
    retryRate,
    connectionImpact,
    recommendations,
  };
}

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
  
  retryStrategy(strategy: 'exponential' | 'linear' | 'none'): LoadingScenarioBuilder {
    this.scenario.retryStrategy = strategy;
    return this;
  }
  
  maxRetries(maxRetries: number): LoadingScenarioBuilder {
    this.scenario.maxRetries = maxRetries;
    return this;
  }
  
  priority(priority: 'high' | 'medium' | 'low'): LoadingScenarioBuilder {
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
  
  stages(stages: Array<{ id: string; message: string; duration?: number }>): LoadingScenarioBuilder {
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

// Utility for creating loading operations from scenarios
export function createOperationFromScenario(
  scenario: LoadingScenario,
  instanceId: string,
  connectionInfo?: any
): Omit<LoadingOperation, 'startTime' | 'retryCount'> {
  const adjustedTimeout = connectionInfo 
    ? getAdjustedTimeout(scenario.defaultTimeout, connectionInfo.connectionType)
    : scenario.defaultTimeout;
  
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
    stage: scenario.stages?.[0]?.id,
  };
}

// Performance monitoring utilities
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
  
  startTracking(operationId: string, connectionType?: string) {
    this.metrics.push({
      operationId,
      startTime: Date.now(),
      retryCount: 0,
      connectionType,
    });
  }
  
  endTracking(operationId: string, success: boolean, error?: string) {
    const metric = this.metrics.find(m => m.operationId === operationId);
    if (metric) {
      metric.endTime = Date.now();
      metric.success = success;
      metric.error = error;
    }
  }
  
  recordRetry(operationId: string) {
    const metric = this.metrics.find(m => m.operationId === operationId);
    if (metric) {
      metric.retryCount++;
    }
  }
  
  getMetrics() {
    return [...this.metrics];
  }
  
  getAverageLoadTime(): number {
    const completedMetrics = this.metrics.filter(m => m.endTime);
    if (completedMetrics.length === 0) return 0;
    
    const totalTime = completedMetrics.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0);
    return totalTime / completedMetrics.length;
  }
  
  getSuccessRate(): number {
    const completedMetrics = this.metrics.filter(m => m.endTime);
    if (completedMetrics.length === 0) return 0;
    
    const successfulMetrics = completedMetrics.filter(m => m.success);
    return successfulMetrics.length / completedMetrics.length;
  }
  
  clear() {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const globalLoadingMonitor = new LoadingPerformanceMonitor();

// Utility functions for common loading patterns
export const LoadingUtils = {
  // Create a page loading operation
  createPageLoading: (pageId: string, connectionInfo?: any) => 
    createOperationFromScenario(LOADING_SCENARIOS.PAGE_INITIAL, pageId, connectionInfo),
  
  // Create an API loading operation
  createApiLoading: (apiId: string, connectionInfo?: any) => 
    createOperationFromScenario(LOADING_SCENARIOS.API_REQUEST, apiId, connectionInfo),
  
  // Create a component loading operation
  createComponentLoading: (componentId: string, connectionInfo?: any) => 
    createOperationFromScenario(LOADING_SCENARIOS.COMPONENT_LAZY, componentId, connectionInfo),
  
  // Check if operation should be delayed based on connection
  shouldDelayOperation: (priority: 'high' | 'medium' | 'low', connectionType: string, isOnline: boolean): boolean => {
    if (!isOnline && priority !== 'high') return true;
    if (connectionType === 'slow' && priority === 'low') return true;
    return false;
  },
  
  // Get optimal batch size for operations based on connection
  getOptimalBatchSize: (connectionType: string): number => {
    switch (connectionType) {
      case 'slow': return 1;
      case '3g': return 2;
      case '4g': return 4;
      default: return 3;
    }
  },
  
  // Format loading time for display
  formatLoadingTime: (milliseconds: number): string => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  },
};











































