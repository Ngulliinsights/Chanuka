/**
 * Test utility to adapt neverthrow Result to test-friendly format
 */

import { Result } from 'neverthrow';
import type { StandardizedError } from '@server/infrastructure/error-handling/types';

export interface TestResult<T> {
  success: boolean;
  data?: T;
  error?: StandardizedError;
}

/**
 * Converts neverthrow Result to test-friendly format with success/data/error properties
 */
export function toTestResult<T>(result: Result<T, StandardizedError>): TestResult<T> {
  if (result.isOk()) {
    return {
      success: true,
      data: result.value,
    };
  } else {
    return {
      success: false,
      error: result.error,
    };
  }
}

/**
 * Async version of toTestResult
 */
export async function toTestResultAsync<T>(
  resultPromise: Promise<Result<T, StandardizedError>>
): Promise<TestResult<T>> {
  const result = await resultPromise;
  return toTestResult(result);
}
