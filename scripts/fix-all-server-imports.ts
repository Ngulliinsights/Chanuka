#!/usr/bin/env tsx
/**
 * Fix all @server/* and @shared/* imports in server directory
 * Add .js extensions where needed
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, resolve as resolvePath } from 'path';

const SERVER_DIR = resolvePath(process.cwd(), 'server');
const SHARED_DIR = resolvePath(process.cwd(), 'shared');

let filesProcessed = 0;
let importsFixed = 0;

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      // Skip node_modules and dist
      if (entry === 'node_modules' || entry === 'dist' || entry === '.nx') {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return files;
}

function fixImportsInFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = false;
    let newContent = content;
    
    // Fix @server/* imports to relative
    const serverImportRegex = /from ['"]@server\/([^'"]+)['"]/g;
    newContent = newContent.replace(serverImportRegex, (match, path) => {
      modified = true;
      importsFixed++;
      
      // Calculate relative path from current file to server root
      const relPath = relative(dirname(filePath), SERVER_DIR);
      const finalPath = join(relPath, path).replace(/\\/g, '/');
      
      // Add .js if not present and not a directory import
      if (!finalPath.endsWith('.js') && !finalPath.includes('/index')) {
        return `from './${finalPath}.js'`;
      }
      return `from './${finalPath}'`;
    });
    
    // Fix @shared/* imports to relative
    const sharedImportRegex = /from ['"]@shared\/([^'"]+)['"]/g;
    newContent = newContent.replace(sharedImportRegex, (match, path) => {
      modified = true;
      importsFixed++;
      
      // Calculate relative path from current file to shared directory
      const relPath = relative(dirname(filePath), SHARED_DIR);
      const finalPath = join(relPath, path).replace(/\\/g, '/');
      
      // Add .js if not present
      if (!finalPath.endsWith('.js') && !finalPath.includes('/index')) {
        return `from '${finalPath}.js'`;
      }
      return `from '${finalPath}'`;
    });
    
    // Fix @shared imports (without path)
    const sharedRootImportRegex = /from ['"]@shared['"]/g;
    newContent = newContent.replace(sharedRootImportRegex, (match) => {
      modified = true;
      importsFixed++;
      
      const relPath = relative(dirname(filePath), SHARED_DIR);
      const finalPath = join(relPath, 'index').replace(/\\/g, '/');
      return `from '${finalPath}.js'`;
    });
    
    if (modified) {
      writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing all @server/* and @shared/* imports in server directory...\n');
  
  const tsFiles = getAllTsFiles(SERVER_DIR);
  console.log(`📊 Found ${tsFiles.length} TypeScript files\n`);
  
  for (const file of tsFiles) {
    const relativePath = relative(SERVER_DIR, file);
    
    if (fixImportsInFile(file)) {
      filesProcessed++;
      console.log(`  ✓ ${relativePath}`);
    }
  }
  
  console.log(`\n✅ Complete:`);
  console.log(`   - Files processed: ${filesProcessed}`);
  console.log(`   - Imports fixed: ${importsFixed}\n`);
  
  console.log('🎉 Done! Try running: npm run dev\n');
}

main();
