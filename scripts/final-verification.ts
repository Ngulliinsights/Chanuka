#!/usr/bin/env node
/**
 * Final Verification Script
 * 
 * Quick verification of key metrics for production readiness
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  metric: string;
  target: string;
  actual: string;
  passed: boolean;
}

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: unknown) {
    return error.stdout || error.stderr || '';
  }
}

function countPattern(pattern: RegExp, files: string[]): number {
  let count = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  return count;
}

function findFiles(dir: string, extensions: string[], exclude: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);
        
        // Check if excluded
        if (exclude.some(pattern => relativePath.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  walk(dir);
  return files;
}

async function main() {
  console.log('🔍 Running Final Verification...\n');
  
  const results: VerificationResult[] = [];
  
  // Find all TypeScript files (excluding tests and node_modules)
  const productionFiles = findFiles(
    process.cwd(),
    ['.ts', '.tsx'],
    ['node_modules', 'dist', 'build', '.test.ts', '.test.tsx', 'tests/', 'test/']
  );
  
  const allFiles = findFiles(
    process.cwd(),
    ['.ts', '.tsx'],
    ['node_modules', 'dist', 'build']
  );
  
  // 1. Type Safety Violations
  const typeSafetyViolations = countPattern(/\bas\s+any\b/g, productionFiles);
  results.push({
    metric: 'Type Safety Violations (as any)',
    target: '0',
    actual: typeSafetyViolations.toString(),
    passed: typeSafetyViolations === 0
  });
  
  // 2. Commented Imports (actual commented imports, not documentation)
  const commentedImports = countPattern(/^\/\/\s*import\s+[^/]/gm, allFiles);
  results.push({
    metric: 'Commented Imports',
    target: '0',
    actual: commentedImports.toString(),
    passed: commentedImports === 0
  });
  
  // 3. TODO/FIXME indicating bugs
  const bugTodos = countPattern(/\/\/\s*(TODO|FIXME|HACK):?\s*(fix|bug|broken|error|issue)/gi, allFiles);
  results.push({
    metric: 'TODO/FIXME Comments (bugs)',
    target: '0',
    actual: bugTodos.toString(),
    passed: bugTodos === 0
  });
  
  // 4. ESLint Suppressions
  const eslintSuppressions = countPattern(/eslint-disable/g, allFiles);
  results.push({
    metric: 'ESLint Suppressions',
    target: '<10',
    actual: eslintSuppressions.toString(),
    passed: eslintSuppressions < 10
  });
  
  // 5. TypeScript Suppressions
  const tsSuppressions = countPattern(/@ts-(ignore|expect-error|nocheck)/g, allFiles);
  results.push({
    metric: 'TypeScript Suppressions',
    target: '0',
    actual: tsSuppressions.toString(),
    passed: tsSuppressions === 0
  });
  
  // 6. TypeScript Compilation
  console.log('Checking TypeScript compilation...');
  const tscOutput = runCommand('npx tsc --noEmit 2>&1');
  const tscErrors = (tscOutput.match(/error TS/g) || []).length;
  results.push({
    metric: 'TypeScript Compilation Errors',
    target: '0',
    actual: tscErrors.toString(),
    passed: tscErrors === 0
  });
  
  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('FINAL VERIFICATION RESULTS');
  console.log('='.repeat(80));
  
  for (const result of results) {
    const emoji = result.passed ? '✅' : '❌';
    console.log(`${emoji} ${result.metric}`);
    console.log(`   Target: ${result.target}, Actual: ${result.actual}`);
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passed}/${total} checks passed`);
  console.log('='.repeat(80) + '\n');
  
  if (passed === total) {
    console.log('🎉 All verification checks passed!');
    console.log('\nNext steps:');
    console.log('1. Run full test suite: npm test -- --run');
    console.log('2. Run production build: npm run build');
    console.log('3. Review production readiness summary');
    console.log('4. Obtain stakeholder approval');
    console.log('5. Deploy to production');
  } else {
    console.log('⚠️  Some checks failed. Review the results above.');
    console.log('\nNote: Some failures may be acceptable (e.g., test files with "as unknown")');
  }
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  console.error('Error running verification:', error);
  process.exit(1);
});
