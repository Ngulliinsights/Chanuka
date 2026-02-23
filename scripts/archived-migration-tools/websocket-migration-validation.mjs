#!/usr/bin/env node

/**
 * WebSocket Type Migration Validation Script
 * 
 * This script validates the WebSocket type consolidation migration by:
 * 1. Checking for remaining duplicate type definitions
 * 2. Validating import paths are updated correctly
 * 3. Ensuring no Node.js dependencies in client code
 * 4. Verifying message structure consistency
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CLIENT_DIR = join(__dirname, 'client/src');
const SERVER_DIR = join(__dirname, 'server');
const SHARED_DIR = join(__dirname, 'shared');

// Validation rules
const VALIDATION_RULES = {
  // Files that should not exist after migration
  FORBIDDEN_FILES: [
    'client/src/infrastructure/api/types/websocket.ts'
  ],
  
  // Patterns that indicate problems
  PROBLEMATIC_PATTERNS: [
    {
      pattern: /NodeJS\.Timeout/g,
      description: 'Node.js-specific timer types in client code',
      severity: 'error'
    },
    {
      pattern: /from ['"]@client\/core\/api\/types\/websocket['"]/g,
      description: 'Import from deleted WebSocket types file',
      severity: 'error'
    },
    {
      pattern: /import.*WebSocket.*from ['"]@client\/core\/api\/types['"]/g,
      description: 'WebSocket import from client API types',
      severity: 'error'
    },
    {
      pattern: /payload:/g,
      description: 'Usage of payload field instead of data in WebSocket messages',
      severity: 'warning',
      excludeFiles: ['docs/', 'README', '.md']
    },
    {
      pattern: /export.*ConnectionState.*enum/g,
      description: 'Duplicate ConnectionState enum definition',
      severity: 'error'
    },
    {
      pattern: /export.*WebSocketErrorCode.*enum/g,
      description: 'Duplicate WebSocketErrorCode enum definition',
      severity: 'error'
    }
  ],
  
  // Required imports that should be present
  REQUIRED_IMPORTS: [
    {
      file: 'client/src/infrastructure/realtime/websocket-client.ts',
      pattern: /from ['"]@shared\/schema\/websocket['"]/,
      description: 'WebSocket client should import from shared schema'
    },
    {
      file: 'client/src/infrastructure/realtime/types/index.ts',
      pattern: /from ['"]@shared\/schema\/websocket['"]/,
      description: 'Real-time types should import from shared schema'
    }
  ]
};

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(file, line, message) {
    this.errors.push({ file, line, message, severity: 'error' });
  }

  addWarning(file, line, message) {
    this.warnings.push({ file, line, message, severity: 'warning' });
  }

  addInfo(file, line, message) {
    this.info.push({ file, line, message, severity: 'info' });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  print() {
    console.log('\n🔍 WebSocket Type Migration Validation Results\n');
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.forEach(({ file, line, message }) => {
        console.log(`   ${file}:${line} - ${message}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(({ file, line, message }) => {
        console.log(`   ${file}:${line} - ${message}`);
      });
      console.log('');
    }

    if (this.info.length > 0) {
      console.log('ℹ️  INFO:');
      this.info.forEach(({ file, line, message }) => {
        console.log(`   ${file}:${line} - ${message}`);
      });
      console.log('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validations passed! Migration appears successful.');
    } else {
      console.log(`📊 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    }
  }
}

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
            traverse(fullPath);
          }
        } else if (extensions.includes(extname(item))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir);
  return files;
}

function validateFile(filePath, result) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = filePath.replace(__dirname + '/', '');

    // Check for problematic patterns
    VALIDATION_RULES.PROBLEMATIC_PATTERNS.forEach(({ pattern, description, severity, excludeFiles = [] }) => {
      // Skip if file should be excluded
      if (excludeFiles.some(exclude => relativePath.includes(exclude))) {
        return;
      }

      lines.forEach((line, index) => {
        const matches = line.match(pattern);
        if (matches) {
          const lineNumber = index + 1;
          if (severity === 'error') {
            result.addError(relativePath, lineNumber, `${description}: ${matches[0]}`);
          } else if (severity === 'warning') {
            result.addWarning(relativePath, lineNumber, `${description}: ${matches[0]}`);
          }
        }
      });
    });

    // Check for required imports
    VALIDATION_RULES.REQUIRED_IMPORTS.forEach(({ file, pattern, description }) => {
      if (relativePath.endsWith(file)) {
        if (!pattern.test(content)) {
          result.addError(relativePath, 1, description);
        } else {
          result.addInfo(relativePath, 1, `✓ ${description}`);
        }
      }
    });

  } catch (error) {
    result.addError(filePath, 1, `Failed to read file: ${error.message}`);
  }
}

function validateForbiddenFiles(result) {
  VALIDATION_RULES.FORBIDDEN_FILES.forEach(file => {
    const fullPath = join(__dirname, file);
    try {
      statSync(fullPath);
      result.addError(file, 1, 'File should have been deleted during migration');
    } catch (error) {
      // File doesn't exist, which is good
      result.addInfo(file, 1, '✓ File successfully removed');
    }
  });
}

function main() {
  console.log('🚀 Starting WebSocket type migration validation...\n');
  
  const result = new ValidationResult();

  // Check for forbidden files
  validateForbiddenFiles(result);

  // Get all TypeScript files
  const allFiles = [
    ...getAllFiles(CLIENT_DIR),
    ...getAllFiles(SERVER_DIR),
    ...getAllFiles(SHARED_DIR)
  ];

  console.log(`📁 Scanning ${allFiles.length} files...\n`);

  // Validate each file
  allFiles.forEach(file => validateFile(file, result));

  // Print results
  result.print();

  // Exit with appropriate code
  process.exit(result.hasErrors() ? 1 : 0);
}

main();