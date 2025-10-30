#!/usr/bin/env tsx

/**
 * Clean up missing imports in shared/core module
 * 
 * This script removes imports to modules that were deleted by design
 * during development to reduce complexity.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
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
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function cleanSharedCoreImports(): Promise<void> {
  console.log('🧹 Cleaning up missing imports in shared/core...\n');
  
  const sharedCoreDir = join(projectRoot, 'shared/core/src');
  const tsFiles = findTsFiles(sharedCoreDir);
  
  let filesModified = 0;
  
  // Common patterns of missing imports that were deleted by design
  const missingImportPatterns = [
    // Migration utilities
    /export \* from ['"]\.\/migration['"];?/g,
    /export \* from ['"]\.\/utils\/migration['"];?/g,
    /import .+ from ['"]\.\/migration['"];?/g,
    /import .+ from ['"]\.\/utils\/migration['"];?/g,
    
    // Chain utilities
    /export .+ from ['"]\.\/chain['"];?/g,
    /import .+ from ['"]\.\/chain['"];?/g,
    
    // Health utilities (if not in observability)
    /export .+ from ['"]\.\/health['"];?/g,
    /import .+ from ['"]\.\/health['"];?/g,
    /export .+ from ['"]\.\.\/health['"];?/g,
    /import .+ from ['"]\.\.\/health['"];?/g,
    
    // Legacy adapters
    /export .+ from ['"]\.\/legacy['"];?/g,
    /import .+ from ['"]\.\/legacy['"];?/g,
    
    // Backward compatibility
    /export .+ from ['"]\.\/compat['"];?/g,
    /import .+ from ['"]\.\/compat['"];?/g,
  ];
  
  for (const file of tsFiles) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;
      
      for (const pattern of missingImportPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, '// Removed - module deleted by design during development');
          modified = true;
        }
      }
      
      // Fix specific known issues
      if (content.includes("from '../health'")) {
        content = content.replace(/from ['"]\.\.\/health['"];?/g, "from '../observability/health';");
        modified = true;
      }
      
      if (content.includes("from './health'")) {
        content = content.replace(/from ['"]\.\/health['"];?/g, "from './observability/health';");
        modified = true;
      }
      
      if (modified) {
        writeFileSync(file, content);
        filesModified++;
        console.log(`✅ Cleaned imports in: ${file.replace(projectRoot, '.')}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error}`);
    }
  }
  
  console.log(`\n🎉 Cleaned imports in ${filesModified} files`);
}

// Run the cleanup
cleanSharedCoreImports().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});