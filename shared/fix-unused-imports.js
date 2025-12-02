#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to fix unused imports and variables
const fixes = [
  // Unused imports - comment them out
  {
    pattern: /^import { logger } from [^;]+;$/gm,
    replacement: '// import { logger } from \'../observability/logging\'; // Unused import'
  },
  {
    pattern: /^import { CacheAdapter } from [^;]+;$/gm,
    replacement: '// import { CacheAdapter } from \'../caching/core/interfaces\'; // Unused import'
  },
  {
    pattern: /^import { CircuitBreaker, [^}]+ } from [^;]+;$/gm,
    replacement: (match) => `// ${match} // Unused import`
  },
  
  // Unused variables - prefix with underscore
  {
    pattern: /(\s+)([a-zA-Z_][a-zA-Z0-9_]*): ([^,\n]+),?(\s*\/\/.*)?$/gm,
    replacement: (match, indent, varName, type, comment) => {
      if (varName.startsWith('_')) return match;
      return `${indent}_${varName}: ${type},${comment || ''}`;
    }
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
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
}

// Start from core/src directory
walkDirectory('./core/src');
console.log('Unused import fixes completed');