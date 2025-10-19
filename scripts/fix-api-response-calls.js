#!/usr/bin/env node

/**
 * Script to fix ApiResponseWrapper.createMetadata calls
 */

import { readFile, writeFile } from 'fs/promises';

const filePath = 'server/infrastructure/monitoring/external-api-management.ts';

try {
  let content = await readFile(filePath, 'utf8');
  
  // Replace all ApiResponseWrapper.createMetadata calls with simple responses
  
  // Fix ApiError calls with createMetadata
  content = content.replace(
    /ApiError\(\s*res,\s*([^,]+),\s*(\d+),\s*ApiResponseWrapper\.createMetadata\([^)]+\)\s*\)/g,
    'sendError(res, $1, $2)'
  );
  
  // Fix ApiSuccess calls with createMetadata
  content = content.replace(
    /ApiSuccess\(\s*res,\s*([^,]+),\s*ApiResponseWrapper\.createMetadata\([^)]+\)\s*\)/g,
    'sendResponse(res, $1)'
  );
  
  // Fix res.json calls with createMetadata
  content = content.replace(
    /res\.json\(\s*({[^}]+}),\s*ApiResponseWrapper\.createMetadata\([^)]+\)\s*\)/g,
    'sendResponse(res, $1)'
  );
  
  await writeFile(filePath, content, 'utf8');
  console.log('✅ Fixed ApiResponseWrapper.createMetadata calls');
  
} catch (error) {
  console.error('❌ Error fixing API response calls:', error.message);
  process.exit(1);
}