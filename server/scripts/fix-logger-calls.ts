#!/usr/bin/env tsx
/**
 * Fix logger calls to match Pino signature
 * Pino expects: logger.info(metadata, message) or logger.info(message)
 * Current code has: logger.info(message, metadata)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Fix {
  file: string;
  line: number;
  original: string;
  fixed: string;
}

const fixes: Fix[] = [];

async function fixLoggerCalls() {
  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    cwd: path.join(process.cwd()),
    ignore: ['node_modules/**', 'dist/**', 'scripts/fix-logger-calls.ts'],
    absolute: true
  });

  console.log(`Found ${files.length} TypeScript files to check`);

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      let modified = false;
      const lines = content.split('\n');
      
      // Pattern to match: logger.level("message", { metadata })
      // Should become: logger.level({ metadata }, "message")
      const loggerPattern = /(logger\.(info|warn|error|debug))\((['"`][^'"`]+['"`]),\s*(\{[^}]+\})\)/g;
      
      let newContent = content;
      let match;
      
      while ((match = loggerPattern.exec(content)) !== null) {
        const fullMatch = match[0];
        const loggerCall = match[1]; // logger.info
        const message = match[3]; // "message"
        const metadata = match[4]; // { ... }
        
        // Swap the parameters
        const fixed = `${loggerCall}(${metadata}, ${message})`;
        
        newContent = newContent.replace(fullMatch, fixed);
        modified = true;
        
        fixes.push({
          file: path.relative(process.cwd(), file),
          line: content.substring(0, match.index).split('\n').length,
          original: fullMatch,
          fixed
        });
      }
      
      if (modified) {
        fs.writeFileSync(file, newContent, 'utf-8');
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  console.log(`\n✅ Fixed ${fixes.length} logger calls`);
  
  if (fixes.length > 0) {
    console.log('\nSample fixes:');
    fixes.slice(0, 5).forEach(fix => {
      console.log(`\n${fix.file}:${fix.line}`);
      console.log(`  - ${fix.original}`);
      console.log(`  + ${fix.fixed}`);
    });
  }
}

fixLoggerCalls().catch(console.error);
