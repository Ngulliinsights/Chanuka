import { drizzle } from 'drizzle-orm/node-postgres';
import * as pg from 'pg';
import * as schema from '../schema.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Combined pool configuration from both files
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'legalease',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool };

// Define our desired database schema type, including all tables we want to work with
export type FullDatabaseSchema = {
  users: typeof schema.users;
  userProfiles: typeof schema.userProfiles;
  userInterests: typeof schema.userInterests;
  bills: typeof schema.bills;
  billTags: typeof schema.billTags;
  billComments: typeof schema.billComments;
  billEngagement: typeof schema.billEngagement;
  notifications: typeof schema.notifications;
  analysis: typeof schema.analysis;
  sponsors: typeof schema.sponsors;
  sponsorAffiliations: typeof schema.sponsorAffiliations;
  billSponsorships: typeof schema.billSponsorships;
  sponsorTransparency: typeof schema.sponsorTransparency;
  billSectionConflicts: typeof schema.billSectionConflicts;
  expertVerifications: typeof schema.expertVerifications;
  citizenVerifications: typeof schema.citizenVerifications;
} & typeof schema;

// Get the actual schema type from the imported schema
// This is important to ensure type safety when using the database pools
type ActualSchemaType = typeof schema;

// Function to validate schema compatibility
function validateSchemaType<T extends ActualSchemaType>(schema: T): T {
  return schema;
}

// Type extension for Pool metrics functionality
declare module 'pg' {
  interface Pool {
    getMetrics: () => {
      queries: number;
      connections: number;
      idleConnections: number;
      totalConnections: number;
      waitingClients: number;
      avgQueryTime?: number; // Added for performance monitoring
    };
    resetMetrics: () => void;
    trackQuery: (queryDuration: number) => void; // Added for tracking query performance
  }
}

// Constants with more descriptive names
const CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  READ_REPLICA_URL: process.env.READ_REPLICA_URL,
  WRITE_MASTER_URL: process.env.DATABASE_URL,
  DEFAULT_HOST: process.env.DB_HOST || 'localhost',
  DEFAULT_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DEFAULT_DB: process.env.DB_NAME || 'chanuka',
  DEFAULT_USER: process.env.DB_USER || 'postgres',
  DEFAULT_PASSWORD: process.env.DB_PASSWORD,
  DEFAULT_MAX_POOL_SIZE: parseInt(process.env.DB_POOL_MAX || '20', 10),
  APP_NAME: 'chanuka',
  MAX_CONNECTION_USES: 7500,
};

/**
 * Creates a configuration object for the PostgreSQL connection pool
 * @param isReadOnly Whether this pool is for read-only operations
 * @returns Configuration object for the pool
 */
export const createPoolConfig = (isReadOnly = false) => {
  // Determine which connection string to use based on environment and pool type
  const connectionString =
    isReadOnly && CONFIG.IS_PRODUCTION && CONFIG.READ_REPLICA_URL
      ? CONFIG.READ_REPLICA_URL
      : CONFIG.WRITE_MASTER_URL;

  const appName = `${CONFIG.APP_NAME}_${isReadOnly ? 'read' : 'write'}`;

  // Return optimized pool configuration with appropriate settings for read vs write pools
  return {
    connectionString: connectionString || process.env.DATABASE_URL,
    ssl: CONFIG.IS_PRODUCTION ? { rejectUnauthorized: false } : false,
    host: CONFIG.DEFAULT_HOST,
    port: CONFIG.DEFAULT_PORT,
    database: CONFIG.DEFAULT_DB,
    user: CONFIG.DEFAULT_USER,
    password: CONFIG.DEFAULT_PASSWORD,
    // Optimize pool sizes: larger for read pools, smaller for write pools
    max: isReadOnly ? 30 : CONFIG.DEFAULT_MAX_POOL_SIZE,
    min: isReadOnly ? 5 : 3,
    // Longer idle timeout for read connections as they're used more frequently
    idleTimeoutMillis: isReadOnly ? 120000 : 30000,
    connectionTimeoutMillis: 5000,
    // Shorter timeout for read queries as they should be faster
    statement_timeout: isReadOnly ? 15000 : 30000,
    application_name: appName,
    query_timeout: isReadOnly ? 15000 : 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 30000,
    maxUses: CONFIG.MAX_CONNECTION_USES, // Recycle connections after 7500 queries
  };
};

/**
 * Enhanced metrics tracking with query timing information
 */
const metrics = {
  queries: 0,
  connections: 0,
  idleConnections: 0,
  queryTimes: [] as number[], // Track recent query times for performance monitoring
  maxQueryTimes: 100, // Store the last 100 query times
};

/**
 * Setup a pool with error handling and metrics
 * @param isReadOnly Whether this pool is for read-only operations
 * @param name Name of the pool for logging
 * @returns Configured PostgreSQL Pool
 */
const setupPool = (isReadOnly = false, name = isReadOnly ? 'read' : 'write') => {
  const newPool = new Pool(createPoolConfig(isReadOnly));

  // Enhanced error handling with more context
  newPool.on('error', (err: Error) => {
    logger.error(`Postgres ${name} pool error:`, {
      error: err.message,
      // PostgreSQL errors might have a detail property, but standard Error doesn't
      // We need to use type assertion or optional chaining for these PostgreSQL-specific properties
      detail: (err as any).detail,
      stack: err.stack,
      poolSize: newPool.totalCount,
      waiting: newPool.waitingCount,
    });
  });

  // Connection management events for better monitoring
  newPool.on('connect', (client: pg.PoolClient) => {
    metrics.connections++;
    client.on('error', (err: Error) => {
      logger.error(`Client connection error in ${name} pool:`, err);
    });
  });

  newPool.on('acquire', () => {
    metrics.idleConnections = Math.max(0, metrics.idleConnections - 1);
  });

  newPool.on('remove', () => {
    metrics.connections = Math.max(0, metrics.connections - 1);
  });

  newPool.on('release', () => {
    metrics.idleConnections++;
  });

  // Add metrics methods to the pool
  newPool.getMetrics = () => {
    const avgQueryTime = metrics.queryTimes.length
      ? metrics.queryTimes.reduce((sum, time) => sum + time, 0) / metrics.queryTimes.length
      : undefined;

    return {
      ...metrics,
      totalConnections: newPool.totalCount,
      waitingClients: newPool.waitingCount,
      avgQueryTime,
    };
  };

  newPool.resetMetrics = () => {
    metrics.queries = 0;
    metrics.connections = 0;
    metrics.idleConnections = 0;
    metrics.queryTimes = [];
  };

  // Add method to track query performance
  newPool.trackQuery = queryDuration => {
    metrics.queries++;
    metrics.queryTimes.push(queryDuration);

    // Keep only the most recent query times
    if (metrics.queryTimes.length > metrics.maxQueryTimes) {
      metrics.queryTimes.shift();
    }
  };

  return newPool;
};

// Initialize raw PostgreSQL pools
const rawGeneralPool = setupPool(false, 'general');
export const rawReadPool = setupPool(true, 'read');
export const rawWritePool = setupPool(false, 'write');

// Create Drizzle ORM wrappers for the raw pools
export const db = drizzle(rawGeneralPool, { schema: validateSchemaType(schema) });
export const readDb = drizzle(rawReadPool, { schema: validateSchemaType(schema) });
export const writeDb = drizzle(rawWritePool, { schema: validateSchemaType(schema) });

/**
 * Helper function for executing queries with timing metrics
 * @param text SQL query text
 * @param params Query parameters (optional)
 * @param pool Database pool to use (defaults to general pool)
 * @param context Context description for logging
 * @returns Query result
 */
export const executeQuery = async <T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[] | Record<string, any>,
  pool = rawGeneralPool,
  context?: string,
): Promise<pg.QueryResult<T>> => {
  const start = Date.now();
  if (context) {
    logger.debug(`Executing query in context: ${context}`, {
      query: text,
      pool: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
    });
  }
  try {
    // Handle different parameter types for pg's query method
    let result: pg.QueryResult<T>;

    if (params === undefined) {
      result = await pool.query(text);
    } else if (Array.isArray(params)) {
      result = await pool.query(text, params);
    } else {
      // For object parameters, use a QueryConfig object
      result = await pool.query({
        text,
        values: Object.values(params),
      });
    }

    const duration = Date.now() - start;
    pool.trackQuery(duration);

    // Log slow queries for performance analysis
    if (duration > 1000) {
      logger.warn(`Slow query detected (${duration}ms):`, {
        query: text,
        durationMs: duration,
        pool: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
        params: params,
      });
    }

    return result;
  } catch (error: unknown) {
    // Safely handle the unknown error type
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Query execution error', {
      error: errorMessage,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params,
    });
    throw error;
  }
};

// Export a function that returns all pools for management purposes
export const getPools = () => ({
  general: {
    raw: rawGeneralPool,
    drizzle: db,
  },
  read: {
    raw: rawReadPool,
    drizzle: readDb,
  },
  write: {
    raw: rawWritePool,
    drizzle: writeDb,
  },
});

// Export a function to close all pools gracefully on application shutdown
export const closePools = async () => {
  logger.info('Closing all database connection pools');
  await Promise.all([rawGeneralPool.end(), rawReadPool.end(), rawWritePool.end()]);
  logger.info('All database connection pools closed');
};
