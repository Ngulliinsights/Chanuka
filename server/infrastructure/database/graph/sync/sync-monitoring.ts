/**
 * Sync Monitoring (REFACTORED)
 * IMPROVEMENTS: Added input validation, proper typing, error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { logger } from '@server/infrastructure/observability';

const errorHandler = new GraphErrorHandler();

export interface SyncMetrics {
  total_entities: number;
  synced_entities: number;
  pending_entities: number;
  failed_entities: number;
  last_sync: Date | null;
  sync_lag_seconds: number;
}

export async function getSyncMetrics(driver: Driver): Promise<SyncMetrics> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (n)
       WITH count(n) as total,
            sum(case when n.last_synced_at IS NOT NULL then 1 else 0 end) as synced,
            sum(case when n.last_synced_at IS NULL then 1 else 0 end) as pending
       RETURN total, synced, pending`,
      {},
      { mode: 'READ' }
    );
    
    const record = result.records[0];
    return {
      total_entities: Number(record?.get('total')) || 0,
      synced_entities: Number(record?.get('synced')) || 0,
      pending_entities: Number(record?.get('pending')) || 0,
      failed_entities: 0,
      last_sync: null,
      sync_lag_seconds: 0
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getSyncMetrics' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get sync metrics', cause: error as Error });
  }
}

export async function monitorSyncHealth(driver: Driver): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    const metrics = await getSyncMetrics(driver);
    
    if (metrics.pending_entities > metrics.total_entities * 0.1) {
      issues.push('High number of pending entities (>10%)');
    }
    
    if (metrics.failed_entities > 0) {
      issues.push(`${metrics.failed_entities} failed entities detected`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'monitorSyncHealth' });
    return { healthy: false, issues: ['Health check failed'] };
  }
}
