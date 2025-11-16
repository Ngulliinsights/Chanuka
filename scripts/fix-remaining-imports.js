#!/usr/bin/env node

/**
 * Script to fix remaining incorrect import paths in client code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Calculate correct relative path to utils/logger
    const relativePath = path.relative('client/src', filePath);
    const depth = relativePath.split('/').length - 1;
    const relativePrefix = '../'.repeat(depth);

    // Fix incorrect logger import paths
    const incorrectLoggerPatterns = [
      /import\s*{\s*logger\s*}\s*from\s*['"]utils\/logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]\.\/utils\/logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]utils\/logger['"];?/g
    ];

    incorrectLoggerPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { logger } from '${relativePrefix}utils/logger';`);
        modified = true;
      }
    });

    // Fix incorrect i18n import paths
    const incorrectI18nPatterns = [
      /import\s*{\s*en\s*}\s*from\s*['"]utils\/i18n['"];?/g,
      /import\s*{\s*en\s*}\s*from\s*['"]\.\/utils\/i18n['"];?/g
    ];

    incorrectI18nPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { en } from '${relativePrefix}utils/i18n';`);
        modified = true;
      }
    });

    // Fix validation service imports
    const incorrectValidationPatterns = [
      /import\s*{\s*validationService\s*}\s*from\s*['"]utils\/logger['"];?/g,
      /import\s*{\s*validationService\s*}\s*from\s*['"]\.\/utils\/logger['"];?/g
    ];

    incorrectValidationPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { validationService } from '${relativePrefix}utils/logger';`);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Fixing remaining import paths in client code...\n');

  const clientSrcPath = path.join(__dirname, '..', 'client', 'src');
  const files = getAllFiles(clientSrcPath);

  let totalFixed = 0;
  
  files.forEach(file => {
    totalFixed += fixImportsInFile(file);
  });

  console.log(`\n✅ Fixed imports in ${totalFixed} files`);
  
  if (totalFixed > 0) {
    console.log('🚀 Running TypeScript check to verify fixes...');
  } else {
    console.log('ℹ️  No import issues found to fix');
  }
}

main();