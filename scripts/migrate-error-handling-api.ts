#!/usr/bin/env tsx
/**
 * Automated Migration Script: Old Error Handling API → New API
 * 
 * This script migrates files from the old error handling API to the new one.
 * 
 * Changes:
 * 1. Updates imports from old paths to new paths
 * 2. Replaces withResultHandling() with safeAsync()
 * 3. Replaces ResultAdapter.* calls with new API functions
 * 4. Fixes function signatures
 * 
 * Usage:
 *   tsx scripts/migrate-error-handling-api.ts [file-pattern]
 *   tsx scripts/migrate-error-handling-api.ts server/features/users/**\/*.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationStats {
  filesProcessed: number;
  filesModified: number;
  importsUpdated: number;
  apiCallsReplaced: number;
  errors: string[];
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  importsUpdated: 0,
  apiCallsReplaced: 0,
  errors: [],
};

/**
 * Migration patterns
 */
const migrations = {
  // Import path updates
  imports: [
    // Error handling imports
    {
      pattern: /from ['"]@\/infrastructure\/errors\/result-adapter['"]/g,
      replacement: "from '@server/infrastructure/error-handling'",
    },
    {
      pattern: /from ['"]\.\.\/\.\.\/\.\.\/infrastructure\/errors\/result-adapter['"]/g,
      replacement: "from '@server/infrastructure/error-handling'",
    },
    {
      pattern: /from ['"]@\/infrastructure\/errors['"]/g,
      replacement: "from '@server/infrastructure/error-handling'",
    },
    {
      pattern: /from ['"]\.\.\/\.\.\/\.\.\/infrastructure\/errors['"]/g,
      replacement: "from '@server/infrastructure/error-handling'",
    },
    // Database service imports
    {
      pattern: /from ['"]@\/infrastructure\/database\/database-service['"]/g,
      replacement: "from '@server/infrastructure/database'",
    },
    {
      pattern: /from ['"]\.\.\/\.\.\/\.\.\/infrastructure\/database\/database-service['"]/g,
      replacement: "from '@server/infrastructure/database'",
    },
    {
      pattern: /from ['"]@server\/infrastructure\/database\/database-service['"]/g,
      replacement: "from '@server/infrastructure/database'",
    },
  ],

  // API call replacements
  apiCalls: [
    // Database service calls
    {
      pattern: /databaseService\.db\b/g,
      replacement: 'db',
      description: 'databaseService.db → db',
    },
    {
      pattern: /databaseService\.readDb\b/g,
      replacement: 'readDb',
      description: 'databaseService.readDb → readDb',
    },
    {
      pattern: /databaseService\.writeDb\b/g,
      replacement: 'writeDb',
      description: 'databaseService.writeDb → writeDb',
    },
    {
      pattern: /databaseService\.withTransaction\(/g,
      replacement: 'withTransaction(',
      description: 'databaseService.withTransaction → withTransaction',
    },
    {
      pattern: /databaseService\.withReadConnection\(/g,
      replacement: 'withReadConnection(',
      description: 'databaseService.withReadConnection → withReadConnection',
    },
    
    // Error handling calls
    // withResultHandling → safeAsync
    {
      pattern: /withResultHandling\s*\(/g,
      replacement: 'safeAsync(',
      description: 'withResultHandling → safeAsync',
    },
    
    // ResultAdapter.validationError
    {
      pattern: /ResultAdapter\.validationError\s*\(\s*\[([^\]]+)\]\s*,\s*({[^}]+})\s*\)/g,
      replacement: (match: string, fields: string, context: string) => {
        return `err(createValidationError('Validation failed', ${context}))`;
      },
      description: 'ResultAdapter.validationError → createValidationError',
    },
    
    // ResultAdapter.businessLogicError
    {
      pattern: /ResultAdapter\.businessLogicError\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*({[^}]+})\s*\)/g,
      replacement: (match: string, code: string, message: string, context: string) => {
        return `err(createBusinessLogicError('${message}', { ...${context}, code: '${code}' }))`;
      },
      description: 'ResultAdapter.businessLogicError → createBusinessLogicError',
    },
    
    // ResultAdapter.notFoundError
    {
      pattern: /ResultAdapter\.notFoundError\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^,]+)\s*,\s*({[^}]+})\s*\)/g,
      replacement: (match: string, resourceType: string, resourceId: string, context: string) => {
        return `err(createNotFoundError('${resourceType}', ${resourceId}, ${context}))`;
      },
      description: 'ResultAdapter.notFoundError → createNotFoundError',
    },
    
    // ResultAdapter.toBoom
    {
      pattern: /ResultAdapter\.toBoom\s*\(/g,
      replacement: 'boomFromStandardized(',
      description: 'ResultAdapter.toBoom → boomFromStandardized',
    },
    
    // ResultAdapter.fromBoom
    {
      pattern: /ResultAdapter\.fromBoom\s*\(/g,
      replacement: 'standardizedFromBoom(',
      description: 'ResultAdapter.fromBoom → standardizedFromBoom',
    },
  ],

  // Import statement updates
  importStatements: {
    // Remove old imports
    remove: [
      'withResultHandling',
      'ResultAdapter',
      'wrapAsync',
      'wrapSync',
      'databaseService',
    ],
    // Add new imports for error handling
    addErrorHandling: [
      'safeAsync',
      'safe',
      'err',
      'ok',
      'createValidationError',
      'createBusinessLogicError',
      'createNotFoundError',
      'createAuthenticationError',
      'createAuthorizationError',
      'boomFromStandardized',
      'standardizedFromBoom',
    ],
    // Add new imports for database
    addDatabase: [
      'db',
      'readDb',
      'writeDb',
      'withTransaction',
      'withReadConnection',
    ],
  },
};

/**
 * Migrate a single file
 */
function migrateFile(filePath: string): boolean {
  try {
    stats.filesProcessed++;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;

    // Update import paths
    for (const { pattern, replacement } of migrations.imports) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        stats.importsUpdated++;
        modified = true;
      }
    }

    // Replace API calls
    for (const migration of migrations.apiCalls) {
      if (migration.pattern.test(content)) {
        content = content.replace(migration.pattern, migration.replacement as any);
        stats.apiCallsReplaced++;
        modified = true;
        console.log(`  ✓ ${migration.description}`);
      }
    }

    // Update import statements to include new functions
    if (content.includes("from '@server/infrastructure/error-handling'")) {
      // Extract current imports
      const importMatch = content.match(
        /import\s+{([^}]+)}\s+from\s+['"]@server\/infrastructure\/error-handling['"]/
      );
      
      if (importMatch) {
        const currentImports = importMatch[1]
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
        
        // Determine which new imports are needed based on content
        const neededImports = new Set(currentImports);
        
        if (content.includes('safeAsync(')) neededImports.add('safeAsync');
        if (content.includes('safe(')) neededImports.add('safe');
        if (content.includes('err(')) neededImports.add('err');
        if (content.includes('ok(')) neededImports.add('ok');
        if (content.includes('createValidationError')) neededImports.add('createValidationError');
        if (content.includes('createBusinessLogicError')) neededImports.add('createBusinessLogicError');
        if (content.includes('createNotFoundError')) neededImports.add('createNotFoundError');
        if (content.includes('createAuthenticationError')) neededImports.add('createAuthenticationError');
        if (content.includes('createAuthorizationError')) neededImports.add('createAuthorizationError');
        if (content.includes('boomFromStandardized')) neededImports.add('boomFromStandardized');
        if (content.includes('standardizedFromBoom')) neededImports.add('standardizedFromBoom');
        
        // Remove old imports
        migrations.importStatements.remove.forEach(imp => neededImports.delete(imp));
        
        // Build new import statement
        const newImports = Array.from(neededImports).sort().join(',\n  ');
        const newImportStatement = `import {\n  ${newImports}\n} from '@server/infrastructure/error-handling'`;
        
        content = content.replace(
          /import\s+{[^}]+}\s+from\s+['"]@server\/infrastructure\/error-handling['"]/,
          newImportStatement
        );
        modified = true;
      }
    }

    // Write back if modified
    if (modified && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      stats.filesModified++;
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

/**
 * Main migration function
 */
async function migrate(pattern: string = 'server/features/**/*.ts') {
  console.log('🔄 Starting Error Handling API Migration\n');
  console.log(`Pattern: ${pattern}\n`);

  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
  });

  console.log(`Found ${files.length} files to process\n`);

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    
    // Check if file uses old API
    const content = fs.readFileSync(file, 'utf-8');
    const usesOldApi = 
      content.includes('withResultHandling') ||
      content.includes('ResultAdapter') ||
      content.includes('infrastructure/errors');
    
    if (!usesOldApi) {
      continue;
    }

    console.log(`\n📝 Migrating: ${relativePath}`);
    const modified = migrateFile(file);
    
    if (modified) {
      console.log(`  ✓ Modified`);
    } else {
      console.log(`  - No changes needed`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files processed:     ${stats.filesProcessed}`);
  console.log(`Files modified:      ${stats.filesModified}`);
  console.log(`Imports updated:     ${stats.importsUpdated}`);
  console.log(`API calls replaced:  ${stats.apiCallsReplaced}`);
  console.log(`Errors:              ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Run TypeScript compilation: npm run type-check');
  console.log('3. Run tests: npm test');
  console.log('4. Commit changes: git add -A && git commit -m "refactor: migrate to new error handling API"');
}

// Run migration
const pattern = process.argv[2] || 'server/features/**/*.ts';
migrate(pattern).catch(console.error);
