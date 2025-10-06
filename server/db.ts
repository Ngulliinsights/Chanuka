import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from "../shared/schema.js";
import { fallbackService } from './services/fallback-service.js';

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
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL
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

    console.log('📋 Seeding initial demonstration data...');
    
    await db.insert(schema.bills).values([
      {
        title: "Digital Rights and Privacy Protection Act",
        billNumber: "HR-2024-001",
        introducedDate: new Date('2024-01-15'),
        status: "committee",
        summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Rights and Privacy Protection Act...",
        category: "technology",
        tags: ["privacy", "technology", "digital-rights"],
        viewCount: 0,
        shareCount: 0,
        complexityScore: 7,
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
        billNumber: "S-2024-042",
        introducedDate: new Date('2024-02-03'),
        status: "introduced",
        summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Action and Green Energy Transition Act...",
        category: "environment",
        tags: ["climate", "energy", "environment"],
        viewCount: 0,
        shareCount: 0,
        complexityScore: 9,
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
    
    console.log('✅ Initial data seeded successfully');
  } catch (error) {
    console.log('ℹ️ Could not seed data:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Initializes the fallback data service when database is unavailable.
 * This ensures the application remains functional even without database access.
 */
async function initializeFallback(): Promise<void> {
  console.log('📋 Initializing fallback data store...');
  const status = fallbackService.getStatus();
  console.log(`✅ Fallback service ready: ${status.billCount} bills, ${status.userCount} users, ${status.commentCount} comments`);
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
    
    // Verify the connection works before marking as connected
    const isConnected = await testConnection(state.pool);
    
    if (!isConnected) {
      throw new Error('Connection test failed');
    }
    
    state.isConnected = true;
    console.log('✅ Database connection established successfully');
    
    // Seed data only after confirming connection
    await seedInitialData(state.db);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('🔄 Application will continue with fallback mode');
    
    // Clean up any partial initialization
    if (state.pool) {
      await state.pool.end().catch(() => {});
      state.pool = null;
    }
    
    state.db = null;
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
    console.log(`⚠️ Database unavailable for ${context}, using fallback data`);
    return fallbackData;
  }

  try {
    return await operation();
  } catch (error) {
    console.error(`❌ Database operation failed for ${context}:`, error instanceof Error ? error.message : 'Unknown error');
    
    // Only mark as disconnected for connection errors, not query errors
    if (isConnectionError(error)) {
      state.isConnected = false;
      console.log('🔌 Database marked as disconnected due to connection error');
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
  console.log(`🔄 Database connection status updated: ${connected ? 'connected' : 'disconnected'}`);
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
    console.log('🔌 Database connections closed');
  }
}

// Start initialization asynchronously without blocking module load
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Export state accessors (read-only access to internal state)
export const isDatabaseConnected = (): boolean => state.isConnected;
export const db = () => state.db;
export const pool = () => state.pool;
export { fallbackService };

// Re-export schema for convenience
export { 
  bills, 
  users, 
  billComments, 
  userProfiles,
  billEngagement,
  notifications,
  analysis,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts,
  userInterests
} from '../shared/schema.js';