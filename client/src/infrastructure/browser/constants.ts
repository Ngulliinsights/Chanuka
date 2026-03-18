/**
 * Browser Compatibility Constants
 *
 * Minimum browser versions, critical features, and browser name mappings.
 */

import type { FeatureSet } from './types';

/**
 * Minimum supported browser versions. These thresholds ensure that critical
 * features like ES6, Fetch API, and modern CSS are available natively.
 */
export /**
 * Features that are absolutely required for the application to function.
 * If any of these are missing, even with polyfills, the app may be unstable.
 */
const CRITICAL_FEATURES: ReadonlyArray<keyof FeatureSet> = [
  'es6',
  'fetch',
  'promises',
  'localStorage',
  'modules',
] as const;

/**
 * Maps internal browser identifiers to user-friendly display names.
 */
export const BROWSER_NAME_MAP: Record<string, string> = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  safari: 'Safari',
  edge: 'Edge',
  'edge-legacy': 'Edge Legacy',
  opera: 'Opera',
  samsung: 'Samsung Internet',
  ios: 'iOS Safari',
  android: 'Android Chrome',
  ie: 'Internet Explorer',
  unknown: 'your browser',
};
