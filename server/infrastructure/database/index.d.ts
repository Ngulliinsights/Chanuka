import { type Store } from 'express-session';
import { type Redis } from 'ioredis';
import { type Pool } from 'pg';

export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}

// Storage interfaces and classes removed - using direct Drizzle ORM services
export interface Storage {
    redis: Redis;
    pool: Pool;
    sessionStore: Store;
    cache: CacheProvider;
}
export declare const storage: Storage;
export declare function isError(err: unknown): err is Error;













































