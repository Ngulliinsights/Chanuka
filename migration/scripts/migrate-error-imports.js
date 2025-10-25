#!/usr/bin/env node

/**
 * Migration script to update error handling imports to use the unified system
 * 
 * This script automatically updates import statements across the codebase
 * to use the new consolidated error management system.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import mappings from old to new system
const IMPORT_MAPPINGS = {
  // Old shared/core/src/errors imports
  "from '../../../shared/core/src/observability/error-management'": "from '../../../shared/core/src/observability/error-management'",
  "from '@shared/core/src/observability/error-management'": "from '@shared/core/src/observability/error-management'",
  "from '../shared/core/src/observability/error-management'": "from '../shared/core/src/observability/error-management'",
  "from '@shared/core/src/observability/error-management'": "from '@shared/core/src/observability/error-management'",
  
  // Old shared/core/src/error-handling imports
  "from '../../../shared/core/src/observability/error-management'": "from '../../../shared/core/src/observability/error-management'",
  "from '@shared/core/src/observability/error-management'": "from '@shared/core/src/observability/error-management'",
  "from '../shared/core/src/observability/error-management'": "from '../shared/core/src/observability/error-management'",
  "from '@shared/core/src/observability/error-management'": "from '@shared/core/src/observability/error-management'",
  
  // Server error imports
  "from '../core/errors/error-tracker.js'": "from '../core/errors/error-tracker.js'",
  "from '../../core/errors/error-tracker.js'": "from '../../core/errors/error-tracker.js'",
  "from '../../../core/errors/error-tracker.js'": "from '../../../core/errors/error-tracker.js'",
};

// Class name mappings for specialized cases
const CLASS_MAPPINGS = {
  'BaseError': 'BaseError',
  'CircuitBreaker': 'CircuitBreaker'
};

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(item)) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Update import paths
  for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPINGS)) {
    if (content.includes(oldImport)) {
      content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
      modified = true;
    }
  }
  
  // Update specific class references if needed
  for (const [oldClass, newClass] of Object.entries(CLASS_MAPPINGS)) {
    const regex = new RegExp(`\\b${oldClass}\\b(?!\\s*:)`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newClass);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🚀 Starting error handling import migration...\n');
  
  const rootDir = process.cwd();
  const files = findFiles(rootDir);
  
  let updatedCount = 0;
  let totalFiles = 0;
  
  for (const file of files) {
    // Skip files in migration directory to avoid self-modification
    if (file.includes('/migration/')) continue;
    
    totalFiles++;
    if (updateImports(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files updated: ${updatedCount}`);
  console.log(`   Files unchanged: ${totalFiles - updatedCount}`);
  
  if (updatedCount > 0) {
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run your tests to ensure everything works');
    console.log('   2. Update any remaining manual imports');
    console.log('   3. Consider removing legacy adapter files once migration is complete');
  } else {
    console.log('\n✅ No files needed updating - migration may already be complete!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateImports, findFiles, IMPORT_MAPPINGS, CLASS_MAPPINGS };




































