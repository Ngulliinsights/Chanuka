#!/usr/bin/env node

import * as dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { MigrationService } from '../infrastructure/database/migration-service.js';
import * as path from 'path';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

interface RunnerOptions {
  command: 'up' | 'down' | 'status' | 'validate' | 'create';
  target?: string;
  force?: boolean;
  dryRun?: boolean;
}

class MigrationRunner {
  private migrationService: MigrationService;
  private pool: InstanceType<typeof Pool>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.migrationService = new MigrationService(this.pool, 'drizzle');
  }

  async runUp(options: RunnerOptions): Promise<void> {
    logger.info('🚀 Running database migrations...', { component: 'SimpleTool' });
    
    if (options.dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made', { component: 'SimpleTool' });
      const pending = await this.migrationService.getPendingMigrations();
      console.log(`Would execute ${pending.length} migrations:`);
      pending.forEach(filename => console.log(`  - ${filename}`));
      return;
    }

    try {
      const results = await this.migrationService.runPendingMigrations();
    
      let successCount = 0;
      let failureCount = 0;

      logger.info('\n📊 Migration Results:', { component: 'SimpleTool' });
      logger.info('=', { component: 'SimpleTool' }, .repeat(50));

      for (const result of results) {
        if (result.success) {
          successCount++;
          const rollbackInfo = result.rollbackAvailable ? '(rollback available)' : '(no rollback)';
          console.log(`✅ ${result.filename} - ${result.executionTime}ms ${rollbackInfo}`);
        } else {
          failureCount++;
          console.log(`❌ ${result.filename} - ${result.error}`);
        }
      }

      logger.info('=', { component: 'SimpleTool' }, .repeat(50));
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failureCount}`);

      if (failureCount > 0) {
        logger.info('\n⚠️  Some migrations failed. Please review the errors above.', { component: 'SimpleTool' });
        process.exit(1);
      } else {
        logger.info('\n🎉 All migrations completed successfully!', { component: 'SimpleTool' });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('💥 Migration execution failed:', { component: 'SimpleTool' }, err.message);
      logger.error('Stack trace:', { component: 'SimpleTool' }, err.stack);
      process.exit(1);
    }
  }

  async runDown(options: RunnerOptions): Promise<void> {
    if (!options.target) {
      logger.error('❌ Target migration filename is required for rollback', { component: 'SimpleTool' });
      process.exit(1);
    }

    console.log(`🔄 Rolling back migration: ${options.target}`);
    
    if (options.dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes would be made', { component: 'SimpleTool' });
      console.log(`Would rollback: ${options.target}`);
      return;
    }

    if (!options.force) {
      logger.info('⚠️  This will rollback the specified migration and may result in data loss.', { component: 'SimpleTool' });
      logger.info('Use --force to confirm this action.', { component: 'SimpleTool' });
      process.exit(1);
    }

    const result = await this.migrationService.rollbackMigration(options.target);
    
    if (result.success) {
      console.log(`✅ Successfully rolled back ${result.filename} in ${result.executionTime}ms`);
    } else {
      console.log(`❌ Failed to rollback ${result.filename}: ${result.error}`);
      process.exit(1);
    }
  }

  async showStatus(): Promise<void> {
    logger.info('📋 Migration Status', { component: 'SimpleTool' });
    logger.info('=', { component: 'SimpleTool' }, .repeat(50));

    const applied = await this.migrationService.getAppliedMigrations();
    const pending = await this.migrationService.getPendingMigrations();

    console.log(`✅ Applied migrations: ${applied.length}`);
    applied.forEach(migration => {
      const rollbackInfo = migration.rollbackSql ? '(rollback available)' : '(no rollback)';
      const executedAt = migration.executedAt ? new Date(migration.executedAt).toISOString() : 'unknown';
      console.log(`  - ${migration.filename} - ${executedAt} ${rollbackInfo}`);
    });

    console.log(`\n⏳ Pending migrations: ${pending.length}`);
    pending.forEach(filename => {
      console.log(`  - ${filename}`);
    });

    if (pending.length === 0) {
      logger.info('\n🎉 Database is up to date!', { component: 'SimpleTool' });
    }
  }

  async validateDatabase(): Promise<void> {
    logger.info('🔍 Validating database integrity...', { component: 'SimpleTool' });
    
    const validation = await this.migrationService.validateDatabaseIntegrity();
    
    logger.info('=', { component: 'SimpleTool' }, .repeat(50));
    
    if (validation.isValid) {
      logger.info('✅ Database integrity check passed', { component: 'SimpleTool' });
    } else {
      logger.info('❌ Database integrity check failed', { component: 'SimpleTool' });
    }

    if (validation.errors.length > 0) {
      logger.info('\n🚨 Errors:', { component: 'SimpleTool' });
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      logger.info('\n⚠️  Warnings:', { component: 'SimpleTool' });
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (!validation.isValid) {
      process.exit(1);
    }
  }

  async createMigration(name: string): Promise<void> {
    if (!name) {
      logger.error('❌ Migration name is required', { component: 'SimpleTool' });
      process.exit(1);
    }

    // Generate migration number
    const applied = await this.migrationService.getAppliedMigrations();
    const pending = await this.migrationService.getPendingMigrations();
    const allMigrations = [...applied.map(m => m.filename), ...pending];
    
    const numbers = allMigrations
      .map(filename => parseInt(filename.split('_')[0]))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);
    
    const nextNumber = numbers.length > 0 ? numbers[0] + 1 : 1;
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    
    const filename = `${paddedNumber}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.sql`;
    const filepath = path.join('drizzle', filename);

    const template = `-- Migration: ${name}
-- Description: Add description here

-- Add your migration SQL here


-- ROLLBACK:
-- Add rollback SQL here

-- END ROLLBACK`;

    const fs = await import('fs');
    fs.writeFileSync(filepath, template);
    
    console.log(`✅ Created migration file: ${filepath}`);
    logger.info('📝 Please edit the file to add your migration SQL and rollback instructions.', { component: 'SimpleTool' });
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {
    command: 'up'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'up':
      case 'down':
      case 'status':
      case 'validate':
      case 'create':
        options.command = arg;
        break;
      case '--target':
        options.target = args[++i];
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (options.command === 'create' && !options.target) {
          options.target = arg;
        }
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Migration Runner - Database Migration Management Tool

Usage:
  npm run migrate [command] [options]

Commands:
  up                    Run all pending migrations (default)
  down --target <file>  Rollback a specific migration
  status                Show migration status
  validate              Validate database integrity
  create <name>         Create a new migration file

Options:
  --target <filename>   Target migration file for rollback
  --force               Force execution (required for rollback)
  --dry-run             Show what would be done without executing
  --help, -h            Show this help message

Examples:
  npm run migrate                                    # Run all pending migrations
  npm run migrate up --dry-run                       # Preview pending migrations
  npm run migrate down --target 0010_add_search.sql --force  # Rollback specific migration
  npm run migrate status                             # Show migration status
  npm run migrate validate                           # Validate database integrity
  npm run migrate create add_user_preferences        # Create new migration file
`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  const runner = new MigrationRunner();

  try {
    switch (options.command) {
      case 'up':
        await runner.runUp(options);
        break;
      case 'down':
        await runner.runDown(options);
        break;
      case 'status':
        await runner.showStatus();
        break;
      case 'validate':
        await runner.validateDatabase();
        break;
      case 'create':
        await runner.createMigration(options.target || '');
        break;
      default:
        console.error(`❌ Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('💥 Migration runner failed:', { component: 'SimpleTool' }, err.message);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception:', { component: 'SimpleTool' }, error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('💥 Unhandled rejection:', { component: 'SimpleTool' }, error);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  logger.error('💥 Fatal error:', { component: 'SimpleTool' }, error.message);
  process.exit(1);
});






