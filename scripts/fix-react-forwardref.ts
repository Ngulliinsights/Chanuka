#!/usr/bin/env tsx
/**
 * Fix React.forwardRef Issues
 * 
 * Adds React import to files that use React.forwardRef but don't import React
 */

import * as fs from 'fs';
import { glob } from 'glob';

async function fixFile(filePath: string): Promise<boolean> {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file uses React.forwardRef or other React APIs
  const usesReactAPI = /React\.(forwardRef|createElement|Component|memo|lazy|Suspense|Fragment|useState|useEffect|useContext|useRef|useMemo|useCallback)/g.test(content);
  
  if (!usesReactAPI) {
    return false;
  }
  
  // Check if React is already imported
  const hasReactImport = /^import\s+(?:React|\{[^}]*\})\s+from\s+['"]react['"]/m.test(content);
  
  if (hasReactImport) {
    return false;
  }
  
  // Find the first import statement
  const firstImportMatch = content.match(/^import\s+/m);
  
  if (!firstImportMatch) {
    // No imports, add at the top
    content = `import React from 'react';\n\n${content}`;
  } else {
    // Add before the first import
    const insertIndex = firstImportMatch.index!;
    content = content.slice(0, insertIndex) + `import React from 'react';\n` + content.slice(insertIndex);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Fixed: ${filePath}`);
  return true;
}

async function main() {
  console.log('🔧 Fixing React.forwardRef issues...\n');

  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  let fixedCount = 0;

  for (const file of files) {
    try {
      const fixed = await fixFile(file);
      if (fixed) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error);
    }
  }

  console.log(`\n✅ Complete! Fixed ${fixedCount} files`);
}

main().catch(console.error);
