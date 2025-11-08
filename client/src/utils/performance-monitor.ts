/**
 * Performance Monitor Utility
 * Provides performance monitoring and metrics collection for the application
 */

import { logger } from './browser-logger';

interface PerformanceMetrics {
    loadTime: number;
    renderTime: number;
    navigationTime: number;
    resourceLoadTime: number;
    memoryUsage?: number;
}

// Remove unused interface - using built-in PerformanceEntry instead

class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetrics = {
        loadTime: 0,
        renderTime: 0,
        navigationTime: 0,
        resourceLoadTime: 0
    };
    private observers: PerformanceObserver[] = [];
    private isMonitoring = false;

    private constructor() { }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.setupPerformanceObservers();
        this.collectInitialMetrics();
    }

    private setupPerformanceObservers(): void {
        if (!('PerformanceObserver' in window)) {
            logger.warn('PerformanceObserver not supported', { component: 'PerformanceMonitor' });
            return;
        }

        try {
            // Monitor navigation timing
            const navObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        this.metrics.navigationTime = entry.duration;
                    }
                });
            });
            navObserver.observe({ entryTypes: ['navigation'] });
            this.observers.push(navObserver);
        } catch (error) {
            logger.warn('Failed to setup navigation observer', { component: 'PerformanceMonitor' }, error);
        }
    }
    private collectInitialMetrics(): void {
        if (!window.performance) {
            logger.warn('Performance API not available', { component: 'PerformanceMonitor' });
            return;
        }

        try {
            // Use modern Navigation Timing API instead of deprecated timing
            const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            if (navigationEntries.length > 0) {
                const navigation = navigationEntries[0];
                if (navigation) {
                    this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
                    this.metrics.renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                    this.metrics.navigationTime = navigation.duration;
                }
            } else {
                // Fallback to deprecated API if modern one isn't available
                if (window.performance.timing) {
                    const timing = window.performance.timing;
                    this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
                    this.metrics.renderTime = timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart;
                }
            }

            // Collect memory usage if available
            if ('memory' in window.performance) {
                const memory = (window.performance as any).memory;
                this.metrics.memoryUsage = memory.usedJSHeapSize;
            }

            logger.info('Initial performance metrics collected', { component: 'PerformanceMonitor' }, this.metrics);
        } catch (error) {
            logger.warn('Failed to collect performance metrics', { component: 'PerformanceMonitor' }, error);
        }
    }

    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    public measureFunction<T>(name: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const end = performance.now();
            logger.debug(`Function ${name} took ${(end - start).toFixed(2)}ms`, { component: 'PerformanceMonitor' });
            return result;
        } catch (error) {
            const end = performance.now();
            logger.debug(`Function ${name} took ${(end - start).toFixed(2)}ms`, { component: 'PerformanceMonitor' });
            throw error;
        }
    }

    public measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        return fn().then((result) => {
            const end = performance.now();
            logger.debug(`Async function ${name} took ${(end - start).toFixed(2)}ms`, { component: 'PerformanceMonitor' });
            return result;
        }).catch((error) => {
            const end = performance.now();
            logger.debug(`Async function ${name} took ${(end - start).toFixed(2)}ms`, { component: 'PerformanceMonitor' });
            throw error;
        });
    }

    public stopMonitoring(): void {
        this.isMonitoring = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export initialization function
export function initPerformanceMonitoring(): void {
    try {
        performanceMonitor.startMonitoring();
        logger.info('Performance monitoring initialized', { component: 'PerformanceMonitor' });
    } catch (error) {
        logger.warn('Failed to initialize performance monitoring', { component: 'PerformanceMonitor' }, error);
    }
}

// Export for debugging
export { PerformanceMonitor };