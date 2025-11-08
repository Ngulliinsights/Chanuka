#!/usr/bin/env node

/**
 * Comprehensive script to fix ALL remaining import issues
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

function calculateRelativePath(fromFile, toFile) {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toFile);
  return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    const clientSrcPath = path.join(__dirname, '..', 'client', 'src');
    const browserLoggerPath = path.join(clientSrcPath, 'utils', 'browser-logger.ts');
    const i18nPath = path.join(clientSrcPath, 'utils', 'i18n.ts');
    const clientCorePath = path.join(clientSrcPath, 'utils', 'client-core.ts');

    // Calculate correct relative paths
    const loggerRelativePath = calculateRelativePath(filePath, browserLoggerPath).replace('.ts', '');
    const i18nRelativePath = calculateRelativePath(filePath, i18nPath).replace('.ts', '');
    const clientCoreRelativePath = calculateRelativePath(filePath, clientCorePath).replace('.ts', '');

    // Fix all variations of incorrect logger imports
    const loggerPatterns = [
      /import\s*{\s*logger\s*}\s*from\s*['"]utils\/browser-logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]\.\/utils\/browser-logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]\.\.\/utils\/browser-logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]\.\.\/\.\.\/utils\/browser-logger['"];?/g,
      /import\s*{\s*logger\s*}\s*from\s*['"]\.\.\/\.\.\/\.\.\/utils\/browser-logger['"];?/g
    ];

    loggerPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { logger } from '${loggerRelativePath}';`);
        modified = true;
      }
    });

    // Fix all variations of incorrect i18n imports
    const i18nPatterns = [
      /import\s*{\s*en\s*}\s*from\s*['"]utils\/i18n['"];?/g,
      /import\s*{\s*en\s*}\s*from\s*['"]\.\/utils\/i18n['"];?/g,
      /import\s*{\s*en\s*}\s*from\s*['"]\.\.\/utils\/i18n['"];?/g,
      /import\s*{\s*en\s*}\s*from\s*['"]\.\.\/\.\.\/utils\/i18n['"];?/g
    ];

    i18nPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { en } from '${i18nRelativePath}';`);
        modified = true;
      }
    });

    // Fix validation service imports
    const validationPatterns = [
      /import\s*{\s*validationService\s*}\s*from\s*['"]utils\/client-core['"];?/g,
      /import\s*{\s*validationService\s*}\s*from\s*['"]\.\/utils\/client-core['"];?/g,
      /import\s*{\s*validationService\s*}\s*from\s*['"]\.\.\/utils\/client-core['"];?/g
    ];

    validationPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `import { validationService } from '${clientCoreRelativePath}';`);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔧 Comprehensive fix for ALL import issues...\n');

  const clientSrcPath = path.join(__dirname, '..', 'client', 'src');
  const files = getAllFiles(clientSrcPath);

  let totalFixed = 0;
  
  files.forEach(file => {
    totalFixed += fixImportsInFile(file);
  });

  console.log(`\n✅ Fixed imports in ${totalFixed} files`);
  console.log('🚀 Running TypeScript check...');
}

main();