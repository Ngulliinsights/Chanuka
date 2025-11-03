import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from "../shared/schema";
import { databaseFallbackService as fallbackService } from './infrastructure/database/database-fallback.js';
import { logger  } from '../shared/core/src/index.js';

// Connection state management with clear separation of concerns
interface DatabaseState {
  pool: pg.Pool | null;
  db: any;
  isConnected: boolean;
  initPromise: Promise<void> | null;
  isInitializing: boolean;
}

const state: DatabaseState = {
  pool: null,
  db: null,
  isConnected: false,
  initPromise: null,
  isInitializing: false
};

/**
 * Creates a pool configuration based on available environment variables.
 * Prioritizes DATABASE_URL for simplicity, falls back to individual parameters.
 */
function createPoolConfig(): pg.PoolConfig {
  const baseConfig: pg.PoolConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };

  if (process.env.DATABASE_URL) {
    // Determine SSL configuration based on URL and environment
    let sslConfig;
    if (process.env.DATABASE_URL.includes('sslmode=require')) {
      sslConfig = { rejectUnauthorized: false };
    } else if (process.env.NODE_ENV === 'production') {
      sslConfig = { rejectUnauthorized: false };
    } else {
      sslConfig = false;
    }

    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig
    };
  }

  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chanuka'
  };
}

/**
 * Tests the database connection by executing a simple query.
 * Returns true if successful, false otherwise.
 */
async function testConnection(pool: pg.Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Seeds the database with initial demonstration data.
 * Only runs if the bills table is empty to avoid duplicates.
 */
async function seedInitialData(db: any): Promise<void> {
  try {
    const existingBills = await db.select().from(schema.bills).limit(1);

    if (existingBills.length > 0) {
      return; // Data already exists, skip seeding
    }

    logger.info('📋 Seeding initial demonstration data...', { component: 'Chanuka' });

    await db.insert(schema.bills).values([
      {
        title: "Digital Rights and Privacy Protection Act",
        bill_number: "HR-2024-001",
        introduced_date: new Date('2024-01-15'),
        status: "committee",
        summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Rights and Privacy Protection Act...",
        category: "technology",
        tags: ["privacy", "technology", "digital-rights"],
        view_count: 0,
        share_count: 0,
        complexity_score: 7,
        constitutionalConcerns: {
          concerns: ["First Amendment implications", "Commerce Clause considerations"],
          severity: "medium"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["citizens", "privacy advocates"],
          potential_opponents: ["tech companies", "data brokers"],
          economic_impact: "moderate"
        }
      },
      {
        title: "Climate Action and Green Energy Transition Act",
        bill_number: "S-2024-042",
        introduced_date: new Date('2024-02-03'),
        status: "introduced",
        summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Action and Green Energy Transition Act...",
        category: "environment",
        tags: ["climate", "energy", "environment"],
        view_count: 0,
        share_count: 0,
        complexity_score: 9,
        constitutionalConcerns: {
          concerns: ["Interstate Commerce regulation", "Federal vs State authority"],
          severity: "low"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["environmental groups", "renewable energy sector"],
          potential_opponents: ["fossil fuel industry", "traditional utilities"],
          economic_impact: "significant"
        }
      }
    ]);

    logger.info('✅ Initial data seeded successfully', { component: 'Chanuka' });
  } catch (error) {
    logger.info('ℹ️ Could not seed data: ' + (error instanceof Error ? error.message : 'Unknown error'), { component: 'Chanuka' });
  }
}

/**
 * Initializes the fallback data service when database is unavailable.
 * This ensures the application remains functional even without database access.
 */
async function initializeFallback(): Promise<void> {
  logger.info('📋 Initializing fallback data store...', { component: 'Chanuka' });
  // fallbackService.getStatus() has a runtime shape used across the codebase.
  // Cast to `any` here to avoid tight coupling to the internal fallback type
  // while we reconcile types across the project. This is a pragmatic, local
  // shim to reduce TypeScript noise; we'll replace with a proper type once
  // the fallback service contract is finalized.
  const status = (fallbackService.getStatus() as any);
  logger.info(`✅ Fallback service ready: ${status?.billCount ?? 0} bills, ${status?.userCount ?? 0} users, ${status?.comment_count ?? 0} comments`, { component: 'Chanuka' });
}

/**
 * Core initialization logic that attempts to establish database connection.
 * On failure, gracefully falls back to in-memory storage.
 */
async function performInitialization(): Promise<void> {
  try {
    // Create connection pool with appropriate configuration
    state.pool = new Pool(createPoolConfig());
    state.db = drizzle(state.pool, { schema });
    // expose runtime db to consumers
    db = state.db;

    // Verify the connection works before marking as connected
    const isConnected = await testConnection(state.pool);

    if (!isConnected) {
      throw new Error('Connection test failed');
    }

    state.isConnected = true;
    logger.info('✅ Database connection established successfully', { component: 'Chanuka' });

    // Seed data only after confirming connection
    await seedInitialData(state.db);

  } catch (error) {
    logger.error('❌ Database connection failed:', { component: 'Chanuka' }, error instanceof Error ? error.message : 'Unknown error');
    logger.info('🔄 Application will continue with fallback mode', { component: 'Chanuka' });

    // Clean up any partial initialization
    if (state.pool) {
      await state.pool.end().catch(() => {});
      state.pool = null;
    }

    state.db = null;
    db = null;
    state.isConnected = false;

    // Ensure fallback service is ready
    await initializeFallback();
  }
}

/**
 * Public initialization function with proper synchronization.
 * Prevents race conditions when multiple parts of the app try to initialize simultaneously.
 */
async function initializeDatabase(): Promise<void> {
  // Return existing promise if initialization is already in progress
  if (state.initPromise) {
    return state.initPromise;
  }

  // Create new initialization promise and track it
  state.isInitializing = true;
  state.initPromise = performInitialization();

  try {
    await state.initPromise;
  } finally {
    state.isInitializing = false;
  }
}

/**
 * Ensures database is initialized before any operations.
 * Safe to call multiple times - will only initialize once.
 */
export async function ensureInitialized(): Promise<void> {
  if (!state.initPromise) {
    await initializeDatabase();
  } else {
    await state.initPromise;
  }
}

/**
 * Determines if an error is connection-related and should trigger fallback mode.
 */
function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const connectionKeywords = [
    'connection',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'timeout',
    'connect ECONNREFUSED'
  ];

  return connectionKeywords.some(keyword =>
    error.message.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Wraps database operations with automatic fallback handling.
 * If database is unavailable or operation fails, returns fallback data instead.
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackData: T,
  context: string
): Promise<T> {
  await ensureInitialized();

  // Use fallback immediately if database is known to be unavailable
  if (!state.isConnected || !state.db) {
    logger.warn(`⚠️ Database unavailable for ${context}, using fallback data`, { component: 'Chanuka' });
    return fallbackData;
  }

  try {
    return await operation();
  } catch (error) {
    logger.error(`❌ Database operation failed for ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`, { component: 'Chanuka' });

    // Only mark as disconnected for connection errors, not query errors
    if (isConnectionError(error)) {
      state.isConnected = false;
      logger.info('🔌 Database marked as disconnected due to connection error', { component: 'Chanuka' });
    }

    return fallbackData;
  }
}

/**
 * Updates the database connection status.
 * Used by external services that may detect connection changes.
 */
export function setDatabaseConnectionStatus(connected: boolean): void {
  state.isConnected = connected;
  logger.info(`🔄 Database connection status updated: ${connected ? 'connected' : 'disconnected'}`, { component: 'Chanuka' });
}

/**
 * Returns detailed information about current database connection state.
 */
export function getConnectionStatus() {
  return {
    isConnected: state.isConnected,
    hasPool: state.pool !== null,
    hasDb: state.db !== null,
    isInitializing: state.isInitializing
  };
}

/**
 * Gracefully closes database connections.
 * Should be called during application shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (state.pool) {
    await state.pool.end();
    state.pool = null;
    state.db = null;
    state.isConnected = false;
    logger.info('🔌 Database connections closed', { component: 'Chanuka' });
  }
}

// Start initialization asynchronously without blocking module load (disabled during tests/tooling)
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_DB_INIT !== '1') {
  initializeDatabase().catch(error => {
    logger.error('Failed to initialize database during auto-init', { component: 'Chanuka' }, error instanceof Error ? error.message : String(error));
  });
} else {
  logger.info('Database auto-initialization disabled by environment', { component: 'Chanuka' });
}

// Export state accessors (read-only access to internal state)
export const isDatabaseConnected = (): boolean => state.isConnected;

// Export a live `db` binding typed as `any` so other modules that import
// `{ db }` can access the runtime drizzle instance without TypeScript
// complaining about missing members. We update this variable when the
// initialization completes. This is a pragmatic shim while we reconcile
// the Drizzle types across the codebase.
export let db: any = null;
export const pool = () => state.pool;
export const readDatabase = () => state.db;
// Accessor helpers encourage using a stable access surface instead of
// directly importing internal variables. This improves separation of
// concerns and makes future refactors less invasive.
export function getDbInstance() {
  return db;
}

export function getFallbackService() {
  return fallbackService;
}

export { fallbackService };

// Re-export schema for convenience
export {
  bill as bills,
  user as users,
  comments as comments,
  user_profiles as user_profiles,
  bill_engagement,
  notification as notifications,
  analysis,
  sponsor as sponsors,
  sponsorAffiliation as sponsorAffiliations,
  bill_sponsorship as bill_sponsorships,
  sponsorTransparency,
  billSectionConflict as billSectionConflicts,
  user_interest as user_interests
} from '../shared/schema';






































