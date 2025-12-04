/**
 * Loading recovery utilities
 * Following navigation component patterns for recovery handling
 */

import { LoadingConfig, ConnectionType } from '@client/types';

import { LoadingError, LoadingTimeoutError, LoadingNetworkError, isRetryableError } from './errors';

export interface RecoveryContext {
  operationId: string;
  error: LoadingError;
  retryCount: number;
  config: LoadingConfig;
  connectionInfo: {
    isOnline: boolean;
    connectionType: ConnectionType;
  };
}

export interface RecoveryResult {
  success: boolean;
  delay?: number;
  strategy?: string;
}

export function createRecoveryContext(
  operationId: string,
  error: LoadingError,
  retryCount: number,
  config: LoadingConfig,
  connectionInfo: { isOnline: boolean; connectionType: ConnectionType }
): RecoveryContext {
  return {
    operationId,
    error,
    retryCount,
    config,
    connectionInfo,
  };
}

export class LoadingRecoveryManager {
  private strategies: Map<string, (context: RecoveryContext) => Promise<RecoveryResult>> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies() {
    // Timeout recovery strategy
    this.strategies.set('timeout', async (context) => {
      if (context.error instanceof LoadingTimeoutError) {
        const delay = Math.min(context.config.errorHandling.retryDelay * (context.retryCount + 1), 10000);
        return { success: true, delay, strategy: 'timeout-backoff' };
      }
      return { success: false };
    });

    // Network recovery strategy
    this.strategies.set('network', async (context) => {
      if (context.error instanceof LoadingNetworkError) {
        if (!context.connectionInfo.isOnline) {
          return { success: false, strategy: 'offline' };
        }
        
        const delay = context.connectionInfo.connectionType === 'slow' ? 5000 : 2000;
        return { success: true, delay, strategy: 'network-wait' };
      }
      return { success: false };
    });

    // Generic retry strategy
    this.strategies.set('generic', async (context) => {
      if (isRetryableError(context.error) && context.retryCount < context.config.errorHandling.maxRetries) {
        const delay = context.config.errorHandling.retryDelay;
        return { success: true, delay, strategy: 'generic-retry' };
      }
      return { success: false };
    });
  }

  async attemptRecovery(context: RecoveryContext): Promise<RecoveryResult> {
    for (const [name, strategy] of this.strategies) {
      try {
        const result = await strategy(context);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`Recovery strategy ${name} failed:`, error);
      }
    }

    return { success: false };
  }

  canAttemptRecovery(error: LoadingError, retryCount: number, maxRetries: number): boolean {
    return isRetryableError(error) && retryCount < maxRetries;
  }

  getSuggestions(error: LoadingError): string[] {
    if (error instanceof LoadingTimeoutError) {
      return ['Check your internet connection', 'Try again in a moment'];
    }
    
    if (error instanceof LoadingNetworkError) {
      return ['Check your network connection', 'Try switching networks'];
    }
    
    return ['Try refreshing the page', 'Check your connection'];
  }
}

export function useLoadingRecovery(config: LoadingConfig) {
  const manager = new LoadingRecoveryManager();
  
  return {
    attemptRecovery: (context: RecoveryContext) => manager.attemptRecovery(context),
    canAttemptRecovery: (error: LoadingError, retryCount: number, maxRetries: number) => 
      manager.canAttemptRecovery(error, retryCount, maxRetries),
    getSuggestions: (error: LoadingError) => manager.getSuggestions(error),
  };
}

