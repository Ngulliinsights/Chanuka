/**
 * Error Classifier (REFACTORED)
 * IMPROVEMENTS: Better classification, type safety
 */
import { GraphErrorCode } from './error-adapter-v2';

export function classifyError(error: Error): GraphErrorCode {
  const message = error.message.toLowerCase();
  
  // Connection errors
  if (message.includes('connection') || message.includes('econnrefused')) {
    return GraphErrorCode.CONNECTION_FAILED;
  }
  
  if (message.includes('timeout') || message.includes('etimedout')) {
    return GraphErrorCode.CONNECTION_TIMEOUT;
  }
  
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return GraphErrorCode.AUTHENTICATION_FAILED;
  }
  
  // Query errors
  if (message.includes('syntax') || message.includes('invalid query')) {
    return GraphErrorCode.INVALID_QUERY;
  }
  
  // Data errors
  if (message.includes('not found')) {
    return GraphErrorCode.NOT_FOUND;
  }
  
  if (message.includes('duplicate') || message.includes('already exists')) {
    return GraphErrorCode.DUPLICATE_ENTITY;
  }
  
  // Transaction errors
  if (message.includes('deadlock')) {
    return GraphErrorCode.DEADLOCK_DETECTED;
  }
  
  return GraphErrorCode.UNKNOWN_ERROR;
}

export function isRetryableError(error: Error): boolean {
  const retryableCodes = [
    GraphErrorCode.CONNECTION_TIMEOUT,
    GraphErrorCode.QUERY_TIMEOUT,
    GraphErrorCode.DEADLOCK_DETECTED,
  ];
  
  const code = classifyError(error);
  return retryableCodes.includes(code);
}

export default {
  classifyError,
  isRetryableError,
};
