#!/usr/bin/env node
/**
 * Nuanced Verification Script
 * 
 * Distinguishes between production code and test code
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DetailedResult {
  metric: string;
  target: string;
  production: number;
  tests: number;
  total: number;
  passed: boolean;
  notes?: string;
}

function countPatternInFiles(pattern: RegExp, files: string[]): number {
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

function isTestFile(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  return (
    relativePath.includes('/tests/') ||
    relativePath.includes('/test/') ||
    relativePath.includes('\\tests\\') ||
    relativePath.includes('\\test\\') ||
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.tsx') ||
    filePath.endsWith('.spec.ts') ||
    filePath.endsWith('.spec.tsx') ||
    relativePath.includes('vitest.setup') ||
    relativePath.includes('test-helpers') ||
    relativePath.includes('setup-')
  );
}

async function main() {
  console.log('🔍 Running Nuanced Verification (Production vs Test Code)...\n');
  
  const results: DetailedResult[] = [];
  
  // Find all TypeScript files
  const allFiles = findFiles(
    process.cwd(),
    ['.ts', '.tsx'],
    ['node_modules', 'dist', 'build', '.cache', '.nx']
  );
  
  const productionFiles = allFiles.filter(f => !isTestFile(f));
  const testFiles = allFiles.filter(f => isTestFile(f));
  
  console.log(`Found ${allFiles.length} TypeScript files:`);
  console.log(`  - Production: ${productionFiles.length}`);
  console.log(`  - Tests: ${testFiles.length}\n`);
  
  // 1. Type Safety Violations
  const prodTypeSafety = countPatternInFiles(/\bas\s+any\b/g, productionFiles);
  const testTypeSafety = countPatternInFiles(/\bas\s+any\b/g, testFiles);
  results.push({
    metric: 'Type Safety Violations (as any)',
    target: '0 in production',
    production: prodTypeSafety,
    tests: testTypeSafety,
    total: prodTypeSafety + testTypeSafety,
    passed: prodTypeSafety === 0,
    notes: 'Test files may use "as unknown" for mocking'
  });
  
  // 2. Commented Imports (actual commented imports, not documentation)
  // Look for lines that start with // and have import followed by something other than a comment
  const prodCommentedImports = countPatternInFiles(/^\/\/\s*import\s+(?!.*\/\/)/gm, productionFiles);
  const testCommentedImports = countPatternInFiles(/^\/\/\s*import\s+(?!.*\/\/)/gm, testFiles);
  results.push({
    metric: 'Commented Imports',
    target: '0',
    production: prodCommentedImports,
    tests: testCommentedImports,
    total: prodCommentedImports + testCommentedImports,
    passed: prodCommentedImports === 0 && testCommentedImports === 0,
    notes: 'Documentation comments like "// Import all schemas" are OK'
  });
  
  // 3. TODO/FIXME indicating bugs
  const prodBugTodos = countPatternInFiles(/\/\/\s*(TODO|FIXME|HACK):?\s*(fix|bug|broken|error|issue)/gi, productionFiles);
  const testBugTodos = countPatternInFiles(/\/\/\s*(TODO|FIXME|HACK):?\s*(fix|bug|broken|error|issue)/gi, testFiles);
  results.push({
    metric: 'TODO/FIXME Comments (bugs)',
    target: '0',
    production: prodBugTodos,
    tests: testBugTodos,
    total: prodBugTodos + testBugTodos,
    passed: prodBugTodos === 0 && testBugTodos === 0,
    notes: 'Documentation TODOs are acceptable'
  });
  
  // 4. ESLint Suppressions
  const prodEslint = countPatternInFiles(/eslint-disable/g, productionFiles);
  const testEslint = countPatternInFiles(/eslint-disable/g, testFiles);
  results.push({
    metric: 'ESLint Suppressions',
    target: '<10 in production',
    production: prodEslint,
    tests: testEslint,
    total: prodEslint + testEslint,
    passed: prodEslint < 10,
    notes: 'Test files may have more suppressions'
  });
  
  // 5. TypeScript Suppressions
  const prodTsSuppress = countPatternInFiles(/@ts-(ignore|expect-error|nocheck)/g, productionFiles);
  const testTsSuppress = countPatternInFiles(/@ts-(ignore|expect-error|nocheck)/g, testFiles);
  results.push({
    metric: 'TypeScript Suppressions',
    target: '0 in production',
    production: prodTsSuppress,
    tests: testTsSuppress,
    total: prodTsSuppress + testTsSuppress,
    passed: prodTsSuppress === 0,
    notes: 'Test files may use suppressions for mocking'
  });
  
  // 6. TypeScript Compilation
  console.log('Checking TypeScript compilation...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    results.push({
      metric: 'TypeScript Compilation',
      target: '0 errors',
      production: 0,
      tests: 0,
      total: 0,
      passed: true
    });
  } catch (error: unknown) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const errorCount = (output.match(/error TS/g) || []).length;
    results.push({
      metric: 'TypeScript Compilation',
      target: '0 errors',
      production: errorCount,
      tests: 0,
      total: errorCount,
      passed: false
    });
  }
  
  // Print results
  console.log('\n' + '='.repeat(100));
  console.log('NUANCED VERIFICATION RESULTS (Production vs Test Code)');
  console.log('='.repeat(100));
  
  for (const result of results) {
    const emoji = result.passed ? '✅' : '❌';
    console.log(`\n${emoji} ${result.metric}`);
    console.log(`   Target: ${result.target}`);
    console.log(`   Production: ${result.production}, Tests: ${result.tests}, Total: ${result.total}`);
    if (result.notes) {
      console.log(`   Note: ${result.notes}`);
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(100));
  console.log(`SUMMARY: ${passed}/${total} checks passed`);
  console.log('='.repeat(100) + '\n');
  
  // Detailed analysis
  console.log('DETAILED ANALYSIS:\n');
  
  const typeSafetyResult = results.find(r => r.metric.includes('Type Safety'));
  if (typeSafetyResult && !typeSafetyResult.passed) {
    console.log(`⚠️  Type Safety: ${typeSafetyResult.production} "as unknown" in production code`);
    console.log('   These should be reviewed and replaced with proper type guards.');
  }
  
  const todoResult = results.find(r => r.metric.includes('TODO/FIXME'));
  if (todoResult && !todoResult.passed) {
    console.log(`⚠️  TODO/FIXME: ${todoResult.production} bug-related comments in production`);
    console.log('   These indicate incomplete implementations or known bugs.');
  }
  
  const eslintResult = results.find(r => r.metric.includes('ESLint'));
  if (eslintResult && !eslintResult.passed) {
    console.log(`⚠️  ESLint: ${eslintResult.production} suppressions in production (target: <10)`);
    console.log('   Review these suppressions and fix underlying issues where possible.');
  }
  
  console.log('\n' + '='.repeat(100));
  
  if (passed === total) {
    console.log('🎉 ALL CHECKS PASSED! Production code meets all quality standards.');
    console.log('\nThe codebase is ready for production deployment.');
  } else {
    const criticalFailures = results.filter(r => !r.passed && r.production > 0).length;
    if (criticalFailures === 0) {
      console.log('✅ Production code meets standards. Test code has some issues (acceptable).');
    } else {
      console.log(`⚠️  ${criticalFailures} critical check(s) failed in production code.`);
      console.log('Review and address these issues before production deployment.');
    }
  }
  
  console.log('='.repeat(100) + '\n');
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed: total - passed
    },
    results,
    files: {
      total: allFiles.length,
      production: productionFiles.length,
      tests: testFiles.length
    }
  };
  
  const reportPath = path.join(process.cwd(), '.kiro/specs/comprehensive-bug-fixes/NUANCED_VERIFICATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  console.error('Error running verification:', error);
  process.exit(1);
});
