/**
 * Browser Compatibility Manager
 * 
 * This module provides a centralized manager for all browser compatibility
 * features including detection, testing, polyfills, and fallbacks.
 */

import { getBrowserInfo, isBrowserSupported, getBrowserWarnings } from './browser-compatibility';
import { loadPolyfills, polyfillManager } from './polyfills';
import { runBrowserCompatibilityTests, CompatibilityTestSuite } from './browser-compatibility-tests';
import { logger } from '@shared/utils/logger';

export interface CompatibilityManagerConfig {
  autoLoadPolyfills: boolean;
  runTestsOnInit: boolean;
  blockUnsupportedBrowsers: boolean;
  showWarnings: boolean;
  logResults: boolean;
}

export interface CompatibilityStatus {
  browserInfo: ReturnType<typeof getBrowserInfo>;
  isSupported: boolean;
  warnings: string[];
  polyfillsLoaded: boolean;
  testResults?: CompatibilityTestSuite;
  recommendations: string[];
  workarounds: string[];
}

export class BrowserCompatibilityManager {
  private static instance: BrowserCompatibilityManager;
  private config: CompatibilityManagerConfig;
  private status: CompatibilityStatus | null = null;
  private initialized = false;

  private constructor(config: Partial<CompatibilityManagerConfig> = {}) {
    this.config = {
      autoLoadPolyfills: true,
      runTestsOnInit: false,
      blockUnsupportedBrowsers: false,
      showWarnings: true,
      logResults: true,
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
   * Initialize the compatibility manager
   */
  async initialize(): Promise<CompatibilityStatus> {
    if (this.initialized && this.status) {
      return this.status;
    }

    try {
      // Get browser information
      const browserInfo = getBrowserInfo();
      const isSupported = isBrowserSupported();
      const warnings = getBrowserWarnings();

      // Initialize status
      this.status = {
        browserInfo,
        isSupported,
        warnings,
        polyfillsLoaded: false,
        recommendations: [],
        workarounds: []
      };

      // Load polyfills if configured
      if (this.config.autoLoadPolyfills) {
        await this.loadPolyfills();
      }

      // Run tests if configured
      if (this.config.runTestsOnInit) {
        await this.runCompatibilityTests();
      }

      // Generate recommendations and workarounds
      this.generateRecommendations();
      this.generateWorkarounds();

      // Log results if configured
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
   * Load polyfills for browser compatibility
   */
  async loadPolyfills(): Promise<void> {
    if (!this.status) {
      throw new Error('Manager not initialized');
    }

    try {
      await loadPolyfills();
      this.status.polyfillsLoaded = true;
      
      if (this.config.logResults) {
        logger.info('✅ Browser polyfills loaded successfully', { component: 'Chanuka' });
        
        // Log polyfill status
        const polyfillStatus = polyfillManager.getPolyfillStatus();
        polyfillStatus.forEach((status, feature) => {
          if (status.loaded) {
            console.log(`  ✅ ${feature} polyfill loaded`);
          } else if (status.error) {
            console.warn(`  ❌ ${feature} polyfill failed:`, status.error.message);
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
   * Run comprehensive compatibility tests
   */
  async runCompatibilityTests(): Promise<CompatibilityTestSuite> {
    if (!this.status) {
      throw new Error('Manager not initialized');
    }

    try {
      const testResults = await runBrowserCompatibilityTests();
      this.status.testResults = testResults;

      if (this.config.logResults) {
        console.log(`🧪 Compatibility tests completed: ${testResults.overallScore}% score`);
        console.log(`  ✅ ${testResults.testResults.filter(t => t.passed).length} tests passed`);
        console.log(`  ❌ ${testResults.testResults.filter(t => !t.passed).length} tests failed`);
        console.log(`  🚨 ${testResults.criticalIssues.length} critical issues`);
      }

      return testResults;
    } catch (error) {
      logger.error('Failed to run compatibility tests:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Check if browser should be blocked
   */
  shouldBlockBrowser(): boolean {
    if (!this.status) {
      return false;
    }

    if (!this.config.blockUnsupportedBrowsers) {
      return false;
    }

    // Block Internet Explorer
    if (this.status.browserInfo.name === 'ie') {
      return true;
    }

    // Block very old browsers
    if (!this.status.isSupported) {
      return true;
    }

    // Block if critical issues exist
    if (this.status.testResults && this.status.testResults.criticalIssues.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get compatibility warnings to show user
   */
  getWarningsToShow(): string[] {
    if (!this.status || !this.config.showWarnings) {
      return [];
    }

    const warnings: string[] = [];

    // Browser warnings
    warnings.push(...this.status.warnings);

    // Test result warnings
    if (this.status.testResults) {
      const failedTests = this.status.testResults.testResults.filter(t => !t.passed);
      const highPriorityFailures = failedTests.filter(t => t.severity === 'high' || t.severity === 'critical');
      
      if (highPriorityFailures.length > 0) {
        warnings.push(`${highPriorityFailures.length} high-priority compatibility issues detected`);
      }
    }

    // Polyfill warnings
    if (!this.status.polyfillsLoaded) {
      warnings.push('Some browser polyfills failed to load');
    }

    return warnings;
  }

  /**
   * Get current compatibility status
   */
  getStatus(): CompatibilityStatus | null {
    return this.status;
  }

  /**
   * Generate recommendations based on browser and test results
   */
  private generateRecommendations(): void {
    if (!this.status) return;

    const recommendations: string[] = [];
    const { browserInfo, testResults } = this.status;

    // Browser-specific recommendations
    if (browserInfo.name === 'ie') {
      recommendations.push('Switch to a modern browser like Chrome, Firefox, Safari, or Edge for better security and performance.');
    } else if (browserInfo.name === 'edge-legacy') {
      recommendations.push('Update to the new Chromium-based Microsoft Edge for better compatibility.');
    } else if (!browserInfo.isSupported) {
      recommendations.push(`Update your ${browserInfo.name} browser to a newer version for better compatibility.`);
    }

    // Test result recommendations
    if (testResults) {
      if (testResults.criticalIssues.length > 0) {
        recommendations.push('Critical compatibility issues detected. Update your browser immediately.');
      }
      
      const highIssues = testResults.testResults.filter(t => !t.passed && t.severity === 'high');
      if (highIssues.length > 0) {
        recommendations.push('High-priority compatibility issues detected. Consider updating your browser.');
      }

      if (testResults.overallScore < 70) {
        recommendations.push('Your browser has limited compatibility. Update to a newer version for the best experience.');
      }
    }

    // Feature-specific recommendations
    if (!browserInfo.features.serviceWorkers) {
      recommendations.push('Update your browser to enable offline functionality.');
    }

    if (!browserInfo.features.intersectionObserver) {
      recommendations.push('Update your browser for better scroll performance.');
    }

    this.status.recommendations = recommendations;
  }

  /**
   * Generate browser-specific workarounds
   */
  private generateWorkarounds(): void {
    if (!this.status) return;

    const workarounds: string[] = [];
    const { browserInfo } = this.status;

    switch (browserInfo.name) {
      case 'safari':
        if (browserInfo.majorVersion < 14) {
          workarounds.push('Some modern features may not work correctly in older Safari versions.');
          workarounds.push('Consider updating to Safari 14 or later for full compatibility.');
        }
        break;

      case 'firefox':
        if (browserInfo.majorVersion < 70) {
          workarounds.push('Performance may be reduced in older Firefox versions.');
          workarounds.push('Update to Firefox 70 or later for optimal performance.');
        }
        break;

      case 'chrome':
        if (browserInfo.majorVersion < 80) {
          workarounds.push('Some security features may be limited in older Chrome versions.');
          workarounds.push('Update to Chrome 80 or later for enhanced security.');
        }
        break;

      case 'ie':
        workarounds.push('Internet Explorer is not supported and will not work correctly.');
        workarounds.push('Please switch to a modern browser immediately.');
        break;

      case 'edge-legacy':
        workarounds.push('Legacy Edge has limited support for modern web features.');
        workarounds.push('Update to the new Chromium-based Edge for full compatibility.');
        break;
    }

    // Mobile-specific workarounds
    if (browserInfo.name === 'ios' || browserInfo.name === 'android') {
      workarounds.push('Some features may be optimized for desktop browsers.');
      workarounds.push('For the best experience, consider using a desktop browser when possible.');
    }

    this.status.workarounds = workarounds;
  }

  /**
   * Log compatibility status to console
   */
  private logCompatibilityStatus(): void {
    if (!this.status) return;

    console.group('🌐 Browser Compatibility Status');
    
    console.log(`Browser: ${this.status.browserInfo.name} ${this.status.browserInfo.version}`);
    console.log(`Supported: ${this.status.isSupported ? '✅' : '❌'}`);
    console.log(`Polyfills Loaded: ${this.status.polyfillsLoaded ? '✅' : '❌'}`);
    
    if (this.status.testResults) {
      console.log(`Compatibility Score: ${this.status.testResults.overallScore}%`);
      console.log(`Critical Issues: ${this.status.testResults.criticalIssues.length}`);
    }

    if (this.status.warnings.length > 0) {
      console.group('⚠️ Warnings:');
      this.status.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    if (this.status.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      this.status.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Reset the manager (for testing purposes)
   */
  reset(): void {
    this.status = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const browserCompatibilityManager = BrowserCompatibilityManager.getInstance();

// Convenience functions
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






