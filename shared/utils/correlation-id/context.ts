/**
 * Correlation ID Context Management
 * 
 * Manages correlation ID context for tracking operations across layers.
 * Uses AsyncLocalStorage in Node.js for proper async context isolation.
 */

import { generateCorrelationId } from './generator';

// Store current correlation ID in context
let currentCorrelationId: string | null = null;

// AsyncLocalStorage for Node.js (if available)
let asyncLocalStorage: any = null;

// Initialize AsyncLocalStorage if in Node.js environment
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    const { AsyncLocalStorage } = require('async_hooks');
    asyncLocalStorage = new AsyncLocalStorage();
  } catch {
    // AsyncLocalStorage not available, fall back to simple storage
  }
}

/**
 * Set the current correlation ID
 * 
 * @param correlationId - The correlation ID to set
 */
export function setCurrentCorrelationId(correlationId: string): void {
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore() || {};
    store.correlationId = correlationId;
  } else {
    currentCorrelationId = correlationId;
  }
}

/**
 * Get the current correlation ID
 * 
 * @returns The current correlation ID or null if not set
 */
export function getCurrentCorrelationId(): string | null {
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore();
    return store?.correlationId || null;
  }
  return currentCorrelationId;
}

/**
 * Clear the current correlation ID
 */
export function clearCurrentCorrelationId(): void {
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      delete store.correlationId;
    }
  } else {
    currentCorrelationId = null;
  }
}

/**
 * Execute a function with a correlation ID context
 * 
 * Automatically sets and clears the correlation ID.
 * Uses AsyncLocalStorage for proper async isolation in Node.js.
 * 
 * @param correlationId - The correlation ID to use
 * @param fn - The function to execute
 * @returns The result of the function
 */
export async function withCorrelationId<T>(
  correlationId: string,
  fn: () => Promise<T>
): Promise<T> {
  if (asyncLocalStorage) {
    return asyncLocalStorage.run({ correlationId }, fn);
  }

  // Fallback for environments without AsyncLocalStorage
  setCurrentCorrelationId(correlationId);
  try {
    return await fn();
  } finally {
    clearCurrentCorrelationId();
  }
}

/**
 * Execute a function with a new correlation ID
 * 
 * Generates a new correlation ID and executes the function with it.
 * 
 * @param fn - The function to execute
 * @returns The result of the function
 */
export async function withNewCorrelationId<T>(
  fn: () => Promise<T>
): Promise<T> {
  const correlationId = generateCorrelationId();
  return withCorrelationId(correlationId, fn);
}

/**
 * Get or create a correlation ID
 * 
 * Returns the current correlation ID if set, otherwise generates a new one.
 * 
 * @returns A correlation ID
 */
export function getOrCreateCorrelationId(): string {
  return getCurrentCorrelationId() || generateCorrelationId();
}
