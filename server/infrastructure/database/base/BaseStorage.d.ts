import { Redis } from 'ioredis';
import { Pool, PoolClient } from 'pg';
import { logger } from '@shared/core';
interface StorageOptions {
    cacheTTL?: number;
    prefix?: string;
}
export declare abstract class BaseStorage<T> {
    protected redis: Redis;
    protected pool: Pool;
    protected cacheTTL: number;
    protected prefix: string;
    constructor(redis: Redis, pool: Pool, options?: StorageOptions);
    protected getCached<R>(key: string, getter: () => Promise<R>): Promise<R>;
    protected invalidateCache(pattern: string): Promise<void>;
    protected withTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R>;
    protected withClient<R>(callback: (client: PoolClient) => Promise<R>): Promise<R>;
    healthCheck(): Promise<{
        database: boolean;
        cache: boolean;
    }>;
    shutdown(): Promise<void>;
}
export {};













































