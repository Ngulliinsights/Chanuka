#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  'server/features/community/comment.ts',
  'server/features/community/comment-voting.ts',
  'server/features/analytics/services/engagement.service.ts',
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Pattern 1: Simple withFallback with result.data return
  content = content.replace(
    /const result = await databaseService\.withFallback\(\s*async \(\) => \{([\s\S]*?)\},\s*([\s\S]*?),\s*[`'"]([^`'"]+)[`'"]\s*\);\s*return result\.data;/g,
    (match, operation, fallback, opName) => {
      return `try {${operation}
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'ServiceName',
        operation: '${opName}'
      });
      return ${fallback.trim()};
    }`;
    }
  );
  
  // Pattern 2: withFallback assigned to result variable
  content = content.replace(
    /const result = await databaseService\.withFallback\(\s*async \(\) => \{([\s\S]*?)\},\s*([\s\S]*?),\s*[`'"]([^`'"]+)[`'"]\s*\);/g,
    (match, operation, fallback, opName) => {
      return `let result;
    try {
      result = ${operation.trim()};
    } catch (error) {
      logger.error('Operation failed', {
        error,
        component: 'ServiceName',
        operation: '${opName}'
      });
      result = ${fallback.trim()};
    }`;
    }
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Fixed ${filePath}`);
});

console.log('\n✅ All files processed!');
