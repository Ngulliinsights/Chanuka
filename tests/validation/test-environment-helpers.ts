/**
 * Test Environment Helpers - Error simulation and browser state management
 * 
 * Provides utilities for testing error handling, managing test state,
 * and getting information about the test environment.
 * 
 * Migrated from: client/src/utils/testing.ts (TestHelpers class)
 * Usage: Error boundary testing, environment diagnostics, test state cleanup
 */

/**
 * Simulates different types of errors for testing error handling.
 * Useful for verifying error boundaries and recovery mechanisms work.
 * 
 * @param type - Type of error to simulate: 'javascript', 'promise', 'network', or 'resource'
 * 
 * Example:
 *   simulateError('javascript');  // Throw synchronous error
 *   simulateError('promise');     // Create unhandled promise rejection
 *   simulateError('network');     // Simulate fetch failure
 *   simulateError('resource');    // Simulate script load failure
 */
export function simulateError(type: 'javascript' | 'promise' | 'network' | 'resource'): void {
  console.log(`🧪 Simulating ${type} error for testing`);

  switch (type) {
    case 'javascript':
      // Synchronous error - tests error boundaries
      throw new Error('Simulated JavaScript error for testing');

    case 'promise':
      // Asynchronous error - tests unhandled rejection handling
      Promise.reject(new Error('Simulated promise rejection for testing'));
      break;

    case 'resource': {
      // Resource loading error - tests asset loading error handling
      if (typeof document !== 'undefined') {
        const script = document.createElement('script');
        script.src = '/non-existent-script.js';
        document.head.appendChild(script);
      }
      break;
    }

    case 'network':
      // Network error - tests API error handling
      if (typeof fetch !== 'undefined') {
        fetch('/non-existent-endpoint').catch(() => {
          console.log('Simulated network error completed');
        });
      }
      break;
  }
}

/**
 * Clears all caches and storage for a clean test state.
 * Useful for ensuring tests start from a known state.
 * 
 * Clears:
 * - Browser cache (IndexedDB, etc.)
 * - localStorage
 * - sessionStorage
 * 
 * Example:
 *   await clearAllCaches();
 */
export async function clearAllCaches(): Promise<void> {
  // Clear browser caches
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    } catch (e) {
      console.warn('Failed to clear caches', e);
    }
  }

  // Clear storage (with error handling for restricted contexts)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage (may be in restricted context)', e);
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear sessionStorage (may be in restricted context)', e);
    }
  }
}

/**
 * Gets comprehensive information about the test environment.
 * Useful for debugging environment-specific issues.
 * 
 * Returns information about:
 * - Browser/user agent
 * - Platform and language
 * - Viewport dimensions
 * - Screen dimensions and color depth
 * - Online/offline status
 * 
 * Example:
 *   const env = getTestEnvironment();
 *   console.log(env.userAgent);
 *   console.log(env.viewport);
 */
export function getTestEnvironment(): Record<string, unknown> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      environment: 'node',
      message: 'Running in Node.js environment (browser APIs unavailable)'
    };
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
    },
  };
}

/**
 * Class-based interface for test environment helpers (backward compatibility)
 * 
 * Example:
 *   TestEnvironmentHelpers.simulateError('javascript');
 *   await TestEnvironmentHelpers.clearAllCaches();
 *   const env = TestEnvironmentHelpers.getTestEnvironment();
 */
export class TestEnvironmentHelpers {
  static simulateError(type: 'javascript' | 'promise' | 'network' | 'resource'): void {
    simulateError(type);
  }

  static async clearAllCaches(): Promise<void> {
    return clearAllCaches();
  }

  static getTestEnvironment(): Record<string, unknown> {
    return getTestEnvironment();
  }
}
