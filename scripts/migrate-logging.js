#!/usr/bin/env node

/**
 * Logging Migration Script
 * 
 * This script helps migrate from the old logging system to the new unified logger.
 * It performs the following tasks:
 * 1. Updates import statements
 * 2. Replaces logger usage patterns
 * 3. Updates error type imports
 * 4. Validates the migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CLIENT_SRC_DIR = path.join(__dirname, '../client/src');
const BACKUP_DIR = path.join(__dirname, '../.migration-backup');

// Migration patterns
const MIGRATION_PATTERNS = [
  // Logger imports
  {
    pattern: /import\s*{\s*logger\s*}\s*from\s*['"]\.\/logger['"]/g,
    replacement: "import { logger } from './unified-logger'"
  },
  {
    pattern: /import\s*{\s*logger\s*}\s*from\s*['"]\.\/logger['"]/g,
    replacement: "import { logger } from './unified-logger'"
  },
  {
    pattern: /import\s*{\s*logger\s*as\s*clientLogger[^}]*}\s*from\s*['"][^'"]*logger['"]/g,
    replacement: "import { logger as clientLogger } from './unified-logger'"
  },
  
  // Error type imports
  {
    pattern: /import\s*{\s*([^}]*ErrorSeverity[^}]*)\s*}\s*from\s*['"][^'"]*shared\/errors['"]/g,
    replacement: "import { $1 } from '../types/errors'"
  },
  {
    pattern: /import\s*{\s*([^}]*ErrorDomain[^}]*)\s*}\s*from\s*['"][^'"]*shared\/errors['"]/g,
    replacement: "import { $1 } from '../types/errors'"
  },
  
  // Update relative imports for error types
  {
    pattern: /from\s*['"]\.\.\/shared\/errors['"]/g,
    replacement: "from '../types/errors'"
  },
];

// Files to exclude from migration
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.migration-backup/,
  /unified-logger\.ts$/,
  /types\/logging\.ts$/,
  /types\/errors\.ts$/,
];

/**
 * Get all TypeScript and JavaScript files in the client directory
 */
function getClientFiles(dir = CLIENT_SRC_DIR) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Create backup of files before migration
 */
function createBackup(files) {
  console.log('Creating backup...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  for (const file of files) {
    const relativePath = path.relative(CLIENT_SRC_DIR, file);
    const backupPath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(file, backupPath);
  }
  
  console.log(`Backup created in ${BACKUP_DIR}`);
}

/**
 * Apply migration patterns to a file
 */
function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let hasChanges = false;
  
  for (const { pattern, replacement } of MIGRATION_PATTERNS) {
    const beforeLength = newContent.length;
    newContent = newContent.replace(pattern, replacement);
    
    if (newContent.length !== beforeLength) {
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Migrated: ${path.relative(CLIENT_SRC_DIR, filePath)}`);
    return true;
  }
  
  return false;
}

/**
 * Validate migration by checking for problematic imports
 */
function validateMigration(files) {
  console.log('\nValidating migration...');
  
  const issues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(CLIENT_SRC_DIR, file);
    
    // Check for remaining problematic imports
    if (content.includes('from \'../core/error\'') || content.includes('from "../core/error"')) {
      issues.push(`${relativePath}: Still importing from core/error`);
    }
    
    if (content.includes('shared/core')) {
      issues.push(`${relativePath}: Still importing from shared/core`);
    }
    
    // Check for old logger patterns
    if (content.includes('from \'./logger\'') && content.includes('logger')) {
      issues.push(`${relativePath}: Still importing logger from logger`);
    }
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Migration issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    return false;
  }
  
  console.log('✅ Migration validation passed!');
  return true;
}

/**
 * Run TypeScript compilation to check for errors
 */
function checkTypeScript() {
  console.log('\nChecking TypeScript compilation...');
  
  try {
    execSync('npm run type-check', { 
      cwd: path.join(__dirname, '../client'),
      stdio: 'pipe'
    });
    console.log('✅ TypeScript compilation successful!');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed:');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

/**
 * Main migration function
 */
function main() {
  console.log('🚀 Starting logging system migration...\n');
  
  // Get all files to migrate
  const files = getClientFiles();
  console.log(`Found ${files.length} files to process`);
  
  // Create backup
  createBackup(files);
  
  // Apply migrations
  console.log('\nApplying migrations...');
  let migratedCount = 0;
  
  for (const file of files) {
    if (migrateFile(file)) {
      migratedCount++;
    }
  }
  
  console.log(`\n✓ Migration complete! ${migratedCount} files updated`);
  
  // Validate migration
  const isValid = validateMigration(files);
  
  // Check TypeScript compilation
  const tsValid = checkTypeScript();
  
  if (isValid && tsValid) {
    console.log('\n🎉 Migration successful!');
    console.log('\nNext steps:');
    console.log('1. Run tests to ensure everything works correctly');
    console.log('2. Update any remaining manual imports');
    console.log('3. Remove old logger files when ready');
    console.log(`4. Remove backup directory: ${BACKUP_DIR}`);
  } else {
    console.log('\n❌ Migration completed with issues');
    console.log('Please review the issues above and fix them manually');
    console.log(`Backup available in: ${BACKUP_DIR}`);
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  getClientFiles,
  migrateFile,
  validateMigration,
  MIGRATION_PATTERNS
};