/**
 * Loading Types - Complete definitions
 */

// Basic loading types
export type LoadingSize = 'sm' | 'md' | 'lg';
export type LoadingType = 'page' | 'component' | 'asset' | 'data' | 'network';
export type LoadingPriority = 'low' | 'medium' | 'high';
export type LoadingState = 'loading' | 'success' | 'error' | 'timeout' | 'offline';

// Core loading operation interface
export interface LoadingOperation {
  id: string;
  type: LoadingType;
  priority: LoadingPriority;
  startTime: number;
  timeout?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

// Loading configuration
export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
  enableCaching: boolean;
  priority: LoadingPriority;
  validation: {
    enabled: boolean;
    strict: boolean;
    validateProgress: boolean;
  };
  errorHandling: {
    enableRecovery: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  performance: {
    enableMemoization: boolean;
    debounceMs: number;
    maxConcurrentOperations: number;
  };
  display: {
    autoHide: boolean;
    autoHideDelay: number;
    showProgress: boolean;
    showDetails: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  };
}

// Loading props interface
export interface LoadingProps {
  size?: LoadingSize;
  type?: LoadingType;
  priority?: LoadingPriority;
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// Asset loading specific types
export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: 'fixed' | 'relative' | 'absolute';
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  phase: 'preload' | 'critical' | 'lazy' | 'complete';
  currentAsset?: string;
}

export interface LoadingStats {
  loaded: number;
  failed: number;
  isOnline: boolean;
  connectionType: 'fast' | 'slow' | 'offline';
}

export interface RecoveryState {
  canRecover: boolean;
  isRecovering: boolean;
  attempts: number;
  suggestions: string[];
}
export type ConnectionType = any; // Generated type - please implement

export type LoadingStage = any; // Generated type - please implement

export interface LoadingStateProps {
  // Generated interface
  [key: string]: any;
}

export interface ProgressiveLoaderProps {
  // Generated interface
  [key: string]: any;
}

export interface SkeletonProps {
  // Generated interface
  [key: string]: any;
}

export interface TimeoutAwareLoaderProps {
  // Generated interface
  [key: string]: any;
}

export type UseLoadingResult = any; // Generated type - please implement
