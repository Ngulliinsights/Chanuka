#!/usr/bin/env tsx
/**
 * Add .js extensions to relative imports in server/index.ts
 * 
 * ESM requires explicit file extensions for relative imports
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

const SERVER_INDEX_PATH = resolve(process.cwd(), 'server/index.ts');
const SERVER_DIR = dirname(SERVER_INDEX_PATH);

function checkFileExists(importPath: string, fromFile: string): string | null {
  const baseDir = dirname(fromFile);
  
  // Try different extensions and patterns
  const attempts = [
    importPath + '.ts',
    importPath + '.js',
    importPath + '/index.ts',
    importPath + '/index.js',
    importPath.replace(/\.js$/, '.ts'),
  ];
  
  for (const attempt of attempts) {
    const fullPath = resolve(baseDir, attempt);
    if (existsSync(fullPath)) {
      // Return the import path with .js extension
      if (attempt.endsWith('/index.ts') || attempt.endsWith('/index.js')) {
        return importPath.endsWith('/index') ? importPath + '.js' : importPath + '/index.js';
      }
      return importPath.endsWith('.js') ? importPath : importPath + '.js';
    }
  }
  
  return null;
}

function addJsExtensions(content: string, filePath: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    // Match import statements with relative paths
    const importMatch = line.match(/^(import\s+.*?from\s+['"])(\.[^'"]+)(['"])/);
    
    if (importMatch) {
      const [, prefix, importPath, suffix] = importMatch;
      
      // Skip if already has .js extension
      if (importPath.endsWith('.js')) {
        result.push(line);
        continue;
      }
      
      // Check what file exists and add appropriate extension
      const correctedPath = checkFileExists(importPath, filePath);
      
      if (correctedPath) {
        result.push(`${prefix}${correctedPath}${suffix}`);
        console.log(`  ✓ ${importPath} → ${correctedPath}`);
      } else {
        // Keep original if we can't find the file
        result.push(line);
        console.log(`  ⚠ ${importPath} (file not found, keeping as-is)`);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

function main() {
  console.log('🔧 Adding .js extensions to relative imports...\n');
  
  try {
    // Read the file
    const content = readFileSync(SERVER_INDEX_PATH, 'utf-8');
    
    // Count imports before
    const beforeCount = (content.match(/from ['"]\.[^'"]*['"]/g) || []).length;
    const withExtensions = (content.match(/from ['"]\.[^'"]*\.js['"]/g) || []).length;
    
    console.log(`📊 Found ${beforeCount} relative imports`);
    console.log(`   ${withExtensions} already have .js extensions`);
    console.log(`   ${beforeCount - withExtensions} need .js extensions\n`);
    
    // Add extensions
    const converted = addJsExtensions(content, SERVER_INDEX_PATH);
    
    // Count after
    const afterCount = (converted.match(/from ['"]\.[^'"]*\.js['"]/g) || []).length;
    
    console.log(`\n✅ Conversion complete:`);
    console.log(`   - Before: ${withExtensions} imports with .js`);
    console.log(`   - After: ${afterCount} imports with .js`);
    console.log(`   - Added: ${afterCount - withExtensions} extensions\n`);
    
    // Write back
    writeFileSync(SERVER_INDEX_PATH, converted, 'utf-8');
    console.log(`💾 Updated ${SERVER_INDEX_PATH}\n`);
    
    console.log('🎉 Done! Try running: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
