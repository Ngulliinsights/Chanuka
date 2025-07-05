import { logger } from '../../../shared/utils/logger.js';
export class BaseStorage {
    redis;
    pool;
    cacheTTL;
    prefix;
    constructor(redis, pool, options = {}) {
        this.redis = redis;
        this.pool = pool;
        this.cacheTTL = options.cacheTTL || 3600;
        this.prefix = options.prefix || this.constructor.name;
    }
    async getCached(key, getter) {
        const cacheKey = `${this.prefix}:${key}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        catch (error) {
            console.error('Cache error:', error);
        }
        const value = await getter();
        if (value !== null && value !== undefined) {
            try {
                await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(value));
            }
            catch (error) {
                console.error('Cache set error:', error);
            }
        }
        return value;
    }
    async invalidateCache(pattern) {
        const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    async withTransaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async withClient(callback) {
        const client = await this.pool.connect();
        try {
            return await callback(client);
        }
        finally {
            client.release();
        }
    }
    async healthCheck() {
        const results = { database: false, cache: false };
        try {
            const client = await this.pool.connect();
            try {
                await client.query('SELECT 1');
                results.database = true;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger.error('Database health check failed:', error);
        }
        try {
            const pong = await this.redis.ping();
            results.cache = pong === 'PONG';
        }
        catch (error) {
            logger.error('Cache health check failed:', error);
        }
        return results;
    }
    async shutdown() {
        await Promise.all([this.redis.quit(), this.pool.end()]);
    }
}
//# sourceMappingURL=BaseStorage.js.map