/**
 * Browser Logger - Client Utility
 *
 * Simple console-based logger for browser environment that avoids
 * importing Node.js specific modules that can cause runtime errors.
 * Extended with render tracking capabilities for race condition diagnostics.
 */

type LoggerLike = {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

// Render tracking interfaces
interface RenderTrackingData {
  component: string;
  renderCount: number;
  timestamp: number;
  trigger: string;
  props?: any;
  state?: any;
}

interface ComponentLifecycleData {
  component: string;
  action: 'mount' | 'unmount' | 'update';
  timestamp: number;
  props?: any;
  state?: any;
}

interface PerformanceImpactData {
  component: string;
  renderDuration: number;
  timestamp: number;
  memoryUsage?: number;
}

interface InfiniteRenderAlert {
  component: string;
  renderCount: number;
  timeWindow: number;
  rendersPerSecond: number;
  timestamp: number;
}

// Extended logger interface with render tracking
interface ExtendedLoggerLike extends LoggerLike {
  trackRender: (data: RenderTrackingData) => void;
  trackLifecycle: (data: ComponentLifecycleData) => void;
  trackPerformanceImpact: (data: PerformanceImpactData) => void;
  detectInfiniteRender: (component: string, threshold?: number) => boolean;
  getRenderStats: (component?: string) => RenderStats;
  clearRenderStats: (component?: string) => void;
}

interface RenderStats {
  totalRenders: number;
  averageRenderTime: number;
  lastRenderTime: number;
  infiniteRenderAlerts: number;
  mountCount: number;
  unmountCount: number;
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

// Global render tracker instance
const renderTracker = new RenderTracker();

const browserLogger: LoggerLike = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// Extended logger with render tracking capabilities
const extendedLogger: ExtendedLoggerLike = {
  ...browserLogger,
  
  trackRender: (data: RenderTrackingData) => {
    try {
      renderTracker.trackRender(data);
      
      if (process.env.NODE_ENV === 'development') {
        browserLogger.debug('[RENDER_TRACK]', {
          component: data.component,
          renderCount: data.renderCount,
          trigger: data.trigger,
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
      
      // Check for infinite renders
      renderTracker.detectInfiniteRender(data.component);
    } catch (error) {
      browserLogger.warn('Failed to track render', { component: data.component }, error);
    }
  },
  
  trackLifecycle: (data: ComponentLifecycleData) => {
    try {
      renderTracker.trackLifecycle(data);
      
      if (process.env.NODE_ENV === 'development') {
        browserLogger.debug('[LIFECYCLE_TRACK]', {
          component: data.component,
          action: data.action,
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
    } catch (error) {
      browserLogger.warn('Failed to track lifecycle', { component: data.component }, error);
    }
  },
  
  trackPerformanceImpact: (data: PerformanceImpactData) => {
    try {
      renderTracker.trackPerformanceImpact(data);
      
      if (process.env.NODE_ENV === 'development') {
        browserLogger.debug('[PERFORMANCE_TRACK]', {
          component: data.component,
          renderDuration: `${data.renderDuration.toFixed(2)}ms`,
          memoryUsage: data.memoryUsage ? `${(data.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
          timestamp: new Date(data.timestamp).toISOString()
        });
      }
      
      // Warn about slow renders
      if (data.renderDuration > 16) { // > 1 frame at 60fps
        browserLogger.warn('[SLOW_RENDER]', {
          component: data.component,
          duration: `${data.renderDuration.toFixed(2)}ms`,
          threshold: '16ms'
        });
      }
    } catch (error) {
      browserLogger.warn('Failed to track performance impact', { component: data.component }, error);
    }
  },
  
  detectInfiniteRender: (component: string, threshold = 50) => {
    try {
      return renderTracker.detectInfiniteRender(component, threshold);
    } catch (error) {
      browserLogger.warn('Failed to detect infinite render', { component }, error);
      return false;
    }
  },
  
  getRenderStats: (component?: string) => {
    try {
      return renderTracker.getRenderStats(component);
    } catch (error) {
      browserLogger.warn('Failed to get render stats', { component }, error);
      return {
        totalRenders: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        infiniteRenderAlerts: 0,
        mountCount: 0,
        unmountCount: 0
      };
    }
  },
  
  clearRenderStats: (component?: string) => {
    try {
      renderTracker.clearRenderStats(component);
      browserLogger.info('[RENDER_STATS_CLEARED]', { component: component || 'all' });
    } catch (error) {
      browserLogger.warn('Failed to clear render stats', { component }, error);
    }
  }
};

export const logger: ExtendedLoggerLike = extendedLogger;

// Export types for external use
export type {
  RenderTrackingData,
  ComponentLifecycleData,
  PerformanceImpactData,
  InfiniteRenderAlert,
  RenderStats
};

export default logger;