#!/usr/bin/env tsx
/**
 * Fix Duplicate React Imports
 * 
 * Removes duplicate React imports that were accidentally added
 */

import * as fs from 'fs';
import { glob } from 'glob';

async function fixFile(filePath: string): Promise<boolean> {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for duplicate React imports
  const reactImportPattern = /^import\s+(?:React|\*\s+as\s+React)\s+from\s+['"]react['"];?\s*\n/gm;
  const matches = content.match(reactImportPattern);
  
  if (!matches || matches.length <= 1) {
    return false;
  }
  
  // Keep only the first React import, remove duplicates
  let firstImportFound = false;
  content = content.replace(reactImportPattern, (match) => {
    if (!firstImportFound) {
      firstImportFound = true;
      return match;
    }
    return '';
  });
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Fixed: ${filePath}`);
  return true;
}

async function main() {
  console.log('🔧 Fixing duplicate React imports...\n');

  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  let fixedCount = 0;

  for (const file of files) {
    try {
      const fixed = await fixFile(file);
      if (fixed) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error);
    }
  }

  console.log(`\n✅ Complete! Fixed ${fixedCount} files`);
}

main().catch(console.error);
