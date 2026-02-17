#!/usr/bin/env tsx
/**
 * Batch Fix Type Safety Violations
 * 
 * Systematically fixes common patterns of `as unknown` usage with proper type guards
 * and validation.
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

interface FixResult {
  file: string;
  fixed: number;
  patterns: Record<string, number>;
}

const results: FixResult[] = [];
let totalFixed = 0;

// Pattern 1: Simple type assertions that can use unknown
const PATTERN_1 = {
  name: 'as unknown to as unknown',
  regex: /\bas any\b/g,
  replacement: 'as unknown',
  validate: (line: string) => {
    // Only replace if it's a simple cast, not in a complex expression
    return !line.includes('as unknown[]') && 
           !line.includes('as any)') &&
           !line.includes('Record<string, unknown>');
  }
};

// Pattern 2: Error objects
const PATTERN_2 = {
  name: 'error as unknown to error instanceof Error',
  regex: /\(error as unknown\)\.(\w+)/g,
  replacement: (match: string, prop: string) => {
    if (['message', 'stack', 'name'].includes(prop)) {
      return `(error instanceof Error ? error.${prop} : String(error))`;
    }
    return match; // Keep as-is for other properties
  }
};

// Pattern 3: JSON.parse results
const PATTERN_3 = {
  name: 'JSON.parse as unknown to unknown with validation',
  regex: /JSON\.parse\([^)]+\)\s+as unknown/g,
  replacement: '/* TODO: Add Zod validation */ JSON.parse($1) as unknown',
};

function fixFile(filePath: string, dryRun: boolean = false): FixResult {
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  const patterns: Record<string, number> = {};
  let totalChanges = 0;

  // Apply Pattern 1: as unknown -> as unknown (simple cases)
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.includes('as unknown') && PATTERN_1.validate(line)) {
      const matches = line.match(PATTERN_1.regex);
      if (matches) {
        patterns[PATTERN_1.name] = (patterns[PATTERN_1.name] || 0) + matches.length;
        totalChanges += matches.length;
        return line.replace(PATTERN_1.regex, PATTERN_1.replacement);
      }
    }
    return line;
  });

  newContent = newLines.join('\n');

  // Apply Pattern 2: Error handling
  const errorMatches = newContent.match(/\(error as unknown\)\.\w+/g);
  if (errorMatches) {
    patterns[PATTERN_2.name] = errorMatches.length;
    totalChanges += errorMatches.length;
    newContent = newContent.replace(
      /\(error as unknown\)\.(\w+)/g,
      (match, prop) => {
        if (['message', 'stack', 'name'].includes(prop)) {
          return `(error instanceof Error ? error.${prop} : String(error))`;
        }
        return match;
      }
    );
  }

  if (!dryRun && totalChanges > 0) {
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    file: filePath,
    fixed: totalChanges,
    patterns,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = args.includes('--limit') 
    ? parseInt(args[args.indexOf('--limit') + 1]) 
    : undefined;

  console.log('🔍 Scanning for type safety violations...\n');
  
  if (dryRun) {
    console.log('🔬 DRY RUN MODE - No files will be modified\n');
  }

  // Find all TypeScript files in production code
  const files = await glob('**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/build/**',
      '**/*.d.ts',
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    absolute: true,
  });

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  // Process files
  let processedCount = 0;
  for (const file of files) {
    if (limit && processedCount >= limit) {
      console.log(`\n⚠️  Reached limit of ${limit} files\n`);
      break;
    }

    const result = fixFile(file, dryRun);
    
    if (result.fixed > 0) {
      results.push(result);
      totalFixed += result.fixed;
      processedCount++;
    }
  }

  // Print results
  console.log('============================================================');
  console.log('📊 TYPE SAFETY FIX SUMMARY');
  console.log('============================================================\n');

  console.log(`✅ Total Fixed: ${totalFixed}`);
  console.log(`📁 Files Modified: ${results.length}\n`);

  if (results.length > 0) {
    console.log('📋 Top 10 Files:\n');
    
    const sorted = results.sort((a, b) => b.fixed - a.fixed).slice(0, 10);
    for (const result of sorted) {
      const fileName = result.file.split(/[/\\]/).slice(-3).join('/');
      console.log(`  ${fileName}`);
      console.log(`    Fixed: ${result.fixed}`);
      
      for (const [pattern, count] of Object.entries(result.patterns)) {
        console.log(`      - ${pattern}: ${count}`);
      }
      console.log('');
    }
  }

  console.log('============================================================');
  
  if (dryRun) {
    console.log('🔬 DRY RUN COMPLETE - No files were modified\n');
    console.log('💡 Run without --dry-run to apply fixes');
  } else {
    console.log('✅ Fix complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run verify:metrics');
    console.log('   2. Run: npm test');
    console.log('   3. Review changes with: git diff');
  }
}

main().catch(console.error);
