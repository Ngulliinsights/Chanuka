#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Rollback procedures with backup file restoration
 */

/**
 * Restore a single file from backup
 */
function restoreFile(filePath) {
  const backupPath = `${filePath}.backup`;

  try {
    if (!fs.existsSync(backupPath)) {
      console.log(`No backup found for ${filePath}`);
      return false;
    }

    // Read backup content
    const backupContent = fs.readFileSync(backupPath, 'utf8');

    // Restore original file
    fs.writeFileSync(filePath, backupContent);

    // Remove backup file
    fs.unlinkSync(backupPath);

    console.log(`Restored: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error restoring ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Find all backup files
 */
async function findBackupFiles() {
  try {
    const backupFiles = await glob('**/*.backup', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    return backupFiles.map(backupPath => backupPath.replace('.backup', ''));
  } catch (error) {
    console.error('Error finding backup files:', error.message);
    return [];
  }
}

/**
 * Create a comprehensive backup before migration (if not already exists)
 */
async function createFullBackup() {
  console.log('Creating full backup before migration...');

  const files = await glob('**/*.{ts,js,tsx,jsx}', {
    ignore: ['node_modules/**', 'dist/**', 'build/**', 'migration/**']
  });

  let backupCount = 0;

  for (const file of files) {
    const backupPath = `${file}.backup`;

    if (!fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(file, backupPath);
        backupCount++;
      } catch (error) {
        console.error(`Error creating backup for ${file}:`, error.message);
      }
    }
  }

  console.log(`Created ${backupCount} backup files`);
  return backupCount;
}

/**
 * Rollback all changes
 */
async function rollbackAll() {
  console.log('Starting full rollback...');

  const originalFiles = await findBackupFiles();

  if (originalFiles.length === 0) {
    console.log('No backup files found - nothing to rollback');
    return 0;
  }

  console.log(`Found ${originalFiles.length} files to restore`);

  let restoredCount = 0;
  let failedCount = 0;

  for (const file of originalFiles) {
    if (restoreFile(file)) {
      restoredCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`Rollback complete:`);
  console.log(`- Restored: ${restoredCount} files`);
  console.log(`- Failed: ${failedCount} files`);

  return restoredCount;
}

/**
 * Selective rollback for specific files
 */
async function rollbackSelective(filePatterns) {
  console.log(`Starting selective rollback for patterns: ${filePatterns.join(', ')}`);

  let restoredCount = 0;

  for (const pattern of filePatterns) {
    try {
      const files = await glob(pattern, {
        ignore: ['node_modules/**', 'dist/**', 'build/**']
      });

      for (const file of files) {
        if (restoreFile(file)) {
          restoredCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing pattern ${pattern}:`, error.message);
    }
  }

  console.log(`Selective rollback complete - restored ${restoredCount} files`);
  return restoredCount;
}

/**
 * Clean up all backup files
 */
async function cleanupBackups() {
  console.log('Cleaning up backup files...');

  const backupFiles = await glob('**/*.backup', {
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  });

  let cleanedCount = 0;

  for (const backupFile of backupFiles) {
    try {
      fs.unlinkSync(backupFile);
      cleanedCount++;
    } catch (error) {
      console.error(`Error removing ${backupFile}:`, error.message);
    }
  }

  console.log(`Cleaned up ${cleanedCount} backup files`);
  return cleanedCount;
}

/**
 * Main rollback function
 */
async function runRollback(options = {}) {
  const { selective, patterns, cleanup } = options;

  if (cleanup) {
    return await cleanupBackups();
  }

  if (selective && patterns && patterns.length > 0) {
    return await rollbackSelective(patterns);
  }

  return await rollbackAll();
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--cleanup')) {
    runRollback({ cleanup: true }).catch(console.error);
  } else if (args.includes('--selective')) {
    const patternIndex = args.indexOf('--selective');
    const patterns = args.slice(patternIndex + 1);
    if (patterns.length === 0) {
      console.error('Usage: node rollback-migration.js --selective <pattern1> <pattern2> ...');
      process.exit(1);
    }
    runRollback({ selective: true, patterns }).catch(console.error);
  } else {
    runRollback().catch(console.error);
  }
}

module.exports = {
  runRollback,
  rollbackAll,
  rollbackSelective,
  cleanupBackups,
  createFullBackup,
  restoreFile
};




































