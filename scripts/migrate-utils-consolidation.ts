#!/usr/bin/env node
/**
 * Utils Consolidation Migration Script
 * 
 * Automatically updates imports to use the new consolidated utility structure.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ImportReplacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const replacements: ImportReplacement[] = [
  // Correlation ID migrations
  {
    pattern: /from ['"]@?\.\.\/\.\.\/shared\/utils\/errors\/correlation-id['"]/g,
    replacement: "from '@shared/utils/correlation-id'",
    description: 'Correlation ID from shared/utils/errors',
  },
  {
    pattern: /from ['"]@?\.\.\/\.\.\/server\/utils\/correlation-id['"]/g,
    replacement: "from '@shared/utils/correlation-id'",
    description: 'Correlation ID from server/utils',
  },
  {
    pattern: /from ['"]@server\/utils\/correlation-id['"]/g,
    replacement: "from '@shared/utils/correlation-id'",
    description: 'Correlation ID from @server/utils',
  },

  // Validation migrations
  {
    pattern: /from ['"]@server\/utils\/validation['"]/g,
    replacement: "from '@shared/validation'",
    description: 'Validation from server/utils',
  },
  {
    pattern: /from ['"]@?\.\.\/\.\.\/server\/utils\/validation['"]/g,
    replacement: "from '@shared/validation'",
    description: 'Validation from server/utils (relative)',
  },

  // Error migrations
  {
    pattern: /from ['"]@server\/utils\/errors['"]/g,
    replacement: "from '@shared/utils/errors'",
    description: 'Errors from server/utils',
  },
  {
    pattern: /from ['"]@?\.\.\/\.\.\/server\/utils\/errors['"]/g,
    replacement: "from '@shared/utils/errors'",
    description: 'Errors from server/utils (relative)',
  },
];

function walkDirectory(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;

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

function migrateFile(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  let changesCount = 0;

  for (const { pattern, replacement, description } of replacements) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changesCount += matches.length;
      console.log(`  ✓ ${description}: ${matches.length} replacement(s)`);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }

  return changesCount;
}

async function main() {
  console.log('🔧 Utils Consolidation Migration\n');
  
  const projectRoot = process.cwd();
  const targetDirs = [
    path.join(projectRoot, 'server'),
    path.join(projectRoot, 'client'),
    path.join(projectRoot, 'shared'),
  ];

  let totalFiles = 0;
  let totalChanges = 0;
  const modifiedFiles: string[] = [];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    console.log(`📁 Scanning ${path.relative(projectRoot, dir)}...`);
    const files = walkDirectory(dir);

    for (const file of files) {
      const changes = migrateFile(file);
      if (changes > 0) {
        modifiedFiles.push(path.relative(projectRoot, file));
        totalChanges += changes;
        totalFiles++;
      }
    }
  }

  console.log(`\n✅ Migration complete!\n`);
  console.log(`📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`   Total changes: ${totalChanges}`);

  if (modifiedFiles.length > 0) {
    console.log(`\n📝 Modified files:`);
    modifiedFiles.forEach(f => console.log(`   - ${f}`));
  }

  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Run TypeScript compiler: npx tsc --noEmit`);
  console.log(`   2. Run tests: npm test`);
  console.log(`   3. Review changes: git diff`);
}

main().catch(console.error);
