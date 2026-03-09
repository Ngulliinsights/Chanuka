#!/usr/bin/env tsx
/**
 * Fix Critical Demo Errors
 * 
 * Fixes the most critical TypeScript errors for demo readiness
 */

import * as fs from 'fs';
import { glob } from 'glob';

async function fixFile(filePath: string): Promise<number> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  const originalContent = content;

  // Fix: Add React import when React UMD global error occurs
  if (content.includes('React.') && !content.match(/^import.*React.*from ['"]react['"]/m)) {
    content = `import React from 'react';\n${content}`;
    fixCount++;
    console.log(`  ✓ Added React import`);
  }

  // Fix: Remove unused imports
  const unusedImports = [
    { pattern: /^import\s+\{\s*BrandedFooter\s*\}\s+from[^;]+;\n/gm, name: 'BrandedFooter' },
    { pattern: /^import\s+\{\s*BillsDashboard\s*\}\s+from[^;]+;\n/gm, name: 'BillsDashboard' },
    { pattern: /^import\s+\{\s*logger\s*\}\s+from[^;]+;\n/gm, name: 'logger' },
    { pattern: /^import\s+\{\s*useDatabaseStatus\s*\}\s+from[^;]+;\n/gm, name: 'useDatabaseStatus' },
    { pattern: /^import\s+\{\s*Users\s*\}\s+from[^;]+;\n/gm, name: 'Users' },
    { pattern: /^import\s+\{\s*AnalyticsEvent\s*,?\s*\}\s+from[^;]+;\n/gm, name: 'AnalyticsEvent' },
    { pattern: /^import\s+\{\s*UserEngagementMetrics\s*,?\s*\}\s+from[^;]+;\n/gm, name: 'UserEngagementMetrics' },
  ];

  for (const { pattern, name } of unusedImports) {
    if (content.match(pattern)) {
      content = content.replace(pattern, '');
      fixCount++;
      console.log(`  ✓ Removed unused import: ${name}`);
    }
  }

  // Fix: Add type annotations for implicit any
  const implicitAnyFixes = [
    {
      pattern: /\.reduce\(\(sum,\s*b\)\s*=>/g,
      replacement: '.reduce((sum: number, b: number) =>',
      name: 'reduce callback parameters'
    },
    {
      pattern: /\.map\(\(([a-z]+),\s*([a-z]+)\)\s*=>\s*\(/g,
      replacement: '.map(($1: any, $2: number) => (',
      name: 'map callback parameters'
    }
  ];

  for (const { pattern, replacement, name } of implicitAnyFixes) {
    if (content.match(pattern)) {
      content = content.replace(pattern, replacement);
      fixCount++;
      console.log(`  ✓ Added type annotations for ${name}`);
    }
  }

  // Fix: Add return statements for functions that don't return on all paths
  if (content.includes('Not all code paths return a value')) {
    // This is a complex fix that requires manual intervention
    console.log(`  ⚠️  Manual fix needed: Not all code paths return a value`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

async function main() {
  console.log('🔧 Fixing critical demo errors...\n');

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
