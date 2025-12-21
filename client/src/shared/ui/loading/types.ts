/**
 * Loading component types and interfaces
 * Following navigation component patterns for type definitions
 */

export type LoadingSize = 'sm' | 'md' | 'lg';
export type LoadingType = 'page' | 'component' | 'inline' | 'progressive' | 'network-aware' | 'timeout-aware';
export type LoadingState = 'loading' | 'success' | 'error' | 'timeout' | 'offline';
export type LoadingPhase = 'preload' | 'critical' | 'lazy' | 'complete';
export type ConnectionType = 'slow' | 'fast' | 'offline';
export type LoadingPriority = 'low' | 'medium' | 'high';

export interface LoadingStateProps {
  className?: string;
  size?: LoadingSize;
  message?: string;
  showMessage?: boolean;
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  phase: LoadingPhase;
  currentAsset?: string;
}

export interface LoadingStage {
  id: string;
  message: string;
  duration?: number;
  retryable?: boolean;
}

export interface LoadingOperation {
  id: string;
  type: LoadingType;
  message: string;
  priority: LoadingPriority;
  progress?: number;
  stage?: string;
  error?: string; // Changed from Error to string to match usage
  startTime: number;
  timeout?: number;
  retryCount: number;
  maxRetries: number;
  connectionAware: boolean;
}

export interface LoadingStats {
  loaded: number;
  failed: number;
  connectionType: ConnectionType;
  isOnline: boolean;
}

export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
  enableCaching: boolean;
  priority: LoadingPriority;
  
  // Validation settings
  validation?: {
    enabled: boolean;
    strict: boolean;
    validateProgress: boolean;
  };
  
  // Error handling settings
  errorHandling?: {
    enableRecovery: boolean;
    maxRetries: number;
    retryDelay: number;
    fallbackComponent?: React.ComponentType;
  };
  
  // Performance settings
  performance?: {
    enableMemoization: boolean;
    debounceMs: number;
    maxConcurrentOperations: number;
  };
  
  // Display settings
  display?: {
    autoHide: boolean;
    autoHideDelay: number;
    showProgress: boolean;
    showDetails: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  };
}

export interface UseLoadingResult {
  // State
  isLoading: boolean;
  progress: LoadingProgress | null;
  error: Error | null;
  stats: LoadingStats;
  
  // Actions
  actions: {
    start: (operation: Partial<LoadingOperation>) => string;
    complete: (operationId: string) => void;
    fail: (operationId: string, error: Error) => void;
    retry: (operationId: string) => Promise<void>;
    cancel: (operationId: string) => void;
    reset: () => void;
  };
  
  // Recovery
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}

export interface ConnectionAwareLoaderProps extends LoadingStateProps {
  isOnline?: boolean;
  connectionType?: ConnectionType;
}

export interface ProgressiveLoaderProps {
  stages: LoadingStage[];
  currentStage: number;
  className?: string;
  onStageComplete?: (stageId: string) => void;
  onStageError?: (stageId: string, error: Error) => void;
  onRetryStage?: (stageId: string) => void;
  showRetryButton?: boolean;
  allowSkip?: boolean;
  onSkipStage?: (stageId: string) => void;
}

export interface TimeoutAwareLoaderProps extends LoadingStateProps {
  timeout?: number;
  onTimeout?: () => void;
  showTimeoutWarning?: boolean;
  timeoutMessage?: string;
}

export interface ConnectionInfo {
  isOnline: boolean;
  connectionType: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkAwareLoaderProps extends LoadingStateProps {
  showNetworkDetails?: boolean;
  adaptToConnection?: boolean;
  onConnectionChange?: (connectionInfo: ConnectionInfo) => void;
}

export interface LoadingStateManagerProps {
  type: LoadingType;
  state: LoadingState;
  message?: string;
  error?: Error;
  progress?: number;
  stages?: LoadingStage[];
  currentStage?: number;
  timeout?: number;
  onRetry?: () => void;
  onTimeout?: () => void;
  className?: string;
  size?: LoadingSize;
  showDetails?: boolean;
}

export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: 'fixed' | 'relative' | 'absolute';
}

export interface GlobalLoadingIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  showDetails?: boolean;
  showProgress?: boolean;
  showConnectionStatus?: boolean;
  maxVisible?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export interface LazyLoadPlaceholderProps {
  onRetry?: () => void;
  error?: Error | null;
  isLoading?: boolean;
  className?: string;
}

