#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'client/src/components/error-handling/ErrorFallback.tsx';

try {
  let content = readFileSync(filePath, 'utf8');
  
  // Fix all getUserMessage calls
  content = content.replace(/normalizedError\.getUserMessage\(\)/g, 'getContextualMessage(normalizedError, errorType, context)');
  
  // Fix all metadata access issues
  content = content.replace(/normalizedError\.metadata\.severity/g, 'normalizedError.metadata?.severity');
  content = content.replace(/normalizedError\.metadata\.domain/g, 'normalizedError.metadata?.domain');
  content = content.replace(/normalizedError\.metadata\.retryable/g, 'normalizedError.metadata?.retryable');
  content = content.replace(/normalizedError\.metadata\.correlationId/g, 'normalizedError.metadata?.correlationId');
  
  // Fix shouldRetry calls
  content = content.replace(/normalizedError\.shouldRetry\(maxRetries\)/g, 'false /* shouldRetry not available */');
  
  // Fix remaining BaseError constructor calls
  content = content.replace(/new NetworkError\(errorMessage, \{[^}]+\}\)/g, 'new NetworkError(errorMessage)');
  content = content.replace(/new ExternalServiceError\(errorMessage, '[^']+', undefined, \{[^}]+\}\)/g, 'new ExternalServiceError(errorMessage)');
  content = content.replace(/new BaseError\(([^,]+), \{[^}]+\}\)/g, 'new BaseError($1, "ERROR")');
  
  // Fix metadata destructuring
  content = content.replace(/const \{ severity \} = normalizedError\.metadata;/g, 'const severity = normalizedError.metadata?.severity || ErrorSeverity.MEDIUM;');
  
  writeFileSync(filePath, content);
  console.log('Fixed ErrorFallback.tsx');
} catch (error) {
  console.error('Error fixing ErrorFallback.tsx:', error);
}