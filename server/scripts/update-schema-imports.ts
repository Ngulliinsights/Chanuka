#!/usr/bin/env node

/**
 * Schema Import Migration Script (Optimized)
 * 
 * This script modernizes import statements across your server codebase by:
 * - Converting relative schema imports to the new @shared/schema path alias
 * - Updating deprecated table names to their current equivalents
 * - Standardizing database connection imports
 * - Providing detailed reporting and optional dry-run mode
 * 
 * Usage:
 *   node migrate-schema-imports.ts          # Apply changes
 *   node migrate-schema-imports.ts --dry-run # Preview changes only
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// Configuration for different import pattern categories
const IMPORT_MAPPINGS = {
  // Schema imports: captures various nesting levels of relative paths
  schema: [
    { pattern: /from ['"]\.\.\/\.\.\/shared\/schema\/schema\.js['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/shared\/schema\/schema\.js['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema\/schema\.js['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema\/schema\.js['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema\/schema\.js['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/shared\/schema['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/shared\/schema['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "from '@shared/schema'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "from '@shared/schema'" },
  ],
  
  // Namespace imports: handles import * as schema patterns
  namespaceSchema: [
    { pattern: /import \* as schema from ['"]\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "import * as schema from '@shared/schema'" },
    { pattern: /import \* as schema from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "import * as schema from '@shared/schema'" },
    { pattern: /import \* as schema from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "import * as schema from '@shared/schema'" },
    { pattern: /import \* as schema from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema['"]/g, replacement: "import * as schema from '@shared/schema'" },
  ],
  
  // Database connection imports
  database: [
    { pattern: /from ['"]\.\.\/shared\/database\/connection['"]/g, replacement: "from '@shared/database'" },
    { pattern: /from ['"]\.\.\/\.\.\/shared\/database\/connection['"]/g, replacement: "from '@shared/database'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/shared\/database\/connection['"]/g, replacement: "from '@shared/database'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/database\/connection['"]/g, replacement: "from '@shared/database'" },
  ],
  
  // Validation schema imports
  validation: [
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/schema\/validation['"]/g, replacement: "from '@shared/schema/validation'" },
    { pattern: /from ['"]\.\.\/\.\.\/\.\.\/shared\/schema\/validation['"]/g, replacement: "from '@shared/schema/validation'" },
    { pattern: /from ['"]\.\.\/\.\.\/shared\/schema\/validation['"]/g, replacement: "from '@shared/schema/validation'" },
  ],
};

// Table name mappings handle legacy naming conventions
const TABLE_MAPPINGS = {
  'user_profiles': 'user_profiles',
  'comments': 'comments',
  'notification': 'notifications',
  'bill': 'bills',
  'sponsor': 'sponsors',
  'user_interest': 'user_interests',
  'verification': 'user_verification',
  'expertVerifications': 'user_verification',
  'citizenVerifications': 'user_verification',
  'securityAuditLog': 'system_audit_log',
  'content_report': 'content_reports',
};

interface MigrationResult {
  filePath: string;
  changes: string[];
  success: boolean;
  error?: string;
}

interface MigrationStats {
  totalFiles: number;
  updatedFiles: number;
  skippedFiles: number;
  errors: number;
  totalChanges: number;
}

/**
 * Recursively discovers all TypeScript files in the given directory
 * while intelligently skipping common directories that shouldn't be processed
 */
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const excludedDirs = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
  
  function traverse(currentDir: string) {
    try {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        // Skip hidden files and excluded directories
        if (item.startsWith('.') || excludedDirs.has(item)) {
          continue;
        }
        
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (stat.isFile() && (extname(item) === '.ts' || extname(item) === '.tsx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read directory ${currentDir}: ${error}`);
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Updates imports and table names in a single file
 * Returns detailed information about what changed
 */
function updateFileImports(filePath: string, dryRun: boolean = false): MigrationResult {
  const changes: string[] = [];
  
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Process each category of import mappings
    for (const [category, mappings] of Object.entries(IMPORT_MAPPINGS)) {
      for (const { pattern, replacement } of mappings) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          content = content.replace(pattern, replacement);
          changes.push(`Updated ${category} import (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
        }
      }
    }
    
    // Update table names with context-aware matching
    for (const [oldTable, newTable] of Object.entries(TABLE_MAPPINGS)) {
      // Match table names in import destructuring: { oldTable, ... }
      const importPattern = new RegExp(`\\b${oldTable}\\b(?=\\s*[,}])`, 'g');
      const importMatches = content.match(importPattern);
      if (importMatches && importMatches.length > 0) {
        content = content.replace(importPattern, newTable);
        changes.push(`Renamed table '${oldTable}' → '${newTable}' in imports (${importMatches.length}x)`);
      }
      
      // Match table names followed by dot notation: oldTable.select()
      const usagePattern = new RegExp(`\\bschema\\.${oldTable}\\b`, 'g');
      const usageMatches = content.match(usagePattern);
      if (usageMatches && usageMatches.length > 0) {
        content = content.replace(usagePattern, `schema.${newTable}`);
        changes.push(`Renamed table 'schema.${oldTable}' → 'schema.${newTable}' (${usageMatches.length}x)`);
      }
    }
    
    // Only write if changes were made and not in dry-run mode
    if (content !== originalContent) {
      if (!dryRun) {
        writeFileSync(filePath, content, 'utf8');
      }
      return { filePath, changes, success: true };
    }
    
    return { filePath, changes: [], success: true };
  } catch (error) {
    return {
      filePath,
      changes: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Formats and displays the migration results in a clear, organized way
 */
function displayResults(results: MigrationResult[], stats: MigrationStats, dryRun: boolean) {
  console.log('\n' + '='.repeat(70));
  console.log(`📊 Migration ${dryRun ? 'Preview' : 'Results'}`);
  console.log('='.repeat(70) + '\n');
  
  // Show files that will be/were updated
  const updatedResults = results.filter(r => r.success && r.changes.length > 0);
  if (updatedResults.length > 0) {
    console.log(`✅ ${dryRun ? 'Would update' : 'Updated'} ${updatedResults.length} file${updatedResults.length !== 1 ? 's' : ''}:\n`);
    
    for (const result of updatedResults) {
      const relativePath = relative(process.cwd(), result.filePath);
      console.log(`  📄 ${relativePath}`);
      for (const change of result.changes) {
        console.log(`     • ${change}`);
      }
      console.log();
    }
  }
  
  // Show errors if any occurred
  const errorResults = results.filter(r => !r.success);
  if (errorResults.length > 0) {
    console.log(`❌ Encountered ${errorResults.length} error${errorResults.length !== 1 ? 's' : ''}:\n`);
    for (const result of errorResults) {
      const relativePath = relative(process.cwd(), result.filePath);
      console.log(`  📄 ${relativePath}`);
      console.log(`     Error: ${result.error}\n`);
    }
  }
  
  // Summary statistics
  console.log('='.repeat(70));
  console.log('📈 Summary Statistics:');
  console.log('='.repeat(70));
  console.log(`Total files scanned:     ${stats.totalFiles}`);
  console.log(`Files ${dryRun ? 'to be modified' : 'modified'}:   ${stats.updatedFiles}`);
  console.log(`Files unchanged:         ${stats.skippedFiles}`);
  console.log(`Errors encountered:      ${stats.errors}`);
  console.log(`Total changes made:      ${stats.totalChanges}`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution function that orchestrates the entire migration process
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  console.log('🚀 Schema Import Migration Tool');
  console.log('================================\n');
  
  if (dryRun) {
    console.log('🔍 Running in DRY-RUN mode (no files will be modified)\n');
  }
  
  const serverDir = join(process.cwd(), 'server');
  console.log(`📂 Scanning directory: ${serverDir}\n`);
  
  const tsFiles = getAllTsFiles(serverDir);
  console.log(`Found ${tsFiles.length} TypeScript file${tsFiles.length !== 1 ? 's' : ''} to process\n`);
  
  if (tsFiles.length === 0) {
    console.log('⚠️  No TypeScript files found. Ensure you\'re running this from the project root.');
    return;
  }
  
  // Process all files
  console.log('Processing files...\n');
  const results: MigrationResult[] = [];
  
  for (const file of tsFiles) {
    const result = updateFileImports(file, dryRun);
    results.push(result);
    
    // Show progress indicator
    if (result.changes.length > 0) {
      process.stdout.write('.');
    }
  }
  
  console.log('\n');
  
  // Calculate statistics
  const stats: MigrationStats = {
    totalFiles: results.length,
    updatedFiles: results.filter(r => r.success && r.changes.length > 0).length,
    skippedFiles: results.filter(r => r.success && r.changes.length === 0).length,
    errors: results.filter(r => !r.success).length,
    totalChanges: results.reduce((sum, r) => sum + r.changes.length, 0),
  };
  
  // Display comprehensive results
  displayResults(results, stats, dryRun);
  
  // Provide next steps guidance
  if (stats.updatedFiles > 0) {
    if (dryRun) {
      console.log('💡 Next steps:');
      console.log('   1. Review the changes above');
      console.log('   2. Run without --dry-run flag to apply changes');
      console.log('   3. Test your application thoroughly\n');
    } else {
      console.log('✨ Migration complete! Recommended next steps:');
      console.log('   1. Review the changes using git diff');
      console.log('   2. Run TypeScript compilation: npm run build or tsc');
      console.log('   3. Run your test suite: npm test');
      console.log('   4. Manually verify any edge cases');
      console.log('   5. Commit the changes\n');
    }
  } else {
    console.log('✅ No changes needed! Your imports are already up to date.\n');
  }
}

// Execute main function
main();

export { updateFileImports, getAllTsFiles };