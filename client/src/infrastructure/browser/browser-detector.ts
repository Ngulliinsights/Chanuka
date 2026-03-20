/**
 * Browser Detection Module
 *
 * Singleton class for parsing user agents and detecting browser information.
 */

import { BROWSER_NAME_MAP, MINIMUM_VERSIONS } from './constants';
import { isBrowserEnv } from './environment';
import { FeatureDetector } from './feature-detector';
import type { BrowserInfo, FeatureSet } from './types';

/**
 * Singleton class for parsing user agents and detecting browser information.
 * This includes identifying the browser name, version, and whether it meets
 * minimum version requirements.
 */
export class BrowserDetector {
  private static instance: BrowserDetector;
  private cachedInfo: BrowserInfo | null = null;

  private constructor() {}

  static getInstance(): BrowserDetector {
    if (!BrowserDetector.instance) {
      BrowserDetector.instance = new BrowserDetector();
    }
    return BrowserDetector.instance;
  }

  /**
   * Parses the user agent string to extract browser name and version.
   * The order of checks matters because some browsers include others in their UA
   * (e.g., Edge includes Chrome, Chrome includes Safari).
   */
  private parseUserAgent(): { name: string; version: string; majorVersion: number } {
    if (!isBrowserEnv()) {
      return { name: 'unknown', version: '0.0', majorVersion: 0 };
    }

    const ua = navigator.userAgent;

    // Internet Explorer: Check for MSIE or Trident (IE11 uses Trident without MSIE)
    if (ua.includes('MSIE') || ua.includes('Trident/')) {
      const match = ua.match(/(?:MSIE |rv:)(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'ie',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Edge Legacy: Pre-Chromium Edge (before version 79)
    if (ua.includes('Edge/')) {
      const match = ua.match(/Edge\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge-legacy',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Modern Edge: Chromium-based Edge uses "Edg/" identifier
    if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Chrome: Must check after Edge since Edge includes "Chrome" in UA
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'chrome',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Firefox: Straightforward detection
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'firefox',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Safari: Must check after Chrome since Chrome includes "Safari" in UA
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'safari',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Opera: Modern Opera uses "OPR/" identifier
    if (ua.includes('OPR/')) {
      const match = ua.match(/OPR\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'opera',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Samsung Internet: Popular mobile browser
    if (ua.includes('SamsungBrowser')) {
      const match = ua.match(/SamsungBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'samsung',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // iOS Safari: Uses iOS version rather than Safari version
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      const match = ua.match(/OS (\d+)_(\d+)/);
      if (match) {
        return {
          name: 'ios',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10),
        };
      }
    }

    // Android: Detect Chrome on Android devices
    if (ua.includes('Android')) {
      const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (chromeMatch) {
        return {
          name: 'android',
          version: `${chromeMatch[1]}.${chromeMatch[2]}`,
          majorVersion: parseInt(chromeMatch[1] || '0', 10),
        };
      }
    }

    return { name: 'unknown', version: '0.0', majorVersion: 0 };
  }

  /**
   * Compares browser version against minimum requirements.
   */
  private checkBrowserSupport(name: string, majorVersion: number): boolean {
    const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
    return minVersion !== undefined && majorVersion >= minVersion;
  }

  /**
   * Generates user-facing warning messages based on missing features.
   * These are critical issues that will likely break the application.
   */
  private generateWarnings(features: FeatureSet, browserName: string): string[] {
    const warnings: string[] = [];

    if (!features.es6) {
      warnings.push('ES6 support is missing. Core application features will not function.');
    }

    if (!features.fetch) {
      warnings.push('Fetch API is unavailable. Network operations will fail.');
    }

    if (!features.promises) {
      warnings.push('Promise support is missing. Asynchronous operations cannot execute.');
    }

    if (!features.localStorage) {
      warnings.push('Local storage is unavailable. Settings and preferences cannot be saved.');
    }

    if (browserName === 'ie') {
      warnings.push('Internet Explorer is no longer supported. Please switch to a modern browser.');
    }

    return warnings;
  }

  /**
   * Generates actionable recommendations for improving compatibility.
   * These are softer suggestions for optional features or performance improvements.
   */
  private generateRecommendations(
    features: FeatureSet,
    browserName: string,
    majorVersion: number
  ): string[] {
    const recommendations: string[] = [];

    const minVersion = MINIMUM_VERSIONS[browserName as keyof typeof MINIMUM_VERSIONS];
    if (minVersion !== undefined && majorVersion < minVersion) {
      recommendations.push(
        `Please update ${this.formatBrowserName(browserName)} to version ${minVersion} or higher for optimal performance.`
      );
    }

    if (!features.intersectionObserver) {
      recommendations.push(
        'Update your browser to enable improved lazy loading and scroll performance.'
      );
    }

    if (!features.webGL) {
      recommendations.push(
        'WebGL support would significantly improve chart and visualization rendering.'
      );
    }

    if (browserName === 'unknown' || browserName === 'ie' || browserName === 'edge-legacy') {
      recommendations.push(
        'For the best experience, we recommend Chrome 70+, Firefox 65+, Safari 12+, or Edge 79+.'
      );
    }

    return recommendations;
  }

  /**
   * Converts internal browser identifiers to user-friendly names.
   */
  private formatBrowserName(name: string): string {
    return BROWSER_NAME_MAP[name] || name;
  }

  /**
   * Returns complete browser information including all detected capabilities.
   * Results are cached for performance.
   */
  getBrowserInfo(): BrowserInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const { name, version, majorVersion } = this.parseUserAgent();
    const featureDetector = FeatureDetector.getInstance();
    const features = featureDetector.getAllFeatures();
    const isSupported = this.checkBrowserSupport(name, majorVersion);
    const warnings = this.generateWarnings(features, name);
    const recommendations = this.generateRecommendations(features, name, majorVersion);

    this.cachedInfo = {
      name,
      version,
      majorVersion,
      isSupported,
      features,
      warnings,
      recommendations,
    };

    return this.cachedInfo;
  }

  isBrowserSupported(): boolean {
    return this.getBrowserInfo().isSupported;
  }

  hasFeature(feature: keyof FeatureSet): boolean {
    return this.getBrowserInfo().features[feature];
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}

export const browserDetector = BrowserDetector.getInstance();
