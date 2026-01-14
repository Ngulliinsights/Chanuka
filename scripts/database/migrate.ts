#!/usr/bin/env tsx
/**
 * Strategic Consolidated Migration Script
 * 
 * Uses Drizzle ORM migration system for database alignment
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationOptions {
  rollback?: string;
  validate?: boolean;
  dryRun?: boolean;
  test?: boolean;
  performance?: boolean;
  force?: boolean;
}

export async function runMigrations(options: MigrationOptions = {}): Promise<void> {
  const startTime = Date.now();
  logger.info('🚀 Starting strategic database migration process...', { options });

  let connectionManager;
  let migrationManager;

  try {
    // Initialize connection manager with migration-optimized settings
    connectionManager = await createConnectionManager({
      max: 5, // Limit connections during migration
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      healthCheckInterval: 0 // Disable during migration
    });

    // Create migration manager
    const pool = connectionManager.getPool();
    migrationManager = createMigrationManager(pool);

    // Initialize migration tracking
    await migrationManager.initializeMigrationTracking();

    // Handle different operation modes
    if (options.rollback) {
      await handleRollback(migrationManager, options.rollback, options.force);
    } else if (options.validate) {
      await handleValidation(migrationManager);
    } else if (options.dryRun) {
      await handleDryRun(migrationManager);
    } else if (options.test) {
      await handleTesting(migrationManager, options.performance);
    } else {
      await handleMigration(migrationManager);
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Migration process completed successfully in ${duration}ms`);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Migration failed after ${duration}ms:`, error);
    throw error;
  } finally {
    // Always clean up connections
    if (connectionManager) {
      await connectionManager.close();
    }
  }
}

async function handleRollback(migrationManager: any, targetVersion: string, force?: boolean): Promise<void> {
  if (!force) {
    logger.warn('⚠️  ROLLBACK WARNING: This will undo database changes!');
    logger.warn(`   Rolling back to version: ${targetVersion}`);
    logger.warn('   Use --force to proceed without confirmation');
    return;
  }

  logger.info(`🔄 Rolling back to version: ${targetVersion}`);
  const results = await migrationManager.rollbackToVersion(targetVersion);
  
  logger.info(`✅ Rollback completed: ${results.length} migrations rolled back`);
  results.forEach((result: any) => {
    if (result.success) {
      logger.info(`   ✓ Rolled back ${result.version} (${result.executionTime}ms)`);
    } else {
      logger.error(`   ✗ Failed to rollback ${result.version}:`, result.error);
    }
  });
}

async function handleValidation(migrationManager: any): Promise<void> {
  logger.info('🔍 Validating migrations...');
  
  const validation = await migrationManager.validateMigrations();
  
  if (validation.valid) {
    logger.info('✅ All migrations are valid');
    logger.info(`   Validated ${validation.issues.length === 0 ? 'all' : validation.issues.length} migration files`);
  } else {
    logger.error('❌ Migration validation failed:');
    validation.issues.forEach((issue: string) => {
      logger.error(`   - ${issue}`);
    });
    throw new Error('Migration validation failed');
  }
}

async function handleDryRun(migrationManager: any): Promise<void> {
  logger.info('👀 Dry run - showing pending migrations...');
  
  const status = await migrationManager.getMigrationStatus();
  
  logger.info(`📋 Current version: ${status.currentVersion || 'None'}`);
  logger.info(`📋 Applied migrations: ${status.appliedMigrations.length}`);
  logger.info(`📋 Pending migrations: ${status.pendingMigrations.length}`);
  
  if (status.pendingMigrations.length > 0) {
    logger.info('   Pending migrations:');
    status.pendingMigrations.forEach((migration: string) => {
      logger.info(`   - ${migration}`);
    });
  } else {
    logger.info('   No pending migrations - database is up to date');
  }
}

async function handleTesting(migrationManager: any, includePerformance?: boolean): Promise<void> {
  logger.info('🧪 Running comprehensive migration tests...');
  
  // Test 1: Validation
  logger.info('   Test 1: Migration validation...');
  const validation = await migrationManager.validateMigrations();
  if (!validation.valid) {
    throw new Error(`Migration validation failed: ${validation.issues.join(', ')}`);
  }
  logger.info('   ✅ Validation passed');
  
  // Test 2: Status check
  logger.info('   Test 2: Migration status check...');
  const status = await migrationManager.getMigrationStatus();
  logger.info(`   ✅ Status check passed (${status.appliedMigrations.length} applied, ${status.pendingMigrations.length} pending)`);
  
  // Test 3: Performance testing (if requested)
  if (includePerformance && status.pendingMigrations.length > 0) {
    logger.info('   Test 3: Performance testing...');
    const performanceStart = Date.now();
    
    // Run migrations and measure performance
    const results = await migrationManager.runMigrations();
    const performanceTime = Date.now() - performanceStart;
    
    logger.info(`   ✅ Performance test completed in ${performanceTime}ms`);
    logger.info(`   Applied ${results.length} migrations`);
    
    // Analyze performance
    const avgTime = results.reduce((sum: number, r: any) => sum + r.executionTime, 0) / results.length;
    const maxTime = Math.max(...results.map((r: any) => r.executionTime));
    
    logger.info(`   Average migration time: ${avgTime.toFixed(2)}ms`);
    logger.info(`   Slowest migration: ${maxTime}ms`);
    
    if (maxTime > 5000) {
      logger.warn(`   ⚠️  Slow migration detected (${maxTime}ms) - consider optimization`);
    }
  }
  
  logger.info('✅ All migration tests passed');
}

async function handleMigration(migrationManager: any): Promise<void> {
  logger.info('📦 Running pending migrations...');
  
  const results = await migrationManager.runMigrations();
  
  if (results.length === 0) {
    logger.info('✅ No pending migrations - database is up to date');
  } else {
    logger.info(`✅ Applied ${results.length} migrations successfully`);
    
    results.forEach((result: any) => {
      if (result.success) {
        logger.info(`   ✓ ${result.version} (${result.executionTime}ms)`);
      } else {
        logger.error(`   ✗ ${result.version} failed:`, result.error);
      }
    });
    
    // Performance analysis
    const totalTime = results.reduce((sum: number, r: any) => sum + r.executionTime, 0);
    const avgTime = totalTime / results.length;
    
    logger.info(`📊 Migration performance: ${totalTime}ms total, ${avgTime.toFixed(2)}ms average`);
  }
}

// CLI interface with comprehensive options
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {};

  // Parse command line arguments
  if (args.includes('--rollback')) {
    const rollbackIndex = args.indexOf('--rollback');
    options.rollback = args[rollbackIndex + 1];
  }
  if (args.includes('--validate')) options.validate = true;
  if (args.includes('--dry-run')) options.dryRun = true;
  if (args.includes('--test')) options.test = true;
  if (args.includes('--performance')) options.performance = true;
  if (args.includes('--force')) options.force = true;

  // Show help if no options provided
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🚀 Strategic Database Migration Tool

Usage:
  npx tsx scripts/database/migrate.ts [options]

Options:
  --validate              Validate all migration files
  --dry-run              Show pending migrations without applying
  --test                 Run comprehensive migration tests
  --performance          Include performance testing (with --test)
  --rollback <version>   Rollback to specific version (requires --force)
  --force                Force rollback without confirmation
  --help                 Show this help message

Examples:
  npx tsx scripts/database/migrate.ts                    # Apply pending migrations
  npx tsx scripts/database/migrate.ts --validate         # Validate migrations
  npx tsx scripts/database/migrate.ts --dry-run          # Preview changes
  npx tsx scripts/database/migrate.ts --test             # Run tests
  npx tsx scripts/database/migrate.ts --test --performance # Test with performance
  npx tsx scripts/database/migrate.ts --rollback v1.0.0 --force # Rollback
`);
    process.exit(0);
  }

  runMigrations(options)
    .then(() => {
      console.log('✅ Migration process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}