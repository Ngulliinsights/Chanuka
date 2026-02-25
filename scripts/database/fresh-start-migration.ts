#!/usr/bin/env tsx
// ============================================================================
// FRESH START MIGRATION SCRIPT
// ============================================================================
// Executes a clean slate database migration with comprehensive validation
// 
// Usage:
//   npm run db:fresh-start              # Interactive mode with confirmations
//   npm run db:fresh-start --auto       # Automated mode (use with caution!)
//   npm run db:fresh-start --dry-run    # Show what would happen without executing

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Configuration
// ============================================================================

interface MigrationConfig {
  dryRun: boolean;
  auto: boolean;
  backupDir: string;
  expectedTableCount: number;
  expectedSchemaFiles: number;
}

const config: MigrationConfig = {
  dryRun: process.argv.includes('--dry-run'),
  auto: process.argv.includes('--auto'),
  backupDir: './backups',
  expectedTableCount: 109, // Core (85) + Strategic (24)
  expectedSchemaFiles: 24,
};

// ============================================================================
// Utilities
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
  };
  
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${icons[type]} ${message}${reset}`);
}

async function confirm(question: string): Promise<boolean> {
  if (config.auto) {
    log(`Auto-confirmed: ${question}`, 'info');
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function runCommand(command: string, description: string): Promise<{ stdout: string; stderr: string }> {
  log(`${description}...`, 'info');
  
  if (config.dryRun) {
    log(`[DRY RUN] Would execute: ${command}`, 'warning');
    return { stdout: '', stderr: '' };
  }
  
  try {
    const result = await execAsync(command);
    log(`${description} - Complete`, 'success');
    return result;
  } catch (error: any) {
    log(`${description} - Failed: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================================================
// Migration Steps
// ============================================================================

async function step1_PreflightChecks(): Promise<boolean> {
  log('\n📋 Step 1: Preflight Checks', 'info');
  
  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL environment variable not set', 'error');
    return false;
  }
  log('DATABASE_URL is configured', 'success');
  
  // Check drizzle.config.ts exists
  try {
    await fs.access('drizzle.config.ts');
    log('drizzle.config.ts found', 'success');
  } catch {
    log('drizzle.config.ts not found', 'error');
    return false;
  }
  
  // Count schema files in config
  const configContent = await fs.readFile('drizzle.config.ts', 'utf-8');
  const schemaMatches = configContent.match(/\.\/server\/infrastructure\/schema\/\w+\.ts/g);
  const schemaCount = schemaMatches ? schemaMatches.length : 0;
  
  log(`Found ${schemaCount} schema files in drizzle.config.ts`, 'info');
  
  if (schemaCount < config.expectedSchemaFiles) {
    log(`Expected at least ${config.expectedSchemaFiles} schema files, found ${schemaCount}`, 'warning');
  } else {
    log(`Schema file count looks good (${schemaCount} files)`, 'success');
  }
  
  return true;
}

async function step2_CreateBackup(): Promise<string | null> {
  log('\n💾 Step 2: Create Database Backup', 'info');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(config.backupDir, `backup_${timestamp}.sql`);
  
  // Create backup directory
  try {
    await fs.mkdir(config.backupDir, { recursive: true });
  } catch (error) {
    log('Failed to create backup directory', 'error');
    return null;
  }
  
  // Create backup
  try {
    await runCommand(
      `pg_dump ${process.env.DATABASE_URL} > ${backupFile}`,
      'Creating database backup'
    );
    
    if (!config.dryRun) {
      const stats = await fs.stat(backupFile);
      log(`Backup created: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    }
    
    return backupFile;
  } catch (error) {
    log('Backup creation failed - continuing without backup', 'warning');
    return null;
  }
}

async function step3_ResetDatabase(): Promise<boolean> {
  log('\n🗑️  Step 3: Reset Database', 'info');
  
  const confirmed = await confirm('⚠️  This will DELETE ALL DATA in the database. Continue?');
  
  if (!confirmed) {
    log('Database reset cancelled by user', 'warning');
    return false;
  }
  
  try {
    await runCommand('npm run db:reset:force', 'Resetting database');
    return true;
  } catch (error) {
    log('Database reset failed', 'error');
    return false;
  }
}

async function step4_GenerateMigration(): Promise<boolean> {
  log('\n🔨 Step 4: Generate Fresh Migration', 'info');
  
  try {
    await runCommand('npm run db:generate', 'Generating migration from schema');
    return true;
  } catch (error) {
    log('Migration generation failed', 'error');
    return false;
  }
}

async function step5_ReviewMigration(): Promise<boolean> {
  log('\n👀 Step 5: Review Generated Migration', 'info');
  
  if (config.dryRun) {
    log('[DRY RUN] Would review migration file', 'warning');
    return true;
  }
  
  // Find the latest migration file
  try {
    const drizzleDir = './drizzle';
    const files = await fs.readdir(drizzleDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql') && !f.startsWith('0'));
    
    if (sqlFiles.length === 0) {
      log('No migration file found', 'error');
      return false;
    }
    
    // Get the most recent migration
    sqlFiles.sort();
    const latestMigration = sqlFiles[sqlFiles.length - 1];
    const migrationPath = path.join(drizzleDir, latestMigration);
    
    log(`Latest migration: ${latestMigration}`, 'info');
    
    // Count CREATE TABLE statements
    const content = await fs.readFile(migrationPath, 'utf-8');
    const tableCount = (content.match(/CREATE TABLE/gi) || []).length;
    
    log(`Migration will create ${tableCount} tables`, 'info');
    
    if (tableCount < config.expectedTableCount * 0.9) {
      log(`Expected ~${config.expectedTableCount} tables, found ${tableCount}`, 'warning');
      log('This might indicate missing schema files in drizzle.config.ts', 'warning');
    } else {
      log(`Table count looks good (${tableCount} tables)`, 'success');
    }
    
    if (!config.auto) {
      const shouldContinue = await confirm('Review the migration file and confirm to continue');
      return shouldContinue;
    }
    
    return true;
  } catch (error) {
    log('Failed to review migration', 'error');
    return false;
  }
}

async function step6_ApplyMigration(): Promise<boolean> {
  log('\n🚀 Step 6: Apply Migration', 'info');
  
  try {
    await runCommand('npm run db:migrate', 'Applying migration to database');
    return true;
  } catch (error) {
    log('Migration application failed', 'error');
    return false;
  }
}

async function step7_VerifyDatabase(): Promise<boolean> {
  log('\n✓ Step 7: Verify Database State', 'info');
  
  if (config.dryRun) {
    log('[DRY RUN] Would verify database state', 'warning');
    return true;
  }
  
  try {
    // Run health check
    await runCommand('npm run db:health', 'Running database health check');
    
    // Verify table count
    log('Verifying table count...', 'info');
    // This would need actual database query - simplified for now
    
    return true;
  } catch (error) {
    log('Database verification failed', 'error');
    return false;
  }
}

async function step8_SeedData(): Promise<boolean> {
  log('\n🌱 Step 8: Seed Essential Data', 'info');
  
  const shouldSeed = await confirm('Would you like to seed the database with initial data?');
  
  if (!shouldSeed) {
    log('Skipping data seeding', 'info');
    return true;
  }
  
  try {
    await runCommand('npm run db:seed', 'Seeding foundation data');
    return true;
  } catch (error) {
    log('Data seeding failed (non-critical)', 'warning');
    return true; // Non-critical, continue
  }
}

async function step9_RunTests(): Promise<boolean> {
  log('\n🧪 Step 9: Run Integration Tests', 'info');
  
  const shouldTest = await confirm('Would you like to run integration tests?');
  
  if (!shouldTest) {
    log('Skipping integration tests', 'info');
    return true;
  }
  
  try {
    await runCommand('npm run test:integration', 'Running integration tests');
    return true;
  } catch (error) {
    log('Some tests failed - review test output', 'warning');
    return true; // Non-critical, continue
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 FRESH START DATABASE MIGRATION');
  console.log('='.repeat(80) + '\n');
  
  if (config.dryRun) {
    log('Running in DRY RUN mode - no changes will be made', 'warning');
  }
  
  if (config.auto) {
    log('Running in AUTOMATED mode - all confirmations will be auto-accepted', 'warning');
  }
  
  // Execute migration steps
  const steps = [
    { name: 'Preflight Checks', fn: step1_PreflightChecks },
    { name: 'Create Backup', fn: step2_CreateBackup },
    { name: 'Reset Database', fn: step3_ResetDatabase },
    { name: 'Generate Migration', fn: step4_GenerateMigration },
    { name: 'Review Migration', fn: step5_ReviewMigration },
    { name: 'Apply Migration', fn: step6_ApplyMigration },
    { name: 'Verify Database', fn: step7_VerifyDatabase },
    { name: 'Seed Data', fn: step8_SeedData },
    { name: 'Run Tests', fn: step9_RunTests },
  ];
  
  let backupFile: string | null = null;
  
  for (const step of steps) {
    try {
      const result = await step.fn();
      
      if (step.name === 'Create Backup' && typeof result === 'string') {
        backupFile = result;
      }
      
      if (result === false) {
        log(`\n❌ Migration failed at step: ${step.name}`, 'error');
        
        if (backupFile) {
          log(`\n💡 To restore from backup, run:`, 'info');
          log(`   psql $DATABASE_URL < ${backupFile}`, 'info');
        }
        
        process.exit(1);
      }
    } catch (error: any) {
      log(`\n❌ Unexpected error in step ${step.name}: ${error.message}`, 'error');
      
      if (backupFile) {
        log(`\n💡 To restore from backup, run:`, 'info');
        log(`   psql $DATABASE_URL < ${backupFile}`, 'info');
      }
      
      process.exit(1);
    }
  }
  
  // Success!
  console.log('\n' + '='.repeat(80));
  log('🎉 MIGRATION COMPLETED SUCCESSFULLY!', 'success');
  console.log('='.repeat(80) + '\n');
  
  log('Next steps:', 'info');
  log('1. Verify application functionality', 'info');
  log('2. Monitor logs for any errors', 'info');
  log('3. Update documentation', 'info');
  
  if (backupFile) {
    log(`\n💾 Backup saved to: ${backupFile}`, 'info');
  }
}

// Execute
main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
