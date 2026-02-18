/**
 * Correlation ID Generator
 * 
 * Isomorphic UUID generation for correlation IDs.
 * Works in both Node.js and browser environments.
 */

/**
 * Generate a new correlation ID using the best available method
 * 
 * Priority:
 * 1. crypto.randomUUID() (Node.js 14.17+ / Modern browsers)
 * 2. Fallback to timestamp + random
 * 
 * @returns A unique correlation ID string
 */
export function generateCorrelationId(): string {
  // Try Node.js crypto module
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis) {
    const crypto = globalThis.crypto as any;
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  }

  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate if a string is a valid correlation ID format
 * 
 * @param id - The string to validate
 * @returns True if the string matches correlation ID format
 */
export function isValidCorrelationId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Fallback format (timestamp-random)
  const fallbackRegex = /^\d{13}-[a-z0-9]{13}$/;

  return uuidRegex.test(id) || fallbackRegex.test(id);
}
