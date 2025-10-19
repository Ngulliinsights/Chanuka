#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';

const filePath = 'server/infrastructure/monitoring/external-api-management.ts';

try {
  let content = await readFile(filePath, 'utf8');
  
  // Remove all createMetadata calls and fix the syntax
  content = content.replace(
    /, ApiResponseWrapper\.createMetadata\([^)]+\)/g,
    ''
  );
  
  // Fix res.json calls to use sendResponse
  content = content.replace(
    /res\.json\(({[^}]+})\);/g,
    'sendResponse(res, $1);'
  );
  
  // Fix return ApiSuccess calls
  content = content.replace(
    /return ApiSuccess\(res, ([^)]+)\);/g,
    'return sendResponse(res, $1);'
  );
  
  await writeFile(filePath, content, 'utf8');
  console.log('✅ Fixed remaining API response calls');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}