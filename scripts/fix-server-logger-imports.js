#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to fix server-side logger imports
 * Updates old logger imports to use the shared core logger
 */

const SERVER_DIR = path.join(__dirname, '..', 'server');

// Old import patterns to replace
const OLD_LOGGER_IMPORTS = [
  "import { logger } from '../utils/logger.js';",
  "import { logger } from '../../utils/logger.js';",
  "import { logger } from '../../../utils/logger.js';",
  "import { logger } from '../../../../utils/logger.js';",
  "import { logger } from '../utils/logger';",
  "import { logger } from '../../utils/logger';",
  "import { logger } from '../../../utils/logger';",
  "import { logger } from '../../../../utils/logger';",
];

// New import to use
const NEW_LOGGER_IMPORT = "import { logger } from '../../../shared/core/index.js';";

/**
 * Calculate the correct relative path to shared/core from a given file
 */
function getCorrectLoggerImport(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '..', 'shared', 'core', 'index.js'));
  return `import { logger } from '${relativePath.replace(/\\/g, '/')}';`;
}

/**
 * Fix logger imports in a single file
 */
function fixLoggerImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Check if file has any old logger imports
    const hasOldImport = OLD_LOGGER_IMPORTS.some(oldImport => content.includes(oldImport));
    
    if (hasOldImport) {
      const correctImport = getCorrectLoggerImport(filePath);
      
      // Replace all old import patterns
      for (const oldImport of OLD_LOGGER_IMPORTS) {
        if (content.includes(oldImport)) {
          content = content.replace(oldImport, correctImport);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed logger import in: ${path.relative(SERVER_DIR, filePath)}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing logger imports in ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively find all TypeScript files in server directory
 */
function findTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        traverse(fullPath);
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting server logger import fixes...\n');
  
  if (!fs.existsSync(SERVER_DIR)) {
    console.error(`❌ Server directory not found: ${SERVER_DIR}`);
    process.exit(1);
  }
  
  const tsFiles = findTsFiles(SERVER_DIR);
  console.log(`📁 Found ${tsFiles.length} TypeScript/JavaScript files\n`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    if (fixLoggerImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ Logger import fixes completed!`);
  console.log(`📊 Fixed logger imports in ${fixedCount} out of ${tsFiles.length} files`);
  
  if (fixedCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('1. Try starting the server: npm run dev');
    console.log('2. Check for any remaining import errors');
  }
}

main();