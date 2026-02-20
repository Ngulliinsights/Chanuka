import { cacheService } from '../../../infrastructure/cache';
import { demoDataService } from '../../../infrastructure/demo-data';
import { logger } from '../../../infrastructure/observability/core/logger';
import { readDatabase } from '../../../infrastructure/database';
import { sql } from 'drizzle-orm';

// Search index health status
export interface SearchIndexHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  totalBills: number;
  indexedBills: number;
  missingIndexes: number;
  indexCoverage: number;
  lastIndexUpdate: Date | null;
  performanceMetrics: {
    averageSearchTime: number;
    indexSize: number;
    fragmentationLevel: number;
  };
  recommendations: string[];
}

// Index rebuild result
export interface IndexRebuildResult {
  success: boolean;
  billsProcessed: number;
  billsUpdated: number;
  errors: number;
  duration: number;
  errorDetails?: string[];
}

// Index performance metrics
export interface IndexPerformanceMetrics {
  searchTime: number;
  indexHitRate: number;
  queryComplexity: 'simple' | 'moderate' | 'complex';
  resultCount: number;
  timestamp: Date;
}

/**
 * Search Index Management Service
 * Handles automatic search index updates, rebuilding, and performance monitoring.
 */
export class SearchIndexManager {
  private get db() {
    return readDatabase;
  }

  private indexUpdateQueue: Set<number> = new Set();
  private isProcessingQueue = false;
  private performanceHistory: IndexPerformanceMetrics[] = [];
  private maxPerformanceHistory = 1000;
  private healthMonitoringInterval: NodeJS.Timeout | null = null;
  private queueProcessingInterval: NodeJS.Timeout | null = null;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Initialize the search index manager. */
  async initialize(): Promise<void> {
    logger.info({ component: 'SearchIndexManager' }, 'Initializing Search Index Manager...');

    try {
      await this.validateSearchIndexSetup();
      this.startHealthMonitoring();
      this.startQueueProcessing();
      logger.info({ component: 'SearchIndexManager' }, '✅ Search Index Manager initialized successfully');
    } catch (error) {
      logger.error({ component: 'SearchIndexManager', error }, '❌ Failed to initialize Search Index Manager');
      throw error;
    }
  }

  /** Queue a bill for a deferred search index update. */
  async queueBillForIndexUpdate(bill_id: number): Promise<void> {
    this.indexUpdateQueue.add(bill_id);
    logger.debug({ component: 'SearchIndexManager', bill_id }, `Bill ${bill_id} queued for search index update`);
  }

  /** Update search index for a specific bill immediately. */
  async updateBillSearchIndex(bill_id: number): Promise<boolean> {
    if (demoDataService.isDemoMode()) {
      logger.debug({ component: 'SearchIndexManager', bill_id }, `🔄 Demo mode: Skipping search index update for bill ${bill_id}`);
      return true;
    }

    try {
      const updateResult = await this.db.execute(sql`
        UPDATE bills
        SET search_vector =
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(content, '')), 'D'),
          updated_at = NOW()
        WHERE id = ${bill_id}
      ` as unknown as string) as unknown as { rowCount?: number };

      const success = (updateResult.rowCount ?? 0) > 0;

      if (success) {
        logger.debug({ component: 'SearchIndexManager', bill_id }, `✅ Search index updated for bill ${bill_id}`);
        await this.clearSearchCaches();
        return true;
      }

      logger.warn({ component: 'SearchIndexManager', bill_id }, `⚠️ No bill found with ID ${bill_id} for index update`);
      return false;
    } catch (error) {
      logger.error({ component: 'SearchIndexManager', error, bill_id }, `❌ Failed to update search index for bill ${bill_id}`);
      return false;
    }
  }

  /** Rebuild all search indexes from scratch. */
  async rebuildAllIndexes(): Promise<IndexRebuildResult> {
    const startTime = Date.now();
    let billsProcessed = 0;
    let billsUpdated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    logger.info({ component: 'SearchIndexManager' }, '🔄 Starting full search index rebuild...');

    if (demoDataService.isDemoMode()) {
      logger.info({ component: 'SearchIndexManager' }, '🔄 Demo mode detected – search index rebuild not needed for demo data');
      const demoBills = demoDataService.getBills();
      return {
        success: true,
        billsProcessed: demoBills.length,
        billsUpdated: 0,
        errors: 0,
        duration: Date.now() - startTime,
      };
    }

    try {
      const countRows = await this.db.execute(
        sql`SELECT COUNT(*) as count FROM bills` as unknown as string
      ) as unknown as { count: string }[];

      billsProcessed = parseInt(countRows[0]?.count ?? '0', 10);

      const updateResult = await this.db.execute(sql`
        UPDATE bills
        SET search_vector =
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(content, '')), 'D'),
          updated_at = NOW()
        WHERE search_vector IS NULL
           OR search_vector = ''::tsvector
           OR updated_at < (SELECT MAX(created_at) FROM bills WHERE search_vector IS NOT NULL)
      ` as unknown as string) as unknown as { rowCount?: number };

      billsUpdated = updateResult.rowCount ?? 0;

      await this.db.execute(sql`ANALYZE bills` as unknown as string);
      await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_search_vector` as unknown as string);

      await this.clearSearchCaches();

      const duration = Date.now() - startTime;
      logger.info(
        { component: 'SearchIndexManager', duration, billsProcessed, billsUpdated },
        `✅ Search index rebuild completed in ${duration}ms`
      );

      return { success: true, billsProcessed, billsUpdated, errors, duration };
    } catch (error) {
      logger.error('Failed to rebuild search indexes', {
        error,
        component: 'SearchIndexManager',
        operation: 'rebuildAllIndexes'
      });
      errors = 1;
      errorDetails.push(error instanceof Error ? error.message : String(error));
      logger.error({ component: 'SearchIndexManager', error }, '❌ Search index rebuild failed');

      return {
        success: false,
        billsProcessed,
        billsUpdated,
        errors,
        duration: Date.now() - startTime,
        errorDetails,
      };
    }
  }

  /** Get comprehensive search index health status. */
  async getIndexHealth(): Promise<SearchIndexHealth> {
    if (demoDataService.isDemoMode()) {
      logger.info({ component: 'SearchIndexManager' }, '🔍 Demo mode: returning demo health status');
      const demoBills = demoDataService.getBills();
      return {
        status: 'healthy',
        totalBills: demoBills.length,
        indexedBills: demoBills.length,
        missingIndexes: 0,
        indexCoverage: 100,
        lastIndexUpdate: new Date(),
        performanceMetrics: { averageSearchTime: 50, indexSize: 1024 * 1024, fragmentationLevel: 5 },
        recommendations: ['System operating in demo mode with sample data'],
      };
    }

    try {
      logger.info({ component: 'SearchIndexManager' }, '🔍 Executing search index health query...');

      const executeResult = await this.db.execute(sql`
        SELECT
          COUNT(*) as total_bills,
          COUNT(search_vector) as indexed_bills,
          COUNT(*) - COUNT(search_vector) as missing_indexes,
          MAX(updated_at) as last_update
        FROM bills
      ` as unknown as string) as unknown as Record<string, unknown>[];

      logger.info(
        { component: 'SearchIndexManager', resultType: typeof executeResult, isArray: Array.isArray(executeResult) },
        '🔍 Execute result metadata'
      );

      if (!Array.isArray(executeResult) || executeResult.length === 0) {
        logger.warn({ component: 'SearchIndexManager' }, '⚠️ Health query returned no rows – reporting offline');
        return this.offlineHealth('Database query returned no results');
      }

      const indexStats = executeResult[0];
      if (!indexStats) {
        logger.warn({ component: 'SearchIndexManager' }, '⚠️ Health query returned an empty first row – reporting offline');
        return this.offlineHealth('Database query returned no results');
      }
      logger.info({ component: 'SearchIndexManager', indexStats }, '🔍 Index stats');

      const totalBills = parseInt(indexStats.total_bills as string, 10);
      const indexedBills = parseInt(indexStats.indexed_bills as string, 10);
      const missingIndexes = parseInt(indexStats.missing_indexes as string, 10);
      const lastIndexUpdate = indexStats.last_update ? new Date(indexStats.last_update as string) : null;
      const indexCoverage = totalBills > 0 ? (indexedBills / totalBills) * 100 : 0;

      const sizeResult = await this.db.execute(sql`
        SELECT
          pg_size_pretty(pg_total_relation_size('idx_bills_search_vector')) as index_size,
          pg_total_relation_size('idx_bills_search_vector') as index_size_bytes
      ` as unknown as string) as unknown as Record<string, unknown>[];

      const [indexSizeRow] = sizeResult;
      const indexSize = parseInt(indexSizeRow?.index_size_bytes as string, 10) || 0;

      const recentMetrics = this.performanceHistory.slice(-100);
      const averageSearchTime =
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.searchTime, 0) / recentMetrics.length
          : 0;

      let status: SearchIndexHealth['status'];
      if (indexCoverage >= 95) status = 'healthy';
      else if (indexCoverage >= 80) status = 'degraded';
      else if (indexCoverage >= 50) status = 'critical';
      else status = 'offline';

      const recommendations: string[] = [];
      if (missingIndexes > 0) recommendations.push(`${missingIndexes} bills need search index updates`);
      if (averageSearchTime > 500) recommendations.push('Search performance is slow – consider index optimisation');
      if (indexCoverage < 90) recommendations.push('Run full index rebuild to improve search coverage');

      return {
        status,
        totalBills,
        indexedBills,
        missingIndexes,
        indexCoverage,
        lastIndexUpdate,
        performanceMetrics: { averageSearchTime, indexSize, fragmentationLevel: 0 },
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to get index health', {
        error,
        component: 'SearchIndexManager',
        operation: 'getIndexHealth'
      });
      return this.offlineHealth('Database connection unavailable');
    }
  }

  /** Record search performance metrics for trend analysis. */
  recordSearchPerformance(metrics: Omit<IndexPerformanceMetrics, 'timestamp'>): void {
    this.performanceHistory.push({ ...metrics, timestamp: new Date() });

    if (this.performanceHistory.length > this.maxPerformanceHistory) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceHistory);
    }

    if (metrics.searchTime > 1000) {
      logger.warn(
        { component: 'SearchIndexManager', searchTime: metrics.searchTime, resultCount: metrics.resultCount },
        `🐌 Slow search detected: ${metrics.searchTime}ms`
      );
    }
  }

  /** Optimise search indexes for better query performance. */
  async optimizeIndexes(): Promise<{ success: boolean; operations: string[]; duration: number }> {
    const startTime = Date.now();
    const operations: string[] = [];

    if (demoDataService.isDemoMode()) {
      logger.info({ component: 'SearchIndexManager' }, '🔄 Demo mode: Skipping search index optimisation');
      return { success: true, operations: ['Demo mode – no optimisation needed'], duration: Date.now() - startTime };
    }

    try {
      await this.db.execute(sql`ANALYZE bills` as unknown as string);
      operations.push('Analysed bills table');

      await this.db.execute(sql`VACUUM ANALYZE bills` as unknown as string);
      operations.push('Updated table statistics');

      await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_search_vector` as unknown as string);
      operations.push('Reindexed search vector');

      await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_status_date` as unknown as string);
      operations.push('Reindexed status-date index');

      await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_category_date` as unknown as string);
      operations.push('Reindexed category-date index');

      const duration = Date.now() - startTime;
      logger.info({ component: 'SearchIndexManager', duration }, `✅ Search index optimisation completed in ${duration}ms`);
      return { success: true, operations, duration };
    } catch (error) {
      logger.error('Failed to optimize indexes', {
        error,
        component: 'SearchIndexManager',
        operation: 'optimizeIndexes'
      });
      logger.error({ component: 'SearchIndexManager', error }, '❌ Search index optimisation failed');
      return {
        success: false,
        operations: [...operations, `Error: ${error instanceof Error ? error.message : String(error)}`],
        duration: Date.now() - startTime,
      };
    }
  }

  /** Get search index statistics for monitoring dashboards. */
  async getIndexStatistics(): Promise<{
    indexSize: string;
    indexSizeBytes: number;
    totalRows: number;
    indexedRows: number;
    indexEfficiency: number;
    lastVacuum: Date | null;
    lastAnalyze: Date | null;
  }> {
    if (demoDataService.isDemoMode()) {
      logger.info({ component: 'SearchIndexManager' }, '🔍 Demo mode: returning demo statistics');
      const demoBills = demoDataService.getBills();
      return {
        indexSize: '1.0 MB',
        indexSizeBytes: 1024 * 1024,
        totalRows: demoBills.length,
        indexedRows: demoBills.length,
        indexEfficiency: 100,
        lastVacuum: new Date(),
        lastAnalyze: new Date(),
      };
    }

    const fallback = {
      indexSize: '0 bytes',
      indexSizeBytes: 0,
      totalRows: 0,
      indexedRows: 0,
      indexEfficiency: 0,
      lastVacuum: null as Date | null,
      lastAnalyze: null as Date | null,
    };

    try {
      const statsResult = await this.db.execute(sql`
        SELECT
          pg_size_pretty(pg_total_relation_size('idx_bills_search_vector')) as index_size,
          pg_total_relation_size('idx_bills_search_vector') as index_size_bytes,
          (SELECT COUNT(*) FROM bills) as total_rows,
          (SELECT COUNT(*) FROM bills WHERE search_vector IS NOT NULL) as indexed_rows,
          (SELECT last_vacuum FROM pg_stat_user_tables WHERE relname = 'bills') as last_vacuum,
          (SELECT last_analyze FROM pg_stat_user_tables WHERE relname = 'bills') as last_analyze
      ` as unknown as string) as unknown as Record<string, unknown>[];

      const stats = statsResult[0];
      if (!stats) {
        throw new Error('Index statistics query returned no rows');
      }
      const totalRows = parseInt(stats.total_rows as string, 10);
      const indexedRows = parseInt(stats.indexed_rows as string, 10);

      return {
        indexSize: stats.index_size as string,
        indexSizeBytes: parseInt(stats.index_size_bytes as string, 10),
        totalRows,
        indexedRows,
        indexEfficiency: totalRows > 0 ? (indexedRows / totalRows) * 100 : 0,
        lastVacuum: stats.last_vacuum ? new Date(stats.last_vacuum as string) : null,
        lastAnalyze: stats.last_analyze ? new Date(stats.last_analyze as string) : null,
      };
    } catch (error) {
      logger.error('Failed to get index statistics', {
        error,
        component: 'SearchIndexManager',
        operation: 'getIndexStatistics'
      });
      logger.error({ component: 'SearchIndexManager', error }, 'Error getting index statistics');
      return { ...fallback, indexSize: 'Error' };
    }
  }

  /** Gracefully shut down the search index manager. */
  async shutdown(): Promise<void> {
    logger.info({ component: 'SearchIndexManager' }, '🛑 Shutting down search index manager...');

    try {
      if (this.healthMonitoringInterval) {
        clearInterval(this.healthMonitoringInterval);
        this.healthMonitoringInterval = null;
      }

      if (this.queueProcessingInterval) {
        clearInterval(this.queueProcessingInterval);
        this.queueProcessingInterval = null;
      }

      this.indexUpdateQueue.clear();
      await this.clearSearchCaches();

      logger.info({ component: 'SearchIndexManager' }, '✅ Search index manager shut down successfully');
    } catch (error) {
      logger.error({ component: 'SearchIndexManager', error }, '❌ Error shutting down search index manager');
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private offlineHealth(reason: string): SearchIndexHealth {
    return {
      status: 'offline',
      totalBills: 0,
      indexedBills: 0,
      missingIndexes: 0,
      indexCoverage: 0,
      lastIndexUpdate: null,
      performanceMetrics: { averageSearchTime: 0, indexSize: 0, fragmentationLevel: 0 },
      recommendations: [reason],
    };
  }

  private async validateSearchIndexSetup(): Promise<void> {
    if (demoDataService.isDemoMode()) {
      logger.info({ component: 'SearchIndexManager' }, '🔄 Demo mode: Skipping search index setup validation');
      return;
    }

    try {
      const columnCheck = await this.db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'bills' AND column_name = 'search_vector'
      ` as unknown as string) as unknown as unknown[];

      if (!Array.isArray(columnCheck) || columnCheck.length === 0) {
        throw new Error('search_vector column not found in bills table');
      }

      const indexCheck = await this.db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'bills' AND indexname = 'idx_bills_search_vector'
      ` as unknown as string) as unknown as unknown[];

      if (!Array.isArray(indexCheck) || indexCheck.length === 0) {
        logger.warn({ component: 'SearchIndexManager' }, '⚠️ GIN index for search_vector not found – creating...');
        await this.db.execute(sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_search_vector
          ON bills USING GIN(search_vector)
        ` as unknown as string);
      }

      const triggerCheck = await this.db.execute(sql`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'bills' AND trigger_name = 'bills_search_vector_update'
      ` as unknown as string) as unknown as unknown[];

      if (!Array.isArray(triggerCheck) || triggerCheck.length === 0) {
        logger.warn({ component: 'SearchIndexManager' }, '⚠️ Search vector update trigger not found');
      }

      logger.info({ component: 'SearchIndexManager' }, '✅ Search index setup validation completed');
    } catch (error) {
      logger.error({ component: 'SearchIndexManager', error }, '❌ Search index setup validation failed');
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    this.healthMonitoringInterval = setInterval(async () => {
      try {
        const health = await this.getIndexHealth();

        if (!demoDataService.isDemoMode()) {
          if (health.status === 'critical' || health.status === 'offline') {
            logger.warn({ component: 'SearchIndexManager', status: health.status, recommendations: health.recommendations },
              `⚠️ Search index health is ${health.status}`
            );
          }

          if (health.missingIndexes > 100) {
            logger.info({ component: 'SearchIndexManager' }, '🔄 Auto-triggering index rebuild due to many missing indexes');
            await this.rebuildAllIndexes();
          }
        }

        this.performMemoryCleanup();

        const memUsage = process.memoryUsage();
        logger.info(
          {
            component: 'SearchIndexManager',
            performanceHistorySize: this.performanceHistory.length,
            indexUpdateQueueSize: this.indexUpdateQueue.size,
            isProcessingQueue: this.isProcessingQueue,
            heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
            heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          },
          'Search Index Manager memory snapshot'
        );
      } catch (error) {
        logger.error({ component: 'SearchIndexManager', error }, 'Error during health monitoring');
      }
    }, 30 * 60 * 1000);
  }

  private performMemoryCleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const before = this.performanceHistory.length;
    const cutoff = Math.max(0, this.performanceHistory.length - 500);

    this.performanceHistory = this.performanceHistory.filter(
      (entry, index) => entry.timestamp.getTime() > oneHourAgo || index >= cutoff
    );

    const cleaned = before - this.performanceHistory.length;
    if (cleaned > 0) {
      logger.info(
        { component: 'SearchIndexManager', cleaned, remaining: this.performanceHistory.length },
        '🧹 Search Index Manager memory cleanup'
      );
    }
  }

  private startQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(async () => {
      if (this.isProcessingQueue || this.indexUpdateQueue.size === 0) return;

      this.isProcessingQueue = true;

      try {
        const bill_ids = Array.from(this.indexUpdateQueue);
        this.indexUpdateQueue.clear();

        logger.info({ component: 'SearchIndexManager', count: bill_ids.length }, `🔄 Processing ${bill_ids.length} bills for search index updates`);

        let updated = 0;
        for (const bill_id of bill_ids) {
          const success = await this.updateBillSearchIndex(bill_id);
          if (success) updated++;
        }

        logger.info({ component: 'SearchIndexManager', updated, total: bill_ids.length }, `✅ Updated ${updated}/${bill_ids.length} search indexes`);
      } catch (error) {
        logger.error({ component: 'SearchIndexManager', error }, 'Error processing index update queue');
      } finally {
        this.isProcessingQueue = false;
      }
    }, 5 * 60 * 1000);
  }

  private async clearSearchCaches(): Promise<void> {
    try {
      // Use type assertion to handle environments where deletePattern may exist
      const cache = cacheService as unknown as {
        deletePattern?: (pattern: string) => Promise<void>;
        delete?: (key: string) => Promise<void>;
      };

      if (typeof cache.deletePattern === 'function') {
        await cache.deletePattern('search:*');
        await cache.deletePattern('bills:search:*');
      } else {
        logger.warn({ component: 'SearchIndexManager' }, 'deletePattern not available on CacheService – skipping cache clear');
      }

      logger.info({ component: 'SearchIndexManager' }, '🧹 Search caches cleared');
    } catch (error) {
      logger.error({ component: 'SearchIndexManager', error }, 'Error clearing search caches');
    }
  }
}

// Singleton instance
export const searchIndexManager = new SearchIndexManager();