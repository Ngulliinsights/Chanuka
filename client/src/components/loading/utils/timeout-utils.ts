/**
 * Timeout management utilities for loading components
 * Following navigation component patterns for utility organization
 */

import { LoadingOperation } from '@client/types';
import { LOADING_TIMEOUTS } from '@client/constants';

export interface TimeoutConfig {
  timeout: number;
  warningThreshold?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
}

export interface TimeoutManager {
  start(): void;
  stop(): void;
  reset(): void;
  extend(additionalTime: number): void;
  getRemainingTime(): number;
  getElapsedTime(): number;
  isWarningTriggered(): boolean;
  hasTimedOut(): boolean;
}

/**
 * Create a timeout manager for loading operations
 */
export function createTimeoutManager(config: TimeoutConfig): TimeoutManager {
  let startTime: number = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let warningId: NodeJS.Timeout | null = null;
  let isWarningTriggered = false;
  let hasTimedOut = false;

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (warningId) {
      clearTimeout(warningId);
      warningId = null;
    }
  };

  const triggerWarning = () => {
    isWarningTriggered = true;
    config.onWarning?.();
  };

  const triggerTimeout = () => {
    hasTimedOut = true;
    cleanup();
    config.onTimeout?.();
  };

  return {
    start: () => {
      cleanup();
      startTime = Date.now();
      isWarningTriggered = false;
      hasTimedOut = false;

      // Set timeout
      timeoutId = setTimeout(triggerTimeout, config.timeout);

      // Set warning if configured
      if (config.warningThreshold && config.onWarning) {
        warningId = setTimeout(triggerWarning, config.warningThreshold);
      }
    },

    stop: () => {
      cleanup();
    },

    reset: () => {
      cleanup();
      startTime = Date.now();
      isWarningTriggered = false;
      hasTimedOut = false;

      // Restart timers
      timeoutId = setTimeout(triggerTimeout, config.timeout);
      if (config.warningThreshold && config.onWarning) {
        warningId = setTimeout(triggerWarning, config.warningThreshold);
      }
    },

    extend: (additionalTime: number) => {
      if (hasTimedOut) return;

      cleanup();
      const elapsed = Date.now() - startTime;
      const remainingTime = config.timeout - elapsed + additionalTime;

      if (remainingTime > 0) {
        timeoutId = setTimeout(triggerTimeout, remainingTime);

        // Reset warning if not triggered yet
        if (!isWarningTriggered && config.warningThreshold && config.onWarning) {
          const warningTime = config.warningThreshold - elapsed + additionalTime;
          if (warningTime > 0) {
            warningId = setTimeout(triggerWarning, warningTime);
          }
        }
      } else {
        triggerTimeout();
      }
    },

    getRemainingTime: () => {
      if (hasTimedOut || startTime === 0) return 0;
      const elapsed = Date.now() - startTime;
      return Math.max(0, config.timeout - elapsed);
    },

    getElapsedTime: () => {
      if (startTime === 0) return 0;
      return Date.now() - startTime;
    },

    isWarningTriggered: () => isWarningTriggered,
    hasTimedOut: () => hasTimedOut,
  };
}

/**
 * Adaptive timeout utilities
 */

export function calculateAdaptiveTimeout(
  baseTimeout: number,
  retryCount: number,
  connectionType: 'fast' | 'slow' | 'offline' = 'fast'
): number {
  let timeout = baseTimeout;

  // Increase timeout based on retry count
  timeout *= Math.pow(1.5, retryCount);

  // Adjust for connection type
  switch (connectionType) {
    case 'slow':
      timeout *= 2;
      break;
    case 'offline':
      timeout *= 0.5; // Shorter timeout for offline detection
      break;
  }

  // Cap the maximum timeout
  return Math.min(timeout, LOADING_TIMEOUTS.EXTENDED);
}

export function getRecommendedTimeout(
  operationType: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  connectionType: 'fast' | 'slow' | 'offline' = 'fast'
): number {
  let baseTimeout: number;

  // Base timeout by operation type
  switch (operationType) {
    case 'page':
      baseTimeout = LOADING_TIMEOUTS.LONG;
      break;
    case 'component':
      baseTimeout = LOADING_TIMEOUTS.MEDIUM;
      break;
    case 'inline':
      baseTimeout = LOADING_TIMEOUTS.SHORT;
      break;
    case 'progressive':
      baseTimeout = LOADING_TIMEOUTS.EXTENDED;
      break;
    case 'asset':
      baseTimeout = LOADING_TIMEOUTS.MEDIUM;
      break;
    default:
      baseTimeout = LOADING_TIMEOUTS.MEDIUM;
  }

  // Adjust for priority
  switch (priority) {
    case 'high':
      baseTimeout *= 1.5;
      break;
    case 'low':
      baseTimeout *= 0.7;
      break;
  }

  // Adjust for connection
  return calculateAdaptiveTimeout(baseTimeout, 0, connectionType);
}

/**
 * Timeout warning utilities
 */

export function calculateWarningThreshold(timeout: number, percentage: number = 0.7): number {
  return Math.floor(timeout * percentage);
}

export function createTimeoutWarning(
  timeout: number,
  onWarning: (timeRemaining: number) => void,
  warningPercentage: number = 0.7
) {
  const warningTime = calculateWarningThreshold(timeout, warningPercentage);
  
  return setTimeout(() => {
    const remaining = timeout - warningTime;
    onWarning(remaining);
  }, warningTime);
}

/**
 * Multiple timeout management
 */

export class MultiTimeoutManager {
  private timeouts: Map<string, TimeoutManager> = new Map();

  public add(id: string, config: TimeoutConfig): void {
    const existing = this.timeouts.get(id);
    if (existing) {
      existing.stop();
    }

    const manager = createTimeoutManager(config);
    this.timeouts.set(id, manager);
    manager.start();
  }

  public remove(id: string): void {
    const manager = this.timeouts.get(id);
    if (manager) {
      manager.stop();
      this.timeouts.delete(id);
    }
  }

  public extend(id: string, additionalTime: number): void {
    const manager = this.timeouts.get(id);
    if (manager) {
      manager.extend(additionalTime);
    }
  }

  public reset(id: string): void {
    const manager = this.timeouts.get(id);
    if (manager) {
      manager.reset();
    }
  }

  public getRemainingTime(id: string): number {
    const manager = this.timeouts.get(id);
    return manager ? manager.getRemainingTime() : 0;
  }

  public getElapsedTime(id: string): number {
    const manager = this.timeouts.get(id);
    return manager ? manager.getElapsedTime() : 0;
  }

  public hasTimedOut(id: string): boolean {
    const manager = this.timeouts.get(id);
    return manager ? manager.hasTimedOut() : false;
  }

  public isWarningTriggered(id: string): boolean {
    const manager = this.timeouts.get(id);
    return manager ? manager.isWarningTriggered() : false;
  }

  public clear(): void {
    this.timeouts.forEach(manager => manager.stop());
    this.timeouts.clear();
  }

  public getActiveTimeouts(): string[] {
    return Array.from(this.timeouts.keys()).filter(id => {
      const manager = this.timeouts.get(id);
      return manager && !manager.hasTimedOut();
    });
  }
}

/**
 * Timeout utilities for operations
 */

export function addTimeoutToOperation(
  operation: LoadingOperation,
  onTimeout: () => void,
  onWarning?: () => void
): TimeoutManager {
  const warningThreshold = operation.timeout ? 
    calculateWarningThreshold(operation.timeout) : 
    undefined;

  return createTimeoutManager({
    timeout: operation.timeout || LOADING_TIMEOUTS.MEDIUM,
    warningThreshold,
    onTimeout,
    onWarning,
  });
}

export function createOperationTimeoutHandler(
  onTimeout: (operationId: string) => void,
  onWarning?: (operationId: string, timeRemaining: number) => void
) {
  const timeoutManager = new MultiTimeoutManager();

  return {
    addOperation: (operation: LoadingOperation) => {
      timeoutManager.add(operation.id, {
        timeout: operation.timeout || LOADING_TIMEOUTS.MEDIUM,
        warningThreshold: operation.timeout ? 
          calculateWarningThreshold(operation.timeout) : 
          undefined,
        onTimeout: () => onTimeout(operation.id),
        onWarning: onWarning ? 
          () => onWarning(operation.id, timeoutManager.getRemainingTime(operation.id)) : 
          undefined,
      });
    },

    removeOperation: (operationId: string) => {
      timeoutManager.remove(operationId);
    },

    extendOperation: (operationId: string, additionalTime: number) => {
      timeoutManager.extend(operationId, additionalTime);
    },

    resetOperation: (operationId: string) => {
      timeoutManager.reset(operationId);
    },

    getOperationStatus: (operationId: string) => ({
      remainingTime: timeoutManager.getRemainingTime(operationId),
      elapsedTime: timeoutManager.getElapsedTime(operationId),
      hasTimedOut: timeoutManager.hasTimedOut(operationId),
      isWarningTriggered: timeoutManager.isWarningTriggered(operationId),
    }),

    clear: () => timeoutManager.clear(),
  };
}

/**
 * Timeout formatting utilities
 */

export function formatTimeout(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';
  
  const seconds = Math.ceil(milliseconds / 1000);
  
  if (seconds <= 10) {
    return `${seconds}s remaining`;
  }
  
  if (seconds < 60) {
    return `${Math.ceil(seconds / 5) * 5}s remaining`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m remaining`;
}

/**
 * Timeout testing utilities
 */

export function createTimeoutTester(
  testFunction: () => Promise<any>,
  timeout: number
): Promise<{ success: boolean; duration: number; timedOut: boolean }> {
  const startTime = Date.now();
  
  return Promise.race([
    testFunction().then(result => ({
      success: true,
      duration: Date.now() - startTime,
      timedOut: false,
      result,
    })),
    new Promise<{ success: boolean; duration: number; timedOut: boolean }>((_, reject) =>
      setTimeout(() => reject({
        success: false,
        duration: Date.now() - startTime,
        timedOut: true,
      }), timeout)
    ),
  ]).catch(error => ({
    success: false,
    duration: Date.now() - startTime,
    timedOut: error.timedOut || false,
    error,
  }));
}

export async function measureOperationTimeout(
  operation: () => Promise<any>,
  expectedTimeout: number,
  tolerance: number = 100
): Promise<{ accurate: boolean; actualDuration: number; expectedDuration: number }> {
  const startTime = Date.now();
  
  try {
    await operation();
    const actualDuration = Date.now() - startTime;
    return {
      accurate: Math.abs(actualDuration - expectedTimeout) <= tolerance,
      actualDuration,
      expectedDuration: expectedTimeout,
    };
  } catch {
    const actualDuration = Date.now() - startTime;
    return {
      accurate: Math.abs(actualDuration - expectedTimeout) <= tolerance,
      actualDuration,
      expectedDuration: expectedTimeout,
    };
  }
}

