export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingOperation {
  id: string;
  type: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  progress?: number;
  state: LoadingState;
  error?: string;
  retryCount: number;
  maxRetries: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ConnectionInfo {
  online: boolean;
  connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'none';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  lastChecked: Date;
}

export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
  enableCaching: boolean;
  cacheTimeout?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  dependencies?: string[];
}

export interface LoadingQueue {
  id: string;
  operations: LoadingOperation[];
  concurrentLimit: number;
  priority: 'low' | 'normal' | 'high';
  paused: boolean;
  createdAt: Date;
}

export interface LoadingMetrics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageDuration: number;
  successRate: number;
  currentQueueLength: number;
  peakQueueLength: number;
}

export interface LoadingContext {
  userId?: string;
  sessionId: string;
  deviceId?: string;
  networkInfo: ConnectionInfo;
  timestamp: Date;
  userAgent?: string;
}

export interface LoadingStrategy {
  id: string;
  name: string;
  description: string;
  conditions: LoadingCondition[];
  actions: LoadingAction[];
  priority: number;
  enabled: boolean;
}

export interface LoadingCondition {
  type: 'network' | 'device' | 'user' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: any;
  field?: string;
}

export interface LoadingAction {
  type: 'retry' | 'fallback' | 'cancel' | 'prioritize' | 'delay' | 'cache';
  parameters?: Record<string, any>;
}

export interface LoadingBatch {
  id: string;
  operations: LoadingOperation[];
  strategy: LoadingStrategy;
  status: LoadingState;
  results: LoadingResult[];
  startedAt: Date;
  completedAt?: Date;
}

export interface LoadingResult {
  operationId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  retries: number;
}