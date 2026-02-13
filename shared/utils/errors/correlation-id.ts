/**
 * Correlation ID Utilities
 *
 * Utilities for generating and managing correlation IDs for error tracing.
 * Correlation IDs allow tracking errors across layer boundaries.
 */

import { randomUUID } from 'crypto';

// Store current correlation ID in context (for server-side)
let currentCorrelationId: string | null = null;

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  // Use crypto.randomUUID if available (Node.js 14.17+)
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  // Fallback for older environments or browser
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Set the current correlation ID
 * Used in middleware to set correlation ID for the current request
 */
export function setCurrentCorrelationId(correlationId: string): void {
  currentCorrelationId = correlationId;
}

/**
 * Get the current correlation ID
 * Returns null if no correlation ID is set
 */
export function getCurrentCorrelationId(): string | null {
  return currentCorrelationId;
}

/**
 * Clear the current correlation ID
 * Should be called at the end of request processing
 */
export function clearCurrentCorrelationId(): void {
  currentCorrelationId = null;
}

/**
 * Execute a function with a correlation ID context
 * Automatically sets and clears the correlation ID
 */
export async function withCorrelationId<T>(
  correlationId: string,
  fn: () => Promise<T>
): Promise<T> {
  setCurrentCorrelationId(correlationId);
  try {
    return await fn();
  } finally {
    clearCurrentCorrelationId();
  }
}
