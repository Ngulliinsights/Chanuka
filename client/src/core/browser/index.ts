/**
 * Browser Compatibility Module - Main Entry Point
 *
 * Provides centralized access to all browser detection, feature testing,
 * and polyfill management functionality.
 *
 * This module consolidates browser-related utilities into a single, well-organized system:
 * - Detects browser type and version using user agent parsing
 * - Tests for modern web API support through feature detection
 * - Manages polyfills for missing features automatically
 * - Provides compatibility scoring and recommendations
 * - Handles graceful degradation for unsupported browsers
 */

import { logger } from '@client/lib/utils/logger';

import { BrowserDetector, browserDetector } from './browser-detector';
import { BrowserCompatibilityManager, browserCompatibilityManager } from './compatibility-manager';
import { isBrowserEnv, isTestEnv } from './environment';
import { FeatureDetector, featureDetector } from './feature-detector';
import { PolyfillManager, polyfillManager } from './polyfill-manager';
import type { BrowserInfo, FeatureSet, CompatibilityStatus } from './types';

// Export types
export type {
  BrowserInfo,
  CompatibilityRecommendation,
  CompatibilityStatus,
  FetchOptions,
  FetchResponse,
  FeatureSet,
  IntersectionObserverEntry,
  IntersectionObserverOptions,
  PolyfillStatus,
  StoragePolyfill,
} from './types';

// Export classes
export { BrowserCompatibilityManager, BrowserDetector, FeatureDetector, PolyfillManager };
export { browserCompatibilityManager, browserDetector, featureDetector, polyfillManager };

// Export constants
export { BROWSER_NAME_MAP, CRITICAL_FEATURES, MINIMUM_VERSIONS } from './constants';

// Export utilities
export { isBrowserEnv, isTestEnv } from './environment';

// ============================================================================
// CONVENIENCE FUNCTIONS - SIMPLIFIED API
// ============================================================================

/**
 * Quick access to browser information without needing to understand the singleton pattern.
 */
export function getBrowserInfo(): BrowserInfo {
  return browserDetector.getBrowserInfo();
}

export function isBrowserSupported(): boolean {
  return browserDetector.isBrowserSupported();
}

export function hasFeature(feature: keyof FeatureSet): boolean {
  return browserDetector.hasFeature(feature);
}

export function hasCriticalFeatures(): boolean {
  return featureDetector.hasCriticalFeatures();
}

/**
 * Initialize the entire compatibility system. Call this early in your application startup.
 */
export async function initializeBrowserCompatibility(): Promise<CompatibilityStatus> {
  return browserCompatibilityManager.initialize();
}

export function getBrowserCompatibilityStatus(): CompatibilityStatus | null {
  return browserCompatibilityManager.getStatus();
}

export function shouldBlockBrowser(): boolean {
  return browserCompatibilityManager.shouldBlockBrowser();
}

export function getCompatibilityWarnings(): string[] {
  return browserCompatibilityManager.getWarningsToShow();
}

export async function loadPolyfills(): Promise<void> {
  return polyfillManager.loadAllPolyfills();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Automatically initialize compatibility checking when this module loads in a browser.
 * This ensures that compatibility issues are detected as early as possible.
 *
 * We skip this in test environments to avoid false failures from headless browsers.
 */
if (isBrowserEnv() && !isTestEnv()) {
  initializeBrowserCompatibility().catch(error => {
    logger.error(
      'Failed to initialize browser compatibility',
      { component: 'BrowserUtils' },
      error
    );
  });
}

// ============================================================================
// DEFAULT EXPORT - EVERYTHING IN ONE OBJECT
// ============================================================================

export default {
  // Classes
  BrowserCompatibilityManager,
  BrowserDetector,
  FeatureDetector,
  PolyfillManager,

  // Singleton instances
  browserCompatibilityManager,
  browserDetector,
  featureDetector,
  polyfillManager,

  // Convenience functions
  getBrowserCompatibilityStatus,
  getBrowserInfo,
  getCompatibilityWarnings,
  hasCriticalFeatures,
  hasFeature,
  initializeBrowserCompatibility,
  isBrowserSupported,
  loadPolyfills,
  shouldBlockBrowser,
};
