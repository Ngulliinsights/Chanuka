/**
 * Browser Compatibility Manager - Refined Edition
 * 
 * Provides centralized orchestration of browser compatibility features including
 * detection, polyfill loading, compatibility testing, and user guidance.
 * 
 * This manager serves as the strategic layer above the detection utilities,
 * coordinating multiple compatibility systems and translating technical details
 * into actionable user guidance.
 */

import { 
  getBrowserInfo, 
  isBrowserSupported, 
  getBrowserWarnings,
  hasFeature,
  type BrowserInfo,
  type FeatureSet 
} from './browser-compatibility';
import { loadPolyfills, polyfillManager } from './polyfills';
import { runBrowserCompatibilityTests, type CompatibilityTestSuite } from './browser-compatibility-tests';
import { logger } from './logger';

/**
 * Configuration options for the compatibility manager's behavior
 */
export interface CompatibilityManagerConfig {
  /** Automatically load polyfills during initialization */
  autoLoadPolyfills: boolean;
  /** Run comprehensive compatibility tests during initialization */
  runTestsOnInit: boolean;
  /** Prevent application loading for unsupported browsers */
  blockUnsupportedBrowsers: boolean;
  /** Display warnings to users about compatibility issues */
  showWarnings: boolean;
  /** Log detailed compatibility information to console */
  logResults: boolean;
  /** Minimum compatibility score (0-100) required to avoid blocking */
  minimumCompatibilityScore: number;
}

/**
 * Severity levels for compatibility issues, used to prioritize user guidance
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Structured recommendation with context about why it's being made
 */
export interface CompatibilityRecommendation {
  message: string;
  severity: IssueSeverity;
  category: 'browser-version' | 'feature-missing' | 'test-failure' | 'polyfill' | 'performance';
  actionable: boolean;
}

/**
 * Complete status snapshot of browser compatibility at a point in time
 */
export interface CompatibilityStatus {
  browserInfo: BrowserInfo;
  isSupported: boolean;
  warnings: string[];
  polyfillsLoaded: boolean;
  polyfillsRequired: string[];
  testResults?: CompatibilityTestSuite;
  recommendations: CompatibilityRecommendation[];
  compatibilityScore: number;
  shouldBlock: boolean;
  timestamp: number;
}

/**
 * BrowserCompatibilityManager orchestrates all compatibility concerns for the application.
 * It delegates feature detection to the utilities layer while handling the strategic
 * decisions about how to respond to compatibility issues.
 * 
 * The manager follows these principles:
 * - Detection utilities provide facts; manager provides interpretation and strategy
 * - All user-facing guidance originates from the manager, not utilities
 * - Compatibility decisions consider context from multiple sources (detection, tests, polyfills)
 * - The manager maintains a complete audit trail of compatibility status
 */
export class BrowserCompatibilityManager {
  private static instance: BrowserCompatibilityManager;
  private config: CompatibilityManagerConfig;
  private status: CompatibilityStatus | null = null;
  private initialized = false;

  private constructor(config: Partial<CompatibilityManagerConfig> = {}) {
    // Establish sensible defaults that prioritize user experience over strict enforcement
    this.config = {
      autoLoadPolyfills: true,
      runTestsOnInit: false,
      blockUnsupportedBrowsers: false,
      showWarnings: true,
      logResults: true,
      minimumCompatibilityScore: 60,
      ...config
    };
  }

  static getInstance(config?: Partial<CompatibilityManagerConfig>): BrowserCompatibilityManager {
    if (!BrowserCompatibilityManager.instance) {
      BrowserCompatibilityManager.instance = new BrowserCompatibilityManager(config);
    }
    return BrowserCompatibilityManager.instance;
  }

  /**
   * Initialize the compatibility manager and establish complete compatibility status.
   * This is the primary entry point for applications using this system.
   * 
   * The initialization flow follows this sequence:
   * 1. Gather browser information from detection utilities
   * 2. Load polyfills if configured (adapting to missing features)
   * 3. Run compatibility tests if configured (validating actual behavior)
   * 4. Calculate comprehensive compatibility score
   * 5. Generate recommendations based on all gathered information
   * 6. Determine whether browser should be blocked
   * 7. Log results for debugging and monitoring
   */
  async initialize(): Promise<CompatibilityStatus> {
    // Return cached status for subsequent calls to avoid redundant initialization
    if (this.initialized && this.status) {
      return this.status;
    }

    try {
      // Phase 1: Gather foundational browser information
      const browserInfo = getBrowserInfo();
      const isSupported = isBrowserSupported();
      const warnings = getBrowserWarnings();

      // Phase 2: Initialize status with known information
      this.status = {
        browserInfo,
        isSupported,
        warnings,
        polyfillsLoaded: false,
        polyfillsRequired: this.identifyRequiredPolyfills(browserInfo.features),
        recommendations: [],
        compatibilityScore: 0,
        shouldBlock: false,
        timestamp: Date.now()
      };

      // Phase 3: Load polyfills if configured, adapting to browser capabilities
      if (this.config.autoLoadPolyfills) {
        await this.loadPolyfills();
      }

      // Phase 4: Run comprehensive tests if configured
      if (this.config.runTestsOnInit) {
        await this.runCompatibilityTests();
      }

      // Phase 5: Calculate overall compatibility score considering all factors
      this.status.compatibilityScore = this.calculateCompatibilityScore();

      // Phase 6: Generate strategic recommendations based on complete picture
      this.status.recommendations = this.generateRecommendations();

      // Phase 7: Determine if browser should be blocked based on policy
      this.status.shouldBlock = this.determineIfShouldBlock();

      // Phase 8: Log comprehensive results if configured
      if (this.config.logResults) {
        this.logCompatibilityStatus();
      }

      this.initialized = true;
      return this.status;

    } catch (error) {
      logger.error('Failed to initialize browser compatibility manager:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Load polyfills to compensate for missing browser features.
   * Updates status to reflect which polyfills were successfully loaded.
   */
  async loadPolyfills(): Promise<void> {
    if (!this.status) {
      throw new Error('Manager not initialized. Call initialize() first.');
    }

    try {
      await loadPolyfills();
      this.status.polyfillsLoaded = true;
      
      if (this.config.logResults) {
        logger.info('✅ Browser polyfills loaded successfully', { component: 'Chanuka' });
        
        // Provide detailed feedback about which polyfills loaded
        const polyfillStatus = polyfillManager.getPolyfillStatus();
        const loadedCount = Array.from(polyfillStatus.values()).filter(s => s.loaded).length;
        const failedCount = Array.from(polyfillStatus.values()).filter(s => s.error).length;
        
        console.log(`  📦 ${loadedCount} polyfills loaded successfully`);
        if (failedCount > 0) {
          console.warn(`  ⚠️  ${failedCount} polyfills failed to load`);
        }
        
        // Log individual polyfill status for debugging
        polyfillStatus.forEach((status, feature) => {
          if (status.loaded) {
            console.log(`    ✅ ${feature}`);
          } else if (status.error) {
            console.warn(`    ❌ ${feature}: ${status.error.message}`);
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load polyfills:', { component: 'Chanuka' }, error);
      this.status.polyfillsLoaded = false;
      throw error;
    }
  }

  /**
   * Run comprehensive compatibility tests to validate actual browser behavior.
   * Tests go beyond feature detection to verify features work as expected.
   */
  async runCompatibilityTests(): Promise<CompatibilityTestSuite> {
    if (!this.status) {
      throw new Error('Manager not initialized. Call initialize() first.');
    }

    try {
      const testResults = await runBrowserCompatibilityTests();
      this.status.testResults = testResults;

      if (this.config.logResults) {
        const passedCount = testResults.testResults.filter(t => t.passed).length;
        const failedCount = testResults.testResults.filter(t => !t.passed).length;
        const criticalCount = testResults.criticalIssues.length;

        console.log(`🧪 Compatibility tests completed`);
        console.log(`  Score: ${testResults.overallScore}%`);
        console.log(`  ✅ ${passedCount} passed`);
        console.log(`  ❌ ${failedCount} failed`);
        if (criticalCount > 0) {
          console.log(`  🚨 ${criticalCount} critical issues`);
        }
      }

      return testResults;
    } catch (error) {
      logger.error('Failed to run compatibility tests:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Identifies which polyfills are needed based on missing browser features.
   * This creates a bridge between detection (what's missing) and remediation (what to load).
   */
  private identifyRequiredPolyfills(features: FeatureSet): string[] {
    const required: string[] = [];

    // Map missing features to their corresponding polyfills
    if (!features.fetch) required.push('fetch');
    if (!features.promises) required.push('promise');
    if (!features.intersectionObserver) required.push('intersection-observer');
    if (!features.resizeObserver) required.push('resize-observer');
    if (!features.customElements) required.push('custom-elements');
    if (!features.shadowDOM) required.push('shadow-dom');

    return required;
  }

  /**
   * Calculate overall compatibility score (0-100) based on multiple factors.
   * This provides a single metric that combines feature support, test results,
   * and polyfill availability into an actionable score.
   */
  private calculateCompatibilityScore(): number {
    if (!this.status) return 0;

    let score = 0;
    let totalWeight = 0;

    // Factor 1: Browser version support (weight: 30)
    if (this.status.isSupported) {
      score += 30;
    } else {
      // Partial credit for browsers that are close to supported versions
      score += 10;
    }
    totalWeight += 30;

    // Factor 2: Feature availability (weight: 40)
    const features = this.status.browserInfo.features;
    const criticalFeatures = ['es6', 'fetch', 'promises', 'localStorage', 'modules'] as const;
    const criticalSupported = criticalFeatures.filter(f => features[f]).length;
    const criticalScore = (criticalSupported / criticalFeatures.length) * 25;
    
    const allFeatures = Object.values(features);
    const allSupported = allFeatures.filter(Boolean).length;
    const allScore = (allSupported / allFeatures.length) * 15;
    
    score += criticalScore + allScore;
    totalWeight += 40;

    // Factor 3: Test results if available (weight: 20)
    if (this.status.testResults) {
      score += (this.status.testResults.overallScore / 100) * 20;
      totalWeight += 20;
    }

    // Factor 4: Polyfill success (weight: 10)
    if (this.status.polyfillsRequired.length === 0) {
      // No polyfills needed means excellent native support
      score += 10;
    } else if (this.status.polyfillsLoaded) {
      // Polyfills loaded successfully, giving good support
      score += 8;
    } else {
      // Missing features without polyfills is problematic
      score += 2;
    }
    totalWeight += 10;

    // Normalize score to 0-100 range
    return Math.round((score / totalWeight) * 100);
  }

  /**
   * Generate comprehensive recommendations based on all available information.
   * This is where the manager's strategic intelligence lives - it considers
   * browser version, features, test results, and polyfills to provide
   * prioritized, actionable guidance.
   */
  private generateRecommendations(): CompatibilityRecommendation[] {
    if (!this.status) return [];

    const recommendations: CompatibilityRecommendation[] = [];
    const { browserInfo, testResults, compatibilityScore, polyfillsLoaded } = this.status;

    // Critical: Internet Explorer is completely unsupported
    if (browserInfo.name === 'ie') {
      recommendations.push({
        message: 'Internet Explorer is no longer supported. Switch to Chrome, Firefox, Safari, or Edge immediately for security and functionality.',
        severity: 'critical',
        category: 'browser-version',
        actionable: true
      });
    }

    // Critical: Legacy Edge should migrate to modern Edge
    if (browserInfo.name === 'edge-legacy') {
      recommendations.push({
        message: 'Legacy Edge has reached end of life. Update to the new Chromium-based Microsoft Edge for full compatibility and security.',
        severity: 'critical',
        category: 'browser-version',
        actionable: true
      });
    }

    // High: Browser version is below minimum requirements
    if (!browserInfo.isSupported && browserInfo.name !== 'ie' && browserInfo.name !== 'edge-legacy') {
      recommendations.push({
        message: `Your ${this.formatBrowserName(browserInfo.name)} version is outdated. Update to the latest version for optimal compatibility and security.`,
        severity: 'high',
        category: 'browser-version',
        actionable: true
      });
    }

    // Critical: Test results show critical failures
    if (testResults && testResults.criticalIssues.length > 0) {
      recommendations.push({
        message: `${testResults.criticalIssues.length} critical compatibility issues detected. Essential features may not function. Browser update required.`,
        severity: 'critical',
        category: 'test-failure',
        actionable: true
      });
    }

    // High: Test results show high-severity failures
    if (testResults) {
      const highIssues = testResults.testResults.filter(t => !t.passed && t.severity === 'high');
      if (highIssues.length > 0) {
        recommendations.push({
          message: `${highIssues.length} high-priority compatibility issues detected. Some features may be degraded. Consider updating your browser.`,
          severity: 'high',
          category: 'test-failure',
          actionable: true
        });
      }
    }

    // Medium: Overall compatibility score is concerning
    if (compatibilityScore < 70) {
      recommendations.push({
        message: `Browser compatibility score is ${compatibilityScore}%. Update your browser for better performance and reliability.`,
        severity: 'medium',
        category: 'browser-version',
        actionable: true
      });
    }

    // Medium: Critical features missing without polyfills
    if (!browserInfo.features.es6 && !polyfillsLoaded) {
      recommendations.push({
        message: 'Modern JavaScript features are not supported. The application may not function correctly.',
        severity: 'high',
        category: 'feature-missing',
        actionable: false
      });
    }

    if (!browserInfo.features.fetch && !polyfillsLoaded) {
      recommendations.push({
        message: 'Network request capabilities are limited. Some features may not work.',
        severity: 'high',
        category: 'feature-missing',
        actionable: false
      });
    }

    // Low: Nice-to-have features missing
    if (!browserInfo.features.serviceWorkers) {
      recommendations.push({
        message: 'Offline functionality is not available. Update your browser to enable working without internet connection.',
        severity: 'low',
        category: 'feature-missing',
        actionable: true
      });
    }

    if (!browserInfo.features.intersectionObserver) {
      recommendations.push({
        message: 'Advanced scroll performance features are unavailable. Update for smoother scrolling and better performance.',
        severity: 'low',
        category: 'performance',
        actionable: true
      });
    }

    if (!browserInfo.features.webGL) {
      recommendations.push({
        message: 'Hardware-accelerated graphics are not available. Charts and visualizations may render slowly.',
        severity: 'low',
        category: 'performance',
        actionable: false
      });
    }

    // Low: Polyfills failed to load
    if (this.status.polyfillsRequired.length > 0 && !polyfillsLoaded) {
      recommendations.push({
        message: 'Some compatibility features could not be loaded. Functionality may be limited.',
        severity: 'medium',
        category: 'polyfill',
        actionable: false
      });
    }

    // Sort by severity (critical -> high -> medium -> low)
    const severityOrder: Record<IssueSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Determine whether the browser should be blocked from using the application.
   * This decision considers configuration, browser identity, version support,
   * test results, and compatibility score.
   */
  private determineIfShouldBlock(): boolean {
    if (!this.status) return false;

    // Blocking is disabled in configuration - allow all browsers
    if (!this.config.blockUnsupportedBrowsers) {
      return false;
    }

    // Always block Internet Explorer regardless of other factors
    if (this.status.browserInfo.name === 'ie') {
      return true;
    }

    // Block if browser version is fundamentally unsupported
    if (!this.status.isSupported) {
      return true;
    }

    // Block if critical test failures exist
    if (this.status.testResults && this.status.testResults.criticalIssues.length > 0) {
      return true;
    }

    // Block if compatibility score is below configured minimum
    if (this.status.compatibilityScore < this.config.minimumCompatibilityScore) {
      return true;
    }

    return false;
  }

  /**
   * Get user-facing warnings that should be displayed.
   * Combines warnings from detection with strategic warnings from manager.
   */
  getWarningsToShow(): string[] {
    if (!this.status || !this.config.showWarnings) {
      return [];
    }

    const warnings: string[] = [];

    // Include warnings from browser detection
    warnings.push(...this.status.warnings);

    // Add high and critical recommendations as warnings
    const criticalRecs = this.status.recommendations
      .filter(r => r.severity === 'critical' || r.severity === 'high')
      .map(r => r.message);
    warnings.push(...criticalRecs);

    return warnings;
  }

  /**
   * Get current compatibility status snapshot
   */
  getStatus(): CompatibilityStatus | null {
    return this.status;
  }

  /**
   * Check if browser should be blocked based on current status
   */
  shouldBlockBrowser(): boolean {
    return this.status?.shouldBlock ?? false;
  }

  /**
   * Get recommendations filtered by severity
   */
  getRecommendationsBySeverity(severity: IssueSeverity): CompatibilityRecommendation[] {
    return this.status?.recommendations.filter(r => r.severity === severity) ?? [];
  }

  /**
   * Get actionable recommendations (those the user can act on)
   */
  getActionableRecommendations(): CompatibilityRecommendation[] {
    return this.status?.recommendations.filter(r => r.actionable) ?? [];
  }

  /**
   * Format browser name for user-facing messages
   */
  private formatBrowserName(name: string): string {
    const nameMap: Record<string, string> = {
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
      unknown: 'your browser'
    };
    
    return nameMap[name] || name;
  }

  /**
   * Log comprehensive compatibility status to console for debugging
   */
  private logCompatibilityStatus(): void {
    if (!this.status) return;

    console.group('🌐 Browser Compatibility Status');
    
    console.log(`Browser: ${this.formatBrowserName(this.status.browserInfo.name)} ${this.status.browserInfo.version}`);
    console.log(`Supported: ${this.status.isSupported ? '✅' : '❌'}`);
    console.log(`Compatibility Score: ${this.status.compatibilityScore}%`);
    console.log(`Should Block: ${this.status.shouldBlock ? '🚫 Yes' : '✅ No'}`);
    console.log(`Polyfills: ${this.status.polyfillsRequired.length} required, ${this.status.polyfillsLoaded ? '✅ loaded' : '❌ not loaded'}`);
    
    if (this.status.testResults) {
      console.log(`Test Results: ${this.status.testResults.overallScore}% passed`);
      console.log(`Critical Issues: ${this.status.testResults.criticalIssues.length}`);
    }

    if (this.status.warnings.length > 0) {
      console.group('⚠️  Warnings:');
      this.status.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    if (this.status.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      const critical = this.status.recommendations.filter(r => r.severity === 'critical');
      const high = this.status.recommendations.filter(r => r.severity === 'high');
      const medium = this.status.recommendations.filter(r => r.severity === 'medium');
      const low = this.status.recommendations.filter(r => r.severity === 'low');

      if (critical.length > 0) {
        console.group('🚨 Critical:');
        critical.forEach(r => console.error(r.message));
        console.groupEnd();
      }
      
      if (high.length > 0) {
        console.group('⚠️  High Priority:');
        high.forEach(r => console.warn(r.message));
        console.groupEnd();
      }
      
      if (medium.length > 0) {
        console.group('📌 Medium Priority:');
        medium.forEach(r => console.log(r.message));
        console.groupEnd();
      }
      
      if (low.length > 0) {
        console.group('ℹ️  Low Priority:');
        low.forEach(r => console.log(r.message));
        console.groupEnd();
      }
      
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Reset manager state (primarily for testing)
   */
  reset(): void {
    this.status = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const browserCompatibilityManager = BrowserCompatibilityManager.getInstance();

// Convenience functions that provide clean API surface
export async function initializeBrowserCompatibility(
  config?: Partial<CompatibilityManagerConfig>
): Promise<CompatibilityStatus> {
  const manager = BrowserCompatibilityManager.getInstance(config);
  return manager.initialize();
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

export function getCompatibilityRecommendations(): CompatibilityRecommendation[] {
  return browserCompatibilityManager.getStatus()?.recommendations ?? [];
}

export function getActionableRecommendations(): CompatibilityRecommendation[] {
  return browserCompatibilityManager.getActionableRecommendations();
}