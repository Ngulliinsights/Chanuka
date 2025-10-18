#!/usr/bin/env tsx

/**
 * Automated script to migrate console.log/error calls to structured logging
 * This script helps migrate the codebase from console.log to the new unified logger
 */

import * as fs from 'fs';
import * as path from 'path';

// Files and directories to process
const TARGET_DIRS = [
  'server/**/*.ts',
  'server/**/*.js',
  'shared/**/*.ts',
  'shared/**/*.js',
  'client/src/**/*.ts',
  'client/src/**/*.js',
  'client/src/**/*.tsx',
  'client/src/**/*.jsx',
  '*.ts',
  '*.js'
];

// Patterns to match console.log/error calls
const CONSOLE_PATTERNS = [
  // console.log with string
  /console\.log\(['"]([^'"]*)['"]\)/g,
  // console.log with variables
  /console\.log\(['"]([^'"]*)['"],?\s*([^;]*)\)/g,
  // console.error with string
  /console\.error\(['"]([^'"]*)['"]\)/g,
  // console.error with variables
  /console\.error\(['"]([^'"]*)['"],?\s*([^;]*)\)/g,
  // console.warn
  /console\.warn\(['"]([^'"]*)['"]\)/g,
  // console.debug
  /console\.debug\(['"]([^'"]*)['"]\)/g,
];

interface MigrationResult {
  file: string;
  changes: number;
  skipped: number;
  errors: string[];
}

function determineLogLevel(consoleMethod: string): string {
  switch (consoleMethod) {
    case 'log': return 'info';
    case 'error': return 'error';
    case 'warn': return 'warn';
    case 'debug': return 'debug';
    default: return 'info';
  }
}

function generateLoggerCall(consoleMethod: string, message: string, args?: string): string {
  const level = determineLogLevel(consoleMethod);
  const context = `{ component: '${path.basename(process.cwd())}' }`;

  if (args && args.trim()) {
    // Has additional arguments - convert to metadata
    return `logger.${level}('${message}', ${context}, ${args.trim()})`;
  } else {
    return `logger.${level}('${message}', ${context})`;
  }
}

function migrateFile(filePath: string): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    changes: 0,
    skipped: 0,
    errors: []
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Check if file already imports logger
    const hasLoggerImport = content.includes("import { logger }") || content.includes("import logger");

    // Add logger import if not present
    if (!hasLoggerImport) {
      // Find a good place to add the import (after other imports)
      const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
      if (importLines.length > 0) {
        const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
        const insertPoint = content.indexOf('\n', lastImportIndex) + 1;
        const loggerImport = "import { logger } from '../../shared/core/src/utils/logger';\n";
        content = content.slice(0, insertPoint) + loggerImport + content.slice(insertPoint);
      }
    }

    // Replace console.log/error calls
    CONSOLE_PATTERNS.forEach(pattern => {
      content = content.replace(pattern, (match, message, args) => {
        const consoleMethod = match.includes('console.log') ? 'log' :
                             match.includes('console.error') ? 'error' :
                             match.includes('console.warn') ? 'warn' : 'debug';

        try {
          const replacement = generateLoggerCall(consoleMethod, message, args);
          result.changes++;
          return replacement;
        } catch (error) {
          result.errors.push(`Failed to replace ${match}: ${error}`);
          result.skipped++;
          return match; // Keep original
        }
      });
    });

    // Only write if there were changes
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Migrated ${filePath}: ${result.changes} changes, ${result.skipped} skipped`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }

  } catch (error) {
    result.errors.push(`Failed to process file: ${error}`);
    console.error(`❌ Error processing ${filePath}:`, error);
  }

  return result;
}

function findFilesRecursively(dir: string, extensions: string[] = ['.ts', '.js', '.tsx', '.jsx']): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules, dist, build, .git, etc.
          if (!['node_modules', 'dist', 'build', '.git', '.next', 'coverage'].includes(item)) {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scan(dir);
  return files;
}

async function main() {
  console.log('🚀 Starting console.log migration to structured logging...\n');

  const allFiles = findFilesRecursively('.', ['.ts', '.js', '.tsx', '.jsx']);

  // Filter to only include files in our target directories
  const filteredFiles = allFiles.filter(file => {
    return file.startsWith('server/') ||
           file.startsWith('shared/') ||
           file.startsWith('client/src/') ||
           !file.includes('/');
  });

  console.log(`📁 Found ${filteredFiles.length} files to process\n`);

  const results: MigrationResult[] = [];
  let totalChanges = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of filteredFiles) {
    // Skip the logger file itself and this migration script
    if (file.includes('logger.ts') || file.includes('migrate-console-logs.ts')) {
      continue;
    }

    const result = migrateFile(file);
    results.push(result);
    totalChanges += result.changes;
    totalSkipped += result.skipped;
    totalErrors += result.errors.length;
  }

  console.log('\n📊 Migration Summary:');
  console.log('='.repeat(50));
  console.log(`Files processed: ${results.length}`);
  console.log(`Total changes: ${totalChanges}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\n🚨 Errors encountered:');
    results.forEach(result => {
      if (result.errors.length > 0) {
        console.log(`  ${result.file}:`);
        result.errors.forEach(error => console.log(`    - ${error}`));
      }
    });
  }

  console.log('\n✅ Migration completed!');
  console.log('\nNext steps:');
  console.log('1. Review the changes made');
  console.log('2. Test the application to ensure logging works correctly');
  console.log('3. Check for any remaining console.log calls that need manual migration');
  console.log('4. Update any custom logging patterns that couldn\'t be automatically migrated');
}

// Run the migration
main().catch(console.error);






