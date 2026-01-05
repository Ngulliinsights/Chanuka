#!/usr/bin/env node

/**
 * Automated script to fix unused imports and variables
 * Fixes TypeScript errors: TS6133, TS6192
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.ts', '.tsx'];

// Common unused imports to remove
const COMMON_UNUSED_IMPORTS = [
  'React,',
  'useState,',
  'useEffect,',
  'useCallback,',
  'useMemo,',
];

// Icons that are commonly imported but unused
const UNUSED_ICONS = [
  'Eye,',
  'EyeOff,',
  'Bell,',
  'Clock,',
  'Palette,',
  'BookOpen,',
];

/**
 * Get all TypeScript files recursively
 */
function getAllTsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && EXTENSIONS.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Remove unused imports from a file
 */
function removeUnusedImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove unused React import when only React is imported
  if (content.includes("import React from 'react';") &&
      !content.includes('React.') &&
      !content.includes('<React.')) {
    content = content.replace(/import React from 'react';\n?/g, '');
    modified = true;
  }

  // Remove unused imports from destructured imports
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"][^'"]+['"];?\n?/g;
  content = content.replace(importRegex, (match, imports) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const usedImports = [];

    for (const imp of importList) {
      const cleanImport = imp.replace(/\s+as\s+\w+/, ''); // Handle 'as' aliases

      // Check if import is used in the file
      const isUsed = content.includes(cleanImport) &&
                     content.split(match)[1].includes(cleanImport);

      if (isUsed) {
        usedImports.push(imp);
      } else {
        modified = true;
      }
    }

    if (usedImports.length === 0) {
      return ''; // Remove entire import line
    } else if (usedImports.length < importList.length) {
      return match.replace(imports, usedImports.join(', '));
    }

    return match;
  });

  // Remove unused variable declarations
  const unusedVarRegex = /const\s+(_\w+|\w+)\s*=\s*[^;]+;?\n?/g;
  content = content.replace(unusedVarRegex, (match, varName) => {
    if (varName.startsWith('_') || !content.split(match)[1].includes(varName)) {
      modified = true;
      return '';
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed unused imports in: ${path.relative(SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting unused imports cleanup...\n');

  const files = getAllTsFiles(SRC_DIR);
  let fixedCount = 0;

  for (const file of files) {
    try {
      if (removeUnusedImports(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✨ Cleanup complete! Fixed ${fixedCount} files.`);

  // Run prettier to format the files
  try {
    console.log('\n🎨 Running prettier to format files...');
    execSync('npm run format', { cwd: path.dirname(__dirname) });
    console.log('✅ Formatting complete!');
  } catch (error) {
    console.log('⚠️  Could not run prettier automatically');
  }
}

if (require.main === module) {
  main();
}

module.exports = { removeUnusedImports, getAllTsFiles };
