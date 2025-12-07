/**
 * Environment Detection Utilities
 * 
 * Detects runtime environment to safely access browser APIs.
 */

/**
 * Determines if code is running in a browser environment rather than Node.js or SSR.
 * This check prevents errors when accessing browser-only APIs during server-side rendering.
 */
export function isBrowserEnv(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof global === 'undefined'
  );
}

/**
 * Detects test environment to avoid operations that fail in test runners.
 * For example, WebGL context creation often fails in headless test environments.
 */
export function isTestEnv(): boolean {
  if (typeof process === 'undefined') {
    return false;
  }
  const nodeEnv = process.env?.NODE_ENV;
  return nodeEnv === 'test';
}
