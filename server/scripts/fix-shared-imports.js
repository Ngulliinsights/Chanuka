#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix @shared/core imports
    let newContent = content.replace(
      /@shared\/core\/index\.js/g,
      '@shared/core'
    );
    
    // Fix @shared/core imports
    newContent = newContent.replace(
      /@shared\/core\/src\/index\.js/g,
      '@shared/core'
    );
    
    // Fix other problematic imports
    newContent = newContent.replace(
      /@shared\/database\/connection\.js/g,
      '@server/infrastructure/database'
    );
    
    newContent = newContent.replace(
      /@shared\/schema\/foundation/g,
      '@shared/schema'
    );
    
    newContent = newContent.replace(
      /@shared\/schema\/citizen_participation/g,
      '@shared/schema'
    );
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      modified = true;
      console.log(`✅ Fixed imports in: ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing shared module imports in server...\n');
  
  const serverDir = process.cwd();
  const tsFiles = findTsFiles(serverDir);
  
  console.log(`📁 Found ${tsFiles.length} TypeScript/JavaScript files\n`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ Import fixes completed!`);
  console.log(`📊 Fixed imports in ${fixedCount} out of ${tsFiles.length} files`);
  
  if (fixedCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('1. Run TypeScript compilation: npx tsc --noEmit');
    console.log('2. Start the server: npm run dev');
  }
}

main();