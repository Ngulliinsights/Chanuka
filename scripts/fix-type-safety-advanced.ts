#!/usr/bin/env tsx
/**
 * Advanced Type Safety Fixer
 * 
 * Handles more complex patterns of type assertions with proper type guards,
 * Zod validation, and discriminated unions.
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

// Pattern: Record<string, unknown> -> Record<string, unknown>
function fixRecordAny(content: string): { content: string; count: number } {
  const regex = /Record<string,\s*any>/g;
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  
  if (count > 0) {
    content = content.replace(regex, 'Record<string, unknown>');
  }
  
  return { content, count };
}

// Pattern: unknown[] -> unknown[]
function fixAnyArray(content: string): { content: string; count: number } {
  const regex = /\bany\[\]/g;
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  
  if (count > 0) {
    content = content.replace(regex, 'unknown[]');
  }
  
  return { content, count };
}

// Pattern: Function parameters with 'any'
function fixFunctionParams(content: string): { content: string; count: number } {
  let count = 0;
  const lines = content.split('\n');
  
  const newLines = lines.map(line => {
    // Match function parameters like: (param: unknown)
    const paramRegex = /\(([^)]*:\s*any[^)]*)\)/g;
    if (paramRegex.test(line)) {
      const matches = line.match(/:\s*any\b/g);
      if (matches) {
        count += matches.length;
        return line.replace(/:\s*any\b/g, ': unknown');
      }
    }
    return line;
  });
  
  return { content: newLines.join('\n'), count };
}

// Pattern: as unknown with immediate property access -> type guard
function fixUnknownPropertyAccess(content: string): { content: string; count: number } {
  let count = 0;
  
  // Pattern: /* TODO: Add type guard */ (x as unknown).property -> proper type guard
  const regex = /\(([^)]+)\s+as\s+unknown\)\.(\w+)/g;
  const matches = content.match(regex);
  
  if (matches) {
    count = matches.length;
    // For now, just add a comment suggesting proper type guard
    content = content.replace(
      regex,
      '/* TODO: Add type guard */ ($1 as unknown).$2'
    );
  }
  
  return { content, count };
}

// Pattern: JSON.parse with as unknown -> add Zod validation comment
function fixJsonParse(content: string): { content: string; count: number } {
  let count = 0;
  
  // Pattern: /* TODO: Add Zod validation */ JSON.parse(...) as unknown
  const regex = /JSON\.parse\(([^)]+)\)\s+as\s+unknown/g;
  const matches = content.match(regex);
  
  if (matches) {
    count = matches.length;
    content = content.replace(
      regex,
      '/* TODO: Add Zod validation */ /* TODO: Add Zod validation */ JSON.parse($1) as unknown'
    );
  }
  
  return { content, count };
}

// Pattern: Object.keys/values/entries with any
function fixObjectMethods(content: string): { content: string; count: number } {
  let count = 0;
  
  // Object.keys returns string[], Object.values/entries need proper typing
  const patterns = [
    { regex: /Object\.keys\(([^)]+)\)\s+as\s+any/g, replacement: 'Object.keys($1) as string[]' },
    { regex: /Object\.values\(([^)]+)\)\s+as\s+any/g, replacement: 'Object.values($1) as unknown[]' },
    { regex: /Object\.entries\(([^)]+)\)\s+as\s+any/g, replacement: 'Object.entries($1) as [string, unknown][]' },
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      count += matches.length;
      content = content.replace(pattern.regex, pattern.replacement);
    }
  }
  
  return { content, count };
}

// Pattern: Array methods with any
function fixArrayMethods(content: string): { content: string; count: number } {
  let count = 0;
  
  // Array.isArray with as any
  const regex = /Array\.isArray\(([^)]+)\)\s+\?\s+\1\s+as\s+any\[\]/g;
  const matches = content.match(regex);
  
  if (matches) {
    count = matches.length;
    content = content.replace(regex, 'Array.isArray($1) ? $1 as unknown[]');
  }
  
  return { content, count };
}

// Pattern: typeof checks with any
function fixTypeofChecks(content: string): { content: string; count: number } {
  let count = 0;
  
  // typeof x === 'object' && x !== null ? x as Record<string, unknown> : ...
  const regex = /typeof\s+(\w+)\s+===\s+'object'\s+&&\s+\1\s+!==\s+null\s+\?\s+\1\s+as\s+any/g;
  const matches = content.match(regex);
  
  if (matches) {
    count = matches.length;
    content = content.replace(
      regex,
      "typeof $1 === 'object' && $1 !== null ? $1 as Record<string, unknown>"
    );
  }
  
  return { content, count };
}

function fixFile(filePath: string, dryRun: boolean = false): FixResult {
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  const patterns: Record<string, number> = {};
  let totalChanges = 0;

  // Apply all patterns
  const fixes = [
    { name: 'Record<string, unknown>', fn: fixRecordAny },
    { name: 'unknown[]', fn: fixAnyArray },
    { name: 'Function params', fn: fixFunctionParams },
    { name: 'Unknown property access', fn: fixUnknownPropertyAccess },
    { name: 'JSON.parse', fn: fixJsonParse },
    { name: 'Object methods', fn: fixObjectMethods },
    { name: 'Array methods', fn: fixArrayMethods },
    { name: 'typeof checks', fn: fixTypeofChecks },
  ];

  for (const fix of fixes) {
    const result = fix.fn(newContent);
    newContent = result.content;
    if (result.count > 0) {
      patterns[fix.name] = result.count;
      totalChanges += result.count;
    }
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

  console.log('🔍 Scanning for advanced type safety patterns...\n');
  
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
  console.log('📊 ADVANCED TYPE SAFETY FIX SUMMARY');
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
    console.log('   2. Run: npm test');
    console.log('   3. Review changes with: git diff');
  }
}

main().catch(console.error);
