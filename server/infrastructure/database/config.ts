// import RedisStore from 'connect-redis'; // Redis not available
// import { Redis } from 'ioredis'; // Redis not available
import { pool } from '../../../shared/database/pool.js';
import { logger } from '../../../shared/core/src/observability/logging'

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface StorageConnections {
  cache: Map<string, any>;
  pool: typeof pool;
  sessionStore: any; // Simple session store
}

export const createCacheConfig = () => ({
  maxSize: 1000,
  ttl: 3600000, // 1 hour in milliseconds
});

// Simple session store implementation
class SimpleSessionStore {
  private sessions: Map<string, any> = new Map();

  get(sid: string, callback: (err?: any, session?: any) => void): void {
    const session = this.sessions.get(sid);
    callback(null, session);
  }

  set(sid: string, session: any, callback?: (err?: any) => void): void {
    this.sessions.set(sid, session);
    if (callback) callback();
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.sessions.delete(sid);
    if (callback) callback();
  }
}

export function initializeConnections(): StorageConnections {
  const cache = new Map<string, any>();
  const sessionStore = new SimpleSessionStore();

  logger.info('Storage connections initialized with simple cache');

  return { cache, pool, sessionStore };
}












































