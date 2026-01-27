#!/usr/bin/env node

/**
 * Comprehensive Type Import Migration Script
 * Migrates all imports from client/src/types/ to appropriate FSD locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const CLIENT_SRC = path.join(PROJECT_ROOT, 'client', 'src');

// Define comprehensive import mappings
const IMPORT_MAPPINGS = [
  // Feature-specific types
  {
    pattern: /from\s+['"](\.\.?\/)*types\/community['"];/g,
    replacement: "from '@client/features/community/types';",
    description: 'Community types'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*types\/expert['"];/g,
    replacement: "from '@client/features/users/types';",
    description: 'Expert types'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*types\/onboarding['"];/g,
    replacement: "from '@client/features/users/types';",
    description: 'Onboarding types'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*types\/conflict-of-interest['"];/g,
    replacement: "from '@client/features/analysis/types';",
    description: 'Conflict of interest types'
  },

  // Shared types
  {
    pattern: /from\s+['"](\.\.?\/)*types\/navigation['"];/g,
    replacement: "from '@client/lib/types/navigation';",
    description: 'Navigation types'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*types\/mobile['"];/g,
    replacement: "from '@client/lib/types/mobile';",
    description: 'Mobile types'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*types\/user-dashboard['"];/g,
    replacement: "from '@client/lib/types/user-dashboard';",
    description: 'User dashboard types'
  },

  // Core auth types
  {
    pattern: /from\s+['"](\.\.?\/)*types\/auth['"];/g,
    replacement: "from '@client/core/auth';",
    description: 'Auth types'
  },

  // Core realtime types
  {
    pattern: /from\s+['"](\.\.?\/)*types\/realtime['"];/g,
    replacement: "from '@client/core/realtime/types';",
    description: 'Realtime types'
  },

  // Generic/core types - keep in shared
  {
    pattern: /from\s+['"](\.\.?\/)*types\/core['"];/g,
    replacement: "from '@client/lib/types';",
    description: 'Core types'
  },

  // Fallback for @client/types path alias imports
  {
    pattern: /from\s+['"]@client\/types\/community['"];/g,
    replacement: "from '@client/features/community/types';",
    description: '@client/types/community alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/expert['"];/g,
    replacement: "from '@client/features/users/types';",
    description: '@client/types/expert alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/conflict-of-interest['"];/g,
    replacement: "from '@client/features/analysis/types';",
    description: '@client/types/conflict-of-interest alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/navigation['"];/g,
    replacement: "from '@client/lib/types/navigation';",
    description: '@client/types/navigation alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/mobile['"];/g,
    replacement: "from '@client/lib/types/mobile';",
    description: '@client/types/mobile alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/user-dashboard['"];/g,
    replacement: "from '@client/lib/types/user-dashboard';",
    description: '@client/types/user-dashboard alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/auth['"];/g,
    replacement: "from '@client/core/auth';",
    description: '@client/types/auth alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/realtime['"];/g,
    replacement: "from '@client/core/realtime/types';",
    description: '@client/types/realtime alias'
  },
  {
    pattern: /from\s+['"]@client\/types\/core['"];/g,
    replacement: "from '@client/lib/types';",
    description: '@client/types/core alias'
  },
];

function getAllTypeFiles() {
  const files = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            walk(fullPath);
          }
        } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Error walking ${dir}:`, err.message);
    }
  }
  walk(CLIENT_SRC);
  return files;
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let changeCount = 0;

    for (const mapping of IMPORT_MAPPINGS) {
      const matches = content.match(mapping.pattern);
      if (matches) {
        content = content.replace(mapping.pattern, mapping.replacement);
        changeCount += matches.length;
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { updated: true, changes: changeCount };
    }
    return { updated: false, changes: 0 };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return { updated: false, changes: 0, error: err.message };
  }
}

function main() {
  console.log('🚀 Starting type import migration...\n');

  const files = getAllTypeFiles();
  console.log(`Found ${files.length} TypeScript files to process\n`);

  let totalFiles = 0;
  let totalChanges = 0;
  const updatedFiles = [];

  for (const filePath of files) {
    const result = updateFile(filePath);
    if (result.updated) {
      totalFiles++;
      totalChanges += result.changes;
      const relPath = path.relative(CLIENT_SRC, filePath);
      updatedFiles.push({ file: relPath, changes: result.changes });
    }
  }

  console.log('\n✅ Migration Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   Files updated: ${totalFiles}`);
  console.log(`   Total replacements: ${totalChanges}\n`);

  if (updatedFiles.length > 0) {
    console.log('📝 Updated files:');
    updatedFiles.forEach(({ file, changes }) => {
      console.log(`   • ${file} (${changes} changes)`);
    });
  }

  return totalFiles > 0 ? 0 : 1;
}

main();
