#!/usr/bin/env node

/**
 * Scan for Remaining Imports
 * 
 * Quick script to find any remaining imports from deprecated modules
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🔍 Scanning for remaining imports from deprecated modules...\n');

const deprecatedModules = [
  'server/infrastructure/realtime',
  'shared/infrastructure/realtime'
];

const results = [];

for (const module of deprecatedModules) {
  console.log(`📋 Scanning for imports from: ${module}`);
  
  try {
    // Search for imports using grep (more portable than ripgrep)
    const searchPattern = `from ['"].*${module}`;
    const command = `grep -r "${searchPattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || true`;
    
    const result = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
    
    if (result.trim()) {
      const lines = result.split('\n').filter(line => line.trim());
      console.log(`  ⚠️  Found ${lines.length} remaining imports:`);
      
      lines.slice(0, 5).forEach(line => {
        console.log(`    ${line}`);
      });
      
      if (lines.length > 5) {
        console.log(`    ... and ${lines.length - 5} more`);
      }
      
      results.push({ module, count: lines.length, imports: lines });
    } else {
      console.log(`  ✅ No remaining imports found`);
      results.push({ module, count: 0, imports: [] });
    }
  } catch (error) {
    console.log(`  ❓ Could not scan ${module}: ${error.message}`);
  }
  
  console.log('');
}

// Generate summary
const totalImports = results.reduce((sum, r) => sum + r.count, 0);

console.log('📊 Summary:');
console.log(`  Total remaining imports: ${totalImports}`);

if (totalImports === 0) {
  console.log('  ✅ All modules are ready for deletion!');
} else {
  console.log('  ⚠️  Some imports still need to be migrated');
  console.log('\n🔧 Suggested actions:');
  
  results.forEach(result => {
    if (result.count > 0) {
      console.log(`\n  ${result.module}:`);
      console.log(`    - Update ${result.count} import statements`);
      console.log(`    - Replace with: import { ... } from 'server/infrastructure/websocket'`);
    }
  });
}

console.log('\n✅ Scan complete!');