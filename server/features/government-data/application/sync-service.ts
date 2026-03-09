/**
 * Government Data Sync Service
 * 
 * Automated synchronization of government data with platform database.
 * Handles data fetching, validation, normalization, conflict resolution, and scheduling.
 * 
 * @module features/government-data/application/sync-service
 */

import { logger } from '../../../infrastructure/observability/logging-config';
import { AsyncServiceResult, safeAsync } from '../../../infrastructure/error-handling/result-types';
import { getGovernmentAPIClient, GovernmentAPIClient } from '../../../infrastructure/external-data/government-api-client';
import { GovernmentAPIProvider } from '../../../infrastructure/external-data/government-api-config';
import { BillNormalizer, NormalizedBillData } from '../domain/normalizer';
import { ConflictResolver, ConflictResolution } from '../domain/conflict-resolver';
import { db } from '../../../infrastructure/database';
import { bills } from '../../../infrastructure/schema';
import { eq } from 'drizzle-orm';

/**
 * Sync Status
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Sync Result
 */
export interface SyncResult {
  provider: GovernmentAPIProvider;
  status: SyncStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  recordsFetched: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  conflicts: number;
  errors: string[];
}

/**
 * Sync Configuration
 */
export interface SyncConfig {
  provider: GovernmentAPIProvider;
  enabled: boolean;
  schedule: string; // Cron expression
  batchSize: number;
  maxRecords?: number;
  fullSync: boolean; // Full sync vs incremental
}

/**
 * Government Data Sync Service
 * 
 * Manages synchronization of government data from external APIs.
 */
export class GovernmentDataSyncService {
  private normalizer: BillNormalizer;
  private conflictResolver: ConflictResolver;
  private syncInProgress: Map<GovernmentAPIProvider, boolean> = new Map();
  
  constructor() {
    this.normalizer = new BillNormalizer();
    this.conflictResolver = new ConflictResolver();
  }
  
  /**
   * Sync data from a specific provider
   */
  async syncProvider(config: SyncConfig): AsyncServiceResult<SyncResult> {
    return safeAsync(
      async () => {
        // Check if sync already in progress
        if (this.syncInProgress.get(config.provider)) {
          throw new Error(`Sync already in progress for ${config.provider}`);
        }
        
        this.syncInProgress.set(config.provider, true);
        
        const startTime = new Date();
        const result: SyncResult = {
          provider: config.provider,
          status: SyncStatus.IN_PROGRESS,
          startTime,
          endTime: new Date(),
          duration: 0,
          recordsFetched: 0,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          conflicts: 0,
          errors: [],
        };
        
        try {
          logger.info({
            provider: config.provider,
            fullSync: config.fullSync,
          }, 'Starting government data sync');
          
          // Get API client
          const client = getGovernmentAPIClient(config.provider);
          
          // Fetch data from government API
          const fetchResult = await this.fetchData(client, config);
          if (!fetchResult.success) {
            throw new Error(`Failed to fetch data: ${fetchResult.error.message}`);
          }
          
          result.recordsFetched = fetchResult.data.length;
          
          // Process each record
          for (const rawData of fetchResult.data) {
            try {
              const processResult = await this.processRecord(rawData, config.provider);
              
              if (processResult.success) {
                result.recordsProcessed++;
                
                if (processResult.data.action === 'created') {
                  result.recordsCreated++;
                } else if (processResult.data.action === 'updated') {
                  result.recordsUpdated++;
                } else if (processResult.data.action === 'skipped') {
                  result.recordsSkipped++;
                }
                
                if (processResult.data.hadConflict) {
                  result.conflicts++;
                }
              } else {
                result.recordsFailed++;
                result.errors.push(processResult.error.message);
              }
            } catch (error) {
              result.recordsFailed++;
              result.errors.push(error instanceof Error ? error.message : 'Unknown error');
            }
          }
          
          // Determine final status
          if (result.recordsFailed === 0) {
            result.status = SyncStatus.COMPLETED;
          } else if (result.recordsProcessed > 0) {
            result.status = SyncStatus.PARTIAL;
          } else {
            result.status = SyncStatus.FAILED;
          }
          
          const endTime = new Date();
          result.endTime = endTime;
          result.duration = endTime.getTime() - startTime.getTime();
          
          logger.info({
            provider: config.provider,
            status: result.status,
            duration: result.duration,
            recordsProcessed: result.recordsProcessed,
            recordsCreated: result.recordsCreated,
            recordsUpdated: result.recordsUpdated,
            recordsFailed: result.recordsFailed,
          }, 'Government data sync completed');
          
          return result;
        } finally {
          this.syncInProgress.set(config.provider, false);
        }
      },
      {
        operation: 'sync_government_data',
        provider: config.provider,
      }
    );
  }
  
  /**
   * Fetch data from government API
   */
  private async fetchData(
    client: GovernmentAPIClient,
    config: SyncConfig
  ): AsyncServiceResult<any[]> {
    return safeAsync(
      async () => {
        const allData: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && (!config.maxRecords || allData.length < config.maxRecords)) {
          const response = await client.get('/bills', {
            page,
            limit: config.batchSize,
            ...(config.fullSync ? {} : { since: this.getLastSyncTime(config.provider) }),
          });
          
          if (!response.success) {
            throw new Error(`API request failed: ${response.error.message}`);
          }
          
          const data = response.data.data;
          allData.push(...data);
          
          // Check if there are more pages
          hasMore = data.length === config.batchSize;
          page++;
          
          // Respect max records limit
          if (config.maxRecords && allData.length >= config.maxRecords) {
            break;
          }
        }
        
        return allData;
      },
      {
        operation: 'fetch_government_data',
        provider: config.provider,
      }
    );
  }
  
  /**
   * Process a single record
   */
  private async processRecord(
    rawData: any,
    provider: GovernmentAPIProvider
  ): AsyncServiceResult<{ action: 'created' | 'updated' | 'skipped'; hadConflict: boolean }> {
    return safeAsync(
      async () => {
        // Normalize data
        const normalizeResult = await this.normalizer.normalize(rawData, provider);
        if (!normalizeResult.success) {
          throw new Error(`Normalization failed: ${normalizeResult.error.message}`);
        }
        
        const normalizedData = normalizeResult.data;
        
        // Check if bill already exists
        const existing = await db.query.bills.findFirst({
          where: eq(bills.externalId, normalizedData.externalId),
        });
        
        let action: 'created' | 'updated' | 'skipped' = 'skipped';
        let hadConflict = false;
        
        if (!existing) {
          // Create new bill
          await db.insert(bills).values({
            ...normalizedData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          action = 'created';
        } else {
          // Check for conflicts
          const conflictResult = await this.conflictResolver.resolve(
            existing,
            normalizedData
          );
          
          if (!conflictResult.success) {
            throw new Error(`Conflict resolution failed: ${conflictResult.error.message}`);
          }
          
          const resolution = conflictResult.data;
          hadConflict = resolution.hasConflict;
          
          if (resolution.shouldUpdate) {
            // Update existing bill
            await db.update(bills)
              .set({
                ...resolution.resolvedData,
                updatedAt: new Date(),
              })
              .where(eq(bills.id, existing.id));
            action = 'updated';
          }
        }
        
        return { action, hadConflict };
      },
      {
        operation: 'process_government_record',
        provider,
      }
    );
  }
  
  /**
   * Get last sync time for provider
   */
  private getLastSyncTime(provider: GovernmentAPIProvider): string {
    // TODO: Implement sync history tracking
    // For now, return 24 hours ago
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }
  
  /**
   * Sync all enabled providers
   */
  async syncAll(configs: SyncConfig[]): AsyncServiceResult<SyncResult[]> {
    return safeAsync(
      async () => {
        const results: SyncResult[] = [];
        
        for (const config of configs) {
          if (!config.enabled) {
            continue;
          }
          
          const result = await this.syncProvider(config);
          if (result.success) {
            results.push(result.data);
          } else {
            // Log error but continue with other providers
            logger.error({
              provider: config.provider,
              error: result.error.message,
            }, 'Provider sync failed');
            
            results.push({
              provider: config.provider,
              status: SyncStatus.FAILED,
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              recordsFetched: 0,
              recordsProcessed: 0,
              recordsCreated: 0,
              recordsUpdated: 0,
              recordsSkipped: 0,
              recordsFailed: 0,
              conflicts: 0,
              errors: [result.error.message],
            });
          }
        }
        
        return results;
      },
      {
        operation: 'sync_all_government_data',
      }
    );
  }
  
  /**
   * Get sync status for provider
   */
  isSyncInProgress(provider: GovernmentAPIProvider): boolean {
    return this.syncInProgress.get(provider) || false;
  }
  
  /**
   * Get sync statistics
   */
  async getSyncStats(provider: GovernmentAPIProvider): AsyncServiceResult<any> {
    return safeAsync(
      async () => {
        // TODO: Implement sync history tracking
        return {
          provider,
          lastSync: null,
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
        };
      },
      {
        operation: 'get_sync_stats',
        provider,
      }
    );
  }
}

// Export singleton instance
export const governmentDataSyncService = new GovernmentDataSyncService();
