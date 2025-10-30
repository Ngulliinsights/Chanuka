/**
 * Browser Compatibility Testing Utilities
 * 
 * This module provides comprehensive testing for browser compatibility
 * and cross-browser issues detection.
 */

import { getBrowserInfo, featureDetector } from './browser-compatibility';
import { logger } from '@shared/core';

export interface CompatibilityTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  recommendation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CompatibilityTestSuite {
  browserInfo: ReturnType<typeof getBrowserInfo>;
  testResults: CompatibilityTestResult[];
  overallScore: number;
  criticalIssues: CompatibilityTestResult[];
  recommendations: string[];
}

export class BrowserCompatibilityTester {
  private static instance: BrowserCompatibilityTester;
  
  static getInstance(): BrowserCompatibilityTester {
    if (!BrowserCompatibilityTester.instance) {
      BrowserCompatibilityTester.instance = new BrowserCompatibilityTester();
    }
    return BrowserCompatibilityTester.instance;
  }

  /**
   * Run comprehensive browser compatibility tests
   */
  async runCompatibilityTests(): Promise<CompatibilityTestSuite> {
    const browserInfo = getBrowserInfo();
    const testResults: CompatibilityTestResult[] = [];

    // Core JavaScript features
    testResults.push(...await this.testCoreJavaScriptFeatures());

    // DOM API features
    testResults.push(...await this.testDOMFeatures());

    // CSS features
    testResults.push(...await this.testCSSFeatures());

    // Network and storage features
    testResults.push(...await this.testNetworkStorageFeatures());

    // Modern web APIs
    testResults.push(...await this.testModernWebAPIs());

    // Performance features
    testResults.push(...await this.testPerformanceFeatures());

    // Calculate overall score
    const passedTests = testResults.filter(test => test.passed).length;
    const overallScore = Math.round((passedTests / testResults.length) * 100);

    // Get critical issues
    const criticalIssues = testResults.filter(test => 
      !test.passed && test.severity === 'critical'
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(testResults, browserInfo);

    return {
      browserInfo,
      testResults,
      overallScore,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Test core JavaScript features
   */
  private async testCoreJavaScriptFeatures(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // ES6 Arrow Functions
    tests.push(this.createTest(
      'ES6 Arrow Functions',
      () => {
        try {
          const arrowTest = new Function('return (() => {})');
          arrowTest();
          return true;
        } catch {
          return false;
        }
      },
      'critical',
      'Arrow functions are required for modern JavaScript. Update your browser.'
    ));

    // ES6 Classes
    tests.push(this.createTest(
      'ES6 Classes',
      () => {
        try {
          const classTest = new Function('class Test {} return Test;');
          classTest();
          return true;
        } catch {
          return false;
        }
      },
      'high',
      'ES6 classes are used throughout the application. Consider updating your browser.'
    ));

    // Template Literals
    tests.push(this.createTest(
      'Template Literals',
      () => {
        try {
          const templateTest = new Function('const x = 1; return `template ${x} literal`;');
          templateTest();
          return true;
        } catch {
          return false;
        }
      },
      'high',
      'Template literals are used for string formatting. Update your browser.'
    ));

    // Destructuring
    tests.push(this.createTest(
      'Destructuring Assignment',
      () => {
        try {
          const destructureTest = new Function('const [a, b] = [1, 2]; const {c} = {c: 3}; return a + b + c;');
          destructureTest();
          return true;
        } catch {
          return false;
        }
      },
      'medium',
      'Destructuring is used for cleaner code. Consider updating your browser.'
    ));

    // Async/Await
    tests.push(this.createTest(
      'Async/Await',
      () => featureDetector.detectAsyncAwaitSupport(),
      'critical',
      'Async/await is required for API communication. Update your browser immediately.'
    ));

    // Promises
    tests.push(this.createTest(
      'Promises',
      () => featureDetector.detectPromiseSupport(),
      'critical',
      'Promises are essential for asynchronous operations. Update your browser.'
    ));

    // Array Methods
    tests.push(this.createTest(
      'Modern Array Methods',
      () => {
        return !!(Array.prototype.find &&
               Array.prototype.includes &&
               Array.prototype.map &&
               Array.prototype.filter &&
               Array.from);
      },
      'high',
      'Modern array methods are used extensively. Update your browser.'
    ));

    // Object Methods
    tests.push(this.createTest(
      'Modern Object Methods',
      () => {
        return !!(Object.assign &&
               Object.keys &&
               Object.values &&
               Object.entries);
      },
      'high',
      'Modern object methods are required. Update your browser.'
    ));

    return tests;
  }

  /**
   * Test DOM API features
   */
  private async testDOMFeatures(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // Query Selector
    tests.push(this.createTest(
      'Query Selector APIs',
      () => {
        return !!(document.querySelector &&
               document.querySelectorAll &&
               Element.prototype.closest);
      },
      'critical',
      'Query selector APIs are required for DOM manipulation. Update your browser.'
    ));

    // Event Listeners
    tests.push(this.createTest(
      'Modern Event APIs',
      () => {
        return !!(Element.prototype.addEventListener &&
               Element.prototype.removeEventListener &&
               typeof CustomEvent === 'function');
      },
      'critical',
      'Modern event APIs are essential. Update your browser.'
    ));

    // DOM Manipulation
    tests.push(this.createTest(
      'DOM Manipulation APIs',
      () => {
        return !!(Element.prototype.remove &&
               Element.prototype.append &&
               Element.prototype.prepend);
      },
      'medium',
      'Modern DOM manipulation methods improve performance. Consider updating.'
    ));

    // Form APIs
    tests.push(this.createTest(
      'Form Validation APIs',
      () => {
        return !!(HTMLFormElement.prototype.checkValidity &&
               HTMLInputElement.prototype.setCustomValidity);
      },
      'medium',
      'Form validation APIs enhance user experience. Consider updating.'
    ));

    return tests;
  }

  /**
   * Test CSS features
   */
  private async testCSSFeatures(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // CSS Grid
    tests.push(this.createTest(
      'CSS Grid Layout',
      () => {
        return !!(CSS.supports && CSS.supports('display', 'grid'));
      },
      'high',
      'CSS Grid is used for layout. Update your browser for better design support.'
    ));

    // CSS Flexbox
    tests.push(this.createTest(
      'CSS Flexbox',
      () => {
        return !!(CSS.supports && CSS.supports('display', 'flex'));
      },
      'high',
      'CSS Flexbox is essential for responsive design. Update your browser.'
    ));

    // CSS Custom Properties
    tests.push(this.createTest(
      'CSS Custom Properties (Variables)',
      () => {
        return !!(CSS.supports && CSS.supports('--custom-property', 'value'));
      },
      'medium',
      'CSS variables are used for theming. Consider updating for better styling.'
    ));

    // CSS Transforms
    tests.push(this.createTest(
      'CSS Transforms',
      () => {
        return !!(CSS.supports && CSS.supports('transform', 'translateX(10px)'));
      },
      'medium',
      'CSS transforms are used for animations. Consider updating.'
    ));

    return tests;
  }

  /**
   * Test network and storage features
   */
  private async testNetworkStorageFeatures(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // Fetch API
    tests.push(this.createTest(
      'Fetch API',
      () => featureDetector.detectFetchSupport(),
      'critical',
      'Fetch API is required for network requests. Update your browser immediately.'
    ));

    // Local Storage
    tests.push(this.createTest(
      'Local Storage',
      () => featureDetector.detectLocalStorageSupport(),
      'high',
      'Local storage is needed for user preferences. Update your browser.'
    ));

    // Session Storage
    tests.push(this.createTest(
      'Session Storage',
      () => featureDetector.detectSessionStorageSupport(),
      'medium',
      'Session storage improves user experience. Consider updating.'
    ));

    // IndexedDB
    tests.push(this.createTest(
      'IndexedDB',
      () => !!('indexedDB' in window),
      'low',
      'IndexedDB enables offline functionality. Consider updating for better features.'
    ));

    return tests;
  }

  /**
   * Test modern web APIs
   */
  private async testModernWebAPIs(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // Service Workers
    tests.push(this.createTest(
      'Service Workers',
      () => featureDetector.detectServiceWorkersSupport(),
      'medium',
      'Service workers enable offline functionality. Consider updating.'
    ));

    // Web Workers
    tests.push(this.createTest(
      'Web Workers',
      () => featureDetector.detectWebWorkersSupport(),
      'low',
      'Web workers improve performance for heavy tasks. Consider updating.'
    ));

    // Intersection Observer
    tests.push(this.createTest(
      'Intersection Observer',
      () => featureDetector.detectIntersectionObserverSupport(),
      'medium',
      'Intersection Observer improves scroll performance. Consider updating.'
    ));

    // Resize Observer
    tests.push(this.createTest(
      'Resize Observer',
      () => featureDetector.detectResizeObserverSupport(),
      'low',
      'Resize Observer improves responsive design. Consider updating.'
    ));

    // Geolocation
    tests.push(this.createTest(
      'Geolocation API',
      () => featureDetector.detectGeolocationSupport(),
      'low',
      'Geolocation enables location-based features. Consider updating.'
    ));

    // Notifications
    tests.push(this.createTest(
      'Notifications API',
      () => featureDetector.detectNotificationsSupport(),
      'low',
      'Notifications improve user engagement. Consider updating.'
    ));

    return tests;
  }

  /**
   * Test performance features
   */
  private async testPerformanceFeatures(): Promise<CompatibilityTestResult[]> {
    const tests: CompatibilityTestResult[] = [];

    // Performance API
    tests.push(this.createTest(
      'Performance API',
      () => !!('performance' in window && 'now' in performance),
      'low',
      'Performance API enables better monitoring. Consider updating.'
    ));

    // RequestAnimationFrame
    tests.push(this.createTest(
      'RequestAnimationFrame',
      () => !!('requestAnimationFrame' in window),
      'medium',
      'RequestAnimationFrame improves animation performance. Consider updating.'
    ));

    // Page Visibility API
    tests.push(this.createTest(
      'Page Visibility API',
      () => !!('visibilityState' in document),
      'low',
      'Page Visibility API optimizes performance. Consider updating.'
    ));

    return tests;
  }

  /**
   * Create a test result
   */
  private createTest(
    testName: string,
    testFunction: () => boolean,
    severity: CompatibilityTestResult['severity'],
    recommendation: string
  ): CompatibilityTestResult {
    try {
      const passed = testFunction();
      return {
        testName,
        passed,
        severity,
        recommendation: passed ? undefined : recommendation
      };
    } catch (error) {
      return {
        testName,
        passed: false,
        error: (error as Error).message,
        severity,
        recommendation
      };
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(
    testResults: CompatibilityTestResult[],
    browserInfo: ReturnType<typeof getBrowserInfo>
  ): string[] {
    const recommendations: string[] = [];
    
    const failedCritical = testResults.filter(test => 
      !test.passed && test.severity === 'critical'
    );
    
    const failedHigh = testResults.filter(test => 
      !test.passed && test.severity === 'high'
    );

    if (failedCritical.length > 0) {
      recommendations.push(
        `Critical compatibility issues detected (${failedCritical.length}). ` +
        'The application may not function properly. Please update your browser immediately.'
      );
    }

    if (failedHigh.length > 0) {
      recommendations.push(
        `High-priority compatibility issues detected (${failedHigh.length}). ` +
        'Some features may not work correctly. Consider updating your browser.'
      );
    }

    if (!browserInfo.isSupported) {
      recommendations.push(
        `Your browser (${browserInfo.name} ${browserInfo.version}) is not officially supported. ` +
        'Please update to a supported version for the best experience.'
      );
    }

    // Browser-specific recommendations
    if (browserInfo.name === 'ie') {
      recommendations.push(
        'Internet Explorer is no longer supported. Please switch to a modern browser like Chrome, Firefox, Safari, or Edge.'
      );
    }

    if (browserInfo.name === 'edge-legacy') {
      recommendations.push(
        'Legacy Edge is deprecated. Please update to the new Chromium-based Edge browser.'
      );
    }

    // Feature-specific recommendations
    const failedFeatures = testResults.filter(test => !test.passed);
    if (failedFeatures.some(test => test.testName.includes('ES6'))) {
      recommendations.push(
        'Your browser lacks ES6 support. Modern JavaScript features are required for this application.'
      );
    }

    if (failedFeatures.some(test => test.testName.includes('CSS'))) {
      recommendations.push(
        'Your browser has limited CSS support. The application design may not display correctly.'
      );
    }

    return recommendations;
  }

  /**
   * Get browser-specific workarounds
   */
  getBrowserWorkarounds(browserInfo: ReturnType<typeof getBrowserInfo>): string[] {
    const workarounds: string[] = [];

    switch (browserInfo.name) {
      case 'safari':
        if (browserInfo.majorVersion < 14) {
          workarounds.push('Safari versions before 14 may have issues with some modern features.');
        }
        break;
      
      case 'firefox':
        if (browserInfo.majorVersion < 70) {
          workarounds.push('Firefox versions before 70 may have performance issues.');
        }
        break;
      
      case 'chrome':
        if (browserInfo.majorVersion < 80) {
          workarounds.push('Chrome versions before 80 may have security limitations.');
        }
        break;
      
      case 'ie':
        workarounds.push('Internet Explorer is not supported. Please use a modern browser.');
        break;
      
      case 'edge-legacy':
        workarounds.push('Legacy Edge has limited support. Please update to Chromium-based Edge.');
        break;
    }

    return workarounds;
  }
}

// Export singleton instance
export const browserCompatibilityTester = BrowserCompatibilityTester.getInstance();

// Convenience function
export async function runBrowserCompatibilityTests(): Promise<CompatibilityTestSuite> {
  return browserCompatibilityTester.runCompatibilityTests();
}












































