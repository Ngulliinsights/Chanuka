#!/usr/bin/env tsx
/**
 * Fix Invalid Imports Script
 * 
 * Systematically fixes all invalid import paths in the server codebase:
 * 1. Remove imports from non-existent @shared subdirectories
 * 2. Fix @/ imports to use @server
 * 3. Remove .ts extensions
 * 4. Fix typos in import paths
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportFix {
  pattern: RegExp;
  action: 'remove' | 'replace' | 'comment';
  replacement?: string;
  description: string;
}

const fixes: ImportFix[] = [
  // Fix 1: Remove invalid @shared/domain imports
  {
    pattern: /^import\s+.*from\s+['"]@shared\/(domain|entities|aggregates|application|infrastructure|monitoring|errors)\/.*['"];?\s*$/gm,
    action: 'comment',
    description: 'Comment out invalid @shared subdirectory imports'
  },
  
  // Fix 2: Fix @/ imports to @server
  {
    pattern: /from\s+['"]@\//g,
    action: 'replace',
    replacement: "from '@server/",
    description: 'Fix @/ imports to @server/'
  },
  
  // Fix 3: Remove .ts extensions from imports
  {
    pattern: /from\s+(['"])(@[^'"]+)\.ts\1/g,
    action: 'replace',
    replacement: "from $1$2$1",
    description: 'Remove .ts extensions from imports'
  },
  
  // Fix 4: Fix common typos
  {
    pattern: /from\s+['"]@server\/infrastructure\/schema\/schema['"]/g,
    action: 'replace',
    replacement: "from '@server/infrastructure/schema'",
    description: 'Fix schema import path'
  },
  
  {
    pattern: /from\s+['"]@server\/infrastructure\/observability\/logger['"]/g,
    action: 'replace',
    replacement: "from '@server/infrastructure/observability'",
    description: 'Fix logger import path'
  },
  
  {
    pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/query-executor['"]/g,
    action: 'comment',
    description: 'Comment out non-existent query-executor imports'
  },
  
  {
    pattern: /from\s+['"]\.\/domain\/legal-analysis\.servicenalysis\.service['"]/g,
    action: 'comment',
    description: 'Comment out typo in legal-analysis service import'
  },
  
  {
    pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/AuthAlert['"]/g,
    action: 'comment',
    description: 'Comment out non-existent AuthAlert import'
  }
];

async function fixFile(filePath: string, dryRun: boolean = false): Promise<{ fixed: number; commented: number }> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  let commentCount = 0;
  let modified = false;

  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      if (fix.action === 'remove') {
        content = content.replace(fix.pattern, '');
        fixCount += matches.length;
        modified = true;
      } else if (fix.action === 'replace' && fix.replacement) {
        content = content.replace(fix.pattern, fix.replacement);
        fixCount += matches.length;
        modified = true;
      } else if (fix.action === 'comment') {
        content = content.replace(fix.pattern, (match) => {
          return `// FIXME: Invalid import - ${fix.description}\n// ${match}`;
        });
        commentCount += matches.length;
        modified = true;
      }
    }
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { fixed: fixCount, commented: commentCount };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('🔧 Fix Invalid Imports Script\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY FIXES'}`);
  console.log(`Verbose: ${verbose ? 'ON' : 'OFF'}\n`);

  // Find all TypeScript files in server
  const serverDir = process.cwd();
  const files = await glob('**/*.ts', {
    cwd: serverDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    absolute: true
  });

  console.log(`Found ${files.length} TypeScript files\n`);

  let totalFixed = 0;
  let totalCommented = 0;
  let filesModified = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const { fixed, commented } = await fixFile(file, dryRun);
    
    if (fixed > 0 || commented > 0) {
      filesModified++;
      totalFixed += fixed;
      totalCommented += commented;
      
      if (verbose || (fixed + commented) > 0) {
        console.log(`📝 ${relativePath}:`);
        if (fixed > 0) console.log(`   ✓ Fixed: ${fixed}`);
        if (commented > 0) console.log(`   ⚠ Commented: ${commented}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Summary:`);
  console.log(`  Files scanned: ${files.length}`);
  console.log(`  Files modified: ${filesModified}`);
  console.log(`  Imports fixed: ${totalFixed}`);
  console.log(`  Imports commented: ${totalCommented}`);
  console.log('='.repeat(70));

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply fixes');
  } else {
    console.log('\n✅ Fixes applied successfully!');
    console.log('\n⚠️  Note: Commented imports need manual review and replacement');
    console.log('   Search for "// FIXME: Invalid import" to find them');
  }
}

main().catch(console.error);
