#!/usr/bin/env tsx
/**
 * Comprehensive Schema Reference Fixer
 * 
 * This script fixes all remaining schema references throughout the codebase
 * after the initial alignment migration.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface FixPattern {
  description: string;
  pattern: RegExp;
  replacement: string;
  fileTypes?: string[];
}

// Comprehensive list of fixes needed
const fixes: FixPattern[] = [
  // Table name fixes that might have been missed
  {
    description: "Fix remaining user table references",
    pattern: /\buser\s*\./g,
    replacement: "users."
  },
  {
    description: "Fix remaining bill table references", 
    pattern: /\bbill\s*\./g,
    replacement: "bills."
  },
  {
    description: "Fix remaining sponsor table references",
    pattern: /\bsponsor\s*\./g, 
    replacement: "sponsors."
  },
  
  // Import statement fixes
  {
    description: "Fix schema imports",
    pattern: /import\s*{\s*([^}]*)\buser\b([^}]*)\s*}\s*from\s*['"][^'"]*schema['"]/g,
    replacement: "import { $1users$2 } from '../shared/schema'"
  },
  
  // Column reference fixes in object destructuring
  { description: "Fix user_id in destructuring",
    pattern: /{\s*([^ }]*)\buser_id\b([^}]*)\s*}/g,
    replacement: "{ $1user_id$2 }"
  },
  { description: "Fix bill_id in destructuring", 
    pattern: /{\s*([^ }]*)\bbill_id\b([^}]*)\s*}/g,
    replacement: "{ $1bill_id$2 }"
  },
  
  // SQL template literal fixes
  {
    description: "Fix SQL column references",
    pattern: /sql`([^`]*)\buser_id\b([^`]*)`/g,
    replacement: "sql`$1user_id$2`"
  },
  {
    description: "Fix SQL bill column references",
    pattern: /sql`([^`]*)\bbill_id\b([^`]*)`/g, 
    replacement: "sql`$1bill_id$2`"
  }
];

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', 'dist', 'build', '.git', '.next'].includes(item)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (stat.isFile() && ['.ts', '.tsx'].includes(extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function applyFixes(): void {
  console.log('🔍 Finding TypeScript files...');
  const files = findTypeScriptFiles('.');
  console.log(`📁 Found ${files.length} TypeScript files`);
  
  let totalChanges = 0;
  
  for (const fix of fixes) {
    console.log(`\n🔧 ${fix.description}`);
    let fixChanges = 0;
    
    for (const file of files) {
      try {
        let content = readFileSync(file, 'utf8');
        const originalContent = content;
        
        content = content.replace(fix.pattern, fix.replacement);
        
        if (content !== originalContent) {
          writeFileSync(file, content);
          fixChanges++;
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing ${file}: ${error}`);
      }
    }
    
    console.log(`   ✅ Updated ${fixChanges} files`);
    totalChanges += fixChanges;
  }
  
  console.log(`\n🎉 Applied fixes to ${totalChanges} files total`);
}

async function main(): void {
  console.log('🚀 Starting Comprehensive Schema Reference Fix\n');
  
  try {
    applyFixes();
    console.log('\n✅ Schema reference fixes completed!');
  } catch (error) {
    console.error('💥 Fix script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);