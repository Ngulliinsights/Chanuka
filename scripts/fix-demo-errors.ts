#!/usr/bin/env tsx
/**
 * Fix Demo-Ready Errors
 * 
 * Systematically fixes TypeScript errors to make core features demo-ready
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Fix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const fixes: Fix[] = [
  // Remove unused React imports (React 17+ JSX transform)
  {
    pattern: /^import React,\s*\{/gm,
    replacement: 'import {',
    description: 'Remove unused React import'
  },
  {
    pattern: /^import React from ['"]react['"];\n/gm,
    replacement: '',
    description: 'Remove standalone unused React import'
  },
  // Fix lucide-react named imports that should be default imports
  {
    pattern: /import\s*\{\s*Play\s*\}\s*from\s*['"]lucide-react['"]/g,
    replacement: "import Play from 'lucide-react/dist/esm/icons/play'",
    description: 'Fix Play icon import from lucide-react'
  },
  {
    pattern: /import\s*\{\s*Brain\s*\}\s*from\s*['"]lucide-react['"]/g,
    replacement: "import Brain from 'lucide-react/dist/esm/icons/brain'",
    description: 'Fix Brain icon import from lucide-react'
  },
];

async function fixFile(filePath: string): Promise<number> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;

  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      content = content.replace(fix.pattern, fix.replacement);
      fixCount += matches.length;
      console.log(`  ✓ ${fix.description} (${matches.length}x)`);
    }
  }

  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

async function main() {
  console.log('🔧 Fixing demo-ready errors...\n');

  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  let totalFixes = 0;
  let filesFixed = 0;

  for (const file of files) {
    const fixes = await fixFile(file);
    if (fixes > 0) {
      filesFixed++;
      totalFixes += fixes;
      console.log(`📝 ${file}: ${fixes} fixes\n`);
    }
  }

  console.log(`\n✅ Complete! Fixed ${totalFixes} issues in ${filesFixed} files`);
}

main().catch(console.error);
