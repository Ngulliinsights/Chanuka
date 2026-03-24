/**
 * Government Data Repository Implementation
 * Data access layer implementation with caching and validation
 */

import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { securityAuditService } from '@server/features/security';
import { ServiceResult, createOk, createError } from '@server/infrastructure/error-handling';
import { 
  government_data, 
  government_sync_logs,
  type GovernmentData,
  type GovernmentSyncLog 
} from '@server/infrastructure/schema';
import { and, eq, desc, gte, lte, count } from 'drizzle-orm';
import { IGovernmentDataRepository } from '../../domain/repositories/government-data.repository.interface';
import { 
  GovernmentDataEntity,
  GovernmentSyncLogEntity,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  SyncLogCreateInput
} from '../../domain/entities/government-data.entity';

export class GovernmentDataRepositoryImpl implements IGovernmentDataRepository {
  private readonly cachePrefix = 'gov-data';

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async findById(id: number): Promise<ServiceResult<GovernmentDataEntity | null>> {
    try {
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
        return createOk(this.mapToEntity(cached));
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
        return createOk(this.mapToEntity(data));
      }

      return createOk(null);
    } catch (error) {
      logger.error({ error, id }, 'Failed to find government data by ID');
      return createError('REPOSITORY_ERROR', 'Failed to find government data', { id });
    }
  }

  async findByExternalId(externalId: string, source: string): Promise<ServiceResult<GovernmentDataEntity | null>> {
    try {
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
        return createOk(this.mapToEntity(cached));
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
        return createOk(this.mapToEntity(data));
      }

      return createOk(null);
    } catch (error) {
      logger.error({ error, externalId, source }, 'Failed to find government data by external ID');
      return createError('REPOSITORY_ERROR', 'Failed to find government data', { externalId, source });
    }
  }

  async findMany(options: GovernmentDataQueryOptions = {}): Promise<ServiceResult<GovernmentDataEntity[]>> {
    try {
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
        return createOk(cached.map(this.mapToEntity));
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

      return createOk(results.map(this.mapToEntity));
    } catch (error) {
      logger.error({ error, options }, 'Failed to find government data');
      return createError('REPOSITORY_ERROR', 'Failed to find government data', { options });
    }
  }

  async count(options: Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {}): Promise<ServiceResult<number>> {
    try {
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
        return createOk(cached);
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

      return createOk(totalCount);
    } catch (error) {
      logger.error({ error, options }, 'Failed to count government data');
      return createError('REPOSITORY_ERROR', 'Failed to count government data', { options });
    }
  }

  // ==========================================================================
  // Mutation Operations
  // ==========================================================================

  async create(input: GovernmentDataCreateInput): Promise<ServiceResult<GovernmentDataEntity>> {
    try {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'create',
        dataType: input.dataType,
        source: input.source
      };
      logger.info(logContext, 'Creating government data');

      const now = new Date();
      const result = await withTransaction(async (tx) => {
        return await tx
          .insert(government_data)
          .values({
            data_type: input.dataType,
            source: input.source,
            external_id: input.externalId,
            title: input.title,
            content: input.content,
            metadata: input.metadata,
            status: input.status,
            published_date: input.publishedDate,
            effective_date: input.effectiveDate,
            created_at: now,
            updated_at: now,
          })
          .returning();
      });

      const newData = result[0];

      // Invalidate related caches
      await this.invalidateListCaches(input.dataType, input.source);

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
          data_type: input.dataType,
          source: input.source,
          external_id: input.externalId
        }
      });

      logger.info({ ...logContext, id: newData.id }, 'Government data created successfully');
      return createOk(this.mapToEntity(newData));
    } catch (error) {
      logger.error({ error, input }, 'Failed to create government data');
      return createError('REPOSITORY_ERROR', 'Failed to create government data', { input });
    }
  }

  async update(id: number, input: GovernmentDataUpdateInput): Promise<ServiceResult<GovernmentDataEntity>> {
    try {
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
            title: input.title,
            content: input.content,
            metadata: input.metadata,
            status: input.status,
            published_date: input.publishedDate,
            effective_date: input.effectiveDate,
            updated_at: new Date(),
          })
          .where(eq(government_data.id, id))
          .returning();
      });

      const updatedData = result[0];
      if (!updatedData) {
        return createError('NOT_FOUND', `Government data with ID ${id} not found`, { id });
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
      return createOk(this.mapToEntity(updatedData));
    } catch (error) {
      logger.error({ error, id, input }, 'Failed to update government data');
      return createError('REPOSITORY_ERROR', 'Failed to update government data', { id, input });
    }
  }

  async delete(id: number): Promise<ServiceResult<boolean>> {
    try {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'delete',
        id
      };
      logger.info(logContext, 'Deleting government data');

      // Get data before deletion for cache invalidation
      const existingData = await this.findById(id);
      if (!existingData.isOk || !existingData.value) {
        return createOk(false);
      }

      const data = existingData.value;

      const result = await withTransaction(async (tx) => {
        return await tx
          .delete(government_data)
          .where(eq(government_data.id, id))
          .returning();
      });

      const deleted = result.length > 0;

      if (deleted) {
        // Invalidate caches
        await this.invalidateCaches(id, data.dataType, data.source);

        // Audit log
        await securityAuditService.logSecurityEvent({
          event_type: 'government_data_deleted',
          severity: 'medium',
          action: 'delete',
          resource_type: 'government_data',
          resource_id: id.toString(),
          metadata: {
            data_type: data.dataType,
            source: data.source
          }
        });

        logger.info(logContext, 'Government data deleted successfully');
      }

      return createOk(deleted);
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete government data');
      return createError('REPOSITORY_ERROR', 'Failed to delete government data', { id });
    }
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async createSyncLog(input: SyncLogCreateInput): Promise<ServiceResult<GovernmentSyncLogEntity>> {
    try {
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
            source: input.source,
            operation: input.operation,
            status: input.status,
            records_processed: input.recordsProcessed,
            records_created: input.recordsCreated,
            records_updated: input.recordsUpdated,
            records_failed: input.recordsFailed,
            error_details: input.errorDetails,
            metadata: input.metadata,
            created_at: now,
          })
          .returning();
      });

      const syncLog = result[0];
      logger.info({ ...logContext, id: syncLog.id }, 'Sync log created successfully');

      return createOk(this.mapSyncLogToEntity(syncLog));
    } catch (error) {
      logger.error({ error, input }, 'Failed to create sync log');
      return createError('REPOSITORY_ERROR', 'Failed to create sync log', { input });
    }
  }

  async getSyncLogs(source?: string, limit: number = 50): Promise<ServiceResult<GovernmentSyncLogEntity[]>> {
    try {
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
        return createOk(cached.map(this.mapSyncLogToEntity));
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

      return createOk(results.map(this.mapSyncLogToEntity));
    } catch (error) {
      logger.error({ error, source, limit }, 'Failed to get sync logs');
      return createError('REPOSITORY_ERROR', 'Failed to get sync logs', { source, limit });
    }
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  async getDataTypes(): Promise<ServiceResult<string[]>> {
    try {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getDataTypes'
      };
      logger.debug(logContext, 'Getting data types');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'data-types', {});
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return createOk(cached);
      }

      const results = await readDatabase
        .selectDistinct({ data_type: government_data.data_type })
        .from(government_data)
        .where(eq(government_data.status, 'active'));

      const dataTypes = results.map((r: any) => r.data_type).filter(Boolean);

      // Cache with longer TTL (metadata changes infrequently)
      await cacheService.set(cacheKey, dataTypes, CACHE_TTL.LONG);

      return createOk(dataTypes);
    } catch (error) {
      logger.error({ error }, 'Failed to get data types');
      return createError('REPOSITORY_ERROR', 'Failed to get data types');
    }
  }

  async getSources(): Promise<ServiceResult<string[]>> {
    try {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getSources'
      };
      logger.debug(logContext, 'Getting sources');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'sources', {});
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return createOk(cached);
      }

      const results = await readDatabase
        .selectDistinct({ source: government_data.source })
        .from(government_data);

      const sources = results.map((r: any) => r.source).filter(Boolean);

      // Cache with longer TTL
      await cacheService.set(cacheKey, sources, CACHE_TTL.LONG);

      return createOk(sources);
    } catch (error) {
      logger.error({ error }, 'Failed to get sources');
      return createError('REPOSITORY_ERROR', 'Failed to get sources');
    }
  }

  async getStatistics(): Promise<ServiceResult<{
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  }>> {
    try {
      const logContext = { 
        component: 'GovernmentDataRepository', 
        operation: 'getStatistics'
      };
      logger.debug(logContext, 'Getting statistics');

      const cacheKey = cacheKeys.query(this.cachePrefix, 'statistics', {});
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return createOk(cached);
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

      const byDataType = dataTypeResults.reduce((acc: any, row: any) => {
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

      const bySource = sourceResults.reduce((acc: any, row: any) => {
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

      const byStatus = statusResults.reduce((acc: any, row: any) => {
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

      return createOk(statistics);
    } catch (error) {
      logger.error({ error }, 'Failed to get statistics');
      return createError('REPOSITORY_ERROR', 'Failed to get statistics');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private mapToEntity(data: GovernmentData): GovernmentDataEntity {
    return {
      id: data.id,
      dataType: data.data_type,
      source: data.source,
      externalId: data.external_id || undefined,
      title: data.title || undefined,
      content: data.content,
      metadata: data.metadata || undefined,
      status: data.status || undefined,
      publishedDate: data.published_date || undefined,
      effectiveDate: data.effective_date || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapSyncLogToEntity(log: GovernmentSyncLog): GovernmentSyncLogEntity {
    return {
      id: log.id,
      source: log.source,
      operation: log.operation,
      status: log.status as 'success' | 'error' | 'partial',
      recordsProcessed: log.records_processed,
      recordsCreated: log.records_created,
      recordsUpdated: log.records_updated,
      recordsFailed: log.records_failed,
      errorDetails: log.error_details || undefined,
      metadata: log.metadata || undefined,
      createdAt: log.created_at,
    };
  }

  private async invalidateCaches(id: number, dataType: string, source: string): Promise<void> {
    const patterns = [
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

    await cacheService.invalidatePattern(patterns);
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

// Export singleton instance
export const governmentDataRepository = new GovernmentDataRepositoryImpl();