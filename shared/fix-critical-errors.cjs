#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix unused logger imports
    if (content.includes('import { logger }') && !content.includes('logger.')) {
      content = content.replace(/^import { logger } from [^;]+;$/gm, '// import { logger } from \'../observability/logging\'; // Unused import');
      modified = true;
    }
    
    // Fix unused CacheAdapter imports
    if (content.includes('import { CacheAdapter }') && !content.includes('new CacheAdapter') && !content.includes(': CacheAdapter')) {
      content = content.replace(/^import { CacheAdapter } from [^;]+;$/gm, '// import { CacheAdapter } from \'../caching/core/interfaces\'; // Unused import');
      modified = true;
    }
    
    // Fix unused Result imports
    if (content.includes('import { Result, ok, err }') && !content.includes('ok(') && !content.includes('err(')) {
      content = content.replace(/^import { Result, ok, err } from [^;]+;$/gm, '// import { Result, ok, err } from \'../../primitives/types/result\'; // Unused import');
      modified = true;
    }
    
    // Fix unused CircuitBreaker imports
    if (content.includes('import { CircuitBreaker,') && !content.includes('new CircuitBreaker')) {
      content = content.replace(/import { CircuitBreaker, ([^}]+) } from ([^;]+);/gm, 'import { $1 } from $2;');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDirectory(filePath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        fixFile(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

// Start from core/src directory
walkDirectory('./core/src');
walkDirectory('./database');
console.log('Critical error fixes completed');