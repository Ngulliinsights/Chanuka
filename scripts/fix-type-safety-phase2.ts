#!/usr/bin/env tsx
/**
 * Type Safety Improvements - Phase 2
 * 
 * Focus on converting 'as unknown' to proper type guards
 * Target: 570 → 400 violations (30% reduction)
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

function addTypeGuard(content: string): { content: string; count: number } {
  let count = 0;
  let newContent = content;

  // Pattern 1: (error as unknown as Error) → proper type guard
  const errorPattern = /\((\w+) as unknown as Error\)/g;
  const errorMatches = content.match(errorPattern);
  if (errorMatches) {
    newContent = newContent.replace(
      errorPattern,
      '($1 instanceof Error ? $1 : new Error(String($1)))'
    );
    count += errorMatches.length;
  }

  // Pattern 2: (value as unknown as string) → String(value)
  const stringPattern = /\((\w+) as unknown as string\)/g;
  const stringMatches = content.match(stringPattern);
  if (stringMatches) {
    newContent = newContent.replace(stringPattern, 'String($1)');
    count += stringMatches.length;
  }

  // Pattern 3: (value as unknown as number) → Number(value)
  const numberPattern = /\((\w+) as unknown as number\)/g;
  const numberMatches = content.match(numberPattern);
  if (numberMatches) {
    newContent = newContent.replace(numberPattern, 'Number($1)');
    count += numberMatches.length;
  }

  // Pattern 4: (value as unknown as boolean) → Boolean(value)
  const booleanPattern = /\((\w+) as unknown as boolean\)/g;
  const booleanMatches = content.match(booleanPattern);
  if (booleanMatches) {
    newContent = newContent.replace(booleanPattern, 'Boolean($1)');
    count += booleanMatches.length;
  }

  return { content: newContent, count };
}

function improveErrorHandling(content: string): { content: string; count: number } {
  let count = 0;
  let newContent = content;

  // Pattern: catch (error: unknown) with (error as any).property
  // Replace with proper type guard
  const catchPattern = /catch\s*\((\w+):\s*unknown\)\s*\{[^}]*\((\1)\s+as\s+any\)\.(\w+)/g;
  const matches = content.match(catchPattern);
  
  if (matches) {
    // This is complex, skip for now
    // Would need AST parsing to do properly
  }

  return { content: newContent, count };
}

function addNullChecks(content: string): { content: string; count: number } {
  let count = 0;
  let newContent = content;

  // Pattern: (value as unknown)?.property → value && typeof value === 'object' ? value.property : undefined
  // This is too complex for regex, would need AST

  return { content: newContent, count };
}

async function fixFile(filePath: string, dryRun: boolean = false): Promise<FixResult> {
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  const patterns: Record<string, number> = {};
  let totalChanges = 0;

  // Apply fixes
  const typeGuardResult = addTypeGuard(newContent);
  newContent = typeGuardResult.content;
  if (typeGuardResult.count > 0) {
    patterns['type guards'] = typeGuardResult.count;
    totalChanges += typeGuardResult.count;
  }

  const errorResult = improveErrorHandling(newContent);
  newContent = errorResult.content;
  if (errorResult.count > 0) {
    patterns['error handling'] = errorResult.count;
    totalChanges += errorResult.count;
  }

  const nullCheckResult = addNullChecks(newContent);
  newContent = nullCheckResult.content;
  if (nullCheckResult.count > 0) {
    patterns['null checks'] = nullCheckResult.count;
    totalChanges += nullCheckResult.count;
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

  console.log('🔍 Scanning for type safety improvements...\n');
  
  if (dryRun) {
    console.log('🔬 DRY RUN MODE - No files will be modified\n');
  }

  // Find all TypeScript files (excluding tests and node_modules)
  const files = await glob('**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/build/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/tests/**',
      '**/__tests__/**',
    ],
    absolute: true,
  });

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  // Process files
  for (const file of files) {
    const result = await fixFile(file, dryRun);
    
    if (result.fixed > 0) {
      results.push(result);
      totalFixed += result.fixed;
    }
  }

  // Print results
  console.log('============================================================');
  console.log('📊 TYPE SAFETY IMPROVEMENT SUMMARY');
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

    // Pattern summary
    console.log('📊 Pattern Summary:\n');
    const patternTotals: Record<string, number> = {};
    for (const result of results) {
      for (const [pattern, count] of Object.entries(result.patterns)) {
        patternTotals[pattern] = (patternTotals[pattern] || 0) + count;
      }
    }
    
    for (const [pattern, count] of Object.entries(patternTotals).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pattern}: ${count}`);
    }
    console.log('');
  }

  console.log('============================================================');
  
  if (dryRun) {
    console.log('🔬 DRY RUN COMPLETE - No files were modified\n');
    console.log('💡 Run without --dry-run to apply fixes');
  } else {
    console.log('✅ Fix complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run verify:metrics');
    console.log('   2. Run: npm run build');
    console.log('   3. Review changes with: git diff');
  }
}

main().catch(console.error);
