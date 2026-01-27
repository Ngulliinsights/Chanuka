#!/usr/bin/env node

/**
 * Shared UI Validation Script
 * Validates the shared UI system for common issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findFiles(dir, extensions) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.existsSync(dir)) {
    walk(dir);
  }
  
  return files;
}

function validateButtonTypes() {
  log('\n🔍 Validating button type attributes...', 'blue');
  
  const tsxFiles = findFiles('client/src/lib/ui', ['.tsx']);
  const issues = [];
  
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for buttons without type attribute
      if (line.includes('<button') && line.includes('onClick') && !line.includes('type=')) {
        issues.push({
          file: file.replace('client/src/lib/ui/', ''),
          line: i + 1,
          issue: 'Button missing type attribute'
        });
      }
    }
  }
  
  if (issues.length === 0) {
    log('✅ All buttons have proper type attributes', 'green');
  } else {
    log(`❌ Found ${issues.length} button type issues:`, 'red');
    issues.forEach(issue => {
      log(`   ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
    });
  }
  
  return issues.length === 0;
}

function validateImportPaths() {
  log('\n🔍 Validating import paths...', 'blue');
  
  const files = findFiles('client/src/lib/ui', ['.ts', '.tsx']);
  const issues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for @/ imports that should be @client/
      if (line.includes('from ') && line.includes('"@/')) {
        issues.push({
          file: file.replace('client/src/lib/ui/', ''),
          line: i + 1,
          issue: 'Using @/ instead of @client/ import'
        });
      }
    }
  }
  
  if (issues.length === 0) {
    log('✅ All import paths are consistent', 'green');
  } else {
    log(`❌ Found ${issues.length} import path issues:`, 'red');
    issues.forEach(issue => {
      log(`   ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
    });
  }
  
  return issues.length === 0;
}

function validateReactImports() {
  log('\n🔍 Validating React imports in TSX files...', 'blue');
  
  const tsxFiles = findFiles('client/src/lib/ui', ['.tsx']);
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
        file: file.replace('client/src/lib/ui/', ''),
        issue: 'TSX file with JSX elements missing React import'
      });
    }
  }
  
  if (issues.length === 0) {
    log('✅ All TSX files have proper React imports', 'green');
  } else {
    log(`❌ Found ${issues.length} React import issues:`, 'red');
    issues.forEach(issue => {
      log(`   ${issue.file} - ${issue.issue}`, 'yellow');
    });
  }
  
  return issues.length === 0;
}

function validateRequiredFiles() {
  log('\n🔍 Validating required files exist...', 'blue');
  
  const requiredFiles = [
    'client/src/lib/ui/utils/error-handling.tsx',
    'client/src/lib/ui/types/index.ts',
    'client/src/lib/ui/templates/component-template.tsx',
    'client/src/lib/ui/templates/hook-template.ts'
  ];
  
  const missing = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missing.push(file);
    }
  }
  
  if (missing.length === 0) {
    log('✅ All required files exist', 'green');
  } else {
    log(`❌ Missing ${missing.length} required files:`, 'red');
    missing.forEach(file => {
      log(`   ${file}`, 'yellow');
    });
  }
  
  return missing.length === 0;
}

function generateReport(results) {
  log('\n📊 VALIDATION SUMMARY', 'cyan');
  log('===================', 'cyan');
  
  const allPassed = results.every(result => result.passed);
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });
  
  log(`\n🎯 Overall Status: ${allPassed ? 'PASSED' : 'FAILED'}`, allPassed ? 'green' : 'red');
  
  if (allPassed) {
    log('\n🎉 Shared UI system is in excellent condition!', 'green');
    log('All critical issues have been resolved.', 'green');
  } else {
    log('\n⚠️  Some issues need attention.', 'yellow');
    log('Run the fix script: ./scripts/fix-shared-ui-bugs.sh', 'yellow');
  }
  
  return allPassed;
}

function main() {
  log('🚀 Shared UI Validation Starting...', 'cyan');
  log('===================================', 'cyan');
  
  // Check if we're in the right directory
  if (!fs.existsSync('client/src/lib/ui')) {
    log('❌ Error: Must be run from project root directory', 'red');
    process.exit(1);
  }
  
  const results = [
    {
      name: 'Button Type Attributes',
      passed: validateButtonTypes()
    },
    {
      name: 'Import Path Consistency',
      passed: validateImportPaths()
    },
    {
      name: 'React Imports',
      passed: validateReactImports()
    },
    {
      name: 'Required Files',
      passed: validateRequiredFiles()
    }
  ];
  
  const allPassed = generateReport(results);
  
  process.exit(allPassed ? 0 : 1);
}

// Always run main when script is executed directly
main();

export {
  validateButtonTypes,
  validateImportPaths,
  validateReactImports,
  validateRequiredFiles
};