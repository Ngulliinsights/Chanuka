/**
 * Performance Optimization Utilities
 * 
 * A comprehensive performance optimization toolkit that provides:
 * - Real-time performance monitoring with minimal overhead
 * - Memory leak detection with proper cleanup
 * - Network request tracking using modern APIs
 * - React hooks for component-level optimization
 * - Detailed performance reporting and recommendations
 */

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { logger } from './logger'

// Performance budgets representing ideal thresholds for various metrics
// These are based on industry standards and Core Web Vitals recommendations
const PERFORMANCE_BUDGETS = {
  RENDER_TIME: 16, // 60fps requires each frame to complete within 16.67ms
  BUNDLE_SIZE: 500 * 1024, // 500KB for initial bundle (mobile-first)
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB threshold for memory warnings
  NETWORK_TIMEOUT: 5000, // 5 seconds before considering a request slow
  INTERACTION_DELAY: 100, // 100ms for user interactions to feel instant
  LONG_TASK_THRESHOLD: 50, // Tasks longer than 50ms block the main thread
} as const

// Type definitions for better type safety and IDE support
export interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  chunkCount: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: string[];
  }>;
  duplicateModules: string[];
  unusedExports: string[];
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  evictions: number;
  averageResponseTime: number;
}

export interface OptimizationRecommendations {
  bundleOptimizations: string[];
  cacheOptimizations: string[];
  renderOptimizations: string[];
  networkOptimizations: string[];
  memoryOptimizations: string[];
  performanceOptimizations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface NetworkRequestMetrics {
  url: string;
  duration: number;
  timestamp: number;
  status?: number;
}

interface RenderMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

/**
 * Core Performance Optimizer Class
 * 
 * This singleton manages all performance monitoring activities. It uses modern
 * Performance APIs and maintains a minimal memory footprint by limiting history size.
 * The class implements proper cleanup to prevent memory leaks.
 */
class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  
  // Store component render times with automatic cleanup
  private renderTimes: Map<string, RenderMetrics[]> = new Map()
  
  // Memory usage tracking with size limits
  private memoryUsage: Array<{ timestamp: number; usage: number }> = []
  
  // Network request tracking with automatic expiration
  private networkRequests: Map<string, NetworkRequestMetrics> = new Map()
  
  // Performance observers for modern browser APIs
  private observers: PerformanceObserver[] = []
  
  // Interval IDs for cleanup
  private intervals: number[] = []
  
  // Configuration for data retention
  private readonly MAX_RENDER_HISTORY = 50
  private readonly MAX_MEMORY_SAMPLES = 100
  private readonly MAX_NETWORK_HISTORY = 100
  private readonly MEMORY_CHECK_INTERVAL = 10000 // 10 seconds
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  private constructor() {
    // Only initialize if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.initializeMonitoring()
      this.startPeriodicCleanup()
    }
  }

  /**
   * Initialize all performance monitoring systems
   * Each monitor is wrapped in error handling to ensure one failure doesn't break others
   */
  private initializeMonitoring() {
    this.monitorLongTasks()
    this.monitorMemoryUsage()
    this.monitorResourceTiming()
    this.monitorLayoutShifts()
  }

  /**
   * Monitor long tasks that block the main thread
   * Long tasks are operations that take more than 50ms and prevent user interactions
   */
  private monitorLongTasks() {
    if (!('PerformanceObserver' in window)) return

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only report tasks that exceed our threshold to reduce noise
          if (entry.duration > PERFORMANCE_BUDGETS.LONG_TASK_THRESHOLD) {
            logger.warn('Long task detected - this blocks user interactions', {
              component: 'PerformanceOptimizer',
              duration: `${entry.duration.toFixed(2)}ms`,
              name: entry.name,
              startTime: `${entry.startTime.toFixed(2)}ms`,
            })
            
            this.suggestOptimizations('long-task', {
              duration: entry.duration,
              name: entry.name,
            })
          }
        }
      })
      
      // The 'longtask' entry type is part of the Long Tasks API
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    } catch (error) {
      // Some browsers don't support the Long Tasks API yet
      logger.debug('Long task observer not available in this browser', {
        component: 'PerformanceOptimizer'
      })
    }
  }

  /**
   * Monitor Cumulative Layout Shift (CLS) for visual stability
   * CLS measures unexpected layout shifts that can frustrate users
   */
  private monitorLayoutShifts() {
    if (!('PerformanceObserver' in window)) return

    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Cast to layout-shift specific entry type
          const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          
          // Only track shifts not caused by user input
          if (!layoutShift.hadRecentInput && layoutShift.value > 0.1) {
            logger.warn('Significant layout shift detected', {
              component: 'PerformanceOptimizer',
              value: layoutShift.value.toFixed(4),
              startTime: `${layoutShift.startTime.toFixed(2)}ms`,
            })
          }
        }
      })
      
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
    } catch (error) {
      logger.debug('Layout shift observer not available', {
        component: 'PerformanceOptimizer'
      })
    }
  }

  /**
   * Monitor memory usage and detect potential memory leaks
   * Note: The memory API is non-standard and only available in Chrome
   */
  private monitorMemoryUsage() {
    // Check if the memory API is available (Chrome-only feature)
    const hasMemoryAPI = 'memory' in performance && (performance as any).memory

    if (!hasMemoryAPI) {
      logger.debug('Memory monitoring not available (Chrome-only feature)', {
        component: 'PerformanceOptimizer'
      })
      return
    }

    const memoryCheckInterval = window.setInterval(() => {
      try {
        const memory = (performance as any).memory
        const currentUsage = memory.usedJSHeapSize
        const timestamp = Date.now()
        
        this.memoryUsage.push({ timestamp, usage: currentUsage })
        
        // Limit memory samples to prevent this monitor from causing memory issues
        if (this.memoryUsage.length > this.MAX_MEMORY_SAMPLES) {
          this.memoryUsage.shift()
        }
        
        // Analyze trend only when we have enough data points
        if (this.memoryUsage.length >= 10) {
          const recent = this.memoryUsage.slice(-10)
          const trend = this.calculateMemoryTrend(recent)
          
          // Alert if memory is growing consistently and exceeds budget
          if (trend > 0.1 && currentUsage > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
            const usageMB = Math.round(currentUsage / 1024 / 1024)
            const trendPercent = Math.round(trend * 100)
            
            logger.warn('Potential memory leak - consistent memory growth detected', {
              component: 'PerformanceOptimizer',
              currentUsage: `${usageMB}MB`,
              trend: `+${trendPercent}%`,
              recommendation: 'Check for uncleaned event listeners and intervals',
            })
            
            this.suggestOptimizations('memory-leak', {
              currentUsage,
              trend,
            })
          }
        }
      } catch (error) {
        logger.error('Memory monitoring failed', {
          component: 'PerformanceOptimizer',
          error,
        })
      }
    }, this.MEMORY_CHECK_INTERVAL)
    
    this.intervals.push(memoryCheckInterval)
  }

  /**
   * Monitor resource loading times using the Resource Timing API
   * This is more reliable than intercepting fetch and works for all resource types
   */
  private monitorResourceTiming() {
    if (!('PerformanceObserver' in window)) return

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming
          
          // Focus on API calls and large resources
          const isAPICall = resourceEntry.name.includes('/api/')
          const duration = resourceEntry.responseEnd - resourceEntry.startTime
          
          if (duration > PERFORMANCE_BUDGETS.NETWORK_TIMEOUT || isAPICall) {
            const metrics: NetworkRequestMetrics = {
              url: resourceEntry.name,
              duration,
              timestamp: Date.now(),
            }
            
            // Store with URL as key, automatically replacing older entries
            this.networkRequests.set(resourceEntry.name, metrics)
            
            if (duration > PERFORMANCE_BUDGETS.NETWORK_TIMEOUT) {
              logger.warn('Slow resource loading detected', {
                component: 'PerformanceOptimizer',
                url: resourceEntry.name,
                duration: `${Math.round(duration)}ms`,
                size: resourceEntry.transferSize ? `${Math.round(resourceEntry.transferSize / 1024)}KB` : 'unknown',
              })
              
              this.suggestOptimizations('slow-network', {
                url: resourceEntry.name,
                duration,
              })
            }
          }
        }
      })
      
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (error) {
      logger.debug('Resource timing observer not available', {
        component: 'PerformanceOptimizer'
      })
    }
  }

  /**
   * Start periodic cleanup to prevent unbounded memory growth
   * This removes old entries from our tracking maps
   */
  private startPeriodicCleanup() {
    const cleanupInterval = window.setInterval(() => {
      const now = Date.now()
      const ONE_HOUR = 60 * 60 * 1000

      // Clean old render metrics
      this.renderTimes.forEach((metrics, componentName) => {
        const recent = metrics.filter(m => now - m.timestamp < ONE_HOUR)
        if (recent.length === 0) {
          this.renderTimes.delete(componentName)
        } else {
          this.renderTimes.set(componentName, recent)
        }
      })

      // Clean old network metrics
      if (this.networkRequests.size > this.MAX_NETWORK_HISTORY) {
        const entries = Array.from(this.networkRequests.entries())
        const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
        this.networkRequests = new Map(sorted.slice(0, this.MAX_NETWORK_HISTORY))
      }
    }, this.CLEANUP_INTERVAL)
    
    this.intervals.push(cleanupInterval)
  }

  /**
   * Calculate memory usage trend to detect memory leaks
   * A positive trend indicates growing memory usage
   */
  private calculateMemoryTrend(samples: Array<{ timestamp: number; usage: number }>): number {
    if (samples.length < 2) return 0

    const firstSample = samples[0]
    const lastSample = samples[samples.length - 1]

    if (!firstSample || !lastSample) return 0

    const first = firstSample.usage
    const last = lastSample.usage

    if (!first || first === 0) return 0

    return (last - first) / first
  }

  /**
   * Generate contextual optimization suggestions based on detected issues
   */
  private suggestOptimizations(type: string, data: any) {
    const suggestions = this.getOptimizationSuggestions(type, data)
    
    if (suggestions.length > 0) {
      logger.info('Performance optimization suggestions available', {
        component: 'PerformanceOptimizer',
        type,
        suggestions,
      })
    }
  }

  /**
   * Get specific optimization suggestions based on the performance issue type
   * These suggestions are actionable and prioritized by impact
   */
  private getOptimizationSuggestions(type: string, data: any): string[] {
    const suggestions: string[] = []
    
    switch (type) {
      case 'long-task':
        suggestions.push('Break down large operations into smaller chunks using requestIdleCallback')
        suggestions.push('Implement virtual scrolling for lists with many items')
        suggestions.push('Defer non-critical JavaScript execution')
        
        if (data.duration > 100) {
          suggestions.push('Move heavy computations to a Web Worker to free the main thread')
        }
        
        if (data.name?.includes('script')) {
          suggestions.push('Consider code splitting to reduce initial JavaScript execution')
        }
        break
        
      case 'memory-leak':
        suggestions.push('Verify all useEffect cleanup functions return proper cleanup')
        suggestions.push('Check for uncleared setInterval and setTimeout')
        suggestions.push('Ensure event listeners are removed when components unmount')
        suggestions.push('Review closures that might hold references to large objects')
        suggestions.push('Consider using WeakMap or WeakSet for temporary object references')
        break
        
      case 'slow-network':
        suggestions.push('Implement request caching with appropriate cache headers')
        suggestions.push('Add timeout handling for network requests')
        suggestions.push('Consider request deduplication for identical concurrent requests')
        
        if (data.url.includes('/api/')) {
          suggestions.push('Optimize API response payload size')
          suggestions.push('Implement pagination for large data sets')
          suggestions.push('Consider using GraphQL to request only needed fields')
        }
        
        if (data.duration > 10000) {
          suggestions.push('Add loading indicators to improve perceived performance')
        }
        break
        
      case 'slow-render':
        suggestions.push('Wrap expensive components with React.memo')
        suggestions.push('Use useMemo for expensive calculations')
        suggestions.push('Use useCallback to prevent unnecessary re-renders')
        suggestions.push('Check if you can lazy load this component')
        suggestions.push('Profile with React DevTools to identify bottlenecks')
        break
    }
    
    return suggestions
  }

  /**
   * Track individual component render times
   * This helps identify which components need optimization
   */
  public trackRender(componentName: string, renderTime: number) {
    const metric: RenderMetrics = {
      componentName,
      renderTime,
      timestamp: Date.now(),
    }
    
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }
    
    const times = this.renderTimes.get(componentName)!
    times.push(metric)
    
    // Limit history to prevent memory issues
    if (times.length > this.MAX_RENDER_HISTORY) {
      times.shift()
    }
    
    // Alert on slow renders
    if (renderTime > PERFORMANCE_BUDGETS.RENDER_TIME) {
      logger.warn('Slow component render detected', {
        component: 'PerformanceOptimizer',
        componentName,
        renderTime: `${renderTime.toFixed(2)}ms`,
        threshold: `${PERFORMANCE_BUDGETS.RENDER_TIME}ms`,
      })
    }
    
    // Check for performance degradation over time
    if (times.length >= 10) {
      const recent = times.slice(-10)
      const average = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length
      
      if (average > PERFORMANCE_BUDGETS.RENDER_TIME * 1.5) {
        this.suggestOptimizations('slow-render', {
          componentName,
          averageRenderTime: average,
        })
      }
    }
  }

  /**
   * Generate a comprehensive performance report
   */
  public getPerformanceReport() {
    const renderTimesSummary: Record<string, { average: number; max: number; count: number }> = {}
    
    this.renderTimes.forEach((metrics, componentName) => {
      const times = metrics.map(m => m.renderTime)
      renderTimesSummary[componentName] = {
        average: times.reduce((sum, t) => sum + t, 0) / times.length,
        max: Math.max(...times),
        count: times.length,
      }
    })
    
    return {
      renderTimes: renderTimesSummary,
      memoryUsage: this.memoryUsage.slice(-10).map(m => ({
        timestamp: new Date(m.timestamp).toISOString(),
        usageMB: Math.round(m.usage / 1024 / 1024),
      })),
      networkRequests: Array.from(this.networkRequests.values()).slice(-10),
      budgets: PERFORMANCE_BUDGETS,
    }
  }

  /**
   * Export a complete performance report including all metrics and recommendations
   */
  public exportPerformanceReport() {
    const report = this.getPerformanceReport()
    
    return {
      ...report,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      bundleMetrics: this.getBundleMetrics(),
      cacheMetrics: this.getCacheMetrics(),
      recommendations: this.getOptimizationRecommendations(),
      performanceEntries: this.getWebVitals(),
    }
  }

  /**
   * Collect Core Web Vitals using the Performance API
   */
  private getWebVitals() {
    const vitals: Record<string, number> = {}
    
    try {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        vitals.ttfb = navigation.responseStart - navigation.requestStart
        vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        vitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart
      }
      
      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint')
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          vitals.fcp = entry.startTime
        } else if (entry.name === 'first-paint') {
          vitals.fp = entry.startTime
        }
      })
    } catch (error) {
      logger.debug('Could not collect Web Vitals', { component: 'PerformanceOptimizer' })
    }
    
    return vitals
  }

  /**
   * Get bundle metrics (mock implementation - in production, integrate with webpack-bundle-analyzer)
   */
  public getBundleMetrics(): BundleMetrics {
    return {
      totalSize: 250000,
      gzippedSize: 75000,
      jsSize: 180000,
      cssSize: 45000,
      imageSize: 25000,
      chunkCount: 8,
      chunks: [],
      duplicateModules: [],
      unusedExports: [],
    }
  }

  /**
   * Get cache metrics (mock implementation - in production, integrate with your caching layer)
   */
  public getCacheMetrics(): CacheMetrics {
    return {
      hitRate: 85.5,
      missRate: 14.5,
      totalRequests: 1250,
      cacheSize: 2048000,
      evictions: 12,
      averageResponseTime: 45,
    }
  }

  /**
   * Generate optimization recommendations based on current metrics
   */
  public getOptimizationRecommendations(): OptimizationRecommendations {
    const recommendations: OptimizationRecommendations = {
      bundleOptimizations: [],
      cacheOptimizations: [],
      renderOptimizations: [],
      networkOptimizations: [],
      memoryOptimizations: [],
      performanceOptimizations: [],
      priority: 'medium',
    }
    
    // Analyze render performance
    const slowComponents = Array.from(this.renderTimes.entries())
      .filter(([_, metrics]) => {
        const recent = metrics.slice(-5)
        const avg = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length
        return avg > PERFORMANCE_BUDGETS.RENDER_TIME
      })
    
    if (slowComponents.length > 0) {
      recommendations.renderOptimizations.push(
        `${slowComponents.length} component(s) have slow render times: ${slowComponents.map(([name]) => name).join(', ')}`
      )
      recommendations.priority = 'high'
    }
    
    // Analyze memory
    if (this.memoryUsage.length > 0) {
      const latest = this.memoryUsage[this.memoryUsage.length - 1]
      if (latest && latest.usage > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
        recommendations.memoryOptimizations.push('Memory usage exceeds recommended threshold')
        recommendations.priority = 'high'
      }
    }
    
    // Analyze network
    const slowRequests = Array.from(this.networkRequests.values())
      .filter(req => req.duration > PERFORMANCE_BUDGETS.NETWORK_TIMEOUT)
    
    if (slowRequests.length > 0) {
      recommendations.networkOptimizations.push(
        `${slowRequests.length} slow network request(s) detected`
      )
    }
    
    // General recommendations
    recommendations.bundleOptimizations.push('Enable tree shaking', 'Implement code splitting')
    recommendations.cacheOptimizations.push('Increase cache TTL for static assets')
    recommendations.performanceOptimizations.push('Optimize image loading', 'Consider lazy loading')
    
    return recommendations
  }

  /**
   * Clean up all monitoring and free resources
   * Important: Call this before destroying the instance
   */
  public cleanup() {
    // Disconnect all performance observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        logger.debug('Observer disconnect failed', { component: 'PerformanceOptimizer' })
      }
    })
    this.observers = []
    
    // Clear all intervals
    this.intervals.forEach(intervalId => clearInterval(intervalId))
    this.intervals = []
    
    // Clear all data structures
    this.renderTimes.clear()
    this.memoryUsage = []
    this.networkRequests.clear()
  }
}

/**
 * React hook for tracking component render performance
 * Automatically measures render time and reports to the optimizer
 */
export function usePerformanceTracking(componentName: string) {
  const startTimeRef = useRef<number>(0)
  const optimizer = useMemo(() => PerformanceOptimizer.getInstance(), [])

  useEffect(() => {
    startTimeRef.current = performance.now()
    
    return () => {
      if (startTimeRef.current > 0) {
        const renderTime = performance.now() - startTimeRef.current
        optimizer.trackRender(componentName, renderTime)
      }
    }
  })

  return optimizer
}

/**
 * Enhanced callback hook with built-in debouncing
 * Reduces unnecessary executions of expensive functions
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debounceMs = 0
): T {
  const timeoutRef = useRef<number>()
  const mountedRef = useRef(true)
  
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      if (debounceMs > 0) {
        timeoutRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            callback(...args)
          }
        }, debounceMs)
      } else {
        callback(...args)
      }
    }) as T,
    [...deps, debounceMs]
  )
}

/**
 * State hook with automatic history management
 * Useful for undo/redo functionality with memory safety
 */
export function useMemoryOptimizedState<T>(
  initialValue: T,
  maxHistorySize = 10
): [T, (value: T | ((prev: T) => T)) => void, T[]] {
  const [current, setCurrent] = useState<T>(initialValue)
  const historyRef = useRef<T[]>([initialValue])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setCurrent(prevValue => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prevValue)
        : value
      
      historyRef.current.push(newValue)
      
      // Prevent unbounded growth by limiting history
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current = historyRef.current.slice(-maxHistorySize)
      }
      
      return newValue
    })
  }, [maxHistorySize])

  return [current, setValue, historyRef.current]
}

/**
 * Enhanced lazy loading with optional preloading
 * Allows you to preload components before they're needed
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  preloadCondition?: () => boolean
) {
  const LazyComponent = React.lazy(importFn)
  
  // Preload immediately if condition is met (e.g., user is hovering over a link)
  if (preloadCondition?.()) {
    importFn().catch(error => {
      logger.warn('Component preload failed', {
        component: 'lazyWithPreload',
        error,
      })
    })
  }
  
  return LazyComponent
}

/**
 * Main hook for accessing performance optimization features
 * Provides a convenient interface for component-level optimization
 */
export function usePerformanceOptimization(componentName: string = 'UnknownComponent') {
  const optimizer = usePerformanceTracking(componentName)

  return useMemo(() => ({
    getBundleMetrics: () => Promise.resolve(optimizer.getBundleMetrics()),
    getCacheMetrics: () => Promise.resolve(optimizer.getCacheMetrics()),
    getLatestRecommendations: () => Promise.resolve(optimizer.getOptimizationRecommendations()),
    trackRender: (renderTime: number) => optimizer.trackRender(componentName, renderTime),
    getPerformanceReport: () => optimizer.getPerformanceReport(),
  }), [optimizer, componentName])
}

// Export singleton instance for direct access
export const performanceOptimizer = PerformanceOptimizer.getInstance()

// Automatic cleanup when the page unloads
// This prevents memory leaks and ensures clean shutdown
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceOptimizer.cleanup()
  })
}