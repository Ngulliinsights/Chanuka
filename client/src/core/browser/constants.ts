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
export const MINIMUM_VERSIONS = {
  chrome: 70, // Released Oct 2018
  firefox: 65, // Released Jan 2019
  safari: 12, // Released Sep 2018
  edge: 79, // Released Jan 2020 (Chromium-based)
  opera: 57, // Released Dec 2018
  samsung: 10, // Released Feb 2019
  ios: 12, // Released Sep 2018
  android: 70, // Based on Chrome version
  ie: 11, // Not truly supported, but included for detection
} as const;

/**
 * Features that are absolutely required for the application to function.
 * If any of these are missing, even with polyfills, the app may be unstable.
 */
export const CRITICAL_FEATURES: ReadonlyArray<keyof FeatureSet> = [
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
