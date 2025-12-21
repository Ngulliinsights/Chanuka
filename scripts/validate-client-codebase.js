#!/usr/bin/env node

/**
 * Client Codebase Validation Script
 * Comprehensive validation of the entire client directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findFiles(dir, extensions, excludeDirs = []) {
  const files = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.some(exclude => fullPath.includes(exclude))) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function validateButtonTypes() {
  log('\n🔍 Validating button type attributes across client...', 'blue');
  
  const tsxFiles = findFiles('client/src', ['.tsx'], ['node_modules', '.git']);
  const issues = [];
  
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for buttons without type attribute
      if (line.includes('<button') && line.includes('onClick') && !line.includes('type=')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Button missing type attribute',
          code: line.trim()
        });
      }
    }
  }
  
  if (issues.length === 0) {
    log('✅ All buttons have proper type attributes', 'green');
  } else {
    log(`❌ Found ${issues.length} button type issues:`, 'red');
    issues.slice(0, 10).forEach(issue => {
      log(`   ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
      log(`     ${issue.code}`, 'cyan');
    });
    if (issues.length > 10) {
      log(`   ... and ${issues.length - 10} more issues`, 'yellow');
    }
  }
  
  return { passed: issues.length === 0, count: issues.length, issues };
}

function validateImportPaths() {
  log('\n🔍 Validating import paths across client...', 'blue');
  
  const files = findFiles('client/src', ['.ts', '.tsx'], ['node_modules', '.git']);
  const issues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for inconsistent import patterns
      if (line.includes('from ') || line.includes('import ')) {
        // Check for @/ imports that should be @client/
        if (line.includes('"@/') && !line.includes('@client/')) {
          issues.push({
            file: file.replace('client/src/', ''),
            line: i + 1,
            issue: 'Using @/ instead of @client/ import',
            code: line.trim()
          });
        }
        
        // Check for relative imports that could be absolute
        if (line.includes('from \'../../../') || line.includes('from "../../../')) {
          issues.push({
            file: file.replace('client/src/', ''),
            line: i + 1,
            issue: 'Deep relative import (consider absolute)',
            code: line.trim()
          });
        }
      }
    }
  }
  
  if (issues.length === 0) {
    log('✅ All import paths are consistent', 'green');
  } else {
    log(`⚠️ Found ${issues.length} import path issues:`, 'yellow');
    issues.slice(0, 10).forEach(issue => {
      log(`   ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
    });
    if (issues.length > 10) {
      log(`   ... and ${issues.length - 10} more issues`, 'yellow');
    }
  }
  
  return { passed: issues.length === 0, count: issues.length, issues };
}

function validateReactImports() {
  log('\n🔍 Validating React imports in TSX files...', 'blue');
  
  const tsxFiles = findFiles('client/src', ['.tsx'], ['node_modules', '.git']);
  const issues = [];
  
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check if file uses JSX elements and doesn't import React or React hooks
    const hasJSXElements = /<[A-Z][a-zA-Z0-9]*/.test(content);
    const hasReactImport = /import\s+React/.test(content);
    const hasReactHooks = /import\s+{[^}]*}\s+from\s+['"]react['"]/.test(content);
    
    // Only flag as issue if file has JSX elements but no React-related imports
    if (hasJSXElements && !hasReactImport && !hasReactHooks) {
      issues.push({
        file: file.replace('client/src/', ''),
        issue: 'TSX file with JSX elements missing React import'
      });
    }
  }
  
  if (issues.length === 0) {
    log('✅ All TSX files have proper React imports', 'green');
  } else {
    log(`❌ Found ${issues.length} React import issues:`, 'red');
    issues.slice(0, 10).forEach(issue => {
      log(`   ${issue.file} - ${issue.issue}`, 'yellow');
    });
    if (issues.length > 10) {
      log(`   ... and ${issues.length - 10} more issues`, 'yellow');
    }
  }
  
  return { passed: issues.length === 0, count: issues.length, issues };
}

function validateTypeScriptErrors() {
  log('\n🔍 Checking for common TypeScript issues...', 'blue');
  
  const files = findFiles('client/src', ['.ts', '.tsx'], ['node_modules', '.git']);
  const issues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for any type usage
      if (line.includes(': any') && !line.includes('// @ts-ignore') && !line.includes('eslint-disable')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Using any type (consider specific type)',
          severity: 'warning',
          code: line.trim()
        });
      }
      
      // Check for console.log statements (should use logger)
      if (line.includes('console.log') && !line.includes('// dev:') && !file.includes('test')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Using console.log (consider using logger)',
          severity: 'warning',
          code: line.trim()
        });
      }
      
      // Check for TODO/FIXME comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'TODO/FIXME comment found',
          severity: 'info',
          code: line.trim()
        });
      }
    }
  }
  
  const errors = issues.filter(i => i.severity !== 'warning' && i.severity !== 'info');
  const warnings = issues.filter(i => i.severity === 'warning');
  const todos = issues.filter(i => i.severity === 'info');
  
  if (errors.length === 0) {
    log('✅ No critical TypeScript issues found', 'green');
  } else {
    log(`❌ Found ${errors.length} TypeScript issues`, 'red');
  }
  
  if (warnings.length > 0) {
    log(`⚠️ Found ${warnings.length} warnings`, 'yellow');
  }
  
  if (todos.length > 0) {
    log(`📝 Found ${todos.length} TODO/FIXME comments`, 'cyan');
  }
  
  return { 
    passed: errors.length === 0, 
    count: errors.length, 
    warnings: warnings.length,
    todos: todos.length,
    issues: errors 
  };
}

function validateAccessibility() {
  log('\n🔍 Checking accessibility issues...', 'blue');
  
  const tsxFiles = findFiles('client/src', ['.tsx'], ['node_modules', '.git']);
  const issues = [];
  
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for images without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Image missing alt attribute',
          code: line.trim()
        });
      }
      
      // Check for buttons with only icons (should have aria-label)
      if (line.includes('<button') && line.includes('className') && 
          (line.includes('Icon') || line.includes('h-') || line.includes('w-')) && 
          !line.includes('aria-label') && !line.includes('title')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Icon button missing aria-label',
          code: line.trim()
        });
      }
      
      // Check for form inputs without labels
      if (line.includes('<input') && !line.includes('aria-label') && 
          !line.includes('placeholder') && !content.includes('<label')) {
        issues.push({
          file: file.replace('client/src/', ''),
          line: i + 1,
          issue: 'Input missing label or aria-label',
          code: line.trim()
        });
      }
    }
  }
  
  if (issues.length === 0) {
    log('✅ No critical accessibility issues found', 'green');
  } else {
    log(`⚠️ Found ${issues.length} accessibility issues:`, 'yellow');
    issues.slice(0, 5).forEach(issue => {
      log(`   ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
    });
    if (issues.length > 5) {
      log(`   ... and ${issues.length - 5} more issues`, 'yellow');
    }
  }
  
  return { passed: issues.length === 0, count: issues.length, issues };
}

function validateErrorHandling() {
  log('\n🔍 Validating error handling patterns...', 'blue');
  
  const files = findFiles('client/src', ['.ts', '.tsx'], ['node_modules', '.git']);
  const issues = [];
  const goodPatterns = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for try-catch blocks without proper error handling
    const tryCatchMatches = content.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g);
    if (tryCatchMatches) {
      tryCatchMatches.forEach(match => {
        if (!match.includes('logger') && !match.includes('console.error') && !match.includes('handleError')) {
          issues.push({
            file: file.replace('client/src/', ''),
            issue: 'Try-catch block without proper error logging'
          });
        } else {
          goodPatterns.push({
            file: file.replace('client/src/', ''),
            pattern: 'Proper error handling found'
          });
        }
      });
    }
    
    // Check for error boundary usage
    if (content.includes('ErrorBoundary') || content.includes('componentDidCatch')) {
      goodPatterns.push({
        file: file.replace('client/src/', ''),
        pattern: 'Error boundary implementation'
      });
    }
    
    // Check for useErrorHandler usage
    if (content.includes('useErrorHandler') || content.includes('useUIErrorHandler')) {
      goodPatterns.push({
        file: file.replace('client/src/', ''),
        pattern: 'Standardized error handler usage'
      });
    }
  }
  
  if (issues.length === 0) {
    log('✅ Error handling patterns look good', 'green');
  } else {
    log(`⚠️ Found ${issues.length} error handling issues`, 'yellow');
  }
  
  log(`📊 Found ${goodPatterns.length} files with good error handling patterns`, 'cyan');
  
  return { passed: issues.length === 0, count: issues.length, goodCount: goodPatterns.length, issues };
}

function validatePerformance() {
  log('\n🔍 Checking performance patterns...', 'blue');
  
  const files = findFiles('client/src', ['.ts', '.tsx'], ['node_modules', '.git']);
  const issues = [];
  const optimizations = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for React.memo usage
    if (content.includes('React.memo') || content.includes('memo(')) {
      optimizations.push({
        file: file.replace('client/src/', ''),
        optimization: 'React.memo usage'
      });
    }
    
    // Check for useCallback usage
    if (content.includes('useCallback')) {
      optimizations.push({
        file: file.replace('client/src/', ''),
        optimization: 'useCallback usage'
      });
    }
    
    // Check for useMemo usage
    if (content.includes('useMemo')) {
      optimizations.push({
        file: file.replace('client/src/', ''),
        optimization: 'useMemo usage'
      });
    }
    
    // Check for potential performance issues
    if (content.includes('useEffect') && content.includes('[]') === false && 
        content.includes('setInterval') || content.includes('setTimeout')) {
      issues.push({
        file: file.replace('client/src/', ''),
        issue: 'Potential memory leak in useEffect'
      });
    }
  }
  
  if (issues.length === 0) {
    log('✅ No performance issues detected', 'green');
  } else {
    log(`⚠️ Found ${issues.length} potential performance issues`, 'yellow');
  }
  
  log(`🚀 Found ${optimizations.length} performance optimizations in use`, 'cyan');
  
  return { passed: issues.length === 0, count: issues.length, optimizations: optimizations.length, issues };
}

function generateDetailedReport(results) {
  log('\n📊 COMPREHENSIVE VALIDATION REPORT', 'cyan');
  log('=====================================', 'cyan');
  
  const allPassed = results.every(result => result.passed);
  
  // Summary table
  log('\n📋 Summary:', 'magenta');
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    const details = result.count !== undefined ? ` (${result.count} issues)` : '';
    log(`${status} ${result.name}${details}`, color);
    
    // Additional details
    if (result.warnings) log(`   ⚠️  ${result.warnings} warnings`, 'yellow');
    if (result.todos) log(`   📝 ${result.todos} TODOs`, 'cyan');
    if (result.goodCount) log(`   ✨ ${result.goodCount} good patterns`, 'green');
    if (result.optimizations) log(`   🚀 ${result.optimizations} optimizations`, 'cyan');
  });
  
  // Overall assessment
  log(`\n🎯 Overall Status: ${allPassed ? 'EXCELLENT' : 'NEEDS ATTENTION'}`, allPassed ? 'green' : 'yellow');
  
  // Recommendations
  log('\n💡 Recommendations:', 'magenta');
  
  const buttonIssues = results.find(r => r.name === 'Button Type Attributes');
  if (buttonIssues && !buttonIssues.passed) {
    log('   • Run button type fix script for remaining issues', 'yellow');
  }
  
  const importIssues = results.find(r => r.name === 'Import Path Consistency');
  if (importIssues && !importIssues.passed) {
    log('   • Standardize import paths to use @client/ prefix', 'yellow');
  }
  
  const reactIssues = results.find(r => r.name === 'React Imports');
  if (reactIssues && !reactIssues.passed) {
    log('   • Add React imports to TSX files with JSX elements', 'yellow');
  }
  
  const accessibilityIssues = results.find(r => r.name === 'Accessibility');
  if (accessibilityIssues && accessibilityIssues.count > 0) {
    log('   • Address accessibility issues for better user experience', 'yellow');
  }
  
  const errorHandling = results.find(r => r.name === 'Error Handling');
  if (errorHandling && errorHandling.goodCount > 0) {
    log('   • Good error handling patterns detected - keep it up!', 'green');
  }
  
  const performance = results.find(r => r.name === 'Performance');
  if (performance && performance.optimizations > 0) {
    log('   • Performance optimizations in use - excellent!', 'green');
  }
  
  // Next steps
  log('\n🚀 Next Steps:', 'magenta');
  if (allPassed) {
    log('   • Codebase is in excellent condition!', 'green');
    log('   • Consider implementing automated linting rules', 'cyan');
    log('   • Set up pre-commit hooks for validation', 'cyan');
  } else {
    log('   • Address critical issues first', 'yellow');
    log('   • Run automated fix scripts where available', 'cyan');
    log('   • Review and update coding standards', 'cyan');
  }
  
  return allPassed;
}

function main() {
  log('🚀 Client Codebase Validation Starting...', 'cyan');
  log('=========================================', 'cyan');
  
  // Check if we're in the right directory
  if (!fs.existsSync('client/src')) {
    log('❌ Error: Must be run from project root directory', 'red');
    process.exit(1);
  }
  
  const results = [
    {
      name: 'Button Type Attributes',
      ...validateButtonTypes()
    },
    {
      name: 'Import Path Consistency',
      ...validateImportPaths()
    },
    {
      name: 'React Imports',
      ...validateReactImports()
    },
    {
      name: 'TypeScript Quality',
      ...validateTypeScriptErrors()
    },
    {
      name: 'Accessibility',
      ...validateAccessibility()
    },
    {
      name: 'Error Handling',
      ...validateErrorHandling()
    },
    {
      name: 'Performance',
      ...validatePerformance()
    }
  ];
  
  const allPassed = generateDetailedReport(results);
  
  // Generate summary stats
  const totalFiles = findFiles('client/src', ['.ts', '.tsx'], ['node_modules', '.git']).length;
  const totalIssues = results.reduce((sum, r) => sum + (r.count || 0), 0);
  
  log(`\n📈 Statistics:`, 'cyan');
  log(`   📁 Total files scanned: ${totalFiles}`, 'cyan');
  log(`   🐛 Total issues found: ${totalIssues}`, totalIssues === 0 ? 'green' : 'yellow');
  log(`   ✅ Validation categories: ${results.length}`, 'cyan');
  
  process.exit(allPassed ? 0 : 1);
}

// Always run main when script is executed directly
main();

export {
  validateButtonTypes,
  validateImportPaths,
  validateReactImports,
  validateTypeScriptErrors,
  validateAccessibility,
  validateErrorHandling,
  validatePerformance
};