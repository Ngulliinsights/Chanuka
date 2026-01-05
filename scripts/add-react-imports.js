#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to add missing React imports to .tsx files
 * Features: dry-run, backups, smart detection, proper import placement
 */

const CLIENT_SRC = path.join(__dirname, '..', 'client', 'src');
const BACKUP_DIR = path.join(__dirname, '..', '.react-import-backup');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-d');
const NO_BACKUP = args.includes('--no-backup');
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__', '.git'];

/**
 * Check if file contains JSX syntax
 */
function containsJSX(content) {
  // More comprehensive JSX detection
  const jsxPatterns = [
    /<[A-Z][a-zA-Z0-9]*[\s/>]/,           // Opening tag with capital letter: <Component
    /<[a-z]+[\s\/>]/,                      // HTML tags: <div, <span
    /<>.*<\/>/s,                           // Fragment: <></>
    /React\.createElement/,                 // React.createElement calls
    /jsx\(/,                                // jsx() calls (new JSX transform)
    /jsxs\(/,                               // jsxs() calls
    /jsxDEV\(/,                             // jsxDEV() calls (dev mode)
  ];
  
  return jsxPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if React is already imported
 */
function hasReactImport(content) {
  const reactImportPatterns = [
    /import\s+React\s+from\s+['"]react['"]/,                    // import React from 'react'
    /import\s+React\s*,\s*{[^}]*}\s+from\s+['"]react['"]/,     // import React, { ... } from 'react'
    /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/,         // import * as React from 'react'
    /const\s+React\s*=\s*require\(['"]react['"]\)/,             // const React = require('react')
  ];
  
  return reactImportPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if file uses new JSX transform (React 17+)
 * These files don't need React import for JSX
 */
function usesNewJSXTransform(content, filePath) {
  // Check tsconfig or vite config for jsx: 'react-jsx'
  // For now, assume if there's JSX but no React.createElement, it might use new transform
  // But we'll be conservative and add import unless explicitly configured
  
  // If file has jsx/jsxs imports from react/jsx-runtime, it uses new transform
  if (content.includes('react/jsx-runtime') || content.includes('react/jsx-dev-runtime')) {
    return true;
  }
  
  return false;
}

/**
 * Find the best position to insert React import
 */
function findImportInsertPosition(content) {
  const lines = content.split('\n');
  let lastImportLine = -1;
  let firstNonCommentLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    
    if (firstNonCommentLine === -1) {
      firstNonCommentLine = i;
    }
    
    // Check if this is an import statement
    if (line.startsWith('import ') || line.startsWith('import{')) {
      lastImportLine = i;
    } else if (lastImportLine !== -1) {
      // We've found the first non-import line after imports
      break;
    }
  }
  
  // Insert after last import, or at the beginning
  if (lastImportLine !== -1) {
    return lastImportLine + 1;
  } else if (firstNonCommentLine !== -1) {
    return firstNonCommentLine;
  }
  
  return 0;
}

/**
 * Add React import to file content
 */
function addReactImportToContent(content) {
  const lines = content.split('\n');
  const insertPosition = findImportInsertPosition(content);
  
  // Insert the import at the appropriate position
  const reactImport = "import React from 'react';";
  
  // Check if we need to add a blank line after the import
  const nextLine = lines[insertPosition];
  const needsBlankLine = nextLine && nextLine.trim() && !nextLine.trim().startsWith('import');
  
  lines.splice(insertPosition, 0, reactImport);
  
  if (needsBlankLine) {
    lines.splice(insertPosition + 1, 0, '');
  }
  
  return lines.join('\n');
}

/**
 * Create backup of a file
 */
function createBackup(filePath) {
  if (NO_BACKUP) return;
  
  try {
    const relativePath = path.relative(CLIENT_SRC, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
  } catch (error) {
    console.error(`⚠️  Failed to create backup for ${filePath}:`, error.message);
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has React import
    if (hasReactImport(content)) {
      if (VERBOSE) {
        console.log(`⏭️  Skipped (has import): ${path.relative(CLIENT_SRC, filePath)}`);
      }
      return { status: 'skipped', reason: 'has-import' };
    }
    
    // Skip if uses new JSX transform
    if (usesNewJSXTransform(content, filePath)) {
      if (VERBOSE) {
        console.log(`⏭️  Skipped (new transform): ${path.relative(CLIENT_SRC, filePath)}`);
      }
      return { status: 'skipped', reason: 'new-transform' };
    }
    
    // Check if file contains JSX
    if (!containsJSX(content)) {
      if (VERBOSE) {
        console.log(`⏭️  Skipped (no JSX): ${path.relative(CLIENT_SRC, filePath)}`);
      }
      return { status: 'skipped', reason: 'no-jsx' };
    }
    
    // Add React import
    const newContent = addReactImportToContent(content);
    
    if (!DRY_RUN) {
      createBackup(filePath);
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
    
    const relativePath = path.relative(CLIENT_SRC, filePath);
    console.log(`${DRY_RUN ? '🔍' : '✅'} ${relativePath}`);
    
    if (VERBOSE) {
      const insertPos = findImportInsertPosition(content);
      console.log(`   Inserted at line ${insertPos + 1}`);
    }
    
    return { status: 'modified' };
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Recursively find all .tsx files
 */
function findTsxFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !EXCLUDE_DIRS.includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`⚠️  Error reading directory ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Usage: node add-react-imports.js [options]

Options:
  --dry-run, -d    Preview changes without modifying files
  --no-backup      Skip creating backup files
  --verbose, -v    Show detailed output for each file
  --help, -h       Show this help message

Description:
  Automatically adds 'import React from "react";' to .tsx files that:
  - Contain JSX syntax
  - Don't already import React
  - Don't use the new JSX transform (React 17+)

Examples:
  node add-react-imports.js --dry-run     # Preview changes
  node add-react-imports.js               # Apply changes with backup
  node add-react-imports.js --verbose     # See detailed output
  `);
}

/**
 * Main execution
 */
function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }
  
  console.log('🚀 React Import Fixer for .tsx Files\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  } else {
    console.log('⚠️  LIVE MODE - Files will be modified');
    if (!NO_BACKUP) {
      console.log(`📦 Backups will be saved to: ${BACKUP_DIR}\n`);
    } else {
      console.log('⚠️  No backups will be created!\n');
    }
  }
  
  if (!fs.existsSync(CLIENT_SRC)) {
    console.error(`❌ Client source directory not found: ${CLIENT_SRC}`);
    console.error('Please run this script from the project root directory.');
    process.exit(1);
  }
  
  console.log(`📁 Scanning for .tsx files in: ${CLIENT_SRC}\n`);
  const tsxFiles = findTsxFiles(CLIENT_SRC);
  
  if (tsxFiles.length === 0) {
    console.log('ℹ️  No .tsx files found.');
    return;
  }
  
  console.log(`Found ${tsxFiles.length} .tsx files to process\n`);
  
  const stats = {
    modified: 0,
    skipped: {
      'has-import': 0,
      'new-transform': 0,
      'no-jsx': 0
    },
    errors: 0
  };
  
  // Process files with progress indicator
  for (let i = 0; i < tsxFiles.length; i++) {
    const file = tsxFiles[i];
    const result = processFile(file);
    
    if (result.status === 'modified') {
      stats.modified++;
    } else if (result.status === 'skipped') {
      stats.skipped[result.reason]++;
    } else if (result.status === 'error') {
      stats.errors++;
    }
    
    // Progress indicator (every 10%)
    if ((i + 1) % Math.ceil(tsxFiles.length / 10) === 0) {
      const percent = Math.round(((i + 1) / tsxFiles.length) * 100);
      console.log(`\n📊 Progress: ${percent}% (${i + 1}/${tsxFiles.length})\n`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ React Import Summary');
  console.log('='.repeat(60));
  console.log(`Total files scanned:        ${tsxFiles.length}`);
  console.log(`Files modified:             ${stats.modified}`);
  console.log(`Files skipped (has import): ${stats.skipped['has-import']}`);
  console.log(`Files skipped (no JSX):     ${stats.skipped['no-jsx']}`);
  console.log(`Files skipped (new JSX):    ${stats.skipped['new-transform']}`);
  console.log(`Errors:                     ${stats.errors}`);
  
  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To apply changes, run without --dry-run');
  } else if (stats.modified > 0) {
    console.log('\n🎯 Next steps:');
    console.log('1. Review the changes: git diff');
    console.log('2. Run type checking: npm run type-check');
    console.log('3. Run tests: npm run test');
    console.log('4. Start dev server: npm run dev');
    
    if (!NO_BACKUP) {
      console.log(`\n📦 Backups saved to: ${BACKUP_DIR}`);
      console.log('To restore: cp -r .react-import-backup/* client/src/');
    }
  } else {
    console.log('\n✓ No changes needed - all files are correct!');
  }
}

main();