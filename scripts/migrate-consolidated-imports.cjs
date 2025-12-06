#!/usr/bin/env node

/**
 * Migration Script for Consolidated Utilities
 * 
 * This script updates import statements across the codebase to use
 * the new consolidated utility modules instead of individual files.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Migration mappings
const IMPORT_MIGRATIONS = {
  // Development Tools
  './dev-mode': './dev-tools',
  './dev-server-check': './dev-tools',
  './development-debug': './dev-tools',
  './development-overrides': './dev-tools',
  
  // Testing
  './test-imports': './testing',
  './validate-migration': './testing',
  './validateArchitecture': './testing',
  
  // Security
  './csp-headers': './security',
  './dom-sanitizer': './security',
  './input-validation': './security',
  './password-validation': './security',
  
  // Performance
  './performance-alerts': './performance',
  './performance-budget-checker': './performance',
  './web-vitals-monitor': './performance',
  './performance-optimizer': './performance',
  
  // Browser
  './browser-compatibility': './browser',
  './browser-compatibility-manager': './browser',
  './polyfills': './browser',
  
  // Assets
  './asset-manager': './assets',
  './asset-loader': './assets',
  './asset-optimization': './assets',
  './asset-fallback-config': './assets',
  
  // Errors
  './error-system': './errors',
  './unified-error-handler': './errors',
  './error-analytics': './errors',
  './error-reporting': './errors',
  './error-integration': './errors',
  './error-rate-limiter': './errors',
  './advanced-error-recovery': './errors',
};

// Files to process
const FILE_PATTERNS = [
  'client/src/**/*.ts',
  'client/src/**/*.tsx',
  '!client/src/utils/dev-tools.ts',
  '!client/src/utils/testing.ts',
  '!client/src/utils/security.ts',
  '!client/src/utils/performance.ts',
  '!client/src/utils/browser.ts',
  '!client/src/utils/assets.ts',
  '!client/src/utils/errors.ts',
  '!client/src/**/*.test.ts',
  '!client/src/**/*.test.tsx',
];

function updateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Update import statements
    for (const [oldPath, newPath] of Object.entries(IMPORT_MIGRATIONS)) {
      const importRegex = new RegExp(`from ['"]${oldPath.replace('./', '\\.\\/').replace('/', '\\/')}['"]`, 'g');
      const requireRegex = new RegExp(`require\\(['"]${oldPath.replace('./', '\\.\\/').replace('/', '\\/')}['"]\\)`, 'g');
      
      if (importRegex.test(content)) {
        content = content.replace(importRegex, `from '${newPath}'`);
        modified = true;
      }
      
      if (requireRegex.test(content)) {
        content = content.replace(requireRegex, `require('${newPath}')`);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting import migration for consolidated utilities...\n');
  
  const files = glob.sync(FILE_PATTERNS, { ignore: ['node_modules/**'] });
  let updatedCount = 0;
  
  for (const file of files) {
    if (updateImports(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Updated ${updatedCount} files out of ${files.length} processed`);
  
  if (updatedCount > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Run type checking: npm run type-check');
    console.log('2. Run tests: npm test');
    console.log('3. Delete redundant files after verification');
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateImports, IMPORT_MIGRATIONS };