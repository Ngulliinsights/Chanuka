/**
 * Script to fix graph module import paths after refactoring
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const graphDir = 'server/infrastructure/database/graph';

// Patterns to fix
const replacements = [
  // From sync/ directory
  { from: /from ['"]\.\/error-adapter-v2['"]/g, to: "from '../utils/error-adapter-v2'" },
  { from: /from ['"]\.\/retry-utils['"]/g, to: "from '../utils/retry-utils'" },
  { from: /from ['"]\.\/utils\/session-manager['"]/g, to: "from '../utils/session-manager'" },
  { from: /from ['"]\.\/utils\/query-builder['"]/g, to: "from '../utils/query-builder'" },
  { from: /from ['"]\.\/config\/graph-config['"]/g, to: "from '../config/graph-config'" },
  
  // From analytics/ directory
  { from: /from ['"]\.\/error-adapter-v2['"]/g, to: "from '../utils/error-adapter-v2'" },
  { from: /from ['"]\.\/retry-utils['"]/g, to: "from '../utils/retry-utils'" },
  { from: /from ['"]\.\/utils\/session-manager['"]/g, to: "from '../utils/session-manager'" },
  { from: /from ['"]\.\/utils\/query-builder['"]/g, to: "from '../utils/query-builder'" },
  { from: /from ['"]\.\/config\/graph-config['"]/g, to: "from '../config/graph-config'" },
  
  // From core/ directory (already mostly fixed, but check graphql-api and idempotency-ledger)
  { from: /from ['"]\.\/error-adapter-v2['"]/g, to: "from '../utils/error-adapter-v2'" },
  { from: /from ['"]\.\/retry-utils['"]/g, to: "from '../utils/retry-utils'" },
  { from: /from ['"]\.\/utils\/session-manager['"]/g, to: "from '../utils/session-manager'" },
  { from: /from ['"]\.\/utils\/query-builder['"]/g, to: "from '../utils/query-builder'" },
  { from: /from ['"]\.\/config\/graph-config['"]/g, to: "from '../config/graph-config'" },
];

function processFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const { from, to } of replacements) {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error);
    return false;
  }
}

function processDirectory(dir: string): number {
  let fixedCount = 0;
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      if (processFile(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('========================================');
console.log('  Fixing Graph Module Import Paths');
console.log('========================================\n');

const syncDir = join(graphDir, 'sync');
const analyticsDir = join(graphDir, 'analytics');
const coreDir = join(graphDir, 'core');

console.log('Processing sync/ directory...');
const syncFixed = processDirectory(syncDir);

console.log('\nProcessing analytics/ directory...');
const analyticsFixed = processDirectory(analyticsDir);

console.log('\nProcessing core/ directory...');
const coreFixed = processDirectory(coreDir);

const totalFixed = syncFixed + analyticsFixed + coreFixed;

console.log('\n========================================');
console.log(`  ✓ Fixed ${totalFixed} files`);
console.log('========================================\n');
