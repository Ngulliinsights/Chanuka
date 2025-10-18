#!/usr/bin/env node

/**
 * Validation script to check error handling migration completeness
 * 
 * This script validates that the error handling migration was successful
 * and identifies any remaining issues.
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate old error system usage
const OLD_PATTERNS = [
  // Old import patterns
  /from\s+['"].*\/shared\/core\/src\/errors['"]/,
  /from\s+['"].*\/shared\/core\/src\/error-handling['"]/,
  /from\s+['"].*\/server\/utils\/errors['"]/,
  
  // Old class instantiations that might need updating
  /new\s+AppError\s*\(/,
  /new\s+EnhancedCircuitBreaker\s*\(/,
  
  // Deprecated console.warn patterns
  /console\.warn\(\s*\[DEPRECATED\]/
];

// Patterns that indicate successful migration
const NEW_PATTERNS = [
  /from\s+['"].*\/observability\/error-management['"]/,
  /BaseError/,
  /ValidationError/,
  /CircuitBreaker/
];

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (!['node_modules', 'dist', 'build', '.git', 'coverage', '.next'].includes(item)) {
            traverse(fullPath);
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory: ${currentDir}`);
    }
  }
  
  traverse(dir);
  return files;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    const successes = [];
    
    // Check for old patterns
    OLD_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'old_pattern',
          pattern: pattern.toString(),
          matches: matches,
          line: findLineNumber(content, matches[0])
        });
      }
    });
    
    // Check for new patterns (positive indicators)
    NEW_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        successes.push({
          type: 'new_pattern',
          pattern: pattern.toString(),
          matches: matches
        });
      }
    });
    
    return { issues, successes };
  } catch (error) {
    return { 
      issues: [{ type: 'read_error', error: error.message }], 
      successes: [] 
    };
  }
}

function findLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1;
    }
  }
  return 'unknown';
}

function generateReport(results) {
  const totalFiles = results.length;
  const filesWithIssues = results.filter(r => r.issues.length > 0).length;
  const filesWithSuccesses = results.filter(r => r.successes.length > 0).length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  
  console.log('📋 Error Handling Migration Validation Report');
  console.log('=' .repeat(50));
  console.log(`📁 Total files analyzed: ${totalFiles}`);
  console.log(`✅ Files using new system: ${filesWithSuccesses}`);
  console.log(`⚠️  Files with migration issues: ${filesWithIssues}`);
  console.log(`🐛 Total issues found: ${totalIssues}`);
  console.log('');
  
  if (filesWithIssues > 0) {
    console.log('🔍 Issues Found:');
    console.log('-'.repeat(30));
    
    results.forEach(result => {
      if (result.issues.length > 0) {
        console.log(`\n📄 ${result.file}`);
        result.issues.forEach(issue => {
          if (issue.type === 'old_pattern') {
            console.log(`   ❌ Line ${issue.line}: ${issue.matches[0]}`);
          } else if (issue.type === 'read_error') {
            console.log(`   ❌ Read error: ${issue.error}`);
          }
        });
      }
    });
    
    console.log('\n💡 Recommendations:');
    console.log('   1. Update remaining old import statements');
    console.log('   2. Replace deprecated class names');
    console.log('   3. Remove legacy adapter files once migration is complete');
    console.log('   4. Run tests to ensure functionality is preserved');
  } else {
    console.log('🎉 Migration appears to be complete!');
    console.log('   All files are using the new unified error management system.');
  }
  
  return {
    totalFiles,
    filesWithIssues,
    filesWithSuccesses,
    totalIssues,
    success: filesWithIssues === 0
  };
}

function main() {
  console.log('🔍 Validating error handling migration...\n');
  
  const rootDir = process.cwd();
  const files = findFiles(rootDir);
  
  const results = files.map(file => ({
    file: path.relative(rootDir, file),
    ...analyzeFile(file)
  }));
  
  const report = generateReport(results);
  
  // Exit with appropriate code
  process.exit(report.success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, findFiles, generateReport };