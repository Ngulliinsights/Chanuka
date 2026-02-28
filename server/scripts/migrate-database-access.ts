#!/usr/bin/env ts-node
/**
 * Database Access Migration Script
 * 
 * This script automates the migration from legacy database pool access to modern
 * database access patterns (readDatabase, writeDatabase, withTransaction).
 * 
 * Requirements: 1.1, 1.2, 1.3
 * 
 * Usage:
 *   npm run migrate:database-access [--dry-run] [--path=<directory>]
 * 
 * Options:
 *   --dry-run: Preview changes without modifying files
 *   --path: Target specific directory (default: server/features)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResult {
  file: string;
  changes: string[];
  success: boolean;
  error?: string;
}

interface MigrationStats {
  filesScanned: number;
  filesModified: number;
  totalChanges: number;
  errors: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEGACY_PATTERNS = {
  // Legacy pool imports
  poolImport: /import\s*{\s*pool\s*}\s*from\s*['"]@server\/infrastructure\/database\/pool['"]/g,
  dbImport: /import\s*{\s*db\s*}\s*from\s*['"]@server\/infrastructure\/database\/pool['"]/g,
  
  // Legacy database imports (already using modern but aliased as db)
  databaseAsDb: /import\s*{\s*database\s+as\s+db\s*,?\s*([^}]*)\s*}\s*from\s*['"]@server\/infrastructure\/database['"]/g,
  
  // Database as db from connection.ts
  databaseAsDbConnection: /import\s*{\s*database\s+as\s+db\s*,?\s*([^}]*)\s*}\s*from\s*['"]@server\/infrastructure\/database\/connection['"]/g,
  
  // Multiple imports including database as db
  multiImportWithDb: /import\s*{\s*([^}]*database\s+as\s+db[^}]*)\s*}\s*from\s*['"]@server\/infrastructure\/database['"]/g,
  
  // Direct pool usage
  poolQuery: /pool\.query\(/g,
  poolConnect: /pool\.connect\(/g,
};

const MODERN_PATTERNS = {
  // Modern imports
  readWriteImport: "import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';",
  
  // Modern usage patterns
  readOperation: 'readDatabase',
  writeOperation: 'writeDatabase',
  transactionWrapper: 'withTransaction',
};

// ============================================================================
// MAIN MIGRATION LOGIC
// ============================================================================

async function migrateFile(filePath: string, dryRun: boolean): Promise<MigrationResult> {
  const result: MigrationResult = {
    file: filePath,
    changes: [],
    success: true,
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Step 1: Replace legacy pool imports with modern imports
    if (LEGACY_PATTERNS.poolImport.test(content) || LEGACY_PATTERNS.dbImport.test(content)) {
      content = content.replace(LEGACY_PATTERNS.poolImport, MODERN_PATTERNS.readWriteImport);
      content = content.replace(LEGACY_PATTERNS.dbImport, MODERN_PATTERNS.readWriteImport);
      result.changes.push('Replaced legacy pool import with modern database imports');
    }

    // Step 2: Replace database as db pattern with proper imports
    const databaseAsDbMatch = content.match(LEGACY_PATTERNS.databaseAsDb);
    if (databaseAsDbMatch) {
      const otherImports = databaseAsDbMatch[1]?.trim();
      if (otherImports) {
        content = content.replace(
          LEGACY_PATTERNS.databaseAsDb,
          `import { readDatabase, writeDatabase, withTransaction, ${otherImports} } from '@server/infrastructure/database';`
        );
      } else {
        content = content.replace(
          LEGACY_PATTERNS.databaseAsDb,
          MODERN_PATTERNS.readWriteImport
        );
      }
      result.changes.push('Replaced "database as db" import with modern pattern');
    }

    // Step 2b: Replace database as db from connection.ts
    const databaseAsDbConnectionMatch = content.match(LEGACY_PATTERNS.databaseAsDbConnection);
    if (databaseAsDbConnectionMatch) {
      const otherImports = databaseAsDbConnectionMatch[1]?.trim();
      if (otherImports) {
        content = content.replace(
          LEGACY_PATTERNS.databaseAsDbConnection,
          `import { readDatabase, writeDatabase, withTransaction, ${otherImports} } from '@server/infrastructure/database';`
        );
      } else {
        content = content.replace(
          LEGACY_PATTERNS.databaseAsDbConnection,
          MODERN_PATTERNS.readWriteImport
        );
      }
      result.changes.push('Replaced "database as db" import from connection.ts with modern pattern');
    }

    // Step 2c: Handle multi-import patterns with database as db
    const multiImportMatch = content.match(LEGACY_PATTERNS.multiImportWithDb);
    if (multiImportMatch) {
      // Extract all imports and replace database as db
      const imports = multiImportMatch[1];
      const cleanedImports = imports
        .replace(/database\s+as\s+db\s*,?\s*/g, '')
        .replace(/,\s*,/g, ',')
        .trim();
      
      if (cleanedImports) {
        content = content.replace(
          LEGACY_PATTERNS.multiImportWithDb,
          `import { readDatabase, writeDatabase, withTransaction, ${cleanedImports} } from '@server/infrastructure/database';`
        );
      } else {
        content = content.replace(
          LEGACY_PATTERNS.multiImportWithDb,
          MODERN_PATTERNS.readWriteImport
        );
      }
      result.changes.push('Replaced multi-import with "database as db" with modern pattern');
    }

    // Step 3: Analyze and replace database operations
    // This is a heuristic approach - we'll replace db.select() with readDatabase
    // and db.insert/update/delete with writeDatabase wrapped in withTransaction
    
    // Replace read operations (select, query for reads)
    const readOpsPattern = /\bdb\.(select|query)\(/g;
    if (readOpsPattern.test(content)) {
      content = content.replace(/\bdb\.select\(/g, 'readDatabase.select(');
      result.changes.push('Replaced db.select() with readDatabase.select()');
    }

    // Replace write operations (insert, update, delete)
    const writeOpsPattern = /\bdb\.(insert|update|delete)\(/g;
    if (writeOpsPattern.test(content)) {
      // Note: This is a simplified replacement. Manual review may be needed
      // to properly wrap operations in withTransaction
      content = content.replace(/\bdb\.insert\(/g, 'writeDatabase.insert(');
      content = content.replace(/\bdb\.update\(/g, 'writeDatabase.update(');
      content = content.replace(/\bdb\.delete\(/g, 'writeDatabase.delete(');
      result.changes.push('Replaced write operations with writeDatabase (manual review needed for withTransaction)');
    }

    // Replace pool.query() with appropriate modern pattern
    if (LEGACY_PATTERNS.poolQuery.test(content)) {
      // This requires manual review as we need to determine if it's read or write
      result.changes.push('WARNING: Found pool.query() - requires manual migration');
    }

    // Step 4: Write changes if not dry run
    if (content !== originalContent) {
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    } else {
      result.changes = ['No changes needed'];
    }

  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function scanDirectory(targetPath: string): Promise<string[]> {
  const pattern = `${targetPath}/**/*.ts`;
  const files = await glob(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  });
  return files;
}

async function runMigration(options: { dryRun: boolean; targetPath: string }): Promise<void> {
  console.log('🚀 Starting database access migration...\n');
  console.log(`Target: ${options.targetPath}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const stats: MigrationStats = {
    filesScanned: 0,
    filesModified: 0,
    totalChanges: 0,
    errors: [],
  };

  try {
    // Scan for TypeScript files
    const files = await scanDirectory(options.targetPath);
    stats.filesScanned = files.length;

    console.log(`Found ${files.length} TypeScript files to analyze\n`);

    // Process each file
    for (const file of files) {
      const result = await migrateFile(file, options.dryRun);

      if (result.changes.length > 0 && result.changes[0] !== 'No changes needed') {
        stats.filesModified++;
        stats.totalChanges += result.changes.length;

        console.log(`\n📝 ${file}`);
        result.changes.forEach(change => {
          console.log(`   ✓ ${change}`);
        });
      }

      if (!result.success) {
        stats.errors.push(`${file}: ${result.error}`);
        console.error(`\n❌ ${file}`);
        console.error(`   Error: ${result.error}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary');
    console.log('='.repeat(80));
    console.log(`Files scanned:  ${stats.filesScanned}`);
    console.log(`Files modified: ${stats.filesModified}`);
    console.log(`Total changes:  ${stats.totalChanges}`);
    console.log(`Errors:         ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach(error => console.log(`   ${error}`));
    }

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No files were modified');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Migration complete!');
      console.log('\n⚠️  IMPORTANT: Manual review required for:');
      console.log('   1. Operations that need withTransaction wrapping');
      console.log('   2. Complex query patterns that may need custom handling');
      console.log('   3. Any pool.query() calls that need read/write classification');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pathArg = args.find(arg => arg.startsWith('--path='));
  const targetPath = pathArg ? pathArg.split('=')[1] : 'server/features';

  await runMigration({ dryRun, targetPath });
}

// Run if executed directly
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { migrateFile, scanDirectory, runMigration };
