import { Redis } from 'ioredis';
import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/database/pool.js';
import { Bill, InsertBill } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';
import { createRedisConfig } from './config.js';
import type { StorageConfig } from './StorageTypes.js';

// Constants for better maintainability
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_KEY = {
  ALL_BILLS: 'bills:all',
  BILL_BY_ID: (id: number) => `bill:${id}`,
  BILLS_BY_TAGS: (tags: string[]) => `bills:tags:${tags.sort().join(',')}`,
  PATTERN_ALL: 'bills:*',
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
   * Gets data from cache if available, otherwise fetches and caches it
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
        return JSON.parse(cached);
      }

      const data = await fetchFn();

      // Only cache if data exists and is not undefined
      if (data !== undefined) {
        await redis.setex(key, ttl, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      // Fallback to direct fetch if cache fails
      return fetchFn();
    }
  }

  /**
   * Invalidates cache entries matching a pattern
   * @param pattern - Redis key pattern to match
   */
  protected async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Failed to invalidate cache with pattern ${pattern}:`, error);
      // Continue execution even if cache invalidation fails
    }
  }

  /**
   * Attaches tags to bills using a more efficient approach
   * @param bills - The bills to attach tags to
   * @param tagsByBill - Map of bill IDs to their tags
   */
  private attachTagsToBills(bills: any[], tagsByBill: Record<number, string[]>): Bill[] {
    return bills.map(bill => ({
      ...bill,
      tags: tagsByBill[bill.id] || [],
    }));
  }

  /**
   * Executes a database transaction with proper error handling
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
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets all bills with their associated tags
   */
  async getBills(): Promise<Bill[]> {
    return this.getCached(CACHE_KEY.ALL_BILLS, async () => {
      // Use a single query with JOIN to improve performance
      const result = await pool.query(`
        SELECT b.*,
               COALESCE(
                 json_agg(bt.tag) FILTER (WHERE bt.tag IS NOT NULL),
                 '[]'
               ) as tags
        FROM bills b
        LEFT JOIN bill_tags bt ON b.id = bt.bill_id
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `);

      // Parse the JSON tags array for each bill
      return result.rows.map(bill => ({
        ...bill,
        tags: Array.isArray(bill.tags) ? bill.tags : [],
      }));
    });
  }

  /**
   * Gets a bill by ID with its associated tags
   * @param id - Bill ID
   */
  async getBill(id: number): Promise<Bill | undefined> {
    if (!id || isNaN(id)) {
      throw new Error('Invalid bill ID');
    }

    return this.getCached(CACHE_KEY.BILL_BY_ID(id), async () => {
      // Use a single query with JOIN to improve performance
      const result = await pool.query(
        `
        SELECT b.*,
               COALESCE(
                 json_agg(bt.tag) FILTER (WHERE bt.tag IS NOT NULL),
                 '[]'
               ) as tags
        FROM bills b
        LEFT JOIN bill_tags bt ON b.id = bt.bill_id
        WHERE b.id = $1
        GROUP BY b.id
      `,
        [id],
      );

      if (result.rows.length === 0) return undefined;

      const bill = result.rows[0];
      // Parse the JSON tags array
      return {
        ...bill,
        tags: Array.isArray(bill.tags) ? bill.tags : [],
      };
    });
  }

  /**
   * Creates a new bill with its associated tags
   * @param bill - Bill data to insert
   */
  async createBill(bill: InsertBill): Promise<Bill> {
    if (!bill.title || !bill.content) {
      throw new Error('Bill must have a title and content');
    }

    return this.executeTransaction(async client => {
      const result = await client.query(
        `INSERT INTO bills
         (title, description, status, proposed_date, last_updated, content,
          stakeholder_ids, view_count, share_count)
         VALUES ($1, $2, $3, $4, $4, $5, $6, 0, 0)
         RETURNING *`,
        [
          bill.title,
          bill.description || '',
          bill.status || 'draft',
          bill.proposedDate || new Date(),
          bill.content,
          JSON.stringify(bill.stakeholderIds || []),
        ],
      );

      const newBill = result.rows[0];
      const tags: string[] = []; // Initialize empty tags for new bills

      // Invalidate cache after successful operation
      await this.invalidateCache(CACHE_KEY.PATTERN_ALL);

      return {
        ...newBill,
        tags,
      };
    });
  }

  /**
   * Updates bill statistics (views or shares)
   * @param billId - Bill ID
   * @param field - Field to increment (view_count or share_count)
   */
  private async incrementBillStat(
    billId: number,
    field: 'view_count' | 'share_count',
  ): Promise<Bill> {
    if (!billId || isNaN(billId)) {
      throw new Error('Invalid bill ID');
    }

    return this.executeTransaction(async client => {
      // Use a single query with JOIN to improve performance
      const result = await client.query(
        `
        UPDATE bills
        SET ${field} = ${field} + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *,
        (SELECT json_agg(tag) FROM bill_tags WHERE bill_id = $1) as tags
      `,
        [billId],
      );

      if (result.rows.length === 0) {
        throw new Error('Bill not found');
      }

      const bill = result.rows[0];

      // Invalidate related cache entries
      await this.invalidateCache(CACHE_KEY.BILL_BY_ID(billId));
      await this.invalidateCache(CACHE_KEY.PATTERN_ALL);

      return {
        ...bill,
        tags: bill.tags || [],
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
   * Gets bills that have all the specified tags
   * @param tags - Array of tags to filter by
   */
  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    if (!tags.length) return [];

    // Ensure tags are properly sanitized to prevent SQL injection
    const sanitizedTags = tags.map(tag => tag.replace(/'/g, "''"));

    return this.getCached(CACHE_KEY.BILLS_BY_TAGS(sanitizedTags), async () => {
      // More efficient query using JOIN and array operators
      const result = await pool.query(
        `
        SELECT b.*,
               json_agg(bt2.tag) as tags
        FROM bills b
        JOIN bill_tags bt1 ON b.id = bt1.bill_id
        JOIN bill_tags bt2 ON b.id = bt2.bill_id
        WHERE bt1.tag = ANY($1::varchar[])
        GROUP BY b.id
        HAVING array_agg(DISTINCT bt1.tag) @> $1::varchar[]
      `,
        [sanitizedTags],
      );

      return result.rows.map(row => ({
        ...row,
        tags: row.tags || [],
      }));
    });
  }

  /**
   * Saves tags for a new bill
   * @param newBill - The new bill
   * @param client - The database client
   * @param tags - The tags to save
   */
  private async saveTags(newBill: Bill, client: PoolClient, tags: string[]) {
    if (!tags.length) return;

    const values = tags
      .map((tag: string) => `(${newBill.id}, '${tag.replace(/'/g, "''")}')`)
      .join(',');

    await client.query(`INSERT INTO bill_tags (bill_id, tag) VALUES ${values}`);
  }
}
