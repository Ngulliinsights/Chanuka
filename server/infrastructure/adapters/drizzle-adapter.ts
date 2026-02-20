/**
 * DrizzleAdapter - Migration transition adapter for repository pattern migration
 * 
 * This adapter provides a temporary bridge during the migration from repository pattern
 * to direct Drizzle ORM usage. It maintains API compatibility while allowing gradual
 * migration of domain services.
 * 
 * Risk Mitigation:
 * - Comprehensive error handling with fallback mechanisms
 * - Performance monitoring and logging
 * - Type safety preservation
 * - Edge case validation
 */

import { logger } from '@server/infrastructure/observability';
import { database as db, withTransaction } from '@server/infrastructure/database';
import { and, asc, count, desc, eq, inArray, or, SQL, sql } from 'drizzle-orm';

// Type helper to ensure timestamp fields exist
type WithTimestamps<T> = T & {
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface EntityMapping<TEntity, TRow> {
  toEntity(row: TRow): TEntity;
  fromEntity(entity: TEntity): Partial<TRow>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'like' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'isNull';
  value: any;
}

/**
 * Generic Drizzle adapter for entity operations
 */
export class DrizzleAdapter<TEntity, TRow> {
  constructor(
    private table: any,
    private entityMapping: EntityMapping<TEntity, TRow>,
    private tableName: string
  ) {}

  /**
   * Find entity by ID with comprehensive error handling
   */
  async findById(id: string | number): Promise<TEntity | null> {
    const startTime = Date.now();
    
    try {
      const [row] = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      const result = row ? this.entityMapping.toEntity(row as TRow) : null;
      this.logPerformance('findById', startTime, { id, found: !!result });
      return result;
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'DrizzleAdapter',
        operation: `findById:${this.tableName}:${id}`,
        context: { id }
      });
      this.logError('findById', error, { id });
      return null;
    }
  }

  /**
   * Find multiple entities with filtering and pagination
   */
  async findMany(
    filters: FilterCondition[] = [],
    options: QueryOptions = {}
  ): Promise<TEntity[]> {
    const startTime = Date.now();
    
    try {
      let query = db.select().from(this.table);

      // Apply filters
      if (filters.length > 0) {
        const conditions = this.buildConditions(filters);
        query = query.where(and(...conditions));
      }

      // Apply ordering
      if (options.orderBy) {
        const orderColumn = this.table[options.orderBy];
        if (orderColumn) {
          query = options.orderDirection === 'asc' 
            ? query.orderBy(asc(orderColumn))
            : query.orderBy(desc(orderColumn));
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(Math.min(options.limit, 1000)); // Safety limit
      }
      if (options.offset) {
        query = query.offset(options.offset);
      }

      const rows = await query;
      const result = rows.map((row: TRow) => this.entityMapping.toEntity(row));

      this.logPerformance('findMany', startTime, { 
        filterCount: filters.length, 
        resultCount: result.length,
        options 
      });
      
      return result;
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'DrizzleAdapter',
        operation: `findMany:${this.tableName}`,
        context: { filters, options }
      });
      this.logError('findMany', error, { filters, options });
      return [];
    }
  }

  /**
   * Create new entity with validation
   */
  async create(entity: TEntity): Promise<TEntity> {
    const startTime = Date.now();
    
    try {
      const result = await withTransaction(
        async (tx) => {
          const insertData = this.entityMapping.fromEntity(entity) as WithTimestamps<Partial<TRow>>;
          
          // Add timestamps if not present
          const now = new Date();
          if (!insertData.created_at) {
            insertData.created_at = now;
          }
          if (!insertData.updated_at) {
            insertData.updated_at = now;
          }

          const [newRow] = await tx
            .insert(this.table)
            .values(insertData)
            .returning();

          return this.entityMapping.toEntity(newRow as TRow);
        },
        `DrizzleAdapter:create:${this.tableName}`
      );

      this.logPerformance('create', startTime, { created: true });
      return result.data;
    } catch (error) {
      this.logError('create', error, { entity });
      throw error;
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string | number, updates: Partial<TEntity>): Promise<TEntity | null> {
    const startTime = Date.now();
    
    try {
      const result = await withTransaction(
        async (tx) => {
          const updateData = this.entityMapping.fromEntity(updates as TEntity) as WithTimestamps<Partial<TRow>>;
          
          // Always update timestamp
          updateData.updated_at = new Date();

          const [updatedRow] = await tx
            .update(this.table)
            .set(updateData)
            .where(eq(this.table.id, id))
            .returning();

          return updatedRow ? this.entityMapping.toEntity(updatedRow as TRow) : null;
        },
        `DrizzleAdapter:update:${this.tableName}`
      );

      this.logPerformance('update', startTime, { id, updated: !!result.data });
      return result.data;
    } catch (error) {
      this.logError('update', error, { id, updates });
      throw error;
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string | number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = await withTransaction(
        async (tx) => {
          const deleteResult = await tx
            .delete(this.table)
            .where(eq(this.table.id, id));

          return deleteResult.rowCount > 0;
        },
        `DrizzleAdapter:delete:${this.tableName}`
      );

      this.logPerformance('delete', startTime, { id, deleted: result.data });
      return result.data;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  /**
   * Count entities with optional filters
   */
  async count(filters: FilterCondition[] = []): Promise<number> {
    const startTime = Date.now();
    
    try {
      let query = db.select({ count: count() }).from(this.table);

      if (filters.length > 0) {
        const conditions = this.buildConditions(filters);
        query = query.where(and(...conditions));
      }

      const [{ count: totalCount }] = await query;
      const result = Number(totalCount);

      this.logPerformance('count', startTime, { filterCount: filters.length, count: result });
      return result;
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'DrizzleAdapter',
        operation: `count:${this.tableName}`,
        context: { filters }
      });
      this.logError('count', error, { filters });
      return 0;
    }
  }

  /**
   * Batch operations for performance
   */
  async batchCreate(entities: TEntity[]): Promise<TEntity[]> {
    const startTime = Date.now();
    
    try {
      if (entities.length === 0) return [];
      
      const result = await withTransaction(
        async (tx) => {
          const insertData = entities.map(entity => {
            const data = this.entityMapping.fromEntity(entity) as WithTimestamps<Partial<TRow>>;
            const now = new Date();
            if (!data.created_at) data.created_at = now;
            if (!data.updated_at) data.updated_at = now;
            return data;
          });

          const newRows = await tx
            .insert(this.table)
            .values(insertData)
            .returning();

          return newRows.map((row: TRow) => this.entityMapping.toEntity(row));
        },
        `DrizzleAdapter:batchCreate:${this.tableName}`
      );

      this.logPerformance('batchCreate', startTime, { count: entities.length });
      return result.data;
    } catch (error) {
      this.logError('batchCreate', error, { count: entities.length });
      throw error;
    }
  }

  /**
   * Search entities with text-based queries
   */
  async search(
    searchFields: string[],
    query: string,
    options: QueryOptions = {}
  ): Promise<TEntity[]> {
    const startTime = Date.now();
    
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const searchConditions = searchFields
        .map(field => {
          const column = this.table[field];
          return column ? sql`LOWER(${column}) LIKE ${searchTerm}` : undefined;
        })
        .filter((condition): condition is SQL<unknown> => condition !== undefined);

      if (searchConditions.length === 0) {
        return [];
      }

      let dbQuery = db
        .select()
        .from(this.table)
        .where(or(...searchConditions));

      // Apply ordering
      if (options.orderBy) {
        const orderColumn = this.table[options.orderBy];
        if (orderColumn) {
          dbQuery = options.orderDirection === 'asc' 
            ? dbQuery.orderBy(asc(orderColumn))
            : dbQuery.orderBy(desc(orderColumn));
        }
      }

      // Apply pagination with safety limits
      const limit = Math.min(options.limit || 50, 1000);
      dbQuery = dbQuery.limit(limit);
      
      if (options.offset) {
        dbQuery = dbQuery.offset(options.offset);
      }

      const rows = await dbQuery;
      const result = rows.map((row: TRow) => this.entityMapping.toEntity(row));

      this.logPerformance('search', startTime, { 
        query, 
        searchFields, 
        resultCount: result.length 
      });
      
      return result;
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'DrizzleAdapter',
        operation: `search:${this.tableName}`,
        context: { query, searchFields, options }
      });
      this.logError('search', error, { query, searchFields, options });
      return [];
    }
  }

  /**
   * Build query conditions from filter array
   */
  private buildConditions(filters: FilterCondition[]): SQL<unknown>[] {
    return filters
      .map(filter => {
        const column = this.table[filter.field];
        if (!column) {
          logger.warn(`Unknown field in filter: ${filter.field}`, { 
            table: this.tableName, 
            filter 
          });
          return undefined;
        }

        switch (filter.operator) {
          case 'eq':
            return eq(column, filter.value);
          case 'like':
            return sql`${column} LIKE ${`%${filter.value}%`}`;
          case 'gt':
            return sql`${column} > ${filter.value}`;
          case 'lt':
            return sql`${column} < ${filter.value}`;
          case 'gte':
            return sql`${column} >= ${filter.value}`;
          case 'lte':
            return sql`${column} <= ${filter.value}`;
          case 'in':
            return inArray(column, Array.isArray(filter.value) ? filter.value : [filter.value]);
          case 'isNull':
            return sql`${column} IS NULL`;
          default:
            logger.warn(`Unknown operator in filter: ${filter.operator}`, { 
              table: this.tableName, 
              filter 
            });
            return undefined;
        }
      })
      .filter((condition): condition is SQL<unknown> => condition !== undefined);
  }

  /**
   * Log performance metrics for monitoring
   */
  private logPerformance(operation: string, startTime: number, metadata: unknown = {}) {
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Log slow queries
      logger.warn(`Slow DrizzleAdapter operation`, {
        table: this.tableName,
        operation,
        duration,
        ...metadata
      });
    } else if (duration > 100) {
      logger.info(`DrizzleAdapter operation`, {
        table: this.tableName,
        operation,
        duration,
        ...metadata
      });
    }
  }

  /**
   * Log errors with context
   */
  private logError(operation: string, error: unknown, metadata: unknown = {}) {
    logger.error(`DrizzleAdapter error`, {
      table: this.tableName,
      operation,
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }
}

/**
 * Factory function to create typed adapters
 */
export function createDrizzleAdapter<TEntity, TRow>(
  table: any,
  entityMapping: EntityMapping<TEntity, TRow>,
  tableName: string
): DrizzleAdapter<TEntity, TRow> {
  return new DrizzleAdapter(table, entityMapping, tableName);
}
