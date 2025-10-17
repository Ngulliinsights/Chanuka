#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Validation tool to detect old import patterns and verify migration completeness
 */

// Migration mappings: old path -> new path
const MIGRATION_MAP = {
  'shared/core/error-handling/': 'shared/core/error-management/',
  'shared/core/validation/': 'shared/core/validation/',
  // Add more mappings as needed
};

/**
 * Validate a single file for old import patterns
 */
function validateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // Check for old import patterns
    for (const [oldPath] of Object.entries(MIGRATION_MAP)) {
      const importRegex = new RegExp(`from ['"](${oldPath}[^'"]*)['"]`, 'g');
      const requireRegex = new RegExp(`require\\(['"](${oldPath}[^'"]*)['"]\\)`, 'g');

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        issues.push({
          type: 'old_import',
          file: filePath,
          line: getLineNumber(content, match.index),
          oldPath: match[1],
          newPath: match[1].replace(oldPath, MIGRATION_MAP[oldPath])
        });
      }

      while ((match = requireRegex.exec(content)) !== null) {
        issues.push({
          type: 'old_require',
          file: filePath,
          line: getLineNumber(content, match.index),
          oldPath: match[1],
          newPath: match[1].replace(oldPath, MIGRATION_MAP[oldPath])
        });
      }
    }

    return issues;
  } catch (error) {
    console.error(`Error validating ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Get line number from character position
 */
function getLineNumber(content, charIndex) {
  const lines = content.substring(0, charIndex).split('\n');
  return lines.length;
}

/**
 * Check if new paths exist
 */
async function validateNewPaths() {
  const issues = [];

  for (const [oldPath, newPath] of Object.entries(MIGRATION_MAP)) {
    try {
      const files = await glob(`${newPath}**/*.{ts,js,tsx,jsx}`);
      if (files.length === 0) {
        issues.push({
          type: 'missing_new_path',
          path: newPath,
          message: `New path ${newPath} does not exist or contains no files`
        });
      }
    } catch (error) {
      issues.push({
        type: 'error_checking_path',
        path: newPath,
        message: error.message
      });
    }
  }

  return issues;
}

/**
 * Main validation function
 */
async function runValidation() {
  console.log('Starting migration validation...');

  // Find all TypeScript and JavaScript files
  const files = await glob('**/*.{ts,js,tsx,jsx}', {
    ignore: ['node_modules/**', 'dist/**', 'build/**', 'migration/**']
  });

  console.log(`Found ${files.length} files to validate`);

  let totalIssues = [];

  // Validate new paths exist
  const pathIssues = await validateNewPaths();
  totalIssues = totalIssues.concat(pathIssues);

  // Validate each file
  for (const file of files) {
    const fileIssues = validateFile(file);
    totalIssues = totalIssues.concat(fileIssues);
  }

  // Report results
  if (totalIssues.length === 0) {
    console.log('✅ Migration validation passed - no issues found');
    process.exit(0);
  } else {
    console.log(`❌ Migration validation failed - found ${totalIssues.length} issues:`);

    const oldImports = totalIssues.filter(i => i.type === 'old_import' || i.type === 'old_require');
    const pathIssues = totalIssues.filter(i => i.type === 'missing_new_path' || i.type === 'error_checking_path');

    if (pathIssues.length > 0) {
      console.log('\n🔍 Path Issues:');
      pathIssues.forEach(issue => {
        console.log(`  - ${issue.path}: ${issue.message}`);
      });
    }

    if (oldImports.length > 0) {
      console.log('\n📦 Old Import Patterns:');
      oldImports.forEach(issue => {
        console.log(`  - ${issue.file}:${issue.line} - ${issue.oldPath} should be ${issue.newPath}`);
      });
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { runValidation, validateFile, validateNewPaths };