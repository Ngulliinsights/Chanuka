#!/usr/bin/env tsx
/**
 * Fix Commented Imports
 * 
 * Removes commented import statements that are marked as unused, deprecated, or not found.
 * Keeps commented imports that have explanatory comments indicating they're intentionally disabled.
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

interface FixResult {
  file: string;
  removed: number;
  kept: number;
  reasons: string[];
}

const results: FixResult[] = [];
let totalRemoved = 0;
let totalKept = 0;

// Patterns that indicate an import should be removed
const REMOVE_PATTERNS = [
  /\/\/\s*import.*\/\/\s*Unused/i,
  /\/\/\s*import.*\/\/\s*Deprecated/i,
  /\/\/\s*import.*\/\/\s*Module not found/i,
  /\/\/\s*import.*\/\/\s*Not used/i,
  /\/\/\s*import.*\/\/\s*Removed/i,
  /\/\/\s*import.*\/\/\s*TODO: Fix/i,
];

// Patterns that indicate an import should be kept (intentionally disabled)
const KEEP_PATTERNS = [
  /\/\/\s*import.*\/\/\s*Keep for reference/i,
  /\/\/\s*import.*\/\/\s*Intentionally disabled/i,
  /\/\/\s*import.*\/\/\s*Will be re-enabled/i,
];

function shouldRemoveImport(line: string): { remove: boolean; reason: string } {
  // Check if it should be kept
  for (const pattern of KEEP_PATTERNS) {
    if (pattern.test(line)) {
      return { remove: false, reason: 'Intentionally disabled' };
    }
  }

  // Check if it should be removed
  for (const pattern of REMOVE_PATTERNS) {
    if (pattern.test(line)) {
      const match = line.match(/\/\/\s*(.+)$/);
      const reason = match ? match[1] : 'Matched removal pattern';
      return { remove: true, reason };
    }
  }

  // If it's just a commented import with no explanation, remove it
  if (/^\/\/\s*import\s+/.test(line.trim())) {
    return { remove: true, reason: 'No explanation provided' };
  }

  return { remove: false, reason: 'Not a commented import' };
}

function fixFile(filePath: string): FixResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  let removed = 0;
  let kept = 0;
  const reasons: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { remove, reason } = shouldRemoveImport(line);

    if (remove) {
      removed++;
      reasons.push(`Line ${i + 1}: ${reason}`);
      // Skip this line (don't add to newLines)
    } else {
      newLines.push(line);
      if (line.trim().startsWith('// import')) {
        kept++;
      }
    }
  }

  if (removed > 0) {
    writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  }

  return {
    file: filePath,
    removed,
    kept,
    reasons,
  };
}

async function main() {
  console.log('🔍 Scanning for commented imports...\n');

  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/build/**',
      '**/*.d.ts',
    ],
    absolute: true,
  });

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  // Process each file
  for (const file of files) {
    const result = fixFile(file);
    
    if (result.removed > 0 || result.kept > 0) {
      results.push(result);
      totalRemoved += result.removed;
      totalKept += result.kept;
    }
  }

  // Print results
  console.log('============================================================');
  console.log('📊 COMMENTED IMPORTS FIX SUMMARY');
  console.log('============================================================\n');

  console.log(`🗑️  Total Removed: ${totalRemoved}`);
  console.log(`📌 Total Kept: ${totalKept}`);
  console.log(`📁 Files Modified: ${results.filter(r => r.removed > 0).length}\n`);

  if (results.length > 0) {
    console.log('📋 Details:\n');
    
    for (const result of results) {
      if (result.removed > 0) {
        console.log(`  ${result.file}`);
        console.log(`    Removed: ${result.removed}, Kept: ${result.kept}`);
        
        if (result.reasons.length > 0 && result.reasons.length <= 5) {
          result.reasons.forEach(reason => {
            console.log(`      - ${reason}`);
          });
        } else if (result.reasons.length > 5) {
          console.log(`      - ${result.reasons.length} imports removed`);
        }
        console.log('');
      }
    }
  }

  console.log('============================================================');
  console.log('✅ Fix complete!\n');

  if (totalRemoved > 0) {
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run verify:metrics');
    console.log('   2. Run: npm test');
    console.log('   3. Verify the application still builds');
  }
}

main().catch(console.error);
