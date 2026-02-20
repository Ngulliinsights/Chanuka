#!/usr/bin/env ts-node
/**
 * Migration script to replace databaseService.withFallback calls with try-catch patterns
 * 
 * This script:
 * 1. Finds all databaseService.withFallback calls
 * 2. Extracts the operation, fallback value, and operation name
 * 3. Replaces with try-catch pattern
 */

import * as fs from 'fs';
import * as path from 'path';

interface WithFallbackCall {
  file: string;
  lineNumber: number;
  fullMatch: string;
  operationCode: string;
  fallbackValue: string;
  operationName: string;
}

const filesToMigrate = [
  'server/features/users/domain/user-profile.ts',
  'server/features/community/comment.ts',
  'server/features/community/comment-voting.ts',
  'server/features/analytics/services/engagement.service.ts',
  'server/features/search/infrastructure/SearchIndexManager.ts',
  'server/infrastructure/adapters/drizzle-adapter.ts',
];

function extractWithFallbackCalls(content: string, filePath: string): WithFallbackCall[] {
  const calls: WithFallbackCall[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for databaseService.withFallback pattern
    if (line.includes('databaseService.withFallback')) {
      // Extract the full call (may span multiple lines)
      let fullCall = '';
      let depth = 0;
      let startLine = i;
      let foundStart = false;
      
      // Go back to find 'const result = await' or similar
      for (let j = i; j >= Math.max(0, i - 5); j--) {
        if (lines[j].includes('const') || lines[j].includes('=')) {
          startLine = j;
          break;
        }
      }
      
      // Extract the full call
      for (let j = startLine; j < lines.length; j++) {
        const currentLine = lines[j];
        fullCall += currentLine + '\n';
        
        // Count parentheses to find the end
        for (const char of currentLine) {
          if (char === '(') depth++;
          if (char === ')') depth--;
          if (depth > 0) foundStart = true;
        }
        
        // If we've closed all parentheses after opening some, we're done
        if (foundStart && depth === 0 && currentLine.includes(')')) {
          // Check if this line ends with semicolon or next line starts with something else
          if (currentLine.trim().endsWith(';') || 
              (j + 1 < lines.length && !lines[j + 1].trim().startsWith('.'))) {
            i = j;
            break;
          }
        }
      }
      
      calls.push({
        file: filePath,
        lineNumber: startLine + 1,
        fullMatch: fullCall,
        operationCode: '', // Will be extracted later
        fallbackValue: '',
        operationName: ''
      });
    }
    
    i++;
  }
  
  return calls;
}

function generateTryCatchReplacement(call: WithFallbackCall, componentName: string): string {
  // This is a simplified version - actual implementation would need more sophisticated parsing
  return `
  try {
    // Database operation
    const data = await db.select()...;
    return data;
  } catch (error) {
    logger.error('Operation failed', { 
      error, 
      component: '${componentName}',
      operation: '${call.operationName}'
    });
    return ${call.fallbackValue};
  }
  `.trim();
}

function migrateFile(filePath: string): void {
  console.log(`\n📄 Processing: ${filePath}`);
  
  const fullPath = path.join(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  const calls = extractWithFallbackCalls(content, filePath);
  
  if (calls.length === 0) {
    console.log(`  ✅ No databaseService.withFallback calls found`);
    return;
  }
  
  console.log(`  ⚠️  Found ${calls.length} databaseService.withFallback calls`);
  console.log(`  📝 Manual migration required - patterns are complex`);
  
  calls.forEach((call, index) => {
    console.log(`\n  Call #${index + 1} at line ${call.lineNumber}:`);
    console.log(`  ${call.fullMatch.substring(0, 100)}...`);
  });
}

function main() {
  console.log('🚀 DatabaseService Migration Script');
  console.log('=====================================\n');
  
  console.log('This script identifies databaseService.withFallback calls that need migration.');
  console.log('Due to the complexity of the patterns, manual migration is recommended.\n');
  
  let totalCalls = 0;
  
  for (const file of filesToMigrate) {
    try {
      migrateFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  console.log('\n=====================================');
  console.log('📊 Migration Summary');
  console.log('=====================================');
  console.log(`Files to migrate: ${filesToMigrate.length}`);
  console.log(`\nNext steps:`);
  console.log(`1. Review DATABASE_SERVICE_MIGRATION_GUIDE.md`);
  console.log(`2. Manually replace each withFallback call with try-catch`);
  console.log(`3. Test each file after migration`);
  console.log(`4. Run: npm run type-check`);
}

main();
