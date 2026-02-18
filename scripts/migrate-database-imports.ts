#!/usr/bin/env tsx
/**
 * Database Import Migration Script
 * 
 * Migrates from databaseService wrapper to direct database imports
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Stats {
  filesProcessed: number;
  filesModified: number;
  errors: string[];
}

const stats: Stats = {
  filesProcessed: 0,
  filesModified: 0,
  errors: [],
};

function migrateFile(filePath: string): boolean {
  try {
    stats.filesProcessed++;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;

    // Check if file uses databaseService
    if (!content.includes('databaseService') && !content.includes('DatabaseService')) {
      return false;
    }

    console.log(`\n📝 Migrating: ${path.relative(process.cwd(), filePath)}`);

    // Step 1: Replace databaseService.db with db
    if (content.includes('databaseService.db')) {
      content = content.replace(/databaseService\.db\b/g, 'db');
      console.log('  ✓ databaseService.db → db');
      modified = true;
    }

    // Step 2: Replace databaseService.readDb with readDb
    if (content.includes('databaseService.readDb')) {
      content = content.replace(/databaseService\.readDb\b/g, 'readDb');
      console.log('  ✓ databaseService.readDb → readDb');
      modified = true;
    }

    // Step 3: Replace databaseService.writeDb with writeDb
    if (content.includes('databaseService.writeDb')) {
      content = content.replace(/databaseService\.writeDb\b/g, 'writeDb');
      console.log('  ✓ databaseService.writeDb → writeDb');
      modified = true;
    }

    // Step 4: Replace databaseService.withTransaction with withTransaction
    if (content.includes('databaseService.withTransaction')) {
      content = content.replace(/databaseService\.withTransaction\(/g, 'withTransaction(');
      console.log('  ✓ databaseService.withTransaction → withTransaction');
      modified = true;
    }

    // Step 5: Replace databaseService.withReadConnection with withReadConnection
    if (content.includes('databaseService.withReadConnection')) {
      content = content.replace(/databaseService\.withReadConnection\(/g, 'withReadConnection(');
      console.log('  ✓ databaseService.withReadConnection → withReadConnection');
      modified = true;
    }

    // Step 6: Update import statements
    const importPatterns = [
      /import\s+{\s*databaseService\s*}\s+from\s+['"]@server\/infrastructure\/database\/database-service['"]/g,
      /import\s+{\s*databaseService\s*}\s+from\s+['"]@\/infrastructure\/database\/database-service['"]/g,
      /import\s+{\s*databaseService\s*}\s+from\s+['"]\.\.\/\.\.\/\.\.\/infrastructure\/database\/database-service['"]/g,
      /import\s+{\s*databaseService\s*}\s+from\s+['"]@\/services\/database-service['"]/g,
      /import\s+{\s*DatabaseService\s*,\s*databaseService\s*}\s+from\s+['"]@\/infrastructure\/database\/database-service['"]/g,
    ];

    for (const pattern of importPatterns) {
      if (pattern.test(content)) {
        // Determine which imports are needed
        const needsDb = content.includes(' db.') || content.includes('(db)') || content.includes(' db,') || content.includes(' db;');
        const needsReadDb = content.includes('readDb');
        const needsWriteDb = content.includes('writeDb');
        const needsWithTransaction = content.includes('withTransaction(');
        const needsWithReadConnection = content.includes('withReadConnection(');

        const imports: string[] = [];
        if (needsDb) imports.push('db');
        if (needsReadDb) imports.push('readDb');
        if (needsWriteDb) imports.push('writeDb');
        if (needsWithTransaction) imports.push('withTransaction');
        if (needsWithReadConnection) imports.push('withReadConnection');

        if (imports.length > 0) {
          const newImport = `import { ${imports.join(', ')} } from '@server/infrastructure/database'`;
          content = content.replace(pattern, newImport);
          console.log(`  ✓ Updated import: { ${imports.join(', ')} }`);
          modified = true;
        }
        break;
      }
    }

    // Step 7: Remove DatabaseService class import if it's unused
    if (content.includes('DatabaseService') && !content.includes('new DatabaseService') && !content.includes('extends DatabaseService')) {
      content = content.replace(/import\s+{\s*DatabaseService\s*,?\s*}/g, 'import {');
      content = content.replace(/import\s+{\s*,\s*/g, 'import { ');
      content = content.replace(/,\s*DatabaseService\s*}/g, ' }');
      content = content.replace(/DatabaseService\s*,\s*/g, '');
    }

    // Write back if modified
    if (modified && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      stats.filesModified++;
      console.log('  ✅ File updated');
      return true;
    }

    return false;
  } catch (error) {
    const errorMsg = `Error processing ${filePath}: ${error}`;
    stats.errors.push(errorMsg);
    console.error(`  ✗ ${errorMsg}`);
    return false;
  }
}

async function migrate() {
  console.log('🔄 Starting Database Import Migration\n');

  const patterns = [
    'server/features/**/*.ts',
    'server/infrastructure/**/*.ts',
  ];

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
    });
    allFiles = allFiles.concat(files);
  }

  // Remove duplicates
  allFiles = [...new Set(allFiles)];

  console.log(`Found ${allFiles.length} files to check\n`);

  for (const file of allFiles) {
    migrateFile(file);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files processed:     ${stats.filesProcessed}`);
  console.log(`Files modified:      ${stats.filesModified}`);
  console.log(`Errors:              ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review changes: git diff');
  console.log('2. Check compilation: npm run type-check');
  console.log('3. Run tests: npm test');
  console.log('4. Commit: git add -A && git commit -m "refactor: migrate to direct database imports"');
}

migrate().catch(console.error);
