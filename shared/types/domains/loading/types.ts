/**
 * Loading Domain Types - Framework Agnostic
 * Core loading types that can be used across client and server
 */

// ============================================================================
// Core Enums & Types
// ============================================================================

export type LoadingState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'timeout'
  | 'cancelled'
  | 'refreshing'
  | 'offline';

export type ConnectionType = 
  | 'none' 
  | 'cellular' 
  | 'wifi' 
  | 'ethernet' 
  | 'bluetooth' 
  | 'other' 
  | 'unknown' 
  | 'slow' 
  | 'fast' 
  | 'offline';

export type LoadingType =
  | 'page'
  | 'component'
  | 'api'
  | 'asset'
  | 'progressive'
  | 'form'
  | 'navigation'
  | 'data'
  | 'network'
  | 'inline'
  | 'network-aware'
  | 'timeout-aware';

export type LoadingPriority = 'high' | 'medium' | 'low';
export type RetryStrategy = 'exponential' | 'linear' | 'none';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingPhase = 'initial' | 'loading' | 'complete' | 'error';

// ============================================================================
// Core Operation Interface
// ============================================================================

export interface LoadingOperation {
  readonly id: string;
  readonly type: LoadingType;
  readonly priority: LoadingPriority;
  readonly startTime: number;
  readonly endTime?: number;
  readonly timeout?: number;
  readonly estimatedTime?: number;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly retryStrategy: RetryStrategy;
  readonly retryDelay: number;
  readonly state: LoadingState;
  readonly message?: string;
  readonly error?: Error | string;
  readonly progress?: number;
  readonly stage?: string;
  readonly connectionAware: boolean;
  readonly dependencies?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly timeoutWarningShown: boolean;
  readonly cancelled: boolean;
  readonly description?: string;
}

// ============================================================================
// Connection & Network Types
// ============================================================================

export interface ConnectionInfo {
  type: ConnectionType;
  online: boolean;
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastChecked?: number;
}

export interface AdaptiveSettings {
  enableAnimations: boolean;
  maxConcurrentOperations: number;
  defaultTimeout: number;
  retryDelay: number;
  timeoutWarningThreshold: number;
  connectionMultiplier: number;
}

// ============================================================================
// Asset Loading
// ============================================================================

export type AssetLoadingStatus = 'pending' | 'loading' | 'complete' | 'error';

export interface AssetLoadingProgress {
  loaded: number;
  total: number;
  phase: string;
  currentAsset?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
  status: AssetLoadingStatus;
  error?: string;
}

// ============================================================================
// Metrics & Statistics
// ============================================================================

export type ConnectionImpact = 'high' | 'medium' | 'low';

export interface LoadingMetrics {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageLoadTime: number;
  retryRate: number;
  successRate: number;
  connectionImpact: ConnectionImpact;
  lastUpdate: number;
  currentQueueLength: number;
  peakQueueLength: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type LoadingConfigPriority = 'low' | 'normal' | 'high' | 'critical';

export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
  enableCaching: boolean;
  cacheTimeout?: number;
  priority: LoadingConfigPriority;
  dependencies?: readonly string[];
}

export interface LoadingOptions {
  timeout?: number;
  retryLimit?: number;
  retryDelay?: number;
  retryStrategy?: RetryStrategy;
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
  priority?: LoadingPriority;
  type?: LoadingType;
  message?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Progressive Loading
// ============================================================================

export interface ProgressiveStage {
  readonly id: string;
  readonly message: string;
  readonly duration?: number;
  readonly progress?: number;
  readonly retryable?: boolean;
}

export type LoadingScenarioType =
  | 'initial'
  | 'paginated'
  | 'infinite-scroll'
  | 'real-time'
  | 'batch';

export interface LoadingScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultTimeout: number;
  readonly retryStrategy: RetryStrategy;
  readonly maxRetries: number;
  readonly priority: LoadingPriority;
  readonly connectionAware: boolean;
  readonly progressTracking: boolean;
  readonly stages?: readonly ProgressiveStage[];
}

// ============================================================================
// Error Classes
// ============================================================================

export class LoadingError extends Error {
  constructor(
    public readonly operationId: string,
    message: string,
    public readonly code?: string,
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'LoadingError';
    Object.setPrototypeOf(this, LoadingError.prototype);
  }
}

export class LoadingTimeoutError extends LoadingError {
  constructor(
    operationId: string,
    public readonly timeout: number,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(operationId, `Operation timed out after ${timeout}ms`, 'TIMEOUT', metadata);
    this.name = 'LoadingTimeoutError';
    Object.setPrototypeOf(this, LoadingTimeoutError.prototype);
  }
}

export class LoadingRetryError extends LoadingError {
  constructor(
    operationId: string,
    public readonly retryCount: number,
    public readonly maxRetries: number,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(
      operationId,
      `Maximum retry attempts (${maxRetries}) reached`,
      'MAX_RETRIES',
      metadata
    );
    this.name = 'LoadingRetryError';
    Object.setPrototypeOf(this, LoadingRetryError.prototype);
  }
}

export class LoadingConnectionError extends LoadingError {
  constructor(
    operationId: string,
    public readonly connectionType: ConnectionType,
    metadata?: Readonly<Record<string, unknown>>
  ) {
    super(
      operationId,
      `Operation failed due to connection (${connectionType})`,
      'CONNECTION',
      metadata
    );
    this.name = 'LoadingConnectionError';
    Object.setPrototypeOf(this, LoadingConnectionError.prototype);
  }
}

// ============================================================================
// Domain Metadata
// ============================================================================

export const LOADING_DOMAIN_VERSION = '1.0.0' as const;
export const LOADING_DOMAIN_DESCRIPTION = 'Standardized loading system types' as const;
