import { Redis } from 'ioredis';
import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/database/pool.js';
import { Bill, InsertBill } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';
import { createRedisConfig } from './config.js';
import type { StorageConfig } from './StorageTypes.js';

// Enhanced constants for better maintainability and performance
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_KEY = {
  ALL_BILLS: 'bills:all',
  BILL_BY_ID: (id: number) => `bill:${id}`,
  BILLS_BY_TAGS: (tags: string[]) => `bills:tags:${tags.sort().join(',')}`,
  PATTERN_ALL: 'bills:*',
  PATTERN_BY_ID: 'bill:*',
  PATTERN_BY_TAGS: 'bills:tags:*',
};

// Enhanced cache invalidation strategies
const CACHE_INVALIDATION = {
  FULL: [CACHE_KEY.PATTERN_ALL, CACHE_KEY.PATTERN_BY_TAGS],
  SINGLE: (id: number) => [CACHE_KEY.BILL_BY_ID(id)],
  TAGS_ONLY: [CACHE_KEY.PATTERN_BY_TAGS],
};

// Use Redis singleton with config
const redis = new Redis(createRedisConfig());

export class BillStorage extends BaseStorage<Bill> {
  private static instance: BillStorage;

  constructor(redis: Redis, pool: Pool, options: StorageConfig = {}) {
    super(redis, pool, options);
  }

  static getInstance(): BillStorage {
    if (!BillStorage.instance) {
      BillStorage.instance = new BillStorage(redis, pool);
    }
    return BillStorage.instance;
  }

  /**
   * Enhanced cache getter with better error handling and performance monitoring
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if not in cache
   * @param ttl - Optional custom TTL in seconds
   */
  protected async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL,
  ): Promise<T> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          // Log parse error and continue to fetch fresh data
          console.warn(`Cache parse error for key ${key}:`, parseError);
          await redis.del(key); // Remove corrupted cache entry
        }
      }

      const data = await fetchFn();

      // Enhanced caching logic with better validation
      if (data !== undefined && data !== null) {
        try {
          await redis.setex(key, ttl, JSON.stringify(data));
        } catch (cacheError) {
          // Log cache write error but don't fail the operation
          console.warn(`Cache write error for key ${key}:`, cacheError);
        }
      }

      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      // Fallback to direct fetch if cache fails
      return fetchFn();
    }
  }

  /**
   * Enhanced cache invalidation with pattern-based cleanup
   * @param patterns - Array of Redis key patterns to match
   */
  protected async invalidateCache(patterns: string | string[]): Promise<void> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    try {
      // Process patterns in parallel for better performance
      const invalidationPromises = patternArray.map(async (pattern) => {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          // Use pipeline for better performance with multiple deletions
          const pipeline = redis.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
        }
      });

      await Promise.all(invalidationPromises);
    } catch (error) {
      console.error(`Failed to invalidate cache with patterns ${patternArray.join(', ')}:`, error);
      // Continue execution even if cache invalidation fails
    }
  }

  /**
   * Enhanced transaction execution with better error context
   * @param callback - Transaction callback function
   */
  private async executeTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      // Add more context to the error for better debugging
      const enhancedError = new Error(`Transaction failed: ${error.message}`);
      enhancedError.stack = error.stack;
      throw enhancedError;
    } finally {
      client.release();
    }
  }

  /**
   * Optimized query for getting all bills with improved performance
   */
  async getBills(): Promise<Bill[]> {
    return this.getCached(CACHE_KEY.ALL_BILLS, async () => {
      // Enhanced query with better JSON aggregation and ordering
      const result = await pool.query(`
        SELECT b.id,
               b.title,
               b.description,
               b.status,
               b.proposed_date,
               b.last_updated,
               b.content,
               b.stakeholder_ids,
               b.view_count,
               b.share_count,
               b.created_at,
               COALESCE(
                 json_agg(bt.tag ORDER BY bt.tag) FILTER (WHERE bt.tag IS NOT NULL),
                 '[]'::json
               ) as tags
        FROM bills b
        LEFT JOIN bill_tags bt ON b.id = bt.bill_id
        GROUP BY b.id, b.title, b.description, b.status, b.proposed_date, 
                 b.last_updated, b.content, b.stakeholder_ids, b.view_count, 
                 b.share_count, b.created_at
        ORDER BY b.created_at DESC
      `);

      // Enhanced data processing with better type safety
      return result.rows.map(bill => ({
        ...bill,
        tags: Array.isArray(bill.tags) ? bill.tags : [],
        stakeholder_ids: Array.isArray(bill.stakeholder_ids) ? bill.stakeholder_ids : [],
      }));
    });
  }

  /**
   * Optimized single bill retrieval with enhanced validation
   * @param id - Bill ID
   */
  async getBill(id: number): Promise<Bill | undefined> {
    // Enhanced input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    return this.getCached(CACHE_KEY.BILL_BY_ID(id), async () => {
      // Optimized query with explicit column selection
      const result = await pool.query(
        `
        SELECT b.id,
               b.title,
               b.description,
               b.status,
               b.proposed_date,
               b.last_updated,
               b.content,
               b.stakeholder_ids,
               b.view_count,
               b.share_count,
               b.created_at,
               COALESCE(
                 json_agg(bt.tag ORDER BY bt.tag) FILTER (WHERE bt.tag IS NOT NULL),
                 '[]'::json
               ) as tags
        FROM bills b
        LEFT JOIN bill_tags bt ON b.id = bt.bill_id
        WHERE b.id = $1
        GROUP BY b.id, b.title, b.description, b.status, b.proposed_date, 
                 b.last_updated, b.content, b.stakeholder_ids, b.view_count, 
                 b.share_count, b.created_at
      `,
        [id],
      );

      if (result.rows.length === 0) return undefined;

      const bill = result.rows[0];
      return {
        ...bill,
        tags: Array.isArray(bill.tags) ? bill.tags : [],
        stakeholder_ids: Array.isArray(bill.stakeholder_ids) ? bill.stakeholder_ids : [],
      };
    });
  }

  /**
   * Enhanced bill creation with better validation and error handling
   * @param bill - Bill data to insert
   */
  async createBill(bill: InsertBill): Promise<Bill> {
    // Enhanced validation with more specific error messages
    if (!bill.title?.trim()) {
      throw new Error('Bill title is required and cannot be empty');
    }
    if (!bill.content?.trim()) {
      throw new Error('Bill content is required and cannot be empty');
    }

    return this.executeTransaction(async client => {
      // Enhanced insert with better default handling
      const result = await client.query(
        `INSERT INTO bills
         (title, description, status, proposed_date, last_updated, content,
          stakeholder_ids, view_count, share_count, created_at)
         VALUES ($1, $2, $3, $4, $4, $5, $6, 0, 0, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          bill.title.trim(),
          bill.description?.trim() || '',
          bill.status || 'draft',
          bill.proposedDate || new Date(),
          bill.content.trim(),
          JSON.stringify(bill.stakeholderIds || []),
        ],
      );

      const newBill = result.rows[0];

      // Enhanced cache invalidation with more targeted approach
      await this.invalidateCache(CACHE_INVALIDATION.FULL);

      return {
        ...newBill,
        tags: [], // New bills start with no tags
        stakeholder_ids: newBill.stakeholder_ids || [],
      };
    });
  }

  /**
   * Enhanced statistics update with better error handling
   * @param billId - Bill ID
   * @param field - Field to increment (view_count or share_count)
   */
  private async incrementBillStat(
    billId: number,
    field: 'view_count' | 'share_count',
  ): Promise<Bill> {
    // Enhanced input validation
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    return this.executeTransaction(async client => {
      // First check if bill exists to provide better error message
      const checkResult = await client.query('SELECT id FROM bills WHERE id = $1', [billId]);
      if (checkResult.rows.length === 0) {
        throw new Error(`Bill with ID ${billId} not found`);
      }

      // Enhanced update with better query structure
      const result = await client.query(
        `
        UPDATE bills
        SET ${field} = ${field} + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
        [billId],
      );

      const updatedBill = result.rows[0];

      // Get tags in a separate query for better performance
      const tagsResult = await client.query(
        'SELECT json_agg(tag ORDER BY tag) as tags FROM bill_tags WHERE bill_id = $1',
        [billId]
      );

      // Enhanced cache invalidation with more targeted approach
      await this.invalidateCache([
        CACHE_KEY.BILL_BY_ID(billId),
        CACHE_KEY.ALL_BILLS,
      ]);

      return {
        ...updatedBill,
        tags: tagsResult.rows[0]?.tags || [],
        stakeholder_ids: updatedBill.stakeholder_ids || [],
      };
    });
  }

  /**
   * Increments the view count for a bill
   * @param billId - Bill ID
   */
  async incrementBillViews(billId: number): Promise<Bill> {
    return this.incrementBillStat(billId, 'view_count');
  }

  /**
   * Increments the share count for a bill
   * @param billId - Bill ID
   */
  async incrementBillShares(billId: number): Promise<Bill> {
    return this.incrementBillStat(billId, 'share_count');
  }

  /**
   * Enhanced tag-based bill retrieval with better performance
   * @param tags - Array of tags to filter by
   */
  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    // Enhanced input validation
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }

    // Clean and validate tags
    const cleanTags = tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.toLowerCase()); // Normalize case for consistency

    if (cleanTags.length === 0) {
      return [];
    }

    return this.getCached(CACHE_KEY.BILLS_BY_TAGS(cleanTags), async () => {
      // Enhanced query with better performance characteristics
      const result = await pool.query(
        `
        SELECT b.id,
               b.title,
               b.description,
               b.status,
               b.proposed_date,
               b.last_updated,
               b.content,
               b.stakeholder_ids,
               b.view_count,
               b.share_count,
               b.created_at,
               json_agg(bt.tag ORDER BY bt.tag) as tags
        FROM bills b
        INNER JOIN bill_tags bt ON b.id = bt.bill_id
        WHERE b.id IN (
          SELECT bill_id
          FROM bill_tags
          WHERE LOWER(tag) = ANY($1::varchar[])
          GROUP BY bill_id
          HAVING COUNT(DISTINCT LOWER(tag)) = $2
        )
        GROUP BY b.id, b.title, b.description, b.status, b.proposed_date, 
                 b.last_updated, b.content, b.stakeholder_ids, b.view_count, 
                 b.share_count, b.created_at
        ORDER BY b.created_at DESC
      `,
        [cleanTags, cleanTags.length],
      );

      return result.rows.map(row => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        stakeholder_ids: Array.isArray(row.stakeholder_ids) ? row.stakeholder_ids : [],
      }));
    });
  }

  /**
   * Enhanced method to add tags to an existing bill
   * @param billId - Bill ID
   * @param tags - Array of tags to add
   */
  async addTagsToBill(billId: number, tags: string[]): Promise<Bill> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags array is required and cannot be empty');
    }

    const cleanTags = tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    if (cleanTags.length === 0) {
      throw new Error('No valid tags provided');
    }

    return this.executeTransaction(async client => {
      // Check if bill exists
      const billCheck = await client.query('SELECT id FROM bills WHERE id = $1', [billId]);
      if (billCheck.rows.length === 0) {
        throw new Error(`Bill with ID ${billId} not found`);
      }

      // Insert tags, ignoring duplicates
      const values = cleanTags.map((_, index) => `($1, $${index + 2})`).join(',');
      const params = [billId, ...cleanTags];

      await client.query(
        `INSERT INTO bill_tags (bill_id, tag) VALUES ${values} ON CONFLICT (bill_id, tag) DO NOTHING`,
        params
      );

      // Update bill's last_updated timestamp
      await client.query(
        'UPDATE bills SET last_updated = CURRENT_TIMESTAMP WHERE id = $1',
        [billId]
      );

      // Enhanced cache invalidation
      await this.invalidateCache([
        CACHE_KEY.BILL_BY_ID(billId),
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.PATTERN_BY_TAGS,
      ]);

      // Return the updated bill
      return this.getBill(billId);
    });
  }

  /**
   * Enhanced method to remove tags from a bill
   * @param billId - Bill ID
   * @param tags - Array of tags to remove
   */
  async removeTagsFromBill(billId: number, tags: string[]): Promise<Bill> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags array is required and cannot be empty');
    }

    const cleanTags = tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    if (cleanTags.length === 0) {
      throw new Error('No valid tags provided');
    }

    return this.executeTransaction(async client => {
      // Remove specified tags
      await client.query(
        'DELETE FROM bill_tags WHERE bill_id = $1 AND LOWER(tag) = ANY($2::varchar[])',
        [billId, cleanTags]
      );

      // Update bill's last_updated timestamp
      await client.query(
        'UPDATE bills SET last_updated = CURRENT_TIMESTAMP WHERE id = $1',
        [billId]
      );

      // Enhanced cache invalidation
      await this.invalidateCache([
        CACHE_KEY.BILL_BY_ID(billId),
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.PATTERN_BY_TAGS,
      ]);

      // Return the updated bill
      return this.getBill(billId);
    });
  }
}