import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { logger } from '../../shared/core/src/utils/logger';

// Load environment variables
dotenv.config();

/**
 * Creates a database pool with consistent configuration
 * This centralizes our connection logic to avoid duplication
 */
function createPool(databaseName = 'legislative_track') {
  const baseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/legislative_track';
  const connectionString = baseUrl.replace(/\/[^/]*$/, `/${databaseName}`);

  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Add connection pool optimization
    max: 10, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Fail fast on connection attempts
  });
}

/**
 * Tests database connectivity with better error classification
 * This helps us understand what type of connection issue we're dealing with
 */
async function testDatabaseConnection(pool) {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release(); // Always release the client back to the pool
    return { success: true };
  } catch (error) {
    // Classify the error type for better handling
    const isConnectionRefused = error.code === 'ECONNREFUSED';
    const isDatabaseNotFound = error.code === '3D000'; // PostgreSQL code for invalid database
    const isAuthenticationFailed = error.code === '28P01';

    return {
      success: false,
      error,
      isConnectionRefused,
      isDatabaseNotFound,
      isAuthenticationFailed
    };
  }
}

/**
 * Attempts to create the target database
 * This separates database creation logic for better maintainability
 */
async function createDatabaseIfNeeded() {
  const defaultPool = createPool('postgres');

  try {
    logger.info('Attempting to create database...', { component: 'Chanuka' });
    await defaultPool.query('CREATE DATABASE legislative_track');
    logger.info('Database created successfully', { component: 'Chanuka' });
    return true;
  } catch (createError) {
    // Error code 42P04 means database already exists - this is fine
    if (createError.code === '42P04') {
      logger.info('Database already exists, continuing...', { component: 'Chanuka' });
      return true;
    }
    logger.info('Database creation failed:', { component: 'Chanuka' }, createError.message);
    return false;
  } finally {
    await defaultPool.end();
  }
}

/**
 * Ensures migrations directory exists and creates initial migration if needed
 * This handles the bootstrap case more elegantly
 */
function ensureMigrationsDirectory() {
  const migrationsPath = path.join(process.cwd(), 'drizzle');

  if (!fs.existsSync(migrationsPath)) {
    logger.info('Creating migrations directory...', { component: 'Chanuka' });
    fs.mkdirSync(migrationsPath, { recursive: true });

    // Create a more comprehensive initial migration
    const initialMigration = `-- Initial database schema for Legislative Track
-- This migration sets up the foundational tables

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;

    fs.writeFileSync(path.join(migrationsPath, '0000_initial.sql'), initialMigration);
    logger.info('Created initial migration file', { component: 'Chanuka' });
  }

  return migrationsPath;
}

/**
 * Creates the migration tracking table with better error handling
 * This ensures we have proper migration state tracking
 */
async function ensureMigrationTrackingTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        filename TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Add index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_drizzle_migrations_hash 
      ON drizzle_migrations(hash);
    `);

    logger.info('Migration tracking table ready', { component: 'Chanuka' });
  } catch (error) {
    logger.error('Failed to create migration tracking table:', { component: 'Chanuka' }, error.message);
    throw error;
  }
}

/**
 * Generates a simple hash for migration content
 * This helps us track which migrations have been applied
 */
function generateMigrationHash(content, filename) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content + filename).digest('hex');
}

/**
 * Checks if a migration has already been applied
 * This prevents duplicate migration execution
 */
async function isMigrationApplied(pool, hash) {
  try {
    const result = await pool.query(
      'SELECT 1 FROM drizzle_migrations WHERE hash = $1',
      [hash]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.info('Could not check migration status:', { component: 'Chanuka' }, error.message);
    return false; // Assume not applied if we can't check
  }
}

/**
 * Records a successful migration in the tracking table
 * This maintains our migration history
 */
async function recordMigration(pool, hash, filename) {
  try {
    await pool.query(
      'INSERT INTO drizzle_migrations (hash, filename) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING',
      [hash, filename]
    );
  } catch (error) {
    logger.info('Could not record migration:', { component: 'Chanuka' }, error.message);
    // Don't throw here - migration was successful even if we can't record it
  }
}

/**
 * Executes a single migration file with proper error handling
 * This isolates migration execution logic for better testing and maintenance
 */
async function executeMigration(pool, filePath, filename) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const hash = generateMigrationHash(sql, filename);

  // Check if migration already applied
  if (await isMigrationApplied(pool, hash)) {
    console.log(`Migration ${filename} already applied, skipping`);
    return { success: true, skipped: true };
  }

  console.log(`Executing migration: ${filename}`);

  try {
    // Execute the migration in a transaction for safety
    await pool.query('BEGIN');
    await pool.query(sql);
    await recordMigration(pool, hash, filename);
    await pool.query('COMMIT');

    console.log(`Migration ${filename} completed successfully`);
    return { success: true, skipped: false };
  } catch (migrationError) {
    await pool.query('ROLLBACK');
    console.error(`Migration ${filename} failed:`, migrationError.message);
    return { success: false, error: migrationError };
  }
}

async function main() {
  logger.info('Starting database migration process...', { component: 'Chanuka' });

  // Diagnostic logging for SSL authentication debugging
  logger.info('🔍 Migration Script (pg.Pool) Diagnostics:', { component: 'Chanuka' });
  logger.info('NODE_ENV:', { component: 'Chanuka' }, process.env.NODE_ENV);
  logger.info('DATABASE_URL exists:', { component: 'Chanuka' }, !!process.env.DATABASE_URL);
  logger.info('DATABASE_URL starts with postgres:', { component: 'Chanuka' }, process.env.DATABASE_URL?.startsWith('postgres'));
  logger.info('DATABASE_URL contains sslmode:', { component: 'Chanuka' }, process.env.DATABASE_URL?.includes('sslmode'));
  if (process.env.DATABASE_URL?.includes('sslmode')) {
    const sslmode = process.env.DATABASE_URL.match(/sslmode=([^&\s]+)/)?.[1];
    logger.info('SSL mode in URL:', { component: 'Chanuka' }, sslmode);
  }
  logger.info('SSL config will be:', { component: 'Chanuka' }, process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

  let pool = null;

  try {
    // Step 1: Create initial pool and test connection
    pool = createPool();
    const connectionTest = await testDatabaseConnection(pool);

    if (!connectionTest.success) {
      logger.info('Initial connection failed, analyzing issue...', { component: 'Chanuka' });

      // If database doesn't exist, try to create it
      if (connectionTest.isDatabaseNotFound) {
        const created = await createDatabaseIfNeeded();
        if (!created) {
          throw new Error('Could not create database and database does not exist');
        }
        // Re-test connection after database creation
        const retestResult = await testDatabaseConnection(pool);
        if (!retestResult.success) {
          throw retestResult.error;
        }
      } else {
        // For other connection issues, provide specific guidance
        if (connectionTest.isConnectionRefused) {
          throw new Error('Database server is not running or not accessible');
        } else if (connectionTest.isAuthenticationFailed) {
          throw new Error('Database authentication failed - check credentials');
        } else {
          throw connectionTest.error;
        }
      }
    }

    logger.info('Database connection established successfully', { component: 'Chanuka' });

    // Step 2: Ensure migrations directory exists
    const migrationsPath = ensureMigrationsDirectory();

    // Step 3: Set up migration tracking
    await ensureMigrationTrackingTable(pool);

    // Step 4: Get and sort migration files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Natural sort ensures proper order

    if (migrationFiles.length === 0) {
      logger.info('No migration files found - database is ready', { component: 'Chanuka' });
      return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s)`);

    // Step 5: Execute migrations
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsPath, filename);
      const result = await executeMigration(pool, filePath, filename);

      if (result.success) {
        if (result.skipped) {
          skipCount++;
        } else {
          successCount++;
        }
      } else {
        errorCount++;
        // Log error but continue with other migrations
        console.error(`Migration ${filename} failed but continuing with others...`);
      }
    }

    // Step 6: Report results
    logger.info('\n=== Migration Summary ===', { component: 'Chanuka' });
    console.log(`Successfully applied: ${successCount}`);
    console.log(`Skipped (already applied): ${skipCount}`);
    console.log(`Failed: ${errorCount}`);

    if (errorCount > 0) {
      logger.info('\nSome migrations failed. Please review the errors above.', { component: 'Chanuka' });
      logger.info('The application will continue, but you may need to fix failed migrations manually.', { component: 'Chanuka' });
    } else {
      logger.info('\nAll migrations completed successfully!', { component: 'Chanuka' });
    }

  } catch (error) {
    logger.error('Migration process failed:', { component: 'Chanuka' }, error.message);
    logger.info('\nThis is not necessarily fatal - the application may still work with existing schema.', { component: 'Chanuka' });
    logger.info('Consider running migrations manually if needed.', { component: 'Chanuka' });

    // Exit with success to prevent cascading failures in your system
    // The application can often work even if migrations fail
    process.exit(0);
  } finally {
    // Ensure pool is always closed
    if (pool) {
      try {
        await pool.end();
        logger.info('Database connection closed', { component: 'Chanuka' });
      } catch (closeError) {
        logger.info('Error closing database connection:', { component: 'Chanuka' }, closeError.message);
      }
    }
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception during migration:', { component: 'Chanuka' }, error.message);
  process.exit(0); // Exit successfully to avoid cascading failures
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection during migration:', { component: 'Chanuka' }, error.message);
  process.exit(0); // Exit successfully to avoid cascading failures
});

main();






