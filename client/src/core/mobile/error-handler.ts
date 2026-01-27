/**
 * Mobile Error Handler Module
 *
 * Specialized error handler for mobile devices that provides context-aware
 * error handling and automatic recovery strategies.
 *
 * @module core/mobile/error-handler
 */

import { logger } from '@client/lib/utils/logger';

import { DeviceDetector } from './device-detector';
import type { MobileErrorContext } from './types';

/**
 * Specialized error handler for mobile devices that provides context-aware
 * error handling and automatic recovery strategies.
 */
export class MobileErrorHandler {
  private static instance: MobileErrorHandler;
  private deviceDetector: DeviceDetector;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private readonly ERROR_THRESHOLD = 5;
  private readonly ERROR_WINDOW = 10000; // 10 seconds

  private constructor() {
    this.deviceDetector = DeviceDetector.getInstance();
    this.setupMobileErrorHandling();
  }

  static getInstance(): MobileErrorHandler {
    if (!MobileErrorHandler.instance) {
      MobileErrorHandler.instance = new MobileErrorHandler();
    }
    return MobileErrorHandler.instance;
  }

  private setupMobileErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', event => {
      this.handleMobileError(event.error, {
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', event => {
      this.handleMobileError(event.reason, {
        type: 'promise',
        promise: event.promise,
      });
    });

    // Network status monitoring
    window.addEventListener('offline', () => {
      this.handleMobileError(new Error('Network connection lost'), {
        type: 'network',
        status: 'offline',
      });
    });

    window.addEventListener('online', () => {
      logger.info('Network connection restored', {
        deviceInfo: this.deviceDetector.getDeviceInfo(),
      });
      this.errorCount = 0; // Reset error count on network recovery
    });

    // Monitor visibility changes (important for mobile battery conservation)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background - good time to reduce resource usage
        this.handleBackgroundTransition();
      } else {
        // App came to foreground - resume normal operations
        this.handleForegroundTransition();
      }
    });
  }

  private handleMobileError(error: unknown, context: unknown): void {
    const now = Date.now();

    // Track error rate to detect cascading failures
    if (now - this.lastErrorTime < this.ERROR_WINDOW) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    const deviceInfo = this.deviceDetector.getDeviceInfo();
    const mobileContext: MobileErrorContext = {
      deviceInfo,
      touchSupport: deviceInfo.hasTouch,
      ...this.getNetworkInfo(),
      ...this.getMemoryInfo(),
      timestamp: now,
    };

    logger.error('Mobile error occurred', {
      error: (error as Error)?.message || String(error),
      stack: (error as Error)?.stack,
      context,
      mobileContext,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      errorCount: this.errorCount,
    });

    // Implement progressive recovery strategies based on error frequency
    if (this.errorCount >= this.ERROR_THRESHOLD) {
      logger.warn('Error threshold exceeded, initiating emergency recovery');
      this.initiateEmergencyRecovery();
    } else if (deviceInfo.isMobile || deviceInfo.isTablet) {
      this.attemptMobileRecovery(error, context);
    }
  }

  private getNetworkInfo(): Partial<MobileErrorContext> {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return {};
    }

    const connection =
      (
        navigator as Navigator & {
          connection?: { effectiveType?: string; type?: string; downlink?: number };
          mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
          webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
        }
      ).connection ||
      (
        navigator as Navigator & {
          connection?: { effectiveType?: string; type?: string; downlink?: number };
          mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
          webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
        }
      ).mozConnection ||
      (
        navigator as Navigator & {
          connection?: { effectiveType?: string; type?: string; downlink?: number };
          mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
          webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
        }
      ).webkitConnection;
    if (!connection) return {};

    return {
      networkType: connection.effectiveType || connection.type,
      connectionSpeed: connection.downlink ? `${connection.downlink} Mbps` : undefined,
    };
  }

  private getMemoryInfo(): Partial<MobileErrorContext> {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return {};
    }

    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    if (!memory) return {};

    return {
      memoryInfo: {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      },
    };
  }

  private attemptMobileRecovery(error: unknown, context: unknown): void {
    const deviceInfo = this.deviceDetector.getDeviceInfo();

    // Strategy 1: Reduce functionality on low-end devices or small screens
    if (deviceInfo.screenSize === 'xs' || deviceInfo.pixelRatio < 2) {
      this.enableLowPowerMode();
    }

    // Strategy 2: Handle touch-specific errors by resetting touch state
    if ((context as { type?: string })?.type === 'touch' && deviceInfo.hasTouch) {
      this.resetTouchHandlers();
    }

    // Strategy 3: Handle memory pressure on mobile devices
    const errorMessage = String((error as Error)?.message || error).toLowerCase();
    if (
      errorMessage.includes('memory') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('heap')
    ) {
      this.clearMobileCaches();
    }

    // Strategy 4: Handle network-related errors
    if (
      (context as { type?: string })?.type === 'network' ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch')
    ) {
      this.handleNetworkError();
    }

    // Strategy 5: iOS-specific error handling
    if (deviceInfo.isIOS && errorMessage.includes('webkit')) {
      this.handleIOSSpecificError();
    }
  }

  private initiateEmergencyRecovery(): void {
    logger.warn('Initiating emergency recovery procedures');

    // Notify the application of critical error state
    const event = new CustomEvent('mobile:emergencyRecovery', {
      detail: {
        errorCount: this.errorCount,
        deviceInfo: this.deviceDetector.getDeviceInfo(),
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(event);

    // Apply all recovery strategies
    this.enableLowPowerMode();
    this.clearMobileCaches();
    this.resetTouchHandlers();

    // Reset error count after a delay to allow recovery
    setTimeout(() => {
      this.errorCount = 0;
      logger.info('Error count reset after recovery period');
    }, 30000);
  }

  private enableLowPowerMode(): void {
    logger.info('Enabling low power mode for mobile device');

    // Reduce or disable animations globally
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }

    // Dispatch event for application to reduce functionality
    const event = new CustomEvent('mobile:lowPowerMode', {
      detail: {
        enabled: true,
        reason: 'performance_optimization',
      },
    });
    window.dispatchEvent(event);
  }

  private resetTouchHandlers(): void {
    logger.info('Resetting touch handlers due to touch-related error');

    // Dispatch event to notify components to reset their touch state
    const event = new CustomEvent('mobile:resetTouch', {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  }

  private clearMobileCaches(): void {
    logger.info('Clearing mobile caches due to memory pressure');

    try {
      // Clear Cache API if available
      if ('caches' in window) {
        caches
          .keys()
          .then(names => {
            // Only clear non-essential caches, preserve critical assets
            names.forEach(name => {
              if (!name.includes('critical') && !name.includes('essential')) {
                caches.delete(name);
              }
            });
          })
          .catch(err => {
            logger.error('Failed to clear cache API', { error: err });
          });
      }

      // Selectively clear localStorage to free memory
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('cache_') || key.startsWith('temp_'))) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // Ignore individual removal errors
          }
        });

        logger.info(`Cleared ${keysToRemove.length} cached items from localStorage`);
      }

      // Notify application to clear in-memory caches
      const event = new CustomEvent('mobile:clearCaches', {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    } catch (error) {
      logger.error('Failed to clear mobile caches', { error });
    }
  }

  private handleNetworkError(): void {
    logger.info('Handling network-related error');

    // Notify application to switch to offline mode or retry logic
    const event = new CustomEvent('mobile:networkError', {
      detail: {
        online: navigator.onLine,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(event);
  }

  private handleIOSSpecificError(): void {
    logger.info('Handling iOS-specific error');

    // iOS has specific quirks, especially with viewport and touch events
    // Notify application to apply iOS-specific fixes
    const event = new CustomEvent('mobile:iosError', {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  }

  private handleBackgroundTransition(): void {
    logger.debug('Application moved to background');

    // Notify application to reduce resource usage
    const event = new CustomEvent('mobile:background', {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  }

  private handleForegroundTransition(): void {
    logger.debug('Application moved to foreground');

    // Notify application to resume normal operations
    const event = new CustomEvent('mobile:foreground', {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  }

  /**
   * Manually report an error with mobile context
   */
  reportError(error: Error, context?: Record<string, unknown>): void {
    this.handleMobileError(error, { type: 'manual', ...context });
  }

  /**
   * Reset error tracking (useful after successful recovery)
   */
  resetErrorTracking(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    logger.info('Error tracking reset');
  }

  /**
   * Get current error state
   */
  getErrorState(): { count: number; lastErrorTime: number; isInErrorState: boolean } {
    return {
      count: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isInErrorState: this.errorCount >= this.ERROR_THRESHOLD,
    };
  }
}

// Singleton instance
export const mobileErrorHandler = MobileErrorHandler.getInstance();
