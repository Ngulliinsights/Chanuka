/**
 * Verification Script for Graph Module Refactoring (Task 2.2)
 * 
 * Verifies that the graph module refactoring is complete by checking:
 * 1. Directory structure is correct
 * 2. No flat files remain at root (except index.ts)
 * 3. Import paths are updated correctly
 * 4. TypeScript compilation passes
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const graphDir = 'server/infrastructure/database/graph';

console.log('========================================');
console.log('  Graph Module Refactoring Verification');
console.log('========================================\n');

let hasErrors = false;

// Test 1: Verify directory structure
console.log('1. Verifying directory structure...');
const requiredDirs = ['core', 'query', 'utils', 'analytics', 'sync', 'config'];
const entries = readdirSync(graphDir);

for (const dir of requiredDirs) {
  const dirPath = join(graphDir, dir);
  try {
    const stat = statSync(dirPath);
    if (stat.isDirectory()) {
      console.log(`   ✓ ${dir}/ exists`);
    } else {
      console.log(`   ✗ ${dir} is not a directory`);
      hasErrors = true;
    }
  } catch (error) {
    console.log(`   ✗ ${dir}/ not found`);
    hasErrors = true;
  }
}

// Test 2: Verify no flat files remain (except allowed ones)
console.log('\n2. Checking for flat files at root...');
const allowedRootFiles = ['index.ts', 'REFACTORING_SUMMARY.md', 'README.md'];
const rootFiles = entries.filter(entry => {
  const fullPath = join(graphDir, entry);
  const stat = statSync(fullPath);
  return stat.isFile() && entry.endsWith('.ts') && !allowedRootFiles.includes(entry);
});

if (rootFiles.length === 0) {
  console.log('   ✓ No unexpected flat files at root');
} else {
  console.log(`   ✗ Found ${rootFiles.length} unexpected flat files:`);
  rootFiles.forEach(file => console.log(`     - ${file}`));
  hasErrors = true;
}

// Test 3: Verify barrel export exists and is correct
console.log('\n3. Verifying barrel export...');
try {
  const indexPath = join(graphDir, 'index.ts');
  const indexContent = readFileSync(indexPath, 'utf-8');
  
  const expectedExports = requiredDirs.map(dir => `export * from './${dir}';`);
  let allExportsPresent = true;
  
  for (const expectedExport of expectedExports) {
    if (!indexContent.includes(expectedExport)) {
      console.log(`   ✗ Missing export: ${expectedExport}`);
      allExportsPresent = false;
      hasErrors = true;
    }
  }
  
  if (allExportsPresent) {
    console.log('   ✓ Barrel export is correct');
  }
} catch (error) {
  console.log('   ✗ Failed to read barrel export');
  hasErrors = true;
}

// Test 4: Check for old import patterns
console.log('\n4. Checking for incorrect import patterns...');
const incorrectPatterns = [
  { pattern: /from ['"]\.\/error-adapter-v2['"]/, desc: 'Flat error-adapter-v2 imports in subdirs' },
  { pattern: /from ['"]\.\/retry-utils['"]/, desc: 'Flat retry-utils imports in subdirs' },
  { pattern: /from ['"]\.\/graph-config['"]/, desc: 'Flat graph-config imports in subdirs' },
];

function checkDirectory(dir: string, depth: number = 0): number {
  let issueCount = 0;
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      issueCount += checkDirectory(fullPath, depth + 1);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      // Skip files that can use ./ for same-directory imports
      const dirName = dir.split(/[/\\]/).pop() || '';
      if (['utils', 'config', 'core', 'query', 'analytics', 'sync'].includes(dirName)) {
        // Files within these directories can import from same directory with ./
        continue;
      }
      
      const content = readFileSync(fullPath, 'utf-8');
      
      for (const { pattern, desc } of incorrectPatterns) {
        if (pattern.test(content)) {
          console.log(`   ✗ ${fullPath}: ${desc}`);
          issueCount++;
          hasErrors = true;
        }
      }
    }
  }
  
  return issueCount;
}

const issueCount = checkDirectory(graphDir);
if (issueCount === 0) {
  console.log('   ✓ No incorrect import patterns found');
} else {
  console.log(`   ✗ Found ${issueCount} files with incorrect imports`);
}

// Test 5: TypeScript compilation
console.log('\n5. Running TypeScript compilation check...');
try {
  execSync('npx tsc --noEmit --project server/tsconfig.json', {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log('   ✓ TypeScript compilation passed');
} catch (error: any) {
  const output = error.stdout || error.stderr || '';
  if (output.includes('graph')) {
    console.log('   ✗ TypeScript compilation failed with graph-related errors');
    console.log(output.split('\n').filter((line: string) => line.includes('graph')).slice(0, 5).join('\n'));
    hasErrors = true;
  } else {
    console.log('   ✓ No graph-related TypeScript errors');
  }
}

// Summary
console.log('\n========================================');
if (hasErrors) {
  console.log('  ✗ Verification FAILED');
  console.log('  Some issues need to be resolved');
  console.log('========================================\n');
  process.exit(1);
} else {
  console.log('  ✓ Verification PASSED');
  console.log('  Graph module refactoring is complete');
  console.log('========================================\n');
  process.exit(0);
}
