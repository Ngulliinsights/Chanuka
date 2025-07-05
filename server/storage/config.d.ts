import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import { pool } from '../../shared/database/pool.js';
interface StorageConnections {
    redis: Redis;
    pool: typeof pool;
    sessionStore: RedisStore;
}
export declare const createRedisConfig: () => {
    host: string;
    port: number;
    password: string | undefined;
    maxRetriesPerRequest: number;
    retryStrategy: (times: number) => number;
    enableReadyCheck: boolean;
    showFriendlyErrorStack: boolean;
    commandTimeout: number;
};
export declare function initializeConnections(): StorageConnections;
export {};
