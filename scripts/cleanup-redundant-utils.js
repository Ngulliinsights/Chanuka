#!/usr/bin/env node

/**
 * Cleanup Script for Redundant Utility Files
 * 
 * This script safely deletes the original utility files that have been
 * consolidated into the new modules. It includes safety checks to ensure
 * no files are still importing from the old modules.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to delete after consolidation
const FILES_TO_DELETE = [
  // Development Tools
  'client/src/utils/dev-mode.ts',
  'client/src/utils/dev-server-check.ts',
  'client/src/utils/development-debug.ts',
  'client/src/utils/development-overrides.ts',
  
  // Testing
  'client/src/utils/test-imports.ts',
  'client/src/utils/validate-migration.ts',
  'client/src/utils/validateArchitecture.ts',
  
  // Security
  'client/src/utils/csp-headers.ts',
  'client/src/utils/dom-sanitizer.ts',
  'client/src/utils/input-validation.ts',
  'client/src/utils/password-validation.ts',
  
  // Performance
  'client/src/utils/performance-alerts.ts',
  'client/src/utils/performance-budget-checker.ts',
  'client/src/utils/web-vitals-monitor.ts',
  'client/src/utils/performance-optimizer.ts',
  
  // Browser
  'client/src/utils/browser-compatibility.ts',
  'client/src/utils/browser-compatibility-manager.ts',
  'client/src/utils/polyfills.ts',
  
  // Assets
  'client/src/utils/asset-manager.ts',
  'client/src/utils/asset-loader.ts',
  'client/src/utils/asset-optimization.ts',
  'client/src/utils/asset-fallback-config.ts',
  
  // Errors
  'client/src/utils/error-system.ts',
  'client/src/utils/unified-error-handler.ts',
  'client/src/utils/error-analytics.ts',
  'client/src/utils/error-reporting.ts',
  'client/src/utils/error-integration.ts',
  'client/src/utils/error-rate-limiter.ts',
  'client/src/utils/advanced-error-recovery.ts',
];

function checkForImports(filesToDelete) {
  console.log('🔍 Checking for remaining imports from old modules...\n');
  
  const allFiles = glob.sync('client/src/**/*.{ts,tsx}', { 
    ignore: ['node_modules/**', '**/*.test.ts', '**/*.test.tsx'] 
  });
  
  const remainingImports = [];
  
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const fileToDelete of filesToDelete) {
        const moduleName = path.basename(fileToDelete, '.ts');
        const importPattern = new RegExp(`from ['"].*/${moduleName}['"]`, 'g');
        const requirePattern = new RegExp(`require\\(['"].*/${moduleName}['"]\\)`, 'g');
        
        if (importPattern.test(content) || requirePattern.test(content)) {
          remainingImports.push({
            file,
            imports: moduleName
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${file}: ${error.message}`);
    }
  }
  
  return remainingImports;
}

function deleteFiles(filesToDelete, force = false) {
  console.log('🗑️  Deleting redundant utility files...\n');
  
  let deletedCount = 0;
  let skippedCount = 0;
  
  for (const file of filesToDelete) {
    try {
      if (fs.existsSync(file)) {
        if (force) {
          fs.unlinkSync(file);
          console.log(`✅ Deleted: ${file}`);
          deletedCount++;
        } else {
          console.log(`⏭️  Would delete: ${file} (use --force to actually delete)`);
          skippedCount++;
        }
      } else {
        console.log(`ℹ️  Already deleted: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${file}: ${error.message}`);
    }
  }
  
  return { deletedCount, skippedCount };
}

function createBackup(filesToDelete) {
  console.log('💾 Creating backup of files to be deleted...\n');
  
  const backupDir = 'backup/consolidated-utils';
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  let backedUpCount = 0;
  
  for (const file of filesToDelete) {
    try {
      if (fs.existsSync(file)) {
        const backupPath = path.join(backupDir, path.basename(file));
        fs.copyFileSync(file, backupPath);
        console.log(`💾 Backed up: ${file} → ${backupPath}`);
        backedUpCount++;
      }
    } catch (error) {
      console.error(`❌ Error backing up ${file}: ${error.message}`);
    }
  }
  
  console.log(`\n📦 Backed up ${backedUpCount} files to ${backupDir}\n`);
  return backedUpCount;
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const skipBackup = args.includes('--no-backup');
  const skipCheck = args.includes('--skip-check');
  
  console.log('🧹 Utility Consolidation Cleanup\n');
  
  // Safety check for remaining imports
  if (!skipCheck) {
    const remainingImports = checkForImports(FILES_TO_DELETE);
    
    if (remainingImports.length > 0) {
      console.log('⚠️  Found remaining imports from old modules:\n');
      
      remainingImports.forEach(({ file, imports }) => {
        console.log(`   ${file} → ${imports}`);
      });
      
      console.log('\n❌ Cannot proceed with deletion until imports are updated.');
      console.log('💡 Run the migration script first: node scripts/migrate-consolidated-imports.js');
      console.log('💡 Or use --skip-check to bypass this safety check');
      return;
    } else {
      console.log('✅ No remaining imports found. Safe to proceed.\n');
    }
  }
  
  // Create backup unless skipped
  if (!skipBackup) {
    createBackup(FILES_TO_DELETE);
  }
  
  // Delete files
  const { deletedCount, skippedCount } = deleteFiles(FILES_TO_DELETE, force);
  
  console.log('\n📊 Summary:');
  console.log(`   Files to delete: ${FILES_TO_DELETE.length}`);
  console.log(`   Actually deleted: ${deletedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  
  if (skippedCount > 0 && !force) {
    console.log('\n💡 Use --force flag to actually delete the files');
  }
  
  if (deletedCount > 0) {
    console.log('\n✨ Cleanup complete! The utility consolidation is now active.');
    console.log('📋 Recommended next steps:');
    console.log('1. Run type checking: npm run type-check');
    console.log('2. Run tests: npm test');
    console.log('3. Update any remaining import statements manually');
  }
}

if (require.main === module) {
  main();
}

module.exports = { FILES_TO_DELETE, checkForImports, deleteFiles, createBackup };