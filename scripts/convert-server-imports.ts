#!/usr/bin/env tsx
/**
 * Convert @server/* imports to relative imports in server/index.ts
 * 
 * This script automates the conversion of TypeScript path aliases to relative imports
 * to fix the ESM module resolution issue.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const SERVER_INDEX_PATH = resolve(process.cwd(), 'server/index.ts');

// Mapping of @server/* paths to relative paths from server/index.ts
const PATH_MAPPINGS: Record<string, string> = {
  '@server/config': './config',
  '@server/infrastructure': './infrastructure',
  '@server/features': './features',
  '@server/middleware': './middleware',
  '@server/utils': './utils',
  '@server/vite': './vite',
};

function convertImports(content: string): string {
  let converted = content;
  
  // Replace each @server/* import with relative path
  for (const [alias, relativePath] of Object.entries(PATH_MAPPINGS)) {
    // Match: from '@server/...'
    const regex = new RegExp(`from ['"]${alias.replace(/\//g, '\\/')}([^'"]*?)['"]`, 'g');
    converted = converted.replace(regex, (match, subpath) => {
      const fullRelativePath = relativePath + subpath;
      return `from '${fullRelativePath}'`;
    });
  }
  
  return converted;
}

function main() {
  console.log('🔄 Converting @server/* imports to relative imports...\n');
  
  try {
    // Read the file
    const content = readFileSync(SERVER_INDEX_PATH, 'utf-8');
    
    // Count imports before conversion
    const beforeCount = (content.match(/from ['"]@server/g) || []).length;
    console.log(`📊 Found ${beforeCount} @server/* imports\n`);
    
    // Convert imports
    const converted = convertImports(content);
    
    // Count imports after conversion
    const afterCount = (converted.match(/from ['"]@server/g) || []).length;
    
    if (beforeCount === afterCount) {
      console.log('⚠️  No imports were converted. Check the path mappings.');
      process.exit(1);
    }
    
    // Show what changed
    console.log('✅ Conversion complete:');
    console.log(`   - Before: ${beforeCount} @server/* imports`);
    console.log(`   - After: ${afterCount} @server/* imports`);
    console.log(`   - Converted: ${beforeCount - afterCount} imports\n`);
    
    // Write back to file
    writeFileSync(SERVER_INDEX_PATH, converted, 'utf-8');
    console.log(`💾 Updated ${SERVER_INDEX_PATH}\n`);
    
    if (afterCount > 0) {
      console.log('⚠️  Warning: Some @server/* imports remain.');
      console.log('   These may need manual conversion or additional path mappings.\n');
    }
    
    console.log('🎉 Done! Try running: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
