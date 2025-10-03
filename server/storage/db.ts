// import { Redis } from 'ioredis'; // Redis not available

// Re-export the pool from shared module
export { createPoolConfig, pool } from '../../shared/database/pool.js';

// Simple cache implementation since Redis is not available
export const createCache = (config = {}) => {
  return new Map<string, { data: any; expires: number }>();
};

export const cache = createCache();
