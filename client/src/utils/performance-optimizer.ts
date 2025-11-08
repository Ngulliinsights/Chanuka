/**
 * Performance Optimization Utilities
 * 
 * A comprehensive performance optimization toolkit that addresses
 * the current performance issues in the application.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { logger } from './browser-logger'

// Performance budgets and thresholds
const PERFORMANCE_BUDGETS = {
  RENDER_TIME: 16, // 60fps = 16.67ms per frame
  BUNDLE_SIZE: 500 * 1024, // 500KB
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  NETWORK_TIMEOUT: 5000, // 5 seconds
  INTERACTION_DELAY: 100, // 100ms for interactions
} as const

// Performance monitoring
class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private renderTimes: Map<string, number[]> = new Map()
  private memoryUsage: number[] = []
  private networkRequests: Map<string, number> = new Map()
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  private constructor() {
    this.initializeMonitoring()
  }

  private initializeMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > PERFORMANCE_BUDGETS.RENDER_TIME) {
              logger.warn('Long task detected', {
                component: 'PerformanceOptimizer',
                duration: entry.duration,
                name: entry.name,
                startTime: entry.startTime,
              })
              
              // Suggest optimizations
              this.suggestOptimizations('long-task', {
                duration: entry.duration,
                name: entry.name,
              })
            }
          }
        })
        
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        this.observers.push(longTaskObserver)
      } catch (error) {
        logger.warn('Long task observer not supported', { component: 'PerformanceOptimizer' })
      }
    }

    // Monitor memory usage
    this.monitorMemoryUsage()
    
    // Monitor network requests
    this.monitorNetworkRequests()
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        const currentUsage = memory.usedJSHeapSize
        
        this.memoryUsage.push(currentUsage)
        
        // Keep only last 100 measurements
        if (this.memoryUsage.length > 100) {
          this.memoryUsage.shift()
        }
        
        // Check for memory leaks
        if (this.memoryUsage.length >= 10) {
          const recent = this.memoryUsage.slice(-10)
          const trend = this.calculateTrend(recent)
          
          if (trend > 0.1 && currentUsage > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
            logger.warn('Potential memory leak detected', {
              component: 'PerformanceOptimizer',
              currentUsage: Math.round(currentUsage / 1024 / 1024) + 'MB',
              trend: Math.round(trend * 100) + '%',
            })
            
            this.suggestOptimizations('memory-leak', {
              currentUsage,
              trend,
            })
          }
        }
      }, 10000) // Check every 10 seconds
    }
  }

  private monitorNetworkRequests() {
    // Override fetch to monitor network performance
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        const duration = endTime - startTime
        
        this.networkRequests.set(url, duration)
        
        if (duration > PERFORMANCE_BUDGETS.NETWORK_TIMEOUT) {
          logger.warn('Slow network request detected', {
            component: 'PerformanceOptimizer',
            url,
            duration: Math.round(duration) + 'ms',
          })
          
          this.suggestOptimizations('slow-network', {
            url,
            duration,
          })
        }
        
        return response
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        logger.error('Network request failed', {
          component: 'PerformanceOptimizer',
          url,
          duration: Math.round(duration) + 'ms',
          error,
        })
        
        throw error
      }
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const first = values[0]
    const last = values[values.length - 1]
    
    return (last - first) / first
  }

  private suggestOptimizations(type: string, data: any) {
    const suggestions = this.getOptimizationSuggestions(type, data)
    
    if (suggestions.length > 0) {
      logger.info('Performance optimization suggestions', {
        component: 'PerformanceOptimizer',
        type,
        suggestions,
        data,
      })
    }
  }

  private getOptimizationSuggestions(type: string, data: any): string[] {
    const suggestions: string[] = []
    
    switch (type) {
      case 'long-task':
        suggestions.push('Consider breaking down large operations into smaller chunks')
        suggestions.push('Use requestIdleCallback for non-critical work')
        suggestions.push('Implement virtual scrolling for large lists')
        if (data.duration > 100) {
          suggestions.push('Consider moving heavy computations to a Web Worker')
        }
        break
        
      case 'memory-leak':
        suggestions.push('Check for uncleared intervals and timeouts')
        suggestions.push('Ensure event listeners are properly removed')
        suggestions.push('Review component cleanup in useEffect')
        suggestions.push('Consider using WeakMap/WeakSet for temporary references')
        break
        
      case 'slow-network':
        suggestions.push('Implement request caching')
        suggestions.push('Add request timeout handling')
        suggestions.push('Consider request deduplication')
        if (data.url.includes('/api/')) {
          suggestions.push('Optimize API response size')
          suggestions.push('Implement pagination for large datasets')
        }
        break
    }
    
    return suggestions
  }

  // Public methods for component optimization
  public trackRender(componentName: string, renderTime: number) {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }
    
    const times = this.renderTimes.get(componentName)!
    times.push(renderTime)
    
    // Keep only last 50 render times
    if (times.length > 50) {
      times.shift()
    }
    
    // Check for slow renders
    if (renderTime > PERFORMANCE_BUDGETS.RENDER_TIME) {
      logger.warn('Slow render detected', {
        component: 'PerformanceOptimizer',
        componentName,
        renderTime: Math.round(renderTime * 100) / 100 + 'ms',
      })
    }
    
    // Check for render performance degradation
    if (times.length >= 10) {
      const recent = times.slice(-10)
      const average = recent.reduce((sum, time) => sum + time, 0) / recent.length
      
      if (average > PERFORMANCE_BUDGETS.RENDER_TIME * 1.5) {
        this.suggestOptimizations('slow-render', {
          componentName,
          averageRenderTime: average,
        })
      }
    }
  }

  public getPerformanceReport() {
    return {
      renderTimes: Object.fromEntries(this.renderTimes),
      memoryUsage: this.memoryUsage.slice(-10),
      networkRequests: Object.fromEntries(this.networkRequests),
      budgets: PERFORMANCE_BUDGETS,
    }
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.renderTimes.clear()
    this.memoryUsage = []
    this.networkRequests.clear()
  }
}

// React hooks for performance optimization
export function usePerformanceTracking(componentName: string) {
  const startTimeRef = useRef<number>()
  const optimizer = useMemo(() => PerformanceOptimizer.getInstance(), [])

  useEffect(() => {
    startTimeRef.current = performance.now()
    
    return () => {
      if (startTimeRef.current) {
        const renderTime = performance.now() - startTimeRef.current
        optimizer.trackRender(componentName, renderTime)
      }
    }
  })

  return optimizer
}

export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debounceMs = 0
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (debounceMs > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args)
        }, debounceMs)
      } else {
        callback(...args)
      }
    }) as T,
    [...deps, debounceMs]
  )
}

export function useMemoryOptimizedState<T>(
  initialValue: T,
  maxHistorySize = 10
): [T, (value: T) => void, T[]] {
  const [current, setCurrent] = React.useState<T>(initialValue)
  const historyRef = useRef<T[]>([initialValue])

  const setValue = useCallback((value: T) => {
    setCurrent(value)
    
    historyRef.current.push(value)
    
    // Limit history size to prevent memory leaks
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift()
    }
  }, [maxHistorySize])

  return [current, setValue, historyRef.current]
}

// Bundle size optimization utilities
export function lazyWithPreload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  preloadCondition?: () => boolean
) {
  const LazyComponent = React.lazy(importFn)
  
  // Preload component if condition is met
  if (preloadCondition?.()) {
    importFn()
  }
  
  return LazyComponent
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceOptimizer.cleanup()
  })
}