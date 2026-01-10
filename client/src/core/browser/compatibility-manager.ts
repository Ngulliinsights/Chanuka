/**
 * Browser Compatibility Manager Module
 *
 * High-level orchestrator for browser detection, feature testing,
 * polyfill loading, and compatibility scoring.
 */

import { logger } from '@client/shared/utils/logger';

import { BrowserDetector } from './browser-detector';
import { CRITICAL_FEATURES } from './constants';
import { PolyfillManager } from './polyfill-manager';
import type { CompatibilityRecommendation, CompatibilityStatus, FeatureSet } from './types';

/**
 * High-level manager that orchestrates browser detection, feature testing,
 * polyfill loading, and compatibility scoring. This is the main entry point
 * for checking if a browser can run the application.
 */
export class BrowserCompatibilityManager {
  private static instance: BrowserCompatibilityManager;
  private status: CompatibilityStatus | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): BrowserCompatibilityManager {
    if (!BrowserCompatibilityManager.instance) {
      BrowserCompatibilityManager.instance = new BrowserCompatibilityManager();
    }
    return BrowserCompatibilityManager.instance;
  }

  /**
   * Initializes the compatibility system by detecting the browser, testing features,
   * loading polyfills, and generating a comprehensive status report.
   */
  async initialize(): Promise<CompatibilityStatus> {
    if (this.initialized && this.status) {
      return this.status;
    }

    try {
      const browserDetector = BrowserDetector.getInstance();
      const browserInfo = browserDetector.getBrowserInfo();
      const isSupported = browserDetector.isBrowserSupported();

      // Create initial status before polyfill loading
      this.status = {
        browserInfo,
        isSupported,
        warnings: browserInfo.warnings,
        polyfillsLoaded: false,
        polyfillsRequired: this.identifyRequiredPolyfills(browserInfo.features),
        recommendations: [],
        compatibilityScore: 0,
        shouldBlock: false,
        timestamp: Date.now(),
      };

      // Load polyfills for missing features
      await this.loadPolyfills();

      // Calculate final compatibility metrics
      this.status.compatibilityScore = this.calculateCompatibilityScore();
      this.status.recommendations = this.generateRecommendations();
      this.status.shouldBlock = this.determineIfShouldBlock();

      this.initialized = true;
      return this.status;
    } catch (error) {
      logger.error(
        'Failed to initialize browser compatibility manager',
        { component: 'BrowserCompatibilityManager' },
        error
      );
      throw error;
    }
  }

  private async loadPolyfills(): Promise<void> {
    if (!this.status) return;

    try {
      const polyfillManager = PolyfillManager.getInstance();
      await polyfillManager.loadAllPolyfills();
      this.status.polyfillsLoaded = true;
    } catch (error) {
      logger.error('Failed to load polyfills', { component: 'BrowserCompatibilityManager' }, error);
      this.status.polyfillsLoaded = false;
    }
  }

  /**
   * Analyzes the feature set to determine which polyfills are needed.
   */
  private identifyRequiredPolyfills(features: FeatureSet): string[] {
    const required: string[] = [];

    if (!features.fetch) required.push('fetch');
    if (!features.promises) required.push('promise');
    if (!features.intersectionObserver) required.push('intersection-observer');
    if (!features.localStorage) required.push('localStorage');
    if (!features.sessionStorage) required.push('sessionStorage');

    return required;
  }

  /**
   * Calculates a 0-100 compatibility score based on multiple factors:
   * - Browser version support (40 points)
   * - Critical feature availability (40 points)
   * - Polyfill status (20 points)
   */
  private calculateCompatibilityScore(): number {
    if (!this.status) return 0;

    let score = 0;

    // Browser version component: Full points if version meets requirements
    if (this.status.isSupported) {
      score += 40;
    } else {
      score += 10; // Partial credit for being a recognized browser
    }

    // Critical features component: Proportional to how many are supported
    const features = this.status.browserInfo.features;
    const criticalSupported = CRITICAL_FEATURES.filter(f => features[f]).length;
    score += (criticalSupported / CRITICAL_FEATURES.length) * 40;

    // Polyfill component: Best if no polyfills needed, good if loaded successfully
    if (this.status.polyfillsRequired.length === 0) {
      score += 20;
    } else if (this.status.polyfillsLoaded) {
      score += 16;
    } else {
      score += 4;
    }

    return Math.round(score);
  }

  /**
   * Generates structured recommendations sorted by severity.
   */
  private generateRecommendations(): CompatibilityRecommendation[] {
    if (!this.status) return [];

    const recommendations: CompatibilityRecommendation[] = [];
    const { browserInfo, compatibilityScore, polyfillsLoaded } = this.status;

    // Critical: Internet Explorer is completely unsupported
    if (browserInfo.name === 'ie') {
      recommendations.push({
        message:
          'Internet Explorer is no longer supported. Switch to Chrome, Firefox, Safari, or Edge immediately.',
        severity: 'critical',
        category: 'browser-version',
        actionable: true,
      });
    }

    // High: Outdated browser version
    if (!browserInfo.isSupported && browserInfo.name !== 'ie') {
      recommendations.push({
        message: `Your browser version is outdated. Update to the latest version for optimal compatibility.`,
        severity: 'high',
        category: 'browser-version',
        actionable: true,
      });
    }

    // Medium: Low compatibility score
    if (compatibilityScore < 70) {
      recommendations.push({
        message: `Browser compatibility score is ${compatibilityScore}%. Update your browser for better performance.`,
        severity: 'medium',
        category: 'browser-version',
        actionable: true,
      });
    }

    // High: Missing ES6 without polyfills
    if (!browserInfo.features.es6 && !polyfillsLoaded) {
      recommendations.push({
        message:
          'Modern JavaScript features are not supported. The application may not function correctly.',
        severity: 'high',
        category: 'feature-missing',
        actionable: false,
      });
    }

    // Low: Missing optional features
    if (!browserInfo.features.serviceWorkers) {
      recommendations.push({
        message:
          'Offline functionality is not available. Update your browser to enable working without internet.',
        severity: 'low',
        category: 'feature-missing',
        actionable: true,
      });
    }

    // Sort by severity: critical issues first
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Determines if the browser is so incompatible that we should prevent app access.
   */
  private determineIfShouldBlock(): boolean {
    if (!this.status) return false;

    if (this.status.browserInfo.name === 'ie') {
      return true;
    }

    if (this.status.compatibilityScore < 30) {
      return true;
    }

    return false;
  }

  getStatus(): CompatibilityStatus | null {
    return this.status;
  }

  shouldBlockBrowser(): boolean {
    return this.status?.shouldBlock ?? false;
  }

  /**
   * Returns all warnings that should be displayed to the user.
   */
  getWarningsToShow(): string[] {
    if (!this.status) return [];

    const warnings: string[] = [];
    warnings.push(...this.status.warnings);

    const criticalRecs = this.status.recommendations
      .filter(r => r.severity === 'critical' || r.severity === 'high')
      .map(r => r.message);
    warnings.push(...criticalRecs);

    return warnings;
  }
}

export const browserCompatibilityManager = BrowserCompatibilityManager.getInstance();
