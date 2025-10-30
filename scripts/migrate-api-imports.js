#!/usr/bin/env node

/**
 * Comprehensive Migration Script for API Utility Import Errors
 *
 * This script fixes all API utility import errors across the codebase by:
 * 1. Finding all files importing from deprecated API paths
 * 2. Updating imports to use the correct unified API utilities
 * 3. Transforming function calls to match new signatures
 * 4. Handling architectural shifts from helper functions to unified API response system
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const DEPRECATED_IMPORTS = [
  '@shared/core/utils/api-utils',
  '@shared/core/utils/api'
];

const CORRECT_IMPORT = '@shared/core/src/utils/api-utils';

// Function signature transformations
const FUNCTION_TRANSFORMS = {
  // ApiError transformations
  'ApiError\\(res,\\s*([^,]+),\\s*(\\d+),\\s*([^)]+)\\)': (match, error, statusCode, metadata) => {
    // Handle object-style error parameter
    if (error.trim().startsWith('{')) {
      return `sendApiResponse(res, UnifiedApiResponse.error(${error}.message, ${error}.code, ${error}.details, ${metadata}), ${statusCode})`;
    }
    // Handle string error parameter
    return `sendApiResponse(res, UnifiedApiResponse.error(${error}, undefined, undefined, ${metadata}), ${statusCode})`;
  },

  // ApiValidationError transformations
  'ApiValidationError\\(res,\\s*([^,]+),\\s*([^)]*)\\)': (match, errors, metadata) => {
    const metaParam = metadata ? `, ${metadata}` : '';
    return `sendApiResponse(res, UnifiedApiResponse.validation(${errors}${metaParam}), 400)`;
  },

  // ApiNotFound transformations
  'ApiNotFound\\(res,\\s*([^,]+),\\s*([^)]*)\\)': (match, resource, message, metadata) => {
    const msgParam = message ? message : `'${resource} not found'`;
    const metaParam = metadata ? `, ${metadata}` : '';
    return `sendApiResponse(res, UnifiedApiResponse.notFound(${resource}, ${msgParam}${metaParam}), 404)`;
  },

  // ApiSuccess transformations
  'ApiSuccess\\(res,\\s*([^,]+),\\s*([^,]*),\\s*([^)]*)\\)': (match, data, metadata, statusCode) => {
    const metaParam = metadata && metadata !== 'undefined' ? `, undefined, ${metadata}` : '';
    const statusParam = statusCode ? `, ${statusCode}` : '';
    return `sendApiResponse(res, UnifiedApiResponse.success(${data}${metaParam})${statusParam})`;
  }
};

// Import statement transformations
const IMPORT_TRANSFORMS = {
  // Transform imports from deprecated paths
  'import\\s*\\{([^}]+)\\}\\s*from\\s*[\'"](@shared/core/utils/(?:api-utils|api))[\'"]': (match, imports, oldPath) => {
    // Parse imports to determine what needs to be imported
    const importList = imports.split(',').map(imp => imp.trim());

    // Check if we need UnifiedApiResponse or sendApiResponse
    const needsUnifiedApiResponse = importList.some(imp =>
      ['ApiSuccess', 'ApiError', 'ApiValidationError', 'ApiNotFound'].includes(imp)
    );

    const needsSendApiResponse = importList.some(imp =>
      ['ApiSuccess', 'ApiError', 'ApiValidationError', 'ApiNotFound'].includes(imp)
    );

    // Build new import statement
    let newImports = [...importList];
    if (needsUnifiedApiResponse && !newImports.includes('UnifiedApiResponse')) {
      newImports.push('UnifiedApiResponse');
    }
    if (needsSendApiResponse && !newImports.includes('sendApiResponse')) {
      newImports.push('sendApiResponse');
    }

    return `import { ${newImports.join(', ')} } from '${CORRECT_IMPORT}'`;
  }
};

function findFilesWithDeprecatedImports() {
  console.log('🔍 Finding files with deprecated API imports...');

  const results = execSync('find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | grep -v .git', { encoding: 'utf8' });
  const files = results.trim().split('\n').filter(Boolean);

  const filesWithDeprecatedImports = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      const hasDeprecatedImport = DEPRECATED_IMPORTS.some(deprecatedPath => {
        const regex = new RegExp(`from\\s*['"]${deprecatedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
        return regex.test(content);
      });

      if (hasDeprecatedImport) {
        filesWithDeprecatedImports.push(file);
      }
    } catch (error) {
      console.warn(`⚠️  Could not read file: ${file}`);
    }
  }

  console.log(`📁 Found ${filesWithDeprecatedImports.length} files with deprecated imports`);
  return filesWithDeprecatedImports;
}

function transformFile(filePath) {
  console.log(`🔄 Transforming ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  // Transform import statements
  for (const [pattern, transform] of Object.entries(IMPORT_TRANSFORMS)) {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, transform);
      hasChanges = true;
    }
  }

  // Transform function calls
  for (const [pattern, transform] of Object.entries(FUNCTION_TRANSFORMS)) {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, transform);
      hasChanges = true;
    }
  }

  // Handle specific problematic patterns
  // Pattern 1: ApiError with object parameter
  content = content.replace(
    /ApiError\(res,\s*\{([^}]+)\},\s*(\d+)(?:,\s*([^)]+))?\)/g,
    (match, errorObj, statusCode, metadata) => {
      const metaParam = metadata ? `, ${metadata}` : '';
      return `sendApiResponse(res, UnifiedApiResponse.error(${errorObj}.message, ${errorObj}.code || 'INTERNAL_ERROR', ${errorObj}.details${metaParam}), ${statusCode})`;
    }
  );

  // Pattern 2: ApiValidationError with single error object
  content = content.replace(
    /ApiValidationError\(res,\s*\{([^}]+)\}(?:,\s*([^)]+))?\)/g,
    (match, errorObj, metadata) => {
      const metaParam = metadata ? `, ${metadata}` : '';
      return `sendApiResponse(res, UnifiedApiResponse.validation([{${errorObj}}]${metaParam}), 400)`;
    }
  );

  // Pattern 3: ApiNotFound with createMetadata
  content = content.replace(
    /ApiNotFound\(res,\s*([^,]+),\s*(\d+),\s*ApiResponseWrapper\.createMetadata\(([^)]+)\)\)/g,
    (match, resource, statusCode, metadataArgs) => {
      return `sendApiResponse(res, UnifiedApiResponse.notFound(${resource}, undefined, {${metadataArgs}}), ${statusCode})`;
    }
  );

  // Pattern 4: ApiError with createMetadata
  content = content.replace(
    /ApiError\(res,\s*([^,]+),\s*(\d+),\s*ApiResponseWrapper\.createMetadata\(([^)]+)\)\)/g,
    (match, error, statusCode, metadataArgs) => {
      return `sendApiResponse(res, UnifiedApiResponse.error(${error}, undefined, undefined, {${metadataArgs}}), ${statusCode})`;
    }
  );

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed for ${filePath}`);
    return false;
  }
}

function validateTransformation(filePath) {
  console.log(`🔍 Validating ${filePath}...`);

  const content = fs.readFileSync(filePath, 'utf8');

  // Check for remaining deprecated imports
  const remainingDeprecatedImports = DEPRECATED_IMPORTS.filter(deprecatedPath => {
    const regex = new RegExp(`from\\s*['"]${deprecatedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    return regex.test(content);
  });

  if (remainingDeprecatedImports.length > 0) {
    console.warn(`⚠️  ${filePath} still has deprecated imports: ${remainingDeprecatedImports.join(', ')}`);
    return false;
  }

  // Check for syntax errors by attempting to parse
  try {
    // Basic syntax check - look for unmatched brackets
    let bracketCount = 0;
    let parenCount = 0;
    let braceCount = 0;

    for (const char of content) {
      switch (char) {
        case '[': bracketCount++; break;
        case ']': bracketCount--; break;
        case '(': parenCount++; break;
        case ')': parenCount--; break;
        case '{': braceCount++; break;
        case '}': braceCount--; break;
      }
    }

    if (bracketCount !== 0 || parenCount !== 0 || braceCount !== 0) {
      console.error(`❌ ${filePath} has unmatched brackets/braces/parentheses`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} failed syntax validation: ${error.message}`);
    return false;
  }

  console.log(`✅ ${filePath} validation passed`);
  return true;
}

function main() {
  console.log('🚀 Starting comprehensive API import migration...\n');

  // Find files to migrate
  const filesToMigrate = findFilesWithDeprecatedImports();

  if (filesToMigrate.length === 0) {
    console.log('🎉 No files need migration!');
    return;
  }

  console.log('\n📝 Files to migrate:');
  filesToMigrate.forEach(file => console.log(`  - ${file}`));

  // Ask for confirmation
  console.log('\n⚠️  This will modify the files listed above. Continue? (y/N)');
  const shouldContinue = process.argv.includes('--yes') || process.argv.includes('-y');

  if (!shouldContinue) {
    console.log('Migration cancelled. Run with --yes to proceed automatically.');
    return;
  }

  // Transform files
  console.log('\n🔄 Transforming files...');
  const transformedFiles = [];
  const failedFiles = [];

  for (const file of filesToMigrate) {
    try {
      const wasTransformed = transformFile(file);
      if (wasTransformed) {
        transformedFiles.push(file);
      }
    } catch (error) {
      console.error(`❌ Failed to transform ${file}: ${error.message}`);
      failedFiles.push(file);
    }
  }

  // Validate transformations
  console.log('\n🔍 Validating transformations...');
  const validationResults = [];

  for (const file of transformedFiles) {
    try {
      const isValid = validateTransformation(file);
      validationResults.push({ file, valid: isValid });
    } catch (error) {
      console.error(`❌ Failed to validate ${file}: ${error.message}`);
      validationResults.push({ file, valid: false });
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully transformed: ${transformedFiles.length} files`);
  console.log(`❌ Failed to transform: ${failedFiles.length} files`);
  console.log(`🔍 Valid transformations: ${validationResults.filter(r => r.valid).length} files`);
  console.log(`⚠️  Invalid transformations: ${validationResults.filter(r => !r.valid).length} files`);

  if (failedFiles.length > 0) {
    console.log('\n❌ Files that failed transformation:');
    failedFiles.forEach(file => console.log(`  - ${file}`));
  }

  if (validationResults.some(r => !r.valid)) {
    console.log('\n⚠️  Files with validation issues:');
    validationResults.filter(r => !r.valid).forEach(result => console.log(`  - ${result.file}`));
  }

  console.log('\n🎉 Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes made to ensure correctness');
  console.log('2. Run your TypeScript compiler to check for any remaining errors');
  console.log('3. Test the affected functionality');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  findFilesWithDeprecatedImports,
  transformFile,
  validateTransformation,
  DEPRECATED_IMPORTS,
  CORRECT_IMPORT,
  FUNCTION_TRANSFORMS,
  IMPORT_TRANSFORMS
};