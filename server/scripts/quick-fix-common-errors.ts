#!/usr/bin/env tsx
/**
 * Quick Fix Script for Common Server Errors
 * 
 * This script automatically fixes the most common TypeScript errors:
 * 1. Logger usage (wrong parameter order)
 * 2. Invalid import paths (typos and wrong extensions)
 * 3. Missing type guards for ServiceResult
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Fix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const fixes: Fix[] = [
  // Fix 1: Logger usage - swap parameters
  {
    pattern: /logger\.(info|warn|error|debug)\((['"`][^'"`]+['"`]),\s*(\{[^}]+\})\)/g,
    replacement: 'logger.$1($3, $2)',
    description: 'Fix logger parameter order'
  },
  
  // Fix 2: Remove .ts extension from imports
  {
    pattern: /from ['"](@server\/[^'"]+)\.ts['"]/g,
    replacement: "from '$1'",
    description: 'Remove .ts extension from imports'
  },
  
  // Fix 3: Fix common typo in paths
  {
    pattern: /from ['"]@server\/infrastructure\/websocket-adapter\.ts['"]/g,
    replacement: "from '@server/infrastructure/websocket/adapters/websocket-adapter'",
    description: 'Fix websocket adapter path'
  },
  
  // Fix 4: Fix schema import path
  {
    pattern: /from ['"]@server\/infrastructure\/schema\/schema['"]/g,
    replacement: "from '@server/infrastructure/schema'",
    description: 'Fix schema import path'
  },
  
  // Fix 5: Add type guard for ServiceResult.success
  {
    pattern: /if\s*\(\s*(\w+)\.success\s*\)/g,
    replacement: "if ('success' in $1 && $1.success)",
    description: 'Add type guard for ServiceResult.success'
  },
  
  // Fix 6: Add type guard for ServiceResult.error
  {
    pattern: /if\s*\(\s*(\w+)\.error\s*\)/g,
    replacement: "if ('error' in $1 && $1.error)",
    description: 'Add type guard for ServiceResult.error'
  }
];

async function fixFile(filePath: string, dryRun: boolean = false): Promise<number> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  let modified = false;

  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      fixCount += matches.length;
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
      console.log(`  ✓ ${fix.description}: ${matches.length} fix(es)`);
    }
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetDir = args.find(arg => !arg.startsWith('--')) || '.';

  console.log('🔧 Quick Fix Script for Common Server Errors\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY FIXES'}`);
  console.log(`Target: ${targetDir}\n`);

  // Find all TypeScript files
  const files = await glob(`${targetDir}/**/*.ts`, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  console.log(`Found ${files.length} TypeScript files\n`);

  let totalFixes = 0;
  let filesModified = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const fixCount = await fixFile(file, dryRun);
    
    if (fixCount > 0) {
      console.log(`📝 ${relativePath}: ${fixCount} fix(es)\n`);
      filesModified++;
      totalFixes += fixCount;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Summary:`);
  console.log(`  Files scanned: ${files.length}`);
  console.log(`  Files modified: ${filesModified}`);
  console.log(`  Total fixes: ${totalFixes}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply fixes');
  } else {
    console.log('\n✅ Fixes applied successfully!');
  }
}

main().catch(console.error);
