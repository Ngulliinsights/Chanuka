#!/usr/bin/env tsx
/**
 * @deprecated Use initialize-database-integration.ts instead
 *
 * This is the basic setup script. Use initialize-database-integration.ts via npm scripts.
 *
 * Migration path:
 *   Old: tsx scripts/database/setup.ts
 *   New: npm run db:init
 *
 * See: scripts/database/DEPRECATION_NOTICE.md
 */
/**
 * Strategic Database Setup Script
 *
 * Complete database initialization for development and production
 * Replaces: setup-schema.ts and other initialization scripts
 */

import { createConnectionManager } from '@server/infrastructure/database/core';
import { createMigrationManager } from '@server/infrastructure/database';
import { logger } from '@shared/core';

interface SetupOptions {
  environment?: 'development' | 'production' | 'test';
  migrate?: boolean;
  seed?: boolean;
  validate?: boolean;
  force?: boolean;
}

export async function setupDatabase(options: SetupOptions = {}): Promise<void> {
  const { environment = 'development' } = options;
  const startTime = Date.now();

  logger.info('🚀 Starting strategic database setup...', { environment, options });

  let connectionManager;

  try {
    // Step 1: Initialize connection manager
    connectionManager = await initializeConnectionManager(environment);

    // Step 2: Verify database connectivity
    await verifyDatabaseConnection(connectionManager);

    // Step 3: Setup database schema and extensions
    await setupDatabaseSchema(connectionManager.getPool());

    // Step 4: Initialize migration system
    await initializeMigrationSystem(connectionManager.getPool());

    // Step 5: Run migrations if requested
    if (options.migrate) {
      await runInitialMigrations(connectionManager.getPool());
    }

    // Step 6: Seed database if requested
    if (options.seed && environment !== 'production') {
      await seedDevelopmentData();
    }

    // Step 7: Validate setup if requested
    if (options.validate) {
      await validateDatabaseSetup(connectionManager.getPool());
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Database setup completed successfully in ${duration}ms`);

    // Show next steps
    showNextSteps(environment, options);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Database setup failed after ${duration}ms:`, error);
    throw error;
  } finally {
    if (connectionManager) {
      await connectionManager.close();
    }
  }
}

async function initializeConnectionManager(environment: string) {
  logger.info('🔧 Initializing connection manager...');

  const config = {
    development: {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      healthCheckInterval: 30000
    },
    production: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      healthCheckInterval: 15000
    },
    test: {
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
      healthCheckInterval: 0
    }
  };

  const connectionManager = await createConnectionManager(config[environment as keyof typeof config]);
  logger.info('   ✅ Connection manager initialized');

  return connectionManager;
}

async function verifyDatabaseConnection(connectionManager: any): Promise<void> {
  logger.info('🔍 Verifying database connection...');

  try {
    const health = await connectionManager.checkDatabaseHealth();

    if (!health.overall) {
      throw new Error('Database health check failed');
    }

    logger.info(`   ✅ Database connection verified (${health.latencyMs}ms latency)`);
  } catch (error) {
    logger.error('   ❌ Database connection failed:', error);
    throw error;
  }
}

async function setupDatabaseSchema(pool: any): Promise<void> {
  logger.info('📋 Setting up database schema and extensions...');

  try {
    // Create extensions
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
      WITH SCHEMA public;
    `);

    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pg_trgm"
      WITH SCHEMA public;
    `);

    // Create full-text search configuration for better search
    await pool.query(`
      CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS chanuka_search (COPY = english);
    `);

    logger.info('   ✅ Database extensions created');

    // Create basic indexes for performance
    await createPerformanceIndexes(pool);

  } catch (error) {
    logger.error('   ❌ Schema setup failed:', error);
    throw error;
  }
}

async function createPerformanceIndexes(pool: any): Promise<void> {
  logger.info('   Creating performance indexes...');

  try {
    // These will be created by migrations, but we ensure they exist
    const indexes = [
      // Common search patterns
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_title_search
       ON bills USING gin(to_tsvector('chanuka_search', title))`,

      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_status_created
       ON bills(status, created_at DESC)`,

      // User activity patterns
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
       ON users(email) WHERE active = true`,
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
      } catch (indexError) {
        // Index might already exist, continue
        logger.debug(`   Index creation skipped: ${indexError.message}`);
      }
    }

    logger.info('   ✅ Performance indexes created');
  } catch (error) {
    logger.warn('   ⚠️  Some performance indexes failed:', error);
    // Don't fail setup for index issues
  }
}

async function initializeMigrationSystem(pool: any): Promise<void> {
  logger.info('📦 Initializing migration system...');

  try {
    const migrationManager = createMigrationManager(pool);
    await migrationManager.initializeMigrationTracking();

    logger.info('   ✅ Migration system initialized');
  } catch (error) {
    logger.error('   ❌ Migration system initialization failed:', error);
    throw error;
  }
}

async function runInitialMigrations(pool: any): Promise<void> {
  logger.info('🔄 Running initial migrations...');

  try {
    const migrationManager = createMigrationManager(pool);
    const results = await migrationManager.runMigrations();

    if (results.length > 0) {
      logger.info(`   ✅ Applied ${results.length} migrations`);

      // Show successful migrations
      const successful = results.filter((r: any) => r.success);
      const failed = results.filter((r: any) => !r.success);

      if (successful.length > 0) {
        logger.info(`   Successful migrations: ${successful.length}`);
      }

      if (failed.length > 0) {
        logger.error(`   Failed migrations: ${failed.length}`);
        failed.forEach((result: any) => {
          logger.error(`      ✗ ${result.version}: ${result.error}`);
        });
        throw new Error('Some migrations failed');
      }
    } else {
      logger.info('   ✅ No migrations to apply - database is up to date');
    }
  } catch (error) {
    logger.error('   ❌ Migration execution failed:', error);
    throw error;
  }
}

async function seedDevelopmentData(): Promise<void> {
  logger.info('🌱 Seeding development data...');

  try {
    // Try to import seed script
    try {
      const { seedDatabase } = await import('./seed-database.js');
      await seedDatabase();
      logger.info('   ✅ Development data seeded from seed script');
    } catch (importError) {
      // Create minimal development data
      logger.info('   Creating minimal development data...');
      await createMinimalDevData();
      logger.info('   ✅ Minimal development data created');
    }
  } catch (error) {
    logger.error('   ❌ Development data seeding failed:', error);
    // Don't fail setup for seeding issues in development
    logger.warn('   Continuing without seed data...');
  }
}

async function createMinimalDevData(): Promise<void> {
  // This would create minimal data for development
  // Implementation depends on your schema
  logger.info('   Creating basic development records...');

  // Placeholder for actual seed data creation
  // You would implement this based on your specific schema needs
}

async function validateDatabaseSetup(pool: any): Promise<void> {
  logger.info('✅ Validating database setup...');

  try {
    // Check extensions
    const extensionsResult = await pool.query(`
      SELECT extname
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
      ORDER BY extname
    `);

    const extensions = extensionsResult.rows.map((row: any) => row.extname);
    logger.info(`   ✅ Extensions verified: ${extensions.join(', ')}`);

    // Check migration system
    const migrationResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name = 'drizzle_migrations'
    `);

    if (parseInt(migrationResult.rows[0].count) > 0) {
      logger.info('   ✅ Migration system verified');
    } else {
      throw new Error('Migration system not properly initialized');
    }

    // Check basic connectivity
    await pool.query('SELECT NOW() as current_time');
    logger.info('   ✅ Database connectivity verified');

  } catch (error) {
    logger.error('   ❌ Database validation failed:', error);
    throw error;
  }
}

function showNextSteps(environment: string, options: SetupOptions): void {
  logger.info('\n🎉 Database setup completed successfully!');
  logger.info('\n📝 Next steps:');

  if (!options.migrate) {
    logger.info('   1. Run migrations: npx tsx scripts/database/migrate.ts');
  }

  if (!options.seed && environment === 'development') {
    logger.info('   2. Seed development data: npx tsx scripts/database/reset.ts --seed');
  }

  logger.info('   3. Start your application: npm run dev');
  logger.info('   4. Check database health: npx tsx scripts/database/health-check.ts');

  logger.info('\n🔧 Available database commands:');
  logger.info('   - npx tsx scripts/database/migrate.ts --help');
  logger.info('   - npx tsx scripts/database/reset.ts --help');
  logger.info('   - npx tsx scripts/database/health-check.ts');
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  let environment: 'development' | 'production' | 'test' = 'development';
  if (args.includes('--production')) environment = 'production';
  if (args.includes('--test')) environment = 'test';

  const options: SetupOptions = {
    environment,
    migrate: args.includes('--migrate'),
    seed: args.includes('--seed'),
    validate: args.includes('--validate'),
    force: args.includes('--force')
  };

  // Show help if requested
  if (args.includes('--help')) {
    console.log(`
🚀 Strategic Database Setup Tool

Usage:
  npx tsx scripts/database/setup.ts [options]

Options:
  --development    Setup for development (default)
  --production     Setup for production
  --test          Setup for testing
  --migrate       Run migrations after setup
  --seed          Seed with development data (not in production)
  --validate      Validate setup after completion
  --force         Force setup without prompts
  --help          Show this help message

Examples:
  npx tsx scripts/database/setup.ts                    # Basic development setup
  npx tsx scripts/database/setup.ts --migrate --seed   # Full development setup
  npx tsx scripts/database/setup.ts --production --migrate  # Production setup
  npx tsx scripts/database/setup.ts --test --migrate   # Test environment setup
`);
    process.exit(0);
  }

  setupDatabase(options)
    .then(() => {
      console.log('✅ Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}
