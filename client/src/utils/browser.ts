/**
 * Browser utilities
 */

export function isOnline(): boolean {
  return navigator.onLine;
}

export function getBrowserInfo(): { name: string; version: string } {
  return { name: 'Unknown', version: 'Unknown' };
}

export function supportsFeature(_feature: string): boolean {
  return true;
}
