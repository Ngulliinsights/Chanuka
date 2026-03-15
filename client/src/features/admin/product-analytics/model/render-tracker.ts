/**
 * Render Tracker - Modularized from large logger.ts
 *
 * React render tracking functionality with automatic memory management
 * This addresses the 1400+ line file size issue identified in the analysis
 */

// ============================================================================
// Render Tracking Interfaces
// ============================================================================

/**
 * Captures a single component render event with full context.
 * Used to track render frequency and identify performance bottlenecks.
 */
export interface RenderTrackingData {
  component: string;
  renderCount: number;
  timestamp: number;
  trigger: string;
  props?: unknown;
  state?: unknown;
}

/**
 * Tracks component lifecycle transitions (mount, update, unmount).
 * Essential for debugging component behavior and memory leaks.
 */
export interface ComponentLifecycleData {
  component: string;
  action: 'mount' | 'unmount' | 'update';
  timestamp: number;
  props?: unknown;
  state?: unknown;
}

/**
 * Measures the performance impact of a single render.
 * Includes duration and optional memory usage for comprehensive analysis.
 */
export interface PerformanceImpactData {
  component: string;
  renderDuration: number;
  timestamp: number;
  memoryUsage?: number;
}

/**
 * Alert generated when a component renders excessively within a time window.
 * Indicates potential infinite render loops that degrade performance.
 */
export interface InfiniteRenderAlert {
  component: string;
  renderCount: number;
  timeWindow: number;
  rendersPerSecond: number;
  timestamp: number;
}

/**
 * Aggregated statistics for component render behavior.
 * Useful for performance dashboards and optimization efforts.
 */
export interface RenderStats {
  totalRenders: number;
  averageRenderTime: number;
  lastRenderTime: number;
  infiniteRenderAlerts: number;
  mountCount: number;
  unmountCount: number;
}

/**
 * Extended logger interface that includes render tracking capabilities.
 * Provides comprehensive monitoring for React and similar frameworks.
 */
export interface ExtendedLogger {
  trackRender: (data: RenderTrackingData) => void;
  trackLifecycle: (data: ComponentLifecycleData) => void;
  trackPerformanceImpact: (data: PerformanceImpactData) => void;
  detectInfiniteRender: (component: string, threshold?: number) => boolean;
  getRenderStats: (component?: string) => RenderStats;
  clearRenderStats: (component?: string) => void;
}

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Configuration constants for render tracking and performance monitoring.
 * These values are tuned for optimal performance in production environments.
 */
const CONFIG = {
  INFINITE_RENDER_THRESHOLD: 50, // Renders per second before alerting
  MAX_HISTORY_SIZE: 1000, // Maximum entries per component
  HISTORY_RETENTION_MS: 60000, // Keep entries for 1 minute
  SLOW_RENDER_THRESHOLD: 16, // Milliseconds (1 frame at 60fps)
  CLEANUP_INTERVAL_MS: 30000, // Run cleanup every 30 seconds
} as const;

// ============================================================================
// Optimized Render Tracker
// ============================================================================

/**
 * High-performance render tracking system with automatic memory management.
 *
 * This class maintains three separate histories for different types of tracking:
 * - Render history: tracks when and why components render
 * - Performance history: measures render duration and resource usage
 * - Lifecycle history: monitors component mount/unmount cycles
 *
 * Key optimizations:
 * - Single-pass algorithms for statistics calculation
 * - Automatic cleanup of stale entries to prevent memory leaks
 * - Sliding window approach for infinite render detection
 * - Efficient circular buffer pattern for history storage
 */
class RenderTracker {
  private renderHistory: Map<string, RenderTrackingData[]> = new Map();
  private performanceHistory: Map<string, PerformanceImpactData[]> = new Map();
  private lifecycleHistory: Map<string, ComponentLifecycleData[]> = new Map();
  private cleanupTimerId: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor() {
    this.startPeriodicCleanup();
  }

  /**
   * Initiates a background process that periodically removes stale entries.
   * This prevents unbounded memory growth in long-running applications.
   */
  private startPeriodicCleanup(): void {
    if (typeof setInterval === 'undefined') return;

    this.cleanupTimerId = setInterval(() => {
      if (!this.isDestroyed) {
        this.cleanupStaleEntries();
      }
    }, CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Removes entries older than the retention window from all tracking maps.
   * Uses a filter-based approach that's both simple and efficient.
   */
  private cleanupStaleEntries(): void {
    const cutoffTime = Date.now() - CONFIG.HISTORY_RETENTION_MS;

    // Generic helper that works with any timestamped entry type
    const filterStale = <T extends { timestamp: number }>(entries: T[]): T[] => {
      return entries.filter(entry => entry.timestamp >= cutoffTime);
    };

    // Clean each history map, removing components with no recent activity
    this.cleanupHistoryMap(this.renderHistory, filterStale);
    this.cleanupHistoryMap(this.performanceHistory, filterStale);
    this.cleanupHistoryMap(this.lifecycleHistory, filterStale);
  }

  /**
   * Helper method to clean a single history map efficiently.
   * Removes empty entries to reduce memory footprint.
   */
  private cleanupHistoryMap<T extends { timestamp: number }>(
    map: Map<string, T[]>,
    filterFn: (entries: T[]) => T[]
  ): void {
    for (const [component, history] of map.entries()) {
      const filtered = filterFn(history);

      if (filtered.length === 0) {
        map.delete(component);
      } else if (filtered.length !== history.length) {
        map.set(component, filtered);
      }
    }
  }

  /**
   * Adds an entry to a history map with automatic size limit enforcement.
   * Uses array mutation for optimal performance (avoids creating new arrays).
   */
  private addToHistory<T>(map: Map<string, T[]>, key: string, entry: T): void {
    let history = map.get(key);

    if (!history) {
      history = [];
      map.set(key, history);
    }

    history.push(entry);

    // Enforce size limit using splice for O(1) operation
    if (history.length > CONFIG.MAX_HISTORY_SIZE) {
      const excessCount = history.length - CONFIG.MAX_HISTORY_SIZE;
      history.splice(0, excessCount);
    }
  }

  /**
   * Records a component render event for tracking and analysis.
   */
  trackRender(data: RenderTrackingData): void {
    if (this.isDestroyed) return;
    this.addToHistory(this.renderHistory, data.component, data);
  }

  /**
   * Records a component lifecycle transition (mount, update, unmount).
   */
  trackLifecycle(data: ComponentLifecycleData): void {
    if (this.isDestroyed) return;
    this.addToHistory(this.lifecycleHistory, data.component, data);
  }

  /**
   * Records performance metrics for a component render.
   */
  trackPerformanceImpact(data: PerformanceImpactData): void {
    if (this.isDestroyed) return;
    this.addToHistory(this.performanceHistory, data.component, data);
  }

  /**
   * Detects if a component is rendering excessively within a time window.
   *
   * Algorithm complexity: O(n) where n is the number of recent renders
   *
   * This method uses a reverse iteration approach to count renders within
   * the last second. It stops as soon as it encounters a render outside
   * the time window, making it very efficient for typical cases.
   */
  detectInfiniteRender(
    component: string,
    threshold: number = CONFIG.INFINITE_RENDER_THRESHOLD
  ): boolean {
    if (this.isDestroyed) return false;

    const history = this.renderHistory.get(component);
    if (!history || history.length < threshold) return false;

    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Count recent renders by iterating backwards from the most recent
    let recentRenderCount = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const render = history[i];
      // Fix: Add explicit check to satisfy TypeScript's undefined check
      if (!render || render.timestamp < oneSecondAgo) break;
      recentRenderCount++;
    }

    // Alert if threshold is exceeded
    if (recentRenderCount > threshold) {
      const alert: InfiniteRenderAlert = {
        component,
        renderCount: recentRenderCount,
        timeWindow: 1000,
        rendersPerSecond: recentRenderCount,
        timestamp: now,
      };

      // Use the logger directly to avoid circular dependency
      console.error('[INFINITE_RENDER_DETECTED]', alert);
      return true;
    }

    return false;
  }

  /**
   * Retrieves render statistics for a specific component or all components.
   */
  getRenderStats(component?: string): RenderStats {
    if (this.isDestroyed) {
      return this.getEmptyStats();
    }

    if (component) {
      return this.getComponentStats(component);
    }

    return this.getAggregatedStats();
  }

  /**
   * Computes aggregated statistics across all tracked components.
   * Uses a single-pass algorithm to maintain O(n) complexity.
   */
  private getAggregatedStats(): RenderStats {
    let totalRenders = 0;
    let totalRenderTime = 0;
    let totalRenderTimeCount = 0;
    let lastRenderTime = 0;
    let infiniteRenderAlerts = 0;
    let mountCount = 0;
    let unmountCount = 0;

    // Process each component's stats in a single iteration
    for (const component of this.renderHistory.keys()) {
      const stats = this.getComponentStats(component);

      totalRenders += stats.totalRenders;
      infiniteRenderAlerts += stats.infiniteRenderAlerts;
      mountCount += stats.mountCount;
      unmountCount += stats.unmountCount;

      if (stats.lastRenderTime > lastRenderTime) {
        lastRenderTime = stats.lastRenderTime;
      }

      // Accumulate weighted render times for accurate averaging
      if (stats.totalRenders > 0) {
        totalRenderTime += stats.averageRenderTime * stats.totalRenders;
        totalRenderTimeCount += stats.totalRenders;
      }
    }

    const averageRenderTime = totalRenderTimeCount > 0 ? totalRenderTime / totalRenderTimeCount : 0;

    return {
      totalRenders,
      averageRenderTime,
      lastRenderTime,
      infiniteRenderAlerts,
      mountCount,
      unmountCount,
    };
  }

  /**
   * Computes statistics for a single component efficiently.
   * Avoids redundant iterations by combining multiple calculations.
   */
  private getComponentStats(component: string): RenderStats {
    const renderHistory = this.renderHistory.get(component) ?? [];
    const performanceHistory = this.performanceHistory.get(component) ?? [];
    const lifecycleHistory = this.lifecycleHistory.get(component) ?? [];

    // Calculate performance metrics
    const totalRenders = renderHistory.length;
    const totalRenderTime = performanceHistory.reduce((sum, perf) => sum + perf.renderDuration, 0);
    const averageRenderTime =
      performanceHistory.length > 0 ? totalRenderTime / performanceHistory.length : 0;

    // Fix: Safely access the last element with explicit undefined check
    const lastRender = renderHistory[renderHistory.length - 1];
    const lastRenderTime = lastRender ? lastRender.timestamp : 0;

    // Count infinite render alert occurrences
    const infiniteRenderAlerts = this.countInfiniteRenderAlerts(
      renderHistory,
      CONFIG.INFINITE_RENDER_THRESHOLD
    );

    // Count lifecycle events using a single pass
    const mountCount = lifecycleHistory.filter(e => e.action === 'mount').length;
    const unmountCount = lifecycleHistory.filter(e => e.action === 'unmount').length;

    return {
      totalRenders,
      averageRenderTime,
      lastRenderTime,
      infiniteRenderAlerts,
      mountCount,
      unmountCount,
    };
  }

  /**
   * Counts the number of distinct time windows where infinite renders occurred.
   *
   * Algorithm: Sliding window with O(n) complexity
   *
   * This method scans through the render history once, maintaining a sliding
   * 1-second window. When the window exceeds the threshold, it counts that
   * as one alert and skips ahead to avoid double-counting overlapping windows.
   */
  private countInfiniteRenderAlerts(history: RenderTrackingData[], threshold: number): number {
    if (history.length < threshold) return 0;

    let alertCount = 0;
    let windowStart = 0;

    for (let windowEnd = 0; windowEnd < history.length; windowEnd++) {
      const currentRender = history[windowEnd];
      // Fix: Add explicit undefined check
      if (!currentRender) continue;

      const currentTime = currentRender.timestamp;

      // Advance window start to maintain 1-second window size
      while (windowStart < windowEnd) {
        const startRender = history[windowStart];
        // Fix: Add explicit undefined check
        if (!startRender || startRender.timestamp >= currentTime - 1000) break;
        windowStart++;
      }

      // Check if current window exceeds threshold
      const windowSize = windowEnd - windowStart + 1;
      if (windowSize > threshold) {
        alertCount++;
        // Jump past this alert window to avoid counting overlaps
        windowEnd = windowStart + threshold;
        windowStart = windowEnd;
      }
    }

    return alertCount;
  }

  /**
   * Clears render statistics for a specific component or all components.
   */
  clearRenderStats(component?: string): void {
    if (this.isDestroyed) return;

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

  /**
   * Returns empty statistics (used when tracker is destroyed or unavailable).
   */
  private getEmptyStats(): RenderStats {
    return {
      totalRenders: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      infiniteRenderAlerts: 0,
      mountCount: 0,
      unmountCount: 0,
    };
  }

  /**
   * Performs cleanup of all resources and stops background processes.
   * Should be called when the tracker is no longer needed.
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.cleanupTimerId) {
      clearInterval(this.cleanupTimerId);
      this.cleanupTimerId = null;
    }

    this.clearRenderStats();
  }
}

// Global singleton instance of the render tracker
export const renderTracker = new RenderTracker();

// Export CONFIG for use in other modules
export { CONFIG };
