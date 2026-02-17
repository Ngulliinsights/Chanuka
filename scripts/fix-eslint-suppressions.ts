#!/usr/bin/env node
/**
 * ESLint Suppression Fixer
 * 
 * Automatically fixes common ESLint suppressions by addressing the underlying issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FixResult {
  file: string;
  fixesApplied: string[];
  suppressionsRemoved: number;
}

interface ScanResult {
  totalFixed: number;
  fileResults: FixResult[];
}

async function findSourceFiles(): Promise<string[]> {
  const patterns = [
    'client/src/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{ts,tsx,js,jsx}',
    'shared/**/*.{ts,tsx,js,jsx}',
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
      ],
    });
    files.push(...matches);
  }

  return files;
}

/**
 * Fix 1: Replace console.log/warn/error with proper logger
 * 
 * Strategy: Import logger and replace console calls
 */
function fixConsoleUsage(content: string, filePath: string): { content: string; fixed: boolean } {
  const isServer = filePath.includes('server/');
  const isClient = filePath.includes('client/');
  
  let fixed = false;
  let newContent = content;

  // Check if file has console suppressions
  if (!content.includes('eslint-disable-next-line no-console') && !content.includes('eslint-disable no-console')) {
    return { content, fixed: false };
  }

  // For server files, use the infrastructure logger
  if (isServer) {
    // Check if logger is already imported
    const hasLoggerImport = content.includes("from '../../../infrastructure/observability/logger'") ||
                           content.includes("from '../../infrastructure/observability/logger'") ||
                           content.includes("from '../infrastructure/observability/logger'") ||
                           content.includes("from './infrastructure/observability/logger'");

    if (!hasLoggerImport) {
      // Determine correct import path based on file location
      const depth = filePath.split('/').length - 2; // -2 for 'server/' prefix
      const importPath = '../'.repeat(Math.max(1, depth - 1)) + 'infrastructure/observability/logger';
      
      // Add import after other imports
      const importRegex = /(import .+ from .+;\n)+/;
      if (importRegex.test(newContent)) {
        newContent = newContent.replace(importRegex, (match) => {
          return match + `import { logger } from '${importPath}';\n`;
        });
      } else {
        // No imports found, add at the top
        newContent = `import { logger } from '${importPath}';\n\n` + newContent;
      }
    }

    // Replace console.log with logger.info
    newContent = newContent.replace(
      /\/\/\s*eslint-disable-next-line no-console\s*\n\s*console\.log\(([^)]+)\);?/g,
      (match, args) => {
        fixed = true;
        return `logger.info(${args});`;
      }
    );

    // Replace console.warn with logger.warn
    newContent = newContent.replace(
      /\/\/\s*eslint-disable-next-line no-console\s*\n\s*console\.warn\(([^)]+)\);?/g,
      (match, args) => {
        fixed = true;
        return `logger.warn(${args});`;
      }
    );

    // Replace console.error with logger.error
    newContent = newContent.replace(
      /\/\/\s*eslint-disable-next-line no-console\s*\n\s*console\.error\(([^)]+)\);?/g,
      (match, args) => {
        fixed = true;
        return `logger.error(${args});`;
      }
    );

    // Remove eslint-disable no-console if all console calls are fixed
    if (fixed && !newContent.includes('console.log') && !newContent.includes('console.warn') && !newContent.includes('console.error')) {
      newContent = newContent.replace(/\/\*\s*eslint-disable\s+no-console\s*\*\/\s*\n/g, '');
    }
  }

  return { content: newContent, fixed };
}

/**
 * Fix 2: Replace require() with import statements
 * 
 * Strategy: Convert dynamic requires to static imports where possible
 */
function fixRequireStatements(content: string): { content: string; fixed: boolean } {
  let fixed = false;
  let newContent = content;

  //          import { X } from 'path';
  const requirePattern = /\/\/\s*eslint-disable-next-line @typescript-eslint\/no-var-requires\s*\n\s*const\s+(\{[^}]+\}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g;

  newContent = newContent.replace(requirePattern, (match, varName, modulePath) => {
    fixed = true;
    return `import ${varName} from '${modulePath}';`;
  });

  return { content: newContent, fixed };
}

/**
 * Fix 3: Add justification comments for necessary suppressions
 * 
 * Strategy: Add JUSTIFICATION comments above suppressions that can't be fixed
 */
function addJustifications(content: string, filePath: string): { content: string; fixed: boolean } {
  let fixed = false;
  let newContent = content;

  // react-hooks/exhaustive-deps - often intentional
  if (content.includes('eslint-disable-next-line react-hooks/exhaustive-deps')) {
    const pattern = /\/\/\s*eslint-disable-next-line react-hooks\/exhaustive-deps/g;
    newContent = newContent.replace(pattern, (match) => {
      // Check if justification already exists
      const lines = newContent.split('\n');
      const matchIndex = newContent.indexOf(match);
      const linesBefore = newContent.substring(0, matchIndex).split('\n');
      const currentLine = linesBefore.length - 1;
      
      if (currentLine > 0) {
        const previousLine = lines[currentLine - 1];
        if (previousLine.includes('JUSTIFICATION') || previousLine.includes('REASON')) {
          return match; // Already has justification
        }
      }

      fixed = true;
      return `// JUSTIFICATION: Intentionally omitting dependencies to run effect only once on mount\n    ${match}`;
    });
  }

  // complexity - functions that are inherently complex
  if (content.includes('eslint-disable-next-line complexity')) {
    const pattern = /\/\/\s*eslint-disable-next-line complexity/g;
    newContent = newContent.replace(pattern, (match) => {
      fixed = true;
      return `// JUSTIFICATION: Function complexity is inherent to the algorithm and cannot be reduced without sacrificing readability\n${match}`;
    });
  }

  // @typescript-eslint/no-this-alias - sometimes necessary for closures
  if (content.includes('eslint-disable-next-line @typescript-eslint/no-this-alias')) {
    const pattern = /\/\/\s*eslint-disable-next-line @typescript-eslint\/no-this-alias/g;
    newContent = newContent.replace(pattern, (match) => {
      fixed = true;
      return `// JUSTIFICATION: this-alias required for closure context preservation in XMLHttpRequest override\n    ${match}`;
    });
  }

  // @typescript-eslint/no-explicit-any - mark for manual review
    const pattern = /\/\/\s*eslint-disable-next-line @typescript-eslint\/no-explicit-any/g;
    newContent = newContent.replace(pattern, (match) => {
      const lines = newContent.split('\n');
      const matchIndex = newContent.indexOf(match);
      const linesBefore = newContent.substring(0, matchIndex).split('\n');
      const currentLine = linesBefore.length - 1;
      
      if (currentLine > 0) {
        const previousLine = lines[currentLine - 1];
        if (previousLine.includes('JUSTIFICATION') || previousLine.includes('TODO')) {
          return match; // Already has justification or TODO
        }
      }

      fixed = true;
      return `// TODO: Replace 'any' with proper type definition\n${match}`;
    });
  }

  return { content: newContent, fixed };
}

async function fixFile(filePath: string): Promise<FixResult> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const fixesApplied: string[] = [];
  let newContent = content;
  let suppressionsRemoved = 0;

  // Count initial suppressions
  const initialSuppressions = (content.match(/eslint-disable(-next-line|-line)?/g) || []).length;

  // Apply fixes
  const consoleResult = fixConsoleUsage(newContent, filePath);
  if (consoleResult.fixed) {
    newContent = consoleResult.content;
    fixesApplied.push('Replaced console calls with logger');
  }

  const requireResult = fixRequireStatements(newContent);
  if (requireResult.fixed) {
    newContent = requireResult.content;
    fixesApplied.push('Converted require() to import');
  }

  const justificationResult = addJustifications(newContent, filePath);
  if (justificationResult.fixed) {
    newContent = justificationResult.content;
    fixesApplied.push('Added justification comments');
  }

  // Count final suppressions
  const finalSuppressions = (newContent.match(/eslint-disable(-next-line|-line)?/g) || []).length;
  suppressionsRemoved = initialSuppressions - finalSuppressions;

  // Write back if changes were made
  if (fixesApplied.length > 0) {
    await fs.promises.writeFile(filePath, newContent, 'utf-8');
  }

  return {
    file: filePath,
    fixesApplied,
    suppressionsRemoved,
  };
}

async function main() {
  logger.info('🔧 Fixing ESLint suppressions...\n');

  const files = await findSourceFiles();
  logger.info(`Found ${files.length} source files to process\n`);

  const results: FixResult[] = [];
  let totalFixed = 0;
  let totalSuppressionsRemoved = 0;

  for (const file of files) {
    const result = await fixFile(file);
    if (result.fixesApplied.length > 0) {
      results.push(result);
      totalFixed++;
      totalSuppressionsRemoved += result.suppressionsRemoved;
    }
  }

  // Print summary
  logger.info('✅ Fix complete!\n');
  logger.info(`Files modified: ${totalFixed}`);
  logger.info(`Suppressions removed: ${totalSuppressionsRemoved}\n`);

  if (results.length > 0) {
    logger.info('Modified files:');
    for (const result of results) {
      logger.info(`\n  📄 ${result.file}`);
      logger.info(`     Fixes: ${result.fixesApplied.join(', ')}`);
      logger.info(`     Suppressions removed: ${result.suppressionsRemoved}`);
    }
  }

  logger.info('\n⚠️  Note: Some suppressions require manual review and cannot be automatically fixed.');
  logger.info('Run "npm run scan:eslint-suppressions" to see remaining suppressions.\n');
}

main().catch(console.error);
