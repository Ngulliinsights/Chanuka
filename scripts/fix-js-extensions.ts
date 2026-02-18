#!/usr/bin/env node
/**
 * Fix .js extensions in TypeScript import/export statements
 * TypeScript should use extensionless imports
 */

import * as fs from 'fs';
import * as path from 'path';

interface FixResult {
  file: string;
  changes: number;
}

function walkDirectory(dir: string, results: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.nx'].includes(entry.name)) {
        walkDirectory(fullPath, results);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function fixJsExtensions(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Fix: from './file.js' -> from './file'
  content = content.replace(/from\s+(['"])(.+?)\.js\1/g, "from $1$2$1");
  
  // Fix: export * from './file.js' -> export * from './file'
  content = content.replace(/export\s+\*\s+from\s+(['"])(.+?)\.js\1/g, "export * from $1$2$1");
  
  // Fix: export { ... } from './file.js' -> export { ... } from './file'
  content = content.replace(/export\s+\{[^}]+\}\s+from\s+(['"])(.+?)\.js\1/g, (match) => {
    return match.replace(/\.js(['"])/, '$1');
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return 1;
  }
  
  return 0;
}

async function main() {
  console.log('🔧 Fixing .js extensions in TypeScript files...\n');
  
  const projectRoot = process.cwd();
  const targetDirs = [
    path.join(projectRoot, 'server'),
    path.join(projectRoot, 'client'),
    path.join(projectRoot, 'shared'),
  ];
  
  const results: FixResult[] = [];
  let totalChanges = 0;
  
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    
    console.log(`📁 Scanning ${path.relative(projectRoot, dir)}...`);
    const files = walkDirectory(dir);
    
    for (const file of files) {
      const changes = fixJsExtensions(file);
      if (changes > 0) {
        results.push({ file: path.relative(projectRoot, file), changes });
        totalChanges += changes;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${totalChanges} files\n`);
  
  if (results.length > 0) {
    console.log('Modified files:');
    results.forEach(r => console.log(`  - ${r.file}`));
  }
  
  console.log('\n📝 Summary:');
  console.log(`   Total files scanned: ${results.length + totalChanges}`);
  console.log(`   Files modified: ${totalChanges}`);
}

main().catch(console.error);
