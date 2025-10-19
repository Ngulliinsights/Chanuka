#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Automated codemod script for import path updates
 * Handles migration from old structure to new consolidated structure
 */

// Migration mappings: old path -> new path
const MIGRATION_MAP = {
  'shared/core/error-handling/': 'shared/core/error-management/',
  'shared/core/validation/': 'shared/core/validation/',
  // Add more mappings as needed
};

/**
 * Process a single file for import path updates
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Process each migration mapping
    for (const [oldPath, newPath] of Object.entries(MIGRATION_MAP)) {
      const importRegex = new RegExp(`from ['"](${oldPath}[^'"]*)['"]`, 'g');
      const requireRegex = new RegExp(`require\\(['"](${oldPath}[^'"]*)['"]\\)`, 'g');

      // Update ES6 imports
      updatedContent = updatedContent.replace(importRegex, (match, importPath) => {
        const newImportPath = importPath.replace(oldPath, newPath);
        console.log(`Updating import in ${filePath}: ${importPath} -> ${newImportPath}`);
        hasChanges = true;
        return `from '${newImportPath}'`;
      });

      // Update CommonJS requires
      updatedContent = updatedContent.replace(requireRegex, (match, requirePath) => {
        const newRequirePath = requirePath.replace(oldPath, newPath);
        console.log(`Updating require in ${filePath}: ${requirePath} -> ${newRequirePath}`);
        hasChanges = true;
        return `require('${newRequirePath}')`;
      });
    }

    if (hasChanges) {
      // Create backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, content);
      console.log(`Created backup: ${backupPath}`);

      // Write updated content
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated: ${filePath}`);
    }

    return hasChanges;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('Starting automated import path migration...');

  // Find all TypeScript and JavaScript files
  const files = await glob('**/*.{ts,js,tsx,jsx}', {
    ignore: ['node_modules/**', 'dist/**', 'build/**', 'migration/**']
  });

  console.log(`Found ${files.length} files to process`);

  let processedCount = 0;
  let updatedCount = 0;

  for (const file of files) {
    if (processFile(file)) {
      updatedCount++;
    }
    processedCount++;
  }

  console.log(`Migration complete:`);
  console.log(`- Processed: ${processedCount} files`);
  console.log(`- Updated: ${updatedCount} files`);
  console.log(`- Backups created for all modified files`);
}

// Run if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration, processFile };




































