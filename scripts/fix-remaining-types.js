#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const CLIENT_SRC = path.join(PROJECT_ROOT, 'client', 'src');

// Mapping: Find patterns and replace with new imports
const REPLACEMENTS = [
  // Generic @client/types imports
  {
    pattern: /from\s+['"]@client\/types['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Generic @client/types'
  },
  // Relative imports to types (in core/loading, etc)
  {
    pattern: /from\s+['"](\.\.?\/)*types['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Relative types imports'
  },
  // Security types
  {
    pattern: /from\s+['"].*types\/security-types['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Security types'
  },
  // Engagement analytics
  {
    pattern: /from\s+['"].*types\/engagement-analytics['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Engagement analytics types'
  },
  // Onboarding - still needed
  {
    pattern: /from\s+['"].*types\/onboarding['"]/g,
    replacement: "from '@client/features/users/types'",
    description: 'Onboarding types'
  },
  // Browser types
  {
    pattern: /from\s+['"].*types\/browser['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Browser types'
  },
  // Constitutional types
  {
    pattern: /from\s+['"].*types\/constitutional['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Constitutional types'
  },
  // Form types
  {
    pattern: /from\s+['"].*types\/form['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Form types'
  },
  // Error types
  {
    pattern: /from\s+['"].*types\/error['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Error types'
  },
  // Performance types
  {
    pattern: /from\s+['"].*types\/performance['"]/g,
    replacement: "from '@client/shared/types'",
    description: 'Performance types'
  },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let changeCount = 0;

    for (const { pattern, replacement } of REPLACEMENTS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changeCount += matches.length;
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { changed: true, count: changeCount };
    }
    return { changed: false, count: 0 };
  } catch (err) {
    console.error(`Error: ${filePath} - ${err.message}`);
    return { changed: false, count: 0, error: err.message };
  }
}

async function main() {
  console.log('🔄 Starting comprehensive type import migration...\n');

  // Find all files that still import from @client/types or legacy types
  const pattern = path.join(CLIENT_SRC, '**/*.{ts,tsx}');
  const files = globSync(pattern, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**']
  });

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  let totalUpdated = 0;
  let totalChanges = 0;
  const results = [];

  for (const filePath of files) {
    const result = processFile(filePath);
    if (result.changed) {
      totalUpdated++;
      totalChanges += result.count;
      const relPath = path.relative(CLIENT_SRC, filePath);
      results.push(relPath);
    }
  }

  console.log('✅ Migration complete!\n');
  console.log(`📊 Results:`);
  console.log(`   Files updated: ${totalUpdated}`);
  console.log(`   Total changes: ${totalChanges}\n`);

  if (results.length > 0 && results.length <= 20) {
    console.log('📝 Updated files:');
    results.forEach(file => console.log(`   • ${file}`));
  }
}

main().catch(console.error);
