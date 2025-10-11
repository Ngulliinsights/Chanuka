import { sql } from "drizzle-orm";
import { databaseService } from "../services/database-service.js";
import { cacheService } from "../infrastructure/cache/cache-service.js";
import { demoDataService } from "../infrastructure/demo-data.js";
import * as schema from "../../shared/schema.js";
import { logger } from '../../utils/logger';

// Search index health status
export interface SearchIndexHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  totalBills: number;
  indexedBills: number;
  missingIndexes: number;
  indexCoverage: number; // percentage
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
 * Handles automatic search index updates, rebuilding, and performance monitoring
 */
export class SearchIndexManager {
  private db = databaseService.getDatabase();
  private indexUpdateQueue: Set<number> = new Set();
  private isProcessingQueue = false;
  private performanceHistory: IndexPerformanceMetrics[] = [];
  private maxPerformanceHistory = 1000;
  private healthMonitoringInterval: NodeJS.Timeout | null = null;
  private queueProcessingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the search index manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Search Index Manager...', { component: 'SimpleTool' });
    
    try {
      // Check if search vectors exist and are properly configured
      await this.validateSearchIndexSetup();
      
      // Start periodic health checks
      this.startHealthMonitoring();
      
      // Start queue processing
      this.startQueueProcessing();
      
      logger.info('✅ Search Index Manager initialized successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Failed to initialize Search Index Manager:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Queue a bill for search index update
   */
  async queueBillForIndexUpdate(billId: number): Promise<void> {
    this.indexUpdateQueue.add(billId);
    console.log(`Bill ${billId} queued for search index update`);
  }

  /**
   * Update search index for a specific bill
   */
  async updateBillSearchIndex(billId: number): Promise<boolean> {
    // Check if system is in demo mode
    if (demoDataService.isDemoMode()) {
      console.log(`🔄 Demo mode: Skipping search index update for bill ${billId}`);
      return true; // Demo data doesn't need index updates
    }

    try {
      const result = await databaseService.withFallback(
        async () => {
          // Update the search vector for the specific bill
          const updateResult = await this.db.execute(sql`
            UPDATE bills 
            SET search_vector = 
              setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
              setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
              setweight(to_tsvector('english', coalesce(content, '')), 'D'),
              updated_at = NOW()
            WHERE id = ${billId}
          `);

          return updateResult.rowCount > 0;
        },
        false,
        `updateBillSearchIndex(${billId})`
      );

      if (result.data) {
        console.log(`✅ Search index updated for bill ${billId}`);
        
        // Clear related caches
        await this.clearSearchCaches();
        
        return true;
      } else {
        console.warn(`⚠️ No bill found with ID ${billId} for index update`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to update search index for bill ${billId}:`, error);
      return false;
    }
  }

  /**
   * Rebuild all search indexes
   */
  async rebuildAllIndexes(): Promise<IndexRebuildResult> {
    const startTime = Date.now();
    let billsProcessed = 0;
    let billsUpdated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    logger.info('🔄 Starting full search index rebuild...', { component: 'SimpleTool' });

    // Check if system is in demo mode
    if (demoDataService.isDemoMode()) {
      logger.info('🔄 Demo mode detected - search index rebuild not needed for demo data', { component: 'SimpleTool' });
      const demoBills = demoDataService.getBills();
      return {
        success: true,
        billsProcessed: demoBills.length,
        billsUpdated: 0, // Demo data doesn't need updating
        errors: 0,
        duration: Date.now() - startTime,
        errorDetails: undefined
      };
    }

    try {
      const result = await databaseService.withFallback(
        async () => {
          // Get total count of bills
          const [countResult] = await this.db
            .select({ count: sql<number>`COUNT(*)` })
            .from(schema.bills);
          
          billsProcessed = countResult.count;

          // Rebuild all search vectors
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
          `);

          billsUpdated = updateResult.rowCount || 0;

          // Analyze and optimize the search index
          await this.db.execute(sql`ANALYZE bills`);
          
          // Reindex the GIN index for better performance
          await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_search_vector`);

          return { billsProcessed, billsUpdated };
        },
        { billsProcessed: 0, billsUpdated: 0 },
        'rebuildAllIndexes'
      );

      billsProcessed = result.data.billsProcessed;
      billsUpdated = result.data.billsUpdated;

      // Clear all search-related caches
      await this.clearSearchCaches();

      const duration = Date.now() - startTime;
      
      console.log(`✅ Search index rebuild completed in ${duration}ms`);
      console.log(`📊 Bills processed: ${billsProcessed}, Bills updated: ${billsUpdated}`);

      return {
        success: true,
        billsProcessed,
        billsUpdated,
        errors,
        duration,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      };

    } catch (error) {
      errors = 1;
      errorDetails.push(error instanceof Error ? error.message : String(error));
      
      logger.error('❌ Search index rebuild failed:', { component: 'SimpleTool' }, error);
      
      return {
        success: false,
        billsProcessed,
        billsUpdated,
        errors,
        duration: Date.now() - startTime,
        errorDetails
      };
    }
  }

  /**
   * Get comprehensive search index health status
   */
  async getIndexHealth(): Promise<SearchIndexHealth> {
    // Check if system is in demo mode first
    if (demoDataService.isDemoMode()) {
      logger.info('🔍 Search index health check: System in demo mode, returning demo health status', { component: 'SimpleTool' });
      const demoBills = demoDataService.getBills();
      return {
        status: 'healthy',
        totalBills: demoBills.length,
        indexedBills: demoBills.length, // All demo bills are considered indexed
        missingIndexes: 0,
        indexCoverage: 100, // Demo data is fully indexed
        lastIndexUpdate: new Date(),
        performanceMetrics: {
          averageSearchTime: 50, // Mock performance metrics
          indexSize: 1024 * 1024, // 1MB mock size
          fragmentationLevel: 5 // Low fragmentation
        },
        recommendations: ['System operating in demo mode with sample data']
      };
    }

    try {
      const result = await databaseService.withFallback(
        async () => {
          // Get basic index statistics
          logger.info('🔍 Executing search index health query...', { component: 'SimpleTool' });
          const executeResult = await this.db.execute(sql`
            SELECT
              COUNT(*) as total_bills,
              COUNT(search_vector) as indexed_bills,
              COUNT(*) - COUNT(search_vector) as missing_indexes,
              MAX(updated_at) as last_update
            FROM bills
          `);
          logger.info('🔍 Execute result type:', { component: 'SimpleTool' }, typeof executeResult, 'isArray:', Array.isArray(executeResult), 'length:', executeResult?.length);

          if (!Array.isArray(executeResult)) {
            logger.error('❌ Database execute returned non-array result:', { component: 'SimpleTool' }, executeResult);
            throw new Error(`Database execute returned non-array result: ${typeof executeResult}`);
          }

          if (executeResult.length === 0) {
            console.warn('⚠️ Database query returned no rows');
            // Return default values for empty result
            return {
              status: 'offline' as const,
              totalBills: 0,
              indexedBills: 0,
              missingIndexes: 0,
              indexCoverage: 0,
              lastIndexUpdate: null,
              performanceMetrics: {
                averageSearchTime: 0,
                indexSize: 0,
                fragmentationLevel: 0
              },
              recommendations: ['Database query returned no results']
            };
          }

          const [indexStats] = executeResult;
          logger.info('🔍 Index stats:', { component: 'SimpleTool' }, indexStats);

          const totalBills = parseInt(indexStats.total_bills as string);
          const indexedBills = parseInt(indexStats.indexed_bills as string);
          const missingIndexes = parseInt(indexStats.missing_indexes as string);
          const lastIndexUpdate = indexStats.last_update ? new Date(indexStats.last_update as string) : null;

          // Calculate coverage percentage
          const indexCoverage = totalBills > 0 ? (indexedBills / totalBills) * 100 : 0;

          // Get index size and performance metrics
          const [indexSizeResult] = await this.db.execute(sql`
            SELECT pg_size_pretty(pg_total_relation_size('idx_bills_search_vector')) as index_size,
                   pg_total_relation_size('idx_bills_search_vector') as index_size_bytes
          `);

          const indexSize = parseInt(indexSizeResult.index_size_bytes as string) || 0;

          // Calculate average search time from recent performance history
          const recentMetrics = this.performanceHistory.slice(-100);
          const averageSearchTime = recentMetrics.length > 0 
            ? recentMetrics.reduce((sum, m) => sum + m.searchTime, 0) / recentMetrics.length
            : 0;

          // Determine health status
          let status: SearchIndexHealth['status'];
          if (indexCoverage >= 95) {
            status = 'healthy';
          } else if (indexCoverage >= 80) {
            status = 'degraded';
          } else if (indexCoverage >= 50) {
            status = 'critical';
          } else {
            status = 'offline';
          }

          // Generate recommendations
          const recommendations: string[] = [];
          if (missingIndexes > 0) {
            recommendations.push(`${missingIndexes} bills need search index updates`);
          }
          if (averageSearchTime > 500) {
            recommendations.push('Search performance is slow, consider index optimization');
          }
          if (indexCoverage < 90) {
            recommendations.push('Run full index rebuild to improve search coverage');
          }

          return {
            status,
            totalBills,
            indexedBills,
            missingIndexes,
            indexCoverage,
            lastIndexUpdate,
            performanceMetrics: {
              averageSearchTime,
              indexSize,
              fragmentationLevel: 0 // TODO: Calculate actual fragmentation
            },
            recommendations
          };
        },
        {
          status: 'offline' as const,
          totalBills: 0,
          indexedBills: 0,
          missingIndexes: 0,
          indexCoverage: 0,
          lastIndexUpdate: null,
          performanceMetrics: {
            averageSearchTime: 0,
            indexSize: 0,
            fragmentationLevel: 0
          },
          recommendations: ['Database connection unavailable']
        },
        'getIndexHealth'
      );

      return result.data;
    } catch (error) {
      logger.error('Error getting search index health:', { component: 'SimpleTool' }, error);
      return {
        status: 'offline',
        totalBills: 0,
        indexedBills: 0,
        missingIndexes: 0,
        indexCoverage: 0,
        lastIndexUpdate: null,
        performanceMetrics: {
          averageSearchTime: 0,
          indexSize: 0,
          fragmentationLevel: 0
        },
        recommendations: ['Error retrieving index health information']
      };
    }
  }

  /**
   * Record search performance metrics
   */
  recordSearchPerformance(metrics: Omit<IndexPerformanceMetrics, 'timestamp'>): void {
    const performanceMetric: IndexPerformanceMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.performanceHistory.push(performanceMetric);

    // Keep only recent metrics
    if (this.performanceHistory.length > this.maxPerformanceHistory) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceHistory);
    }

    // Log slow searches
    if (metrics.searchTime > 1000) {
      console.warn(`🐌 Slow search detected: ${metrics.searchTime}ms for ${metrics.resultCount} results`);
    }
  }

  /**
   * Optimize search indexes for better performance
   */
  async optimizeIndexes(): Promise<{ success: boolean; operations: string[]; duration: number }> {
    const startTime = Date.now();
    const operations: string[] = [];

    // Check if system is in demo mode
    if (demoDataService.isDemoMode()) {
      logger.info('🔄 Demo mode: Skipping search index optimization', { component: 'SimpleTool' });
      return {
        success: true,
        operations: ['Demo mode - no optimization needed'],
        duration: Date.now() - startTime
      };
    }

    try {
      await databaseService.withFallback(
        async () => {
          // Analyze the bills table for better query planning
          await this.db.execute(sql`ANALYZE bills`);
          operations.push('Analyzed bills table');

          // Update table statistics
          await this.db.execute(sql`VACUUM ANALYZE bills`);
          operations.push('Updated table statistics');

          // Reindex the search vector index
          await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_search_vector`);
          operations.push('Reindexed search vector');

          // Update other relevant indexes
          await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_status_date`);
          operations.push('Reindexed status-date index');

          await this.db.execute(sql`REINDEX INDEX CONCURRENTLY idx_bills_category_date`);
          operations.push('Reindexed category-date index');

          return true;
        },
        false,
        'optimizeIndexes'
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Search index optimization completed in ${duration}ms`);

      return { success: true, operations, duration };
    } catch (error) {
      logger.error('❌ Search index optimization failed:', { component: 'SimpleTool' }, error);
      return { 
        success: false, 
        operations: [...operations, `Error: ${error instanceof Error ? error.message : String(error)}`], 
        duration: Date.now() - startTime 
      };
    }
  }

  /**
   * Get search index statistics for monitoring
   */
  async getIndexStatistics(): Promise<{
    indexSize: string;
    indexSizeBytes: number;
    totalRows: number;
    indexedRows: number;
    indexEfficiency: number;
    lastVacuum: Date | null;
    lastAnalyze: Date | null;
  }> {
    // Check if system is in demo mode
    if (demoDataService.isDemoMode()) {
      logger.info('🔍 Search index statistics: System in demo mode, returning demo statistics', { component: 'SimpleTool' });
      const demoBills = demoDataService.getBills();
      return {
        indexSize: '1.0 MB',
        indexSizeBytes: 1024 * 1024,
        totalRows: demoBills.length,
        indexedRows: demoBills.length,
        indexEfficiency: 100,
        lastVacuum: new Date(),
        lastAnalyze: new Date()
      };
    }

    try {
      const result = await databaseService.withFallback(
        async () => {
          const [stats] = await this.db.execute(sql`
            SELECT 
              pg_size_pretty(pg_total_relation_size('idx_bills_search_vector')) as index_size,
              pg_total_relation_size('idx_bills_search_vector') as index_size_bytes,
              (SELECT COUNT(*) FROM bills) as total_rows,
              (SELECT COUNT(*) FROM bills WHERE search_vector IS NOT NULL) as indexed_rows,
              (SELECT last_vacuum FROM pg_stat_user_tables WHERE relname = 'bills') as last_vacuum,
              (SELECT last_analyze FROM pg_stat_user_tables WHERE relname = 'bills') as last_analyze
          `);

          const totalRows = parseInt(stats.total_rows as string);
          const indexedRows = parseInt(stats.indexed_rows as string);
          const indexEfficiency = totalRows > 0 ? (indexedRows / totalRows) * 100 : 0;

          return {
            indexSize: stats.index_size as string,
            indexSizeBytes: parseInt(stats.index_size_bytes as string),
            totalRows,
            indexedRows,
            indexEfficiency,
            lastVacuum: stats.last_vacuum ? new Date(stats.last_vacuum as string) : null,
            lastAnalyze: stats.last_analyze ? new Date(stats.last_analyze as string) : null
          };
        },
        {
          indexSize: '0 bytes',
          indexSizeBytes: 0,
          totalRows: 0,
          indexedRows: 0,
          indexEfficiency: 0,
          lastVacuum: null,
          lastAnalyze: null
        },
        'getIndexStatistics'
      );

      return result.data;
    } catch (error) {
      logger.error('Error getting index statistics:', { component: 'SimpleTool' }, error);
      return {
        indexSize: 'Error',
        indexSizeBytes: 0,
        totalRows: 0,
        indexedRows: 0,
        indexEfficiency: 0,
        lastVacuum: null,
        lastAnalyze: null
      };
    }
  }

  // Private helper methods

  /**
   * Validate that search index setup is correct
   */
  private async validateSearchIndexSetup(): Promise<void> {
    // Skip validation in demo mode
    if (demoDataService.isDemoMode()) {
      logger.info('🔄 Demo mode: Skipping search index setup validation', { component: 'SimpleTool' });
      return;
    }

    try {
      // Check if search_vector column exists
      const columnCheckResult = await this.db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'bills' AND column_name = 'search_vector'
      `);

      if (!columnCheckResult || columnCheckResult.length === 0) {
        throw new Error('search_vector column not found in bills table');
      }

      // Check if GIN index exists
      const indexCheckResult = await this.db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'bills' AND indexname = 'idx_bills_search_vector'
      `);

      if (!indexCheckResult || indexCheckResult.length === 0) {
        console.warn('⚠️ GIN index for search_vector not found, creating...');
        await this.db.execute(sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_search_vector
          ON bills USING GIN(search_vector)
        `);
      }

      // Check if trigger exists
      const triggerCheckResult = await this.db.execute(sql`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'bills' AND trigger_name = 'bills_search_vector_update'
      `);

      if (!triggerCheckResult || triggerCheckResult.length === 0) {
        console.warn('⚠️ Search vector update trigger not found');
      }

      logger.info('✅ Search index setup validation completed', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Search index setup validation failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
    * Start periodic health monitoring
    */
    private startHealthMonitoring(): void {
      // Check health every 30 minutes
      this.healthMonitoringInterval = setInterval(async () => {
        try {
          const health = await this.getIndexHealth();

          // Only log warnings and auto-rebuild for database mode
          if (!demoDataService.isDemoMode()) {
            if (health.status === 'critical' || health.status === 'offline') {
              console.warn(`⚠️ Search index health is ${health.status}:`, health.recommendations);
            }

            // Auto-rebuild if too many missing indexes
            if (health.missingIndexes > 100) {
              logger.info('🔄 Auto-triggering index rebuild due to many missing indexes', { component: 'SimpleTool' });
              await this.rebuildAllIndexes();
            }
          }

          // Perform memory cleanup
          this.performMemoryCleanup();

          // Log memory usage for search index manager
          const memUsage = process.memoryUsage();
          const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

          logger.info('Search Index Manager Memory Analysis:', { component: 'SimpleTool' }, {
            performanceHistorySize: this.performanceHistory.length,
            indexUpdateQueueSize: this.indexUpdateQueue.size,
            isProcessingQueue: this.isProcessingQueue,
            heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Error during health monitoring:', { component: 'SimpleTool' }, error);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }

  /**
   * Perform memory cleanup for search index manager
   */
  private performMemoryCleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago

    // Clean up old performance history entries
    const perfHistoryBefore = this.performanceHistory.length;
    this.performanceHistory = this.performanceHistory.filter(entry => {
      // Keep entries from the last hour, or the most recent 500 entries
      return entry.timestamp.getTime() > oneHourAgo ||
             this.performanceHistory.indexOf(entry) >= Math.max(0, this.performanceHistory.length - 500);
    });

    const cleanedItems = perfHistoryBefore - this.performanceHistory.length;

    if (cleanedItems > 0) {
      logger.info('🧹 Search Index Manager Memory Cleanup:', { component: 'SimpleTool' }, {
        performanceHistoryCleaned: cleanedItems,
        remainingHistorySize: this.performanceHistory.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start processing the index update queue
   */
  private startQueueProcessing(): void {
    // Process queue every 5 minutes
    this.queueProcessingInterval = setInterval(async () => {
      if (this.isProcessingQueue || this.indexUpdateQueue.size === 0) {
        return;
      }

      this.isProcessingQueue = true;

      try {
        const billIds = Array.from(this.indexUpdateQueue);
        this.indexUpdateQueue.clear();

        console.log(`🔄 Processing ${billIds.length} bills for search index updates`);

        let updated = 0;
        for (const billId of billIds) {
          const success = await this.updateBillSearchIndex(billId);
          if (success) updated++;
        }

        console.log(`✅ Updated search indexes for ${updated}/${billIds.length} bills`);
      } catch (error) {
        logger.error('Error processing index update queue:', { component: 'SimpleTool' }, error);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Shutdown the search index manager
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down search index manager...', { component: 'SimpleTool' });

    try {
      // Stop the health monitoring interval
      if (this.healthMonitoringInterval) {
        clearInterval(this.healthMonitoringInterval);
        this.healthMonitoringInterval = null;
      }

      // Stop the queue processing interval
      if (this.queueProcessingInterval) {
        clearInterval(this.queueProcessingInterval);
        this.queueProcessingInterval = null;
      }

      // Clear any pending queue items
      this.indexUpdateQueue.clear();

      // Clear caches
      await this.clearSearchCaches();

      logger.info('✅ Search index manager shut down successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Error shutting down search index manager:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Clear search-related caches
   */
  private async clearSearchCaches(): Promise<void> {
    try {
      await cacheService.deletePattern('search:*');
      await cacheService.deletePattern('bills:search:*');
      logger.info('🧹 Search caches cleared', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Error clearing search caches:', { component: 'SimpleTool' }, error);
    }
  }
}

// Export singleton instance
export const searchIndexManager = new SearchIndexManager();








