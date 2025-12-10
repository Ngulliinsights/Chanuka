/**
 * Browser Compatibility Tests Utilities
 */

export function isBrowserSupported(): boolean {
  return true;
}

export function getPolyfillStatus(): Record<string, boolean> {
  return {
    Promise: typeof Promise !== 'undefined',
    Fetch: typeof fetch !== 'undefined',
    IntersectionObserver: typeof IntersectionObserver !== 'undefined',
    MutationObserver: typeof MutationObserver !== 'undefined',
  };
}

export function checkRequiredAPIs(): boolean {
  return !!Promise && !!fetch;
}
