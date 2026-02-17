#!/usr/bin/env tsx
/**
 * Fix Easy ESLint Suppressions
 * 
 * Fixes suppressions that can be automatically resolved:
 * 1. no-console -> Replace with logger
 * 2. @typescript-eslint/no-var-requires -> Convert to import
 * 3. Remove suppressions that are no longer needed
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

function fixNoConsole(content: string): { content: string; count: number } {
  let count = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  // Check if logger is already imported
  const hasLoggerImport = content.includes("from '@client/lib/utils/logger'") ||
                          content.includes("from '@shared/core'") ||
                          content.includes("from '../utils/logger'");
  
  let needsLoggerImport = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    
    // Check if this is a no-console suppression
    if (line.includes('eslint-disable-next-line no-console')) {
      // Check what console method is used
      if (nextLine.includes('console.log')) {
        count++;
        needsLoggerImport = true;
        // Skip the suppression line
        continue;
      } else if (nextLine.includes('console.warn')) {
        count++;
        needsLoggerImport = true;
        continue;
      } else if (nextLine.includes('console.error')) {
        count++;
        needsLoggerImport = true;
        continue;
      } else if (nextLine.includes('console.info')) {
        count++;
        needsLoggerImport = true;
        continue;
      } else if (nextLine.includes('console.debug')) {
        count++;
        needsLoggerImport = true;
        continue;
      }
    }
    
    // Replace console calls with logger
    if (line.includes('console.log(') && !line.includes('eslint-disable')) {
      newLines.push(line.replace(/console\.log\(/g, 'logger.info('));
    } else if (line.includes('console.warn(') && !line.includes('eslint-disable')) {
      newLines.push(line.replace(/console\.warn\(/g, 'logger.warn('));
    } else if (line.includes('console.error(') && !line.includes('eslint-disable')) {
      newLines.push(line.replace(/console\.error\(/g, 'logger.error('));
    } else if (line.includes('console.info(') && !line.includes('eslint-disable')) {
      newLines.push(line.replace(/console\.info\(/g, 'logger.info('));
    } else if (line.includes('console.debug(') && !line.includes('eslint-disable')) {
      newLines.push(line.replace(/console\.debug\(/g, 'logger.debug('));
    } else {
      newLines.push(line);
    }
  }
  
  let newContent = newLines.join('\n');
  
  // Add logger import if needed and not already present
  if (needsLoggerImport && !hasLoggerImport) {
    // Determine correct import path based on file location
    const isClient = content.includes('client/src') || content.includes('client\\src');
    const isServer = content.includes('server/') || content.includes('server\\');
    
    let importStatement = '';
    if (isClient) {
      importStatement = "import { logger } from '@client/lib/utils/logger';\n";
    } else if (isServer) {
      importStatement = "import { logger } from '@shared/core';\n";
    } else {
      importStatement = "import { logger } from '@shared/core';\n";
    }
    
    // Add import after other imports
    const importRegex = /^import .+ from .+;$/m;
    const match = newContent.match(importRegex);
    if (match) {
      const lastImportIndex = newContent.lastIndexOf(match[0]) + match[0].length;
      newContent = newContent.slice(0, lastImportIndex) + '\n' + importStatement + newContent.slice(lastImportIndex);
    } else {
      // No imports found, add at the beginning
      newContent = importStatement + '\n' + newContent;
    }
  }
  
  return { content: newContent, count };
}

function fixNoVarRequires(content: string): { content: string; count: number } {
  let count = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    
    // Check if this is a no-var-requires suppression
    if (line.includes('eslint-disable-next-line @typescript-eslint/no-var-requires')) {
      // Check if next line has require
      if (nextLine.includes('require(')) {
        count++;
        // Skip the suppression line
        continue;
      }
    }
    
    // Convert require to import
    const requireMatch = line.match(/const\s+(\{[^}]+\}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/);
    if (requireMatch && !line.includes('eslint-disable')) {
      const [, varName, modulePath] = requireMatch;
      newLines.push(line.replace(requireMatch[0], `import ${varName} from '${modulePath}'`));
    } else {
      newLines.push(line);
    }
  }
  
  return { content: newLines.join('\n'), count };
}

function removeUnnecessarySuppressions(content: string): { content: string; count: number } {
  let count = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    
    // Check for suppressions that might not be needed anymore
      // Check if next line still has 'any'
      if (!nextLine.includes(': any') && !nextLine.includes('as any')) {
        count++;
        // Skip this suppression
        continue;
      }
    }
    
    newLines.push(line);
  }
  
  return { content: newLines.join('\n'), count };
}

function fixFile(filePath: string, dryRun: boolean = false): FixResult {
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  const patterns: Record<string, number> = {};
  let totalChanges = 0;

  // Apply fixes
  const fixes = [
    { name: 'no-console', fn: fixNoConsole },
    { name: 'no-var-requires', fn: fixNoVarRequires },
    { name: 'unnecessary suppressions', fn: removeUnnecessarySuppressions },
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

  logger.info('🔍 Scanning for fixable ESLint suppressions...\n');
  
  if (dryRun) {
    logger.info('🔬 DRY RUN MODE - No files will be modified\n');
  }

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

  logger.info(`📁 Found ${files.length} TypeScript files\n`);

  // Process files
  for (const file of files) {
    const result = fixFile(file, dryRun);
    
    if (result.fixed > 0) {
      results.push(result);
      totalFixed += result.fixed;
    }
  }

  // Print results
  logger.info('============================================================');
  logger.info('📊 ESLINT SUPPRESSION FIX SUMMARY');
  logger.info('============================================================\n');

  logger.info(`✅ Total Fixed: ${totalFixed}`);
  logger.info(`📁 Files Modified: ${results.length}\n`);

  if (results.length > 0) {
    logger.info('📋 Top 10 Files:\n');
    
    const sorted = results.sort((a, b) => b.fixed - a.fixed).slice(0, 10);
    for (const result of sorted) {
      const fileName = result.file.split(/[/\\]/).slice(-3).join('/');
      logger.info(`  ${fileName}`);
      logger.info(`    Fixed: ${result.fixed}`);
      
      for (const [pattern, count] of Object.entries(result.patterns)) {
        logger.info(`      - ${pattern}: ${count}`);
      }
      logger.info('');
    }

    // Pattern summary
    logger.info('📊 Pattern Summary:\n');
    const patternTotals: Record<string, number> = {};
    for (const result of results) {
      for (const [pattern, count] of Object.entries(result.patterns)) {
        patternTotals[pattern] = (patternTotals[pattern] || 0) + count;
      }
    }
    
    for (const [pattern, count] of Object.entries(patternTotals).sort((a, b) => b[1] - a[1])) {
      logger.info(`  ${pattern}: ${count}`);
    }
    logger.info('');
  }

  logger.info('============================================================');
  
  if (dryRun) {
    logger.info('🔬 DRY RUN COMPLETE - No files were modified\n');
    logger.info('💡 Run without --dry-run to apply fixes');
  } else {
    logger.info('✅ Fix complete!\n');
    logger.info('💡 Next steps:');
    logger.info('   1. Run: npm run scan:eslint-suppressions');
    logger.info('   2. Run: npm run verify:metrics');
    logger.info('   3. Review changes with: git diff');
  }
}

main().catch(console.error);
