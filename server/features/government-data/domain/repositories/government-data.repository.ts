/**
 * Government Data Repository
 * Data access layer for government data with caching and validation
 */

import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { securityAuditService } from '@server/features/security';
import { AsyncServiceResult, safeAsync } from '@server/infrastructure/error-handling';
import { 
  government_data, 
  government_sync_logs,
  type GovernmentData,
  type GovernmentSyncLog 
} from '@server/infrastructure/schema';
import { and, eq, desc, gte, lte, like, inArray, count } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface GovernmentDataQueryOptions {
  dataType?: string;
  source?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'data_type' | 'source';
  sortOrder?: 'asc' | 'desc';
}

export interface GovernmentDataCreateInput {
  data_type: string;
  source: string;
  external_id?: string;
  title?: string;
  content: any;
  metadata?: any;
  status?: string;
  published_date?: Date;
  effective_date?: Date;
}

export interface GovernmentDataUpdateInput {
  title?: string;
  content?: any;
  metadata?: any;
  status?: string;
  published_date?: Date;
  effective_date?: Date;
}

export interface SyncLogCreateInput {
  source: string;
  operation: string;
  status: 'success' | 'error' | 'partial';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details?: any;
  metadata?: any;
}

// ============================================================================
// Repository Class
// ============================================================================

export class GovernmentDataRepository {
  private readonly cachePrefix = 'gov-data';

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async findById(id: number): AsyncServiceResult<GovernmentData | null> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'findById', 
        id 
      };
      logger.debug(logContext, 'Finding government data by ID');

      // Check cache first
      const cacheKey = cacheKeys.entity(this.cachePrefix, id.toString());
      const cached = await cacheService.get<GovernmentData>(cacheKey);
      if (cached) {
        logger.debug(logContext, 'Cache hit for government data');
        return cached;
      }

      // Query database
      const result = await readDatabase
        .select()
        .from(government_data)
        .where(eq(government_data.id, id))
        .limit(1);

      const data = result[0] || null;

      // Cache result if found
      if (data) {
        await cacheService.set(cacheKey, data, CACHE_TTL.GOVERNMENT_DATA);
        logger.debug(logContext, 'Government data cached');
      }

      return data;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'findById',
      context: { id }
    });
  }

  async findByExternalId(externalId: string, source: string): AsyncServiceResult<GovernmentData | null> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'findByExternalId', 
        externalId,
        source
      };
      logger.debug(logContext, 'Finding government data by external ID');

      // Check cache first
      const cacheKey = cacheKeys.entity(this.cachePrefix, `${source}:${externalId}`);
      const cached = await cacheService.get<GovernmentData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Query database
      const result = await readDatabase
        .select()
        .from(government_data)
        .where(
          and(
            eq(government_data.external_id, externalId),
            eq(government_data.source, source)
          )
        )
        .limit(1);

      const data = result[0] || null;

      // Cache result if found
      if (data) {
        await cacheService.set(cacheKey, data, CACHE_TTL.GOVERNMENT_DATA);
      }

      return data;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'findByExternalId',
      context: { externalId, source }
    });
  }

  async findMany(options: GovernmentDataQueryOptions = {}): AsyncServiceResult<GovernmentData[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'findMany', 
        options 
      };
      logger.debug(logContext, 'Finding government data with options');

      // Build cache key from options
      const cacheKey = cacheKeys.query(this.cachePrefix, 'list', options);
      const cached = await cacheService.get<GovernmentData[]>(cacheKey);
      if (cached) {
        logger.debug(logContext, 'Cache hit for government data list');
        return cached;
      }

      // Build query
      let query = readDatabase.select().from(government_data);

      // Apply filters
      const conditions = [];
      if (options.dataType) {
        conditions.push(eq(government_data.data_type, options.dataType));
      }
      if (options.source) {
        conditions.push(eq(government_data.source, options.source));
      }
      if (options.status) {
        conditions.push(eq(government_data.status, options.status));
      }
      if (options.dateFrom) {
        conditions.push(gte(government_data.created_at, options.dateFrom));
      }
      if (options.dateTo) {
        conditions.push(lte(government_data.created_at, options.dateTo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      const sortColumn = government_data[sortBy as keyof typeof government_data];
      
      if (sortColumn) {
        query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : sortColumn);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;

      // Cache results
      await cacheService.set(cacheKey, results, CACHE_TTL.GOVERNMENT_DATA);
      logger.debug({ ...logContext, count: results.length }, 'Government data list cached');

      return results;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'findMany',
      context: { options }
    });
  }

  async count(options: Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {}): AsyncServiceResult<number> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'count', 
        options 
      };
      logger.debug(logContext, 'Counting government data');

      // Build cache key
      const cacheKey = cacheKeys.query(this.cachePrefix, 'count', options);
      const cached = await cacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Build query
      let query = readDatabase.select({ count: count() }).from(government_data);

      // Apply filters
      const conditions = [];
      if (options.dataType) {
        conditions.push(eq(government_data.data_type, options.dataType));
      }
      if (options.source) {
        conditions.push(eq(government_data.source, options.source));
      }
      if (options.status) {
        conditions.push(eq(government_data.status, options.status));
      }
      if (options.dateFrom) {
        conditions.push(gte(government_data.created_at, options.dateFrom));
      }
      if (options.dateTo) {
        conditions.push(lte(government_data.created_at, options.dateTo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      const totalCount = result[0]?.count || 0;

      // Cache count
      await cacheService.set(cacheKey, totalCount, CACHE_TTL.GOVERNMENT_DATA);

      return totalCount;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'count',
      context: { options }
    });
  }

  // ==========================================================================
  // Mutation Operations
  // ==========================================================================

  async create(input: GovernmentDataCreateInput): AsyncServiceResult<GovernmentData> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'create',
        dataType: input.data_type,
        source: input.source
      };
      logger.info(logContext, 'Creating government data');

      const now = new Date();
      const result = await withTransaction(async (tx) => {
        return await tx
          .insert(government_data)
          .values({
            ...input,
            created_at: now,
            updated_at: now,
          })
          .returning();
      });

      const newData = result[0];

      // Invalidate related caches
      await this.invalidateListCaches(input.data_type, input.source);

      // Cache the new record
      const cacheKey = cacheKeys.entity(this.cachePrefix, newData.id.toString());
      await cacheService.set(cacheKey, newData, CACHE_TTL.GOVERNMENT_DATA);

      // Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'government_data_created',
        severity: 'low',
        action: 'create',
        resource_type: 'government_data',
        resource_id: newData.id.toString(),
        metadata: {
          data_type: input.data_type,
          source: input.source,
          external_id: input.external_id
        }
      });

      logger.info({ ...logContext, id: newData.id }, 'Government data created successfully');
      return newData;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'create',
      context: { input }
    });
  }

  async update(id: number, input: GovernmentDataUpdateInput): AsyncServiceResult<GovernmentData> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'update',
        id
      };
      logger.info(logContext, 'Updating government data');

      const result = await withTransaction(async (tx) => {
        return await tx
          .update(government_data)
          .set({
            ...input,
            updated_at: new Date(),
          })
          .where(eq(government_data.id, id))
          .returning();
      });

      const updatedData = result[0];
      if (!updatedData) {
        throw new Error(`Government data with ID ${id} not found`);
      }

      // Invalidate caches
      await this.invalidateCaches(id, updatedData.data_type, updatedData.source);

      // Cache updated record
      const cacheKey = cacheKeys.entity(this.cachePrefix, id.toString());
      await cacheService.set(cacheKey, updatedData, CACHE_TTL.GOVERNMENT_DATA);

      // Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'government_data_updated',
        severity: 'low',
        action: 'update',
        resource_type: 'government_data',
        resource_id: id.toString(),
        metadata: input
      });

      logger.info(logContext, 'Government data updated successfully');
      return updatedData;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'update',
      context: { id, input }
    });
  }

  async delete(id: number): AsyncServiceResult<boolean> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'delete',
        id
      };
      logger.info(logContext, 'Deleting government data');

      // Get data before deletion for cache invalidation
      const existingData = await this.findById(id);
      if (!existingData.success || !existingData.data) {
        return false;
      }

      const data = existingData.data;

      const result = await withTransaction(async (tx) => {
        return await tx
          .delete(government_data)
          .where(eq(government_data.id, id))
          .returning();
      });

      const deleted = result.length > 0;

      if (deleted) {
        // Invalidate caches
        await this.invalidateCaches(id, data.data_type, data.source);

        // Audit log
        await securityAuditService.logSecurityEvent({
          event_type: 'government_data_deleted',
          severity: 'medium',
          action: 'delete',
          resource_type: 'government_data',
          resource_id: id.toString(),
          metadata: {
            data_type: data.data_type,
            source: data.source
          }
        });

        logger.info(logContext, 'Government data deleted successfully');
      }

      return deleted;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'delete',
      context: { id }
    });
  }

  // ==========================================================================
  // Sync Log Operations
  // ==========================================================================

  async createSyncLog(input: SyncLogCreateInput): AsyncServiceResult<GovernmentSyncLog> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'createSyncLog',
        source: input.source,
        operation: input.operation
      };
      logger.info(logContext, 'Creating sync log');

      const now = new Date();
      const result = await withTransaction(async (tx) => {
        return await tx
          .insert(government_sync_logs)
          .values({
            ...input,
            created_at: now,
          })
          .returning();
      });

      const syncLog = result[0];
      logger.info({ ...logContext, id: syncLog.id }, 'Sync log created successfully');

      return syncLog;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'createSyncLog',
      context: { input }
    });
  }

  async getSyncLogs(source?: string, limit: number = 50): AsyncServiceResult<GovernmentSyncLog[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getSyncLogs',
        source,
        limit
      };
      logger.debug(logContext, 'Getting sync logs');

      // Build cache key
      const cacheKey = cacheKeys.query(this.cachePrefix, 'sync-logs', { source, limit });
      const cached = await cacheService.get<GovernmentSyncLog[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      let query = readDatabase
        .select()
        .from(government_sync_logs)
        .orderBy(desc(government_sync_logs.created_at))
        .limit(limit);

      if (source) {
        query = query.where(eq(government_sync_logs.source, source));
      }

      const results = await query;

      // Cache results (shorter TTL for logs)
      await cacheService.set(cacheKey, results, CACHE_TTL.SHORT);

      return results;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'getSyncLogs',
      context: { source, limit }
    });
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  async getDataTypes(): AsyncServiceResult<string[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getDataTypes'
      };
      logger.debug(logContext, 'Getting data types');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'data-types', {});
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const results = await readDatabase
        .selectDistinct({ data_type: government_data.data_type })
        .from(government_data)
        .where(eq(government_data.status, 'active'));

      const dataTypes = results.map(r => r.data_type).filter(Boolean);

      // Cache with longer TTL (metadata changes infrequently)
      await cacheService.set(cacheKey, dataTypes, CACHE_TTL.LONG);

      return dataTypes;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'getDataTypes'
    });
  }

  async getSources(): AsyncServiceResult<string[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getSources'
      };
      logger.debug(logContext, 'Getting sources');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'sources', {});
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const results = await readDatabase
        .selectDistinct({ source: government_data.source })
        .from(government_data);

      const sources = results.map(r => r.source).filter(Boolean);

      // Cache with longer TTL
      await cacheService.set(cacheKey, sources, CACHE_TTL.LONG);

      return sources;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'getSources'
    });
  }

  async getStatistics(): AsyncServiceResult<{
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getStatistics'
      };
      logger.debug(logContext, 'Getting statistics');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'statistics', {});
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get total count
      const totalResult = await readDatabase
        .select({ count: count() })
        .from(government_data);
      const total = totalResult[0]?.count || 0;

      // Get counts by data type
      const dataTypeResults = await readDatabase
        .select({ 
          data_type: government_data.data_type, 
          count: count() 
        })
        .from(government_data)
        .groupBy(government_data.data_type);

      const byDataType = dataTypeResults.reduce((acc, row) => {
        acc[row.data_type] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Get counts by source
      const sourceResults = await readDatabase
        .select({ 
          source: government_data.source, 
          count: count() 
        })
        .from(government_data)
        .groupBy(government_data.source);

      const bySource = sourceResults.reduce((acc, row) => {
        acc[row.source] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Get counts by status
      const statusResults = await readDatabase
        .select({ 
          status: government_data.status, 
          count: count() 
        })
        .from(government_data)
        .groupBy(government_data.status);

      const byStatus = statusResults.reduce((acc, row) => {
        acc[row.status || 'unknown'] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const statistics = {
        total,
        byDataType,
        bySource,
        byStatus
      };

      // Cache statistics
      await cacheService.set(cacheKey, statistics, CACHE_TTL.MEDIUM);

      return statistics;
    }, { 
      service: 'GovernmentDataRepository', 
      operation: 'getStatistics'
    });
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private async invalidateCaches(id: number, dataType: string, source: string): Promise<void> {
    const cacheKeys = [
      // Individual record cache
      cacheKeys.entity(this.cachePrefix, id.toString()),
      // External ID cache
      cacheKeys.entity(this.cachePrefix, `${source}:*`),
      // List caches
      cacheKeys.query(this.cachePrefix, 'list', '*'),
      cacheKeys.query(this.cachePrefix, 'count', '*'),
      // Metadata caches
      cacheKeys.query(this.cachePrefix, 'data-types', {}),
      cacheKeys.query(this.cachePrefix, 'sources', {}),
      cacheKeys.query(this.cachePrefix, 'statistics', {}),
    ];

    await cacheService.invalidatePattern(cacheKeys);
    logger.debug({ id, dataType, source }, 'Government data caches invalidated');
  }

  private async invalidateListCaches(dataType: string, source: string): Promise<void> {
    const patterns = [
      cacheKeys.query(this.cachePrefix, 'list', '*'),
      cacheKeys.query(this.cachePrefix, 'count', '*'),
      cacheKeys.query(this.cachePrefix, 'statistics', {}),
    ];

    await cacheService.invalidatePattern(patterns);
    logger.debug({ dataType, source }, 'Government data list caches invalidated');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const governmentDataRepository = new GovernmentDataRepository();