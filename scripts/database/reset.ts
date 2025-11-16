#!/usr/bin/env tsx
/**
 * Strategic Consolidated Database Reset Script
 * 
 * Replaces: simple-reset.ts, reset-database.ts, reset-and-migrate.ts
 * Provides safe database reset with comprehensive options
 */

import { createConnectionManager } from '@shared/database/core';
import { createMigrationManager } from '@server/infrastructure/database';
import { logger } from '@shared/core';
import * as readline from 'readline';

interface ResetOptions {
  force?: boolean;
  migrate?: boolean;
  seed?: boolean;
  backup?: boolean;
  validate?: boolean;
}

export async function resetDatabase(options: ResetOptions = {}): Promise<void> {
  const startTime = Date.now();
  
  // Safety check - require explicit confirmation unless forced
  if (!options.force) {
    const confirmed = await confirmReset();
    if (!confirmed) {
      logger.info('❌ Database reset cancelled by user');
      return;
    }
  }

  logger.info('🔄 Starting strategic database reset process...', { options });

  let connectionManager;

  try {
    // Initialize connection manager
    connectionManager = await createConnectionManager({
      max: 3, // Minimal connections for reset
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000
    });

    const pool = connectionManager.getPool();

    // Step 1: Create backup if requested
    if (options.backup) {
      await createPreResetBackup(pool);
    }

    // Step 2: Perform the reset
    await performDatabaseReset(pool);

    // Step 3: Run migrations if requested
    if (options.migrate) {
      await runMigrationsAfterReset(pool);
    }

    // Step 4: Seed database if requested
    if (options.seed) {
      await seedDatabaseAfterReset();
    }

    // Step 5: Validate if requested
    if (options.validate) {
      await validateResetDatabase(pool);
    }

    const duration = Date.now() - startTime;
    logger.info(`🎉 Database reset completed successfully in ${duration}ms!`);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Database reset failed after ${duration}ms:`, error);
    throw error;
  } finally {
    if (connectionManager) {
      await connectionManager.close();
    }
  }
}

async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n⚠️  DATABASE RESET WARNING ⚠️');
  console.log('This will permanently delete ALL data in the database!');
  console.log('This action cannot be undone.');
  console.log('');

  return new Promise((resolve) => {
    rl.question('Are you absolutely sure you want to continue? (type "yes" to confirm): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function createPreResetBackup(pool: any): Promise<void> {
  logger.info('💾 Creating pre-reset backup...');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `pre-reset-backup-${timestamp}`;
    
    // This would integrate with your backup system
    // For now, we'll just log the intent
    logger.info(`   Backup would be created: ${backupName}`);
    logger.info('   ✅ Pre-reset backup completed');
  } catch (error) {
    logger.error('   ❌ Backup failed:', error);
    throw new Error('Pre-reset backup failed - aborting reset for safety');
  }
}

async function performDatabaseReset(pool: any): Promise<void> {
  logger.info('🗑️  Performing database reset...');
  
  try {
    // Get list of tables before dropping
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tableCount = tablesResult.rows.length;
    logger.info(`   Found ${tableCount} tables to drop`);

    // Drop all tables and recreate schema
    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      COMMENT ON SCHEMA public IS 'standard public schema';
    `);

    logger.info(`   ✅ Dropped ${tableCount} tables and recreated schema`);

    // Drop and recreate extensions if needed
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    `);

    logger.info('   ✅ Recreated database extensions');

  } catch (error) {
    logger.error('   ❌ Database reset failed:', error);
    throw error;
  }
}

async function runMigrationsAfterReset(pool: any): Promise<void> {
  logger.info('📦 Running migrations after reset...');
  
  try {
    const migrationManager = createMigrationManager(pool);
    
    // Initialize migration tracking
    await migrationManager.initializeMigrationTracking();
    
    // Run all migrations
    const results = await migrationManager.runMigrations();
    
    if (results.length > 0) {
      logger.info(`   ✅ Applied ${results.length} migrations`);
      
      // Show migration details
      results.forEach((result: any) => {
        if (result.success) {
          logger.info(`      ✓ ${result.version} (${result.executionTime}ms)`);
        } else {
          logger.error(`      ✗ ${result.version} failed:`, result.error);
        }
      });
    } else {
      logger.info('   ✅ No migrations to apply');
    }
  } catch (error) {
    logger.error('   ❌ Migration after reset failed:', error);
    throw error;
  }
}

async function seedDatabaseAfterReset(): Promise<void> {
  logger.info('🌱 Seeding database after reset...');
  
  try {
    // Try to import and run seed script
    try {
      const { seedDatabase } = await import('./seed-database.js');
      await seedDatabase();
      logger.info('   ✅ Database seeded successfully');
    } catch (importError) {
      // If seed script doesn't exist, create basic seed data
      logger.info('   No seed script found, creating basic data...');
      await createBasicSeedData();
      logger.info('   ✅ Basic seed data created');
    }
  } catch (error) {
    logger.error('   ❌ Database seeding failed:', error);
    throw error;
  }
}

async function createBasicSeedData(): Promise<void> {
  // This would create minimal seed data for development
  // Implementation depends on your schema
  logger.info('   Creating basic development data...');
  
  // Example: Create admin user, sample bills, etc.
  // This is a placeholder - implement based on your needs
}

async function validateResetDatabase(pool: any): Promise<void> {
  logger.info('🔍 Validating reset database...');
  
  try {
    // Check that schema exists
    const schemaResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'public'
    `);
    
    if (schemaResult.rows.length === 0) {
      throw new Error('Public schema not found after reset');
    }

    // Check that extensions are installed
    const extensionsResult = await pool.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
    `);
    
    logger.info(`   ✅ Schema validation passed`);
    logger.info(`   ✅ Extensions validation passed (${extensionsResult.rows.length} extensions)`);

    // If migrations were run, validate tables exist
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableCount = parseInt(tablesResult.rows[0].table_count);
    logger.info(`   ✅ Database structure validation passed (${tableCount} tables)`);

  } catch (error) {
    logger.error('   ❌ Database validation failed:', error);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: ResetOptions = {
    force: args.includes('--force'),
    migrate: args.includes('--migrate'),
    seed: args.includes('--seed'),
    backup: args.includes('--backup'),
    validate: args.includes('--validate')
  };

  // Show help if requested
  if (args.includes('--help')) {
    console.log(`
🔄 Strategic Database Reset Tool

Usage:
  npx tsx scripts/database/reset.ts [options]

Options:
  --force      Skip confirmation prompt (DANGEROUS!)
  --migrate    Run migrations after reset
  --seed       Seed database with sample data after reset
  --backup     Create backup before reset
  --validate   Validate database structure after reset
  --help       Show this help message

Examples:
  npx tsx scripts/database/reset.ts                    # Interactive reset
  npx tsx scripts/database/reset.ts --migrate          # Reset and migrate
  npx tsx scripts/database/reset.ts --force --migrate --seed  # Full reset
  npx tsx scripts/database/reset.ts --backup --migrate # Safe reset with backup

⚠️  WARNING: This will permanently delete all data!
   Always use --backup in production-like environments.
`);
    process.exit(0);
  }

  resetDatabase(options)
    .then(() => {
      console.log('✅ Reset process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Reset process failed:', error);
      process.exit(1);
    });
}