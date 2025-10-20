#!/usr/bin/env tsx

/**
 * Rollback Script - Restore deprecated folders from backup
 * 
 * This script restores directories that were removed by the cleanup script.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const BACKUP_DIR = 'shared/core/.cleanup-backup';

interface RollbackResult {
  restored: string[];
  errors: Array<{ path: string; error: string }>;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function listBackups(): Promise<string[]> {
  try {
    if (!(await directoryExists(BACKUP_DIR))) {
      return [];
    }
    
    const entries = await fs.readdir(BACKUP_DIR);
    return entries.filter(async (entry) => {
      const fullPath = join(BACKUP_DIR, entry);
      return await directoryExists(fullPath);
    });
  } catch {
    return [];
  }
}

async function restoreDirectory(backupName: string): Promise<string> {
  const backupPath = join(BACKUP_DIR, backupName);
  const originalPath = backupName.replace(/_/g, '/');
  
  try {
    // Ensure parent directory exists
    const parentDir = originalPath.split('/').slice(0, -1).join('/');
    if (parentDir) {
      await fs.mkdir(parentDir, { recursive: true });
    }
    
    // Copy backup back to original location
    execSync(`xcopy "${backupPath}" "${originalPath}" /E /I /H /Y`, { stdio: 'inherit' });
    console.log(`✓ Restored ${originalPath} from backup`);
    
    return originalPath;
  } catch (error) {
    console.error(`✗ Failed to restore ${originalPath}:`, error);
    throw error;
  }
}

async function rollback(): Promise<RollbackResult> {
  console.log('🔄 Starting rollback of deprecated folders...');
  
  const result: RollbackResult = {
    restored: [],
    errors: []
  };

  // List available backups
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('ℹ No backups found to restore');
    return result;
  }

  console.log(`📁 Found ${backups.length} backup(s) to restore:`);
  backups.forEach(backup => console.log(`   - ${backup}`));

  // Restore each backup
  for (const backup of backups) {
    try {
      console.log(`\n📁 Restoring ${backup}...`);
      const restoredPath = await restoreDirectory(backup);
      result.restored.push(restoredPath);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: backup, error: errorMsg });
    }
  }

  return result;
}

async function printSummary(result: RollbackResult): Promise<void> {
  console.log('\n📊 Rollback Summary:');
  console.log('===================');
  
  if (result.restored.length > 0) {
    console.log(`✅ Restored directories (${result.restored.length}):`);
    result.restored.forEach(dir => console.log(`   - ${dir}`));
  }
  
  if (result.errors.length > 0) {
    console.log(`❌ Errors (${result.errors.length}):`);
    result.errors.forEach(({ path, error }) => console.log(`   - ${path}: ${error}`));
  }
  
  if (result.restored.length > 0) {
    console.log('\n🎉 Rollback completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run tests to ensure everything works: npm test');
    console.log('   2. Build the project: npm run build');
  }
}

async function main() {
  try {
    const result = await rollback();
    await printSummary(result);
    
    if (result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Rollback failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { rollback };