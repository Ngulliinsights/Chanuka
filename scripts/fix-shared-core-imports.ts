#!/usr/bin/env tsx

/**
 * Fix @shared/core imports to use relative paths temporarily
 * until the path mapping is properly configured
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

function getRelativePathToSharedCore(fromFile: string): string {
  const fromDir = dirname(fromFile);
  const sharedCoreIndex = join(projectRoot, 'shared/core/src/index.ts');
  const relativePath = relative(fromDir, sharedCoreIndex);
  
  // Convert Windows paths to Unix-style for imports
  return relativePath.replace(/\\/g, '/').replace(/\.ts$/, '.js');
}

async function fixSharedCoreImports(): Promise<void> {
  console.log('🔧 Fixing @shared/core imports to use relative paths...\n');
  
  const serverDir = join(projectRoot, 'server');
  const tsFiles = findTsFiles(serverDir);
  
  let filesModified = 0;
  
  for (const file of tsFiles) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;
      
      // Replace @shared/core imports with relative paths
      const sharedCorePattern = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@shared\/core['"];?/g;
      
      if (sharedCorePattern.test(content)) {
        const relativePath = getRelativePathToSharedCore(file);
        
        content = content.replace(
          sharedCorePattern,
          `import { $1 } from '${relativePath}';`
        );
        
        modified = true;
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
fixSharedCoreImports().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});