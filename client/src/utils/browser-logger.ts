/**
 * Enhanced Browser Logger with Render Tracking
 *
 * Extends the unified client logger with browser-specific features
 * including render tracking, performance monitoring, and user interaction logging.
 */

import { UnifiedClientLogger } from './unified-logger';
import { 
  LogContext, 
  BrowserLogger, 
  RenderTrackingData, 
  ComponentLifecycleData, 
  PerformanceImpactData, 
  RenderStats,
  BrowserLoggerConfig 
} from '../types/logging';

// Additional interfaces for render tracking
interface InfiniteRenderAlert {
  component: string;
  renderCount: number;
  timeWindow: number;
  rendersPerSecond: number;
  timestamp: number;
}

// Render tracking storage
class RenderTracker {
  private renderHistory: Map<string, RenderTrackingData[]> = new Map();
  private performanceHistory: Map<string, PerformanceImpactData[]> = new Map();
  private lifecycleHistory: Map<string, ComponentLifecycleData[]> = new Map();
  private infiniteRenderThreshold = 50; // renders per second
  private maxHistorySize = 1000; // prevent memory leaks

  trackRender(data: RenderTrackingData): void {
    const componentHistory = this.renderHistory.get(data.component) || [];
    componentHistory.push(data);
    
    // Limit history size to prevent memory leaks
    if (componentHistory.length > this.maxHistorySize) {
      componentHistory.shift();
    }
    
    this.renderHistory.set(data.component, componentHistory);
  }

  trackLifecycle(data: ComponentLifecycleData): void {
    const componentHistory = this.lifecycleHistory.get(data.component) || [];
    componentHistory.push(data);
    
    if (componentHistory.length > this.maxHistorySize) {
      componentHistory.shift();
    }
    
    this.lifecycleHistory.set(data.component, componentHistory);
  }

  trackPerformanceImpact(data: PerformanceImpactData): void {
    const componentHistory = this.performanceHistory.get(data.component) || [];
    componentHistory.push(data);
    
    if (componentHistory.length > this.maxHistorySize) {
      componentHistory.shift();
    }
    
    this.performanceHistory.set(data.component, componentHistory);
  }

  detectInfiniteRender(component: string, threshold = this.infiniteRenderThreshold): boolean {
    const history = this.renderHistory.get(component);
    if (!history || history.length < 2) return false;

    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Count renders in the last second
    const recentRenders = history.filter(render => render.timestamp >= oneSecondAgo);
    const rendersPerSecond = recentRenders.length;
    
    if (rendersPerSecond > threshold) {
      const alert: InfiniteRenderAlert = {
        component,
        renderCount: recentRenders.length,
        timeWindow: 1000,
        rendersPerSecond,
        timestamp: now
      };
      
      // Log the alert
      browserLogger.error('[INFINITE_RENDER_DETECTED]', alert);
      return true;
    }
    
    return false;
  }

  getRenderStats(component?: string): RenderStats {
    if (component) {
      return this.getComponentStats(component);
    }
    
    // Return aggregated stats for all components
    const allComponents = Array.from(this.renderHistory.keys());
    const aggregatedStats: RenderStats = {
      totalRenders: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      infiniteRenderAlerts: 0,
      mountCount: 0,
      unmountCount: 0
    };
    
    let totalRenderTime = 0;
    let renderCount = 0;
    
    allComponents.forEach(comp => {
      const stats = this.getComponentStats(comp);
      aggregatedStats.totalRenders += stats.totalRenders;
      aggregatedStats.infiniteRenderAlerts += stats.infiniteRenderAlerts;
      aggregatedStats.mountCount += stats.mountCount;
      aggregatedStats.unmountCount += stats.unmountCount;
      
      if (stats.lastRenderTime > aggregatedStats.lastRenderTime) {
        aggregatedStats.lastRenderTime = stats.lastRenderTime;
      }
      
      totalRenderTime += stats.averageRenderTime * stats.totalRenders;
      renderCount += stats.totalRenders;
    });
    
    aggregatedStats.averageRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0;
    
    return aggregatedStats;
  }

  private getComponentStats(component: string): RenderStats {
    const renderHistory = this.renderHistory.get(component) || [];
    const performanceHistory = this.performanceHistory.get(component) || [];
    const lifecycleHistory = this.lifecycleHistory.get(component) || [];
    
    const totalRenders = renderHistory.length;
    const totalRenderTime = performanceHistory.reduce((sum, perf) => sum + perf.renderDuration, 0);
    const averageRenderTime = totalRenders > 0 ? totalRenderTime / performanceHistory.length : 0;
    const lastRenderTime = renderHistory.length > 0 ? renderHistory[renderHistory.length - 1].timestamp : 0;
    
    // Count infinite render alerts (renders > threshold in 1 second windows)
    let infiniteRenderAlerts = 0;
    const threshold = this.infiniteRenderThreshold;
    
    for (let i = 0; i < renderHistory.length; i++) {
      const currentTime = renderHistory[i].timestamp;
      const oneSecondLater = currentTime + 1000;
      
      let renderCount = 1; // Current render
      for (let j = i + 1; j < renderHistory.length && renderHistory[j].timestamp <= oneSecondLater; j++) {
        renderCount++;
      }
      
      if (renderCount > threshold) {
        infiniteRenderAlerts++;
        // Skip ahead to avoid counting overlapping windows
        i += renderCount - 1;
      }
    }
    
    const mountCount = lifecycleHistory.filter(event => event.action === 'mount').length;
    const unmountCount = lifecycleHistory.filter(event => event.action === 'unmount').length;
    
    return {
      totalRenders,
      averageRenderTime,
      lastRenderTime,
      infiniteRenderAlerts,
      mountCount,
      unmountCount
    };
  }

  clearRenderStats(component?: string): void {
    if (component) {
      this.renderHistory.delete(component);
      this.performanceHistory.delete(component);
      this.lifecycleHistory.delete(component);
    } else {
      this.renderHistory.clear();
      this.performanceHistory.clear();
      this.lifecycleHistory.clear();
    }
  }
}

/**
 * Enhanced Browser Logger Class
 * 
 * Extends the unified client logger with browser-specific features:
 * - Render tracking for React components
 * - Performance monitoring
 * - User interaction logging
 * - Memory usage tracking
 */
export class EnhancedBrowserLogger extends UnifiedClientLogger implements BrowserLogger {
  private renderTracker = new RenderTracker();

  constructor(config: BrowserLoggerConfig = {}) {
    super({
      enableRenderTracking: true,
      enablePerformanceTracking: true,
      enableUserTracking: true,
      maxRenderHistory: 1000,
      infiniteRenderThreshold: 50,
      ...config,
    });
  }

  // ==================== Render Tracking Methods ====================
  
  trackRender(data: RenderTrackingData): void {
    try {
      this.renderTracker.trackRender(data);
      
      if (process.env.NODE_ENV === 'development') {
        this.debug('[RENDER_TRACK]', {
          component: data.component,
          renderCount: data.renderCount,
          trigger: data.trigger,
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
      
      // Check for infinite renders
      this.renderTracker.detectInfiniteRender(data.component);
    } catch (error) {
      this.warn('Failed to track render', { component: data.component }, error);
    }
  }
  
  trackLifecycle(data: ComponentLifecycleData): void {
    try {
      this.renderTracker.trackLifecycle(data);
      
      if (process.env.NODE_ENV === 'development') {
        this.debug('[LIFECYCLE_TRACK]', {
          component: data.component,
          action: data.action,
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
    } catch (error) {
      this.warn('Failed to track lifecycle', { component: data.component }, error);
    }
  }
  
  trackPerformanceImpact(data: PerformanceImpactData): void {
    try {
      this.renderTracker.trackPerformanceImpact(data);
      
      if (process.env.NODE_ENV === 'development') {
        this.debug('[PERFORMANCE_TRACK]', {
          component: data.component,
          renderDuration: `${data.renderDuration.toFixed(2)}ms`,
          memoryUsage: data.memoryUsage ? `${(data.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
      
      // Warn about slow renders
      if (data.renderDuration > 16) { // > 1 frame at 60fps
        this.warn('[SLOW_RENDER]', {
          component: data.component,
          duration: `${data.renderDuration.toFixed(2)}ms`,
          threshold: '16ms'
        });
      }
    } catch (error) {
      this.warn('Failed to track performance impact', { component: data.component }, error);
    }
  }
  
  detectInfiniteRender(component: string, threshold = 50): boolean {
    try {
      return this.renderTracker.detectInfiniteRender(component, threshold);
    } catch (error) {
      this.warn('Failed to detect infinite render', { component }, error);
      return false;
    }
  }
  
  getRenderStats(component?: string): RenderStats {
    try {
      return this.renderTracker.getRenderStats(component);
    } catch (error) {
      this.warn('Failed to get render stats', { component }, error);
      return {
        totalRenders: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        infiniteRenderAlerts: 0,
        mountCount: 0,
        unmountCount: 0
      };
    }
  }
  
  clearRenderStats(component?: string): void {
    try {
      this.renderTracker.clearRenderStats(component);
      this.info('[RENDER_STATS_CLEARED]', { component: component || 'all' });
    } catch (error) {
      this.warn('Failed to clear render stats', { component }, error);
    }
  }

  // ==================== Browser-Specific Logging Methods ====================

  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const performanceData = {
      component: 'performance',
      operation,
      duration,
      user_agent: navigator.userAgent,
      url: window.location.href,
      memoryUsage: this.getMemoryUsage(),
      connectionType: this.getConnectionType(),
    };

    const level = duration > 1000 ? 'warn' : 'info';
    this[level](`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, performanceData, metadata);
  }

  logUserInteraction(event: string, element?: string, metadata?: Record<string, unknown>): void {
    this.info(`User interaction: ${event}`, {
      component: 'ui',
      operation: event,
      element,
      url: window.location.href,
      user_agent: navigator.userAgent,
    }, metadata);
  }

  logNavigation(from: string, to: string, metadata?: Record<string, unknown>): void {
    this.info(`Navigation: ${from} -> ${to}`, {
      component: 'navigation',
      operation: 'navigate',
      from,
      to,
      user_agent: navigator.userAgent,
    }, metadata);
  }

  logError(error: Error | string, context?: LogContext, metadata?: Record<string, unknown>): void {
    const errorData = this.processErrorForBrowser(error, context, metadata);
    this.error(typeof error === 'string' ? error : error.message, context, errorData);
  }

  // ==================== Browser-Specific Utility Methods ====================

  private processErrorForBrowser(
    error: Error | string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): Record<string, unknown> {
    let errorObj: Error;
    
    if (typeof error === 'string') {
      errorObj = new Error(error);
    } else {
      errorObj = error;
    }

    return {
      ...metadata,
      error: {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack,
        filename: (errorObj as any).filename,
        lineno: (errorObj as any).lineno,
        colno: (errorObj as any).colno,
      },
      browser: {
        user_agent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        memoryUsage: this.getMemoryUsage(),
        connectionType: this.getConnectionType(),
      },
    };
  }

  private getMemoryUsage(): Record<string, unknown> | undefined {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit,
      };
    }
    return undefined;
  }

  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return undefined;
  }
}

// ==================== Default Logger Instance ====================

/**
 * Default enhanced browser logger instance
 */
export const logger = new EnhancedBrowserLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableRenderTracking: process.env.NODE_ENV === 'development',
  enablePerformanceTracking: true,
  enableUserTracking: process.env.NODE_ENV !== 'development',
});

// ==================== Convenience Functions ====================

/**
 * Create an enhanced browser logger with specific configuration
 */
export function createBrowserLogger(config: BrowserLoggerConfig): BrowserLogger {
  return new EnhancedBrowserLogger(config);
}

/**
 * Track a component render
 */
export function trackRender(component: string, trigger: string = 'unknown', additionalData?: any): void {
  logger.trackRender({
    component,
    renderCount: 1, // This would be managed by the component
    timestamp: Date.now(),
    trigger,
    ...additionalData,
  });
}

/**
 * Track component lifecycle events
 */
export function trackLifecycle(component: string, action: 'mount' | 'unmount' | 'update', additionalData?: any): void {
  logger.trackLifecycle({
    component,
    action,
    timestamp: Date.now(),
    ...additionalData,
  });
}

/**
 * Measure and track performance impact
 */
export function measurePerformance<T>(component: string, fn: () => T): T {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;
  
  logger.trackPerformanceImpact({
    component,
    renderDuration: duration,
    timestamp: Date.now(),
    memoryUsage: logger['getMemoryUsage']?.()?.used as number,
  });
  
  return result;
}

// Export types for external use
export type {
  RenderTrackingData,
  ComponentLifecycleData,
  PerformanceImpactData,
  RenderStats
} from '../types/logging';

export default logger;