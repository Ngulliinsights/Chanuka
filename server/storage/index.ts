import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type Store } from 'express-session';
import { type Redis } from 'ioredis';
import { type Pool } from 'pg';
import { bills, schema, stakeholders, type Bill, type Stakeholder } from '../../shared/schema.js';
import { logger } from '../../shared/utils/logger.js';
import { CommentStorage } from './comment-storage.js';
import { initializeConnections } from './config.js';
import { ProgressStorage } from './progress-storage.js';
import { SocialShareStorage } from './social-share-storage.js';
import { UserStorage } from './user-storage.js';

// Define cache provider interface
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// Enhanced cache implementation
class RedisCacheProvider implements CacheProvider {
  private readonly redis: Redis;
  private readonly defaultTtl: number;

  constructor(redis: Redis, defaultTtl: number = 3600) {
    this.redis = redis;
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger?.error(`Cache retrieval error for key ${key}:`, this.formatError(error));
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTtl): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger?.error(`Cache set error for key ${key}:`, this.formatError(error));
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger?.debug?.(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger?.error(`Cache invalidation error for pattern ${pattern}:`, this.formatError(error));
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

// Create database instance with schema
const createDb = (pool: Pool) => drizzle(pool, { schema });

// Base repository interface
interface Repository<T> {
  getById(id: number): Promise<T | null>;
  update?(entity: T): Promise<void>;
  create?(entity: Partial<T>): Promise<T>;
  delete?(id: number): Promise<void>;
}

// Bill repository implementation
export class BillRepository implements Repository<Bill> {
  private readonly db: ReturnType<typeof createDb>;

  constructor(pool: Pool) {
    this.db = createDb(pool);
  }

  async getById(id: number): Promise<Bill | null> {
    const result = await this.db.select().from(bills).where(eq(bills.id, id));
    return result[0] || null;
  }

  async update(bill: Bill): Promise<void> {
    await this.db.update(bills).set(bill).where(eq(bills.id, bill.id));
  }
}

// Stakeholder repository implementation
export class StakeholderRepository implements Repository<Stakeholder> {
  private readonly db: ReturnType<typeof createDb>;

  constructor(pool: Pool) {
    this.db = createDb(pool);
  }

  async getById(id: number): Promise<Stakeholder | null> {
    const result = await this.db.select().from(stakeholders).where(eq(stakeholders.id, id));
    return result[0] || null;
  }
}

// Storage interface with all available services
export interface Storage {
  redis: Redis;
  pool: Pool;
  users: UserStorage;
  comments: CommentStorage;
  progress: ProgressStorage;
  socialShare: SocialShareStorage;
  sessionStore: Store;
  cache: CacheProvider;
}

// Create and export the application storage system
function createStorage(): Storage {
  const { redis, pool, sessionStore } = initializeConnections();
  const cache = new RedisCacheProvider(redis);

  return {
    redis,
    pool,
    users: new UserStorage(redis, pool),
    comments: new CommentStorage(redis, pool),
    progress: new ProgressStorage(redis, pool),
    socialShare: new SocialShareStorage(redis, pool),
    sessionStore,
    cache,
  };
}

// Export storage singleton
export const storage = createStorage();

// Re-export storage classes for type usage
export { CommentStorage } from './comment-storage.js';
export { ProgressStorage } from './progress-storage.js';
export { SocialShareStorage } from './social-share-storage.js';
export { UserStorage } from './user-storage.js';

// Type guard for error handling (keep for utility)
export function isError(err: unknown): err is Error {
  return err instanceof Error;
}
