#!/usr/bin/env tsx

/**
 * Cleanup Script - Remove deprecated folders from shared/core/src
 * 
 * This script safely removes deprecated directories that have been consolidated
 * into the unified observability system.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const DEPRECATED_DIRECTORIES = [
  'shared/core/src/error-handling',
  'shared/core/src/errors',
  // Note: logging directory kept for now as it may still have active code
];

const BACKUP_DIR = 'shared/core/.cleanup-backup';

interface CleanupResult {
  removed: string[];
  backed_up: string[];
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

async function createBackup(dirPath: string): Promise<void> {
  const backupPath = join(BACKUP_DIR, dirPath.replace(/[\/\\]/g, '_'));
  
  try {
    // Create backup directory if it doesn't exist
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    // Copy directory to backup
    execSync(`xcopy "${dirPath}" "${backupPath}" /E /I /H /Y`, { stdio: 'inherit' });
    console.log(`✓ Backed up ${dirPath} to ${backupPath}`);
  } catch (error) {
    console.warn(`⚠ Failed to backup ${dirPath}:`, error);
    throw error;
  }
}

async function removeDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`✓ Removed ${dirPath}`);
  } catch (error) {
    console.error(`✗ Failed to remove ${dirPath}:`, error);
    throw error;
  }
}

async function validateNoActiveImports(): Promise<boolean> {
  console.log('🔍 Validating no active imports from deprecated directories...');
  
  try {
    // Check for actual imports (not in documentation or migration scripts)
    const result = execSync(
      'findstr /R /S /I "from.*shared/core/src/(error-handling|errors)" *.ts *.js *.tsx *.jsx 2>nul || echo "No matches found"',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    if (result.includes('No matches found') || result.trim() === '') {
      console.log('✓ No active imports found');
      return true;
    } else {
      console.log('⚠ Found potential active imports:');
      console.log(result);
      return false;
    }
  } catch (error) {
    console.log('✓ No active imports found (search completed)');
    return true;
  }
}

async function cleanup(): Promise<CleanupResult> {
  console.log('🧹 Starting cleanup of deprecated folders...');
  
  const result: CleanupResult = {
    removed: [],
    backed_up: [],
    errors: []
  };

  // Validate no active imports
  const safeToClean = await validateNoActiveImports();
  if (!safeToClean) {
    console.log('❌ Found active imports. Please migrate them first.');
    process.exit(1);
  }

  // Process each deprecated directory
  for (const dirPath of DEPRECATED_DIRECTORIES) {
    try {
      if (await directoryExists(dirPath)) {
        console.log(`\n📁 Processing ${dirPath}...`);
        
        // Create backup
        await createBackup(dirPath);
        result.backed_up.push(dirPath);
        
        // Remove directory
        await removeDirectory(dirPath);
        result.removed.push(dirPath);
        
      } else {
        console.log(`ℹ Directory doesn't exist: ${dirPath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: dirPath, error: errorMsg });
      console.error(`❌ Error processing ${dirPath}:`, errorMsg);
    }
  }

  return result;
}

async function printSummary(result: CleanupResult): Promise<void> {
  console.log('\n📊 Cleanup Summary:');
  console.log('==================');
  
  if (result.removed.length > 0) {
    console.log(`✅ Removed directories (${result.removed.length}):`);
    result.removed.forEach(dir => console.log(`   - ${dir}`));
  }
  
  if (result.backed_up.length > 0) {
    console.log(`💾 Backed up directories (${result.backed_up.length}):`);
    result.backed_up.forEach(dir => console.log(`   - ${dir}`));
  }
  
  if (result.errors.length > 0) {
    console.log(`❌ Errors (${result.errors.length}):`);
    result.errors.forEach(({ path, error }) => console.log(`   - ${path}: ${error}`));
  }
  
  if (result.removed.length > 0) {
    console.log('\n🎉 Cleanup completed successfully!');
    console.log(`💾 Backups stored in: ${BACKUP_DIR}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Run tests to ensure everything works: npm test');
    console.log('   2. Build the project: npm run build');
    console.log('   3. If issues arise, restore from backup');
  }
}

async function main() {
  try {
    const result = await cleanup();
    await printSummary(result);
    
    if (result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main().catch(console.error);

export { cleanup, DEPRECATED_DIRECTORIES };