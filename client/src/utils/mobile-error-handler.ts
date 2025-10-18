import { logger } from '@shared/core/src/observability/logging';
/**
 * Mobile Error Handler
 * Provides mobile-specific error handling and fallback mechanisms
 */

export interface MobileErrorContext {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    orientation: string;
  };
  connection: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  memory?: number;
  touchSupport: boolean;
  isStandalone: boolean;
}

export interface MobileErrorReport {
  error: Error;
  context: MobileErrorContext;
  timestamp: Date;
  errorId: string;
  recoveryAttempts: number;
}

export type MobileErrorType = 
  | 'network'
  | 'touch'
  | 'orientation'
  | 'memory'
  | 'viewport'
  | 'performance'
  | 'storage'
  | 'unknown';

export interface MobileErrorHandlerOptions {
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  reportErrors: boolean;
  fallbackStrategies: Partial<Record<MobileErrorType, () => void>>;
}

export class MobileErrorHandler {
  private options: MobileErrorHandlerOptions;
  private errorCounts: Map<MobileErrorType, number> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private errorReports: MobileErrorReport[] = [];

  constructor(options: Partial<MobileErrorHandlerOptions> = {}) {
    this.options = {
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      reportErrors: true,
      fallbackStrategies: {},
      ...options,
    };

    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'unknown');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), 'unknown');
    });

    // Handle network errors
    window.addEventListener('offline', () => {
      this.handleError(new Error('Device went offline'), 'network');
    });

    // Handle orientation change errors
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        try {
          // Check if layout is broken after orientation change
          this.validateLayoutAfterOrientationChange();
        } catch (error) {
          this.handleError(error as Error, 'orientation');
        }
      }, 100);
    });

    // Handle memory pressure (if supported)
    if ('memory' in performance) {
      this.monitorMemoryUsage();
    }
  }

  private validateLayoutAfterOrientationChange(): void {
    const viewport = this.getViewportInfo();
    
    // Check for common layout issues after orientation change
    if (viewport.width === 0 || viewport.height === 0) {
      throw new Error('Invalid viewport dimensions after orientation change');
    }

    // Check if critical elements are still visible
    const criticalElements = document.querySelectorAll('[data-critical]');
    criticalElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        throw new Error(`Critical element ${element.id || element.className} is not visible after orientation change`);
      }
    });
  }

  private monitorMemoryUsage(): void {
    const checkMemory = () => {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const usedRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        if (usedRatio > 0.9) {
          this.handleError(
            new Error(`High memory usage: ${Math.round(usedRatio * 100)}%`),
            'memory'
          );
        }
      }
    };

    // Check memory usage every 30 seconds
    setInterval(checkMemory, 30000);
  }

  public handleError(error: Error, type: MobileErrorType): void {
    const errorId = this.generateErrorId();
    const context = this.getMobileContext();
    
    // Increment error count
    const currentCount = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, currentCount + 1);

    // Create error report
    const report: MobileErrorReport = {
      error,
      context,
      timestamp: new Date(),
      errorId,
      recoveryAttempts: this.recoveryAttempts.get(errorId) || 0,
    };

    // Store error report
    if (this.options.reportErrors) {
      this.errorReports.push(report);
      this.reportErrorToService(report);
    }

    // Attempt recovery if enabled
    if (this.options.enableAutoRecovery) {
      this.attemptRecovery(error, type, errorId);
    }

    // Log error for debugging
    console.error(`Mobile Error [${type}]:`, error, context);
  }

  private attemptRecovery(error: Error, type: MobileErrorType, errorId: string): void {
    const attempts = this.recoveryAttempts.get(errorId) || 0;
    
    if (attempts >= this.options.maxRecoveryAttempts) {
      console.warn(`Max recovery attempts reached for error ${errorId}`);
      this.showFallbackUI(error, type);
      return;
    }

    this.recoveryAttempts.set(errorId, attempts + 1);

    // Try type-specific recovery strategies
    const strategy = this.options.fallbackStrategies[type];
    if (strategy) {
      try {
        strategy();
        console.log(`Recovery strategy executed for ${type} error`);
        return;
      } catch (recoveryError) {
        logger.error('Recovery strategy failed:', { component: 'Chanuka' }, recoveryError);
      }
    }

    // Default recovery strategies
    this.executeDefaultRecovery(type, error);
  }

  private executeDefaultRecovery(type: MobileErrorType, error: Error): void {
    switch (type) {
      case 'network':
        this.handleNetworkError();
        break;
      case 'touch':
        this.handleTouchError();
        break;
      case 'orientation':
        this.handleOrientationError();
        break;
      case 'memory':
        this.handleMemoryError();
        break;
      case 'viewport':
        this.handleViewportError();
        break;
      case 'performance':
        this.handlePerformanceError();
        break;
      case 'storage':
        this.handleStorageError();
        break;
      default:
        this.handleUnknownError(error);
    }
  }

  private handleNetworkError(): void {
    // Show offline indicator
    this.showNotification('You appear to be offline. Some features may not work.', 'warning');
    
    // Enable offline mode if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as any).sync?.register('background-sync');
      });
    }
  }

  private handleTouchError(): void {
    // Reset touch event listeners
    document.querySelectorAll('[data-touch-enabled]').forEach((element) => {
      // Re-initialize touch handlers
      element.dispatchEvent(new CustomEvent('touch-reset'));
    });
    
    this.showNotification('Touch interaction reset. Please try again.', 'info');
  }

  private handleOrientationError(): void {
    // Force layout recalculation
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    // Dispatch resize event to trigger responsive updates
    window.dispatchEvent(new Event('resize'));
    
    this.showNotification('Layout adjusted for orientation change.', 'info');
  }

  private handleMemoryError(): void {
    // Clear non-essential caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('non-essential')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Clear old error reports
    this.errorReports = this.errorReports.slice(-10);
    
    this.showNotification('Memory optimized. Performance may improve.', 'info');
  }

  private handleViewportError(): void {
    // Reset viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes, viewport-fit=cover';
    }
    
    // Force viewport recalculation
    window.dispatchEvent(new Event('resize'));
  }

  private handlePerformanceError(): void {
    // Reduce animations
    document.documentElement.style.setProperty('--timing-fast', '0ms');
    document.documentElement.style.setProperty('--timing-base', '0ms');
    document.documentElement.style.setProperty('--timing-slow', '0ms');
    
    this.showNotification('Animations disabled to improve performance.', 'info');
  }

  private handleStorageError(): void {
    // Clear old localStorage items
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('temp_') || key.includes('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
    
    this.showNotification('Storage cleared to resolve issues.', 'info');
  }

  private handleUnknownError(error: Error): void {
    // Generic recovery: reload critical components
    const event = new CustomEvent('mobile-error-recovery', {
      detail: { error, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  private showFallbackUI(error: Error, type: MobileErrorType): void {
    const fallbackContainer = document.createElement('div');
    fallbackContainer.className = 'mobile-error-fallback';
    fallbackContainer.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 90vw;
        text-align: center;
        z-index: 10000;
      ">
        <h3 style="margin: 0 0 12px; color: #dc2626;">Something went wrong</h3>
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
          We're having trouble with ${type} functionality on your device.
        </p>
        <button onclick="window.location.reload()" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 8px;
        ">
          Refresh Page
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">
          Dismiss
        </button>
      </div>
    `;
    
    document.body.appendChild(fallbackContainer);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (fallbackContainer.parentNode) {
        fallbackContainer.parentNode.removeChild(fallbackContainer);
      }
    }, 10000);
  }

  private showNotification(message: string, type: 'info' | 'warning' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `mobile-notification mobile-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      max-width: 90vw;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }

  private getMobileContext(): MobileErrorContext {
    const connection = (navigator as any).connection || {};
    
    return {
      userAgent: navigator.userAgent,
      viewport: this.getViewportInfo(),
      connection: {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      },
      memory: (performance as any).memory?.jsHeapSizeLimit,
      touchSupport: 'ontouchstart' in window,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    };
  }

  private getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: screen.orientation?.type || 'unknown',
    };
  }

  private generateErrorId(): string {
    return `mobile_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportErrorToService(report: MobileErrorReport): void {
    // In a real application, you would send this to your error reporting service
    try {
      localStorage.setItem(
        `mobile_error_${report.errorId}`,
        JSON.stringify({
          message: report.error.message,
          stack: report.error.stack,
          context: report.context,
          timestamp: report.timestamp.toISOString(),
        })
      );
    } catch (error) {
      console.warn('Could not store error report:', error);
    }
  }

  public getErrorStats(): Record<MobileErrorType, number> {
    const stats: Record<string, number> = {};
    this.errorCounts.forEach((count, type) => {
      stats[type] = count;
    });
    return stats as Record<MobileErrorType, number>;
  }

  public clearErrorHistory(): void {
    this.errorCounts.clear();
    this.recoveryAttempts.clear();
    this.errorReports = [];
    
    // Clear stored error reports
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('mobile_error_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Global instance
let mobileErrorHandler: MobileErrorHandler | null = null;

export function getMobileErrorHandler(): MobileErrorHandler {
  if (!mobileErrorHandler) {
    mobileErrorHandler = new MobileErrorHandler();
  }
  return mobileErrorHandler;
}

/**
 * React hook for mobile error handling
 */
export function useMobileErrorHandler() {
  const [errorHandler] = React.useState(() => getMobileErrorHandler());
  
  const reportError = React.useCallback((error: Error, type: MobileErrorType) => {
    errorHandler.handleError(error, type);
  }, [errorHandler]);
  
  const getStats = React.useCallback(() => {
    return errorHandler.getErrorStats();
  }, [errorHandler]);
  
  const clearHistory = React.useCallback(() => {
    errorHandler.clearErrorHistory();
  }, [errorHandler]);
  
  return {
    reportError,
    getStats,
    clearHistory,
  };
}

// Import React for hooks
import React from 'react';






