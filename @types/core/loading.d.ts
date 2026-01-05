/**
 * Core loading type declarations
 */

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface LoadingOperation {
  id: string;
  type: 'page' | 'component' | 'data' | 'asset';
  message: string;
  progress?: number;
  startTime: number;
  retryCount?: number;
}

export interface LoadingConfig {
  showSpinner?: boolean;
  showProgress?: boolean;
  timeout?: number;
  retryAttempts?: number;
}
