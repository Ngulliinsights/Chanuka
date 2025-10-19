import { BaseAdapter, DualOperationOptions } from './BaseAdapter';
import { FlagManager } from '../feature-flags/FlagManager';
import { MigrationFlag } from '../feature-flags/types';
import { logger } from '../../observability/logging';

export interface CacheOperations {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export class CacheAdapter extends BaseAdapter {
  private readonly legacyCache: CacheOperations;
  private readonly newCache: CacheOperations;
  private readonly flagManager: FlagManager;

  constructor(
    legacyCache: CacheOperations,
    newCache: CacheOperations
  ) {
    super('CacheAdapter');
    this.legacyCache = legacyCache;
    this.newCache = newCache;
    this.flagManager = FlagManager.getInstance();
  }

  async get(key: string, options: DualOperationOptions = {}): Promise<any> {
    const useNewSystem = this.flagManager.isEnabled(MigrationFlag.USE_NEW_CACHE, key);
    
    return this.dualOperation(
      'get',
      () => this.legacyCache.get(key),
      () => this.newCache.get(key),
      {
        ...options,
        preferenceLegacy: !useNewSystem,
      }
    );
  }

  async set(
    key: string,
    value: any,
    ttl?: number,
    options: DualOperationOptions = {}
  ): Promise<void> {
    const useNewSystem = this.flagManager.isEnabled(MigrationFlag.USE_NEW_CACHE, key);

    return this.dualOperation(
      'set',
      () => this.legacyCache.set(key, value, ttl),
      () => this.newCache.set(key, value, ttl),
      {
        ...options,
        preferenceLegacy: !useNewSystem,
      }
    );
  }

  async delete(key: string, options: DualOperationOptions = {}): Promise<void> {
    const useNewSystem = this.flagManager.isEnabled(MigrationFlag.USE_NEW_CACHE, key);

    return this.dualOperation(
      'delete',
      () => this.legacyCache.delete(key),
      () => this.newCache.delete(key),
      {
        ...options,
        preferenceLegacy: !useNewSystem,
      }
    );
  }
}












































