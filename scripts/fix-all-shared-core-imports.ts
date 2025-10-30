#!/usr/bin/env tsx

/**
 * Comprehensive fix for all @shared/core import patterns
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getRelativePathToSharedCore(fromFile: string, targetPath: string = 'shared/core/src/index.ts'): string {
  const fromDir = dirname(fromFile);
  const targetFile = join(projectRoot, targetPath);
  const relativePath = relative(fromDir, targetFile);
  
  // Convert Windows paths to Unix-style for imports
  return relativePath.replace(/\\/g, '/').replace(/\.ts$/, '.js');
}

async function fixAllSharedCoreImports(): Promise<void> {
  console.log('🔧 Fixing ALL @shared/core import patterns...\n');
  
  const serverDir = join(projectRoot, 'server');
  const tsFiles = findTsFiles(serverDir);
  
  let filesModified = 0;
  
  for (const file of tsFiles) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;
      
      // Pattern 1: Basic @shared/core imports
      const basicPattern = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@shared\/core['"];?/g;
      if (basicPattern.test(content)) {
        const relativePath = getRelativePathToSharedCore(file);
        content = content.replace(basicPattern, `import { $1 } from '${relativePath}';`);
        modified = true;
      }
      
      // Pattern 2: @shared/core/index.js imports
      const indexPattern = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@shared\/core\/index\.js['"];?/g;
      if (indexPattern.test(content)) {
        const relativePath = getRelativePathToSharedCore(file);
        content = content.replace(indexPattern, `import { $1 } from '${relativePath}';`);
        modified = true;
      }
      
      // Pattern 3: @shared/core/src/... imports
      const srcPattern = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@shared\/core\/src\/([^'"]+)['"];?/g;
      const srcMatches = [...content.matchAll(srcPattern)];
      for (const match of srcMatches) {
        const [fullMatch, imports, subPath] = match;
        const targetPath = `shared/core/src/${subPath.replace(/\.js$/, '.ts')}`;
        const relativePath = getRelativePathToSharedCore(file, targetPath);
        content = content.replace(fullMatch, `import { ${imports} } from '${relativePath}';`);
        modified = true;
      }
      
      // Pattern 4: Mock imports in tests
      const mockPattern = /vi\.mock\(['"]@shared\/core\/src\/([^'"]+)['"]/g;
      const mockMatches = [...content.matchAll(mockPattern)];
      for (const match of mockMatches) {
        const [fullMatch, subPath] = match;
        const targetPath = `shared/core/src/${subPath.replace(/\.js$/, '.ts')}`;
        const relativePath = getRelativePathToSharedCore(file, targetPath);
        content = content.replace(fullMatch, `vi.mock('${relativePath}'`);
        modified = true;
      }
      
      // Pattern 5: Comments and deprecation warnings
      const commentPattern = /@shared\/core/g;
      if (commentPattern.test(content)) {
        // Don't modify comments, just note them
        // content = content.replace(commentPattern, 'shared/core');
        // modified = true;
      }
      
      if (modified) {
        writeFileSync(file, content);
        filesModified++;
        console.log(`✅ Fixed imports in: ${relative(projectRoot, file)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error}`);
    }
  }
  
  console.log(`\n🎉 Fixed @shared/core imports in ${filesModified} files`);
}

// Run the fix
fixAllSharedCoreImports().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});