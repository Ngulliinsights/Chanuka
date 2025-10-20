/**
 * Core loading business logic
 * Following navigation component patterns for core functionality
 */

import { LoadingOperation, LoadingConfig, LoadingStats } from '../types';
import { LoadingError } from '../errors';
import { validateLoadingOperation } from '../validation';
import { DEFAULT_LOADING_CONFIG } from '../constants';

export class LoadingCore {
  private operations: Map<string, LoadingOperation> = new Map();
  private config: LoadingConfig;
  private stats: LoadingStats = {
    loaded: 0,
    failed: 0,
    connectionType: 'fast',
    isOnline: navigator.onLine,
  };

  constructor(config: LoadingConfig = DEFAULT_LOADING_CONFIG) {
    this.config = config;
  }

  public addOperation(operation: LoadingOperation): void {
    if (this.config.validation.enabled) {
      validateLoadingOperation(operation);
    }
    
    this.operations.set(operation.id, operation);
    this.updateStats();
  }

  public removeOperation(operationId: string): void {
    this.operations.delete(operationId);
    this.updateStats();
  }

  public getOperation(operationId: string): LoadingOperation | undefined {
    return this.operations.get(operationId);
  }

  public getAllOperations(): LoadingOperation[] {
    return Array.from(this.operations.values());
  }

  public getStats(): LoadingStats {
    return { ...this.stats };
  }

  public updateConfig(newConfig: Partial<LoadingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private updateStats(): void {
    const operations = Array.from(this.operations.values());
    this.stats = {
      ...this.stats,
      loaded: operations.filter(op => !op.error).length,
      failed: operations.filter(op => op.error).length,
    };
  }
}