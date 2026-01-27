#!/usr/bin/env tsx
/**
 * Directory Consolidation - Automated Import Updater
 * 
 * This script automatically updates all import statements to use the new
 * consolidated directory structure.
 * 
 * Run with: tsx consolidate-imports.ts
 */

import { promises as fs } from 'fs';
import { join, relative } from 'path';
import { globSync } from 'glob';

interface ImportUpdate {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const projectRoot = process.cwd();
const clientSrcDir = join(projectRoot, 'client/src');

const importUpdates: ImportUpdate[] = [
  // Security directory flattening
  {
    pattern: /from ['"]([^'"]*\/security\/csp\/CSPManager)['"]\b/g,
    replacement: "from '@client/security/csp-manager'",
    description: 'CSP Manager import'
  },
  {
    pattern: /from ['"]([^'"]*\/security\/csrf\/CSRFProtection)['"]\b/g,
    replacement: "from '@client/security/csrf-protection'",
    description: 'CSRF Protection import'
  },
  {
    pattern: /from ['"]([^'"]*\/security\/rate-limiting\/RateLimiter)['"]\b/g,
    replacement: "from '@client/security/rate-limiter'",
    description: 'Rate Limiter import'
  },
  {
    pattern: /from ['"]([^'"]*\/security\/sanitization\/InputSanitizer)['"]\b/g,
    replacement: "from '@client/security/input-sanitizer'",
    description: 'Input Sanitizer import'
  },
  
  // Validation consolidation
  {
    pattern: /from ['"]([^'"]*\/shared\/validation\/base-validation)['"]\b/g,
    replacement: "from '@client/lib/validation'",
    description: 'Base validation imports'
  },
  {
    pattern: /from ['"]([^'"]*\/validation)['"]\b(?!.*\/shared\/validation)/g,
    replacement: "from '@client/lib/validation'",
    description: 'Root validation imports'
  },
];

interface FileUpdate {
  path: string;
  changes: number;
}

const fileUpdates: FileUpdate[] = [];
let totalChanges = 0;

async function updateFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let updatedContent = content;
    let changes = 0;

    for (const update of importUpdates) {
      const matches = updatedContent.match(update.pattern);
      if (matches) {
        updatedContent = updatedContent.replace(update.pattern, update.replacement);
        changes += matches.length;
      }
    }

    if (changes > 0) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      fileUpdates.push({
        path: relative(projectRoot, filePath),
        changes
      });
      totalChanges += changes;
      console.log(`  ✓ ${relative(projectRoot, filePath)} - ${changes} import(s) updated`);
    }
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error);
  }
}

async function main(): Promise<void> {
  console.log('🔄 Directory Consolidation - Import Updater');
  console.log('=========================================\n');

  // Find all TypeScript and TSX files
  const tsFiles = globSync('client/src/**/*.{ts,tsx}', {
    cwd: projectRoot,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts'
    ]
  });

  console.log(`📁 Found ${tsFiles.length} TypeScript files to process\n`);
  console.log('🔍 Updating imports...\n');

  // Process each file
  for (const file of tsFiles) {
    const filePath = join(projectRoot, file);
    await updateFile(filePath);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Consolidation Summary');
  console.log('='.repeat(50));
  console.log(`\nTotal files updated: ${fileUpdates.length}`);
  console.log(`Total import statements updated: ${totalChanges}\n`);

  if (fileUpdates.length > 0) {
    console.log('Files with changes:');
    fileUpdates.forEach(file => {
      console.log(`  • ${file.path} (${file.changes} changes)`);
    });

    console.log('\n✅ Import consolidation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the changes: git diff');
    console.log('2. Type check: npm run typecheck');
    console.log('3. Lint: npm run lint');
    console.log('4. Build: npm run build:client');
    console.log('5. Test: npm run test');
  } else {
    console.log('ℹ️  No import updates needed - structure already consolidated!');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
