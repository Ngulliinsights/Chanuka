/**
 * Enhanced Performance Monitor Utility
 * Comprehensive performance monitoring with optimization integration
 */

import { logger } from './logger';
import { bundleAnalyzer } from './bundle-analyzer';
import { assetOptimizer } from './asset-optimization';
import { webVitalsMonitor } from './web-vitals-monitor';
import { realtimeOptimizer } from './realtime-optimizer';

interface PerformanceMetrics {
    loadTime: number;
    renderTime: number;
    navigationTime: number;
    resourceLoadTime: number;
    memoryUsage?: number;
    bundleSize?: number;
    optimizedAssets?: number;
    webVitalsScore?: number;
    [key: string]: unknown;
}

interface PerformanceConfig {
    enableBundleAnalysis: boolean;
    enableAssetOptimization: boolean;
    enableWebVitalsMonitoring: boolean;
    enableRealtimeOptimization: boolean;
    reportingInterval: number;
    performanceBudgets: {
        loadTime: number;
        bundleSize: number;
        memoryUsage: number;
    };
}

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
    private config: PerformanceConfig;
    private reportingTimer: NodeJS.Timeout | null = null;

    private constructor() {
        this.config = {
            enableBundleAnalysis: true,
            enableAssetOptimization: true,
            enableWebVitalsMonitoring: true,
            enableRealtimeOptimization: true,
            reportingInterval: 30000, // 30 seconds
            performanceBudgets: {
                loadTime: 3000, // 3 seconds
                bundleSize: 2 * 1024 * 1024, // 2MB
                memoryUsage: 100 * 1024 * 1024 // 100MB
            }
        };
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        logger.info('Starting enhanced performance monitoring...', { component: 'PerformanceMonitor' });

        // Initialize core monitoring
        this.setupPerformanceObservers();
        this.collectInitialMetrics();

        // Initialize optimization services
        await this.initializeOptimizationServices();

        // Start periodic reporting
        this.startPeriodicReporting();
    }

    /**
     * Initialize all optimization services
     */
    private async initializeOptimizationServices(): Promise<void> {
        try {
            if (this.config.enableWebVitalsMonitoring) {
                await webVitalsMonitor.startMonitoring();
                logger.info('Web Vitals monitoring initialized', { component: 'PerformanceMonitor' });
            }

            if (this.config.enableBundleAnalysis) {
                bundleAnalyzer.monitorChunkLoading();
                logger.info('Bundle analysis monitoring initialized', { component: 'PerformanceMonitor' });
            }

            if (this.config.enableAssetOptimization) {
                assetOptimizer.optimizeExistingImages();
                logger.info('Asset optimization initialized', { component: 'PerformanceMonitor' });
            }

            // Real-time optimization will be initialized when WebSocket connects
            logger.info('All optimization services initialized', { component: 'PerformanceMonitor' });
        } catch (error) {
            logger.error('Failed to initialize optimization services', { component: 'PerformanceMonitor' }, error);
        }
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
                        this.checkPerformanceBudgets();
                    }
                });
            });
            navObserver.observe({ entryTypes: ['navigation'] });
            this.observers.push(navObserver);

            // Monitor resource loading
            const resourceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.entryType === 'resource') {
                        this.metrics.resourceLoadTime = entry.duration;
                    }
                });
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.push(resourceObserver);

            // Monitor memory usage if available
            if ('memory' in performance) {
                const memoryObserver = setInterval(() => {
                    const memory = (performance as any).memory;
                    if (memory) {
                        this.metrics.memoryUsage = memory.usedJSHeapSize;
                        this.checkMemoryUsage();
                    }
                }, 5000); // Check every 5 seconds

                // Store interval ID for cleanup
                (this as any).memoryInterval = memoryObserver;
            }

        } catch (error) {
            logger.error('Failed to setup performance observers', { component: 'PerformanceMonitor' }, error);
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
            logger.error('Failed to collect performance metrics', { component: 'PerformanceMonitor' }, error);
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

    /**
     * Check performance budgets and alert if exceeded
     */
    private checkPerformanceBudgets(): void {
        const budgets = this.config.performanceBudgets;

        if (this.metrics.loadTime > budgets.loadTime) {
            logger.warn(`Load time budget exceeded: ${this.metrics.loadTime}ms > ${budgets.loadTime}ms`, {
                component: 'PerformanceMonitor'
            });
        }

        if (this.metrics.bundleSize && this.metrics.bundleSize > budgets.bundleSize) {
            logger.warn(`Bundle size budget exceeded: ${this.metrics.bundleSize} > ${budgets.bundleSize}`, {
                component: 'PerformanceMonitor'
            });
        }
    }

    /**
     * Check memory usage and warn if high
     */
    private checkMemoryUsage(): void {
        if (this.metrics.memoryUsage && this.metrics.memoryUsage > this.config.performanceBudgets.memoryUsage) {
            logger.warn(`High memory usage detected: ${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB`, {
                component: 'PerformanceMonitor'
            });
        }
    }

    /**
     * Start periodic performance reporting
     */
    private startPeriodicReporting(): void {
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
        }

        this.reportingTimer = setInterval(async () => {
            await this.generatePerformanceReport();
        }, this.config.reportingInterval);
    }

    /**
     * Generate comprehensive performance report
     */
    private async generatePerformanceReport(): Promise<void> {
        try {
            // Collect metrics from all optimization services
            const bundleMetrics = bundleAnalyzer.getMetrics();
            const assetMetrics = assetOptimizer.getMetrics();
            const webVitalsMetrics = webVitalsMonitor.getMetrics();
            const _connectionMetrics = realtimeOptimizer.getMetrics();

            // Update combined metrics
            if (bundleMetrics) {
                this.metrics.bundleSize = bundleMetrics.totalSize;
            }

            if (assetMetrics) {
                this.metrics.optimizedAssets = assetMetrics.optimizedAssets;
            }

            if (webVitalsMetrics.size > 0) {
                // Calculate Web Vitals score
                const vitalsArray = Array.from(webVitalsMetrics.values());
                const goodMetrics = vitalsArray.filter(m => m.rating === 'good').length;
                this.metrics.webVitalsScore = Math.round((goodMetrics / vitalsArray.length) * 100);
            }

            logger.debug('Performance report generated', {
                component: 'PerformanceMonitor',
                metrics: this.metrics
            });

        } catch (error) {
            logger.error('Failed to generate performance report', { component: 'PerformanceMonitor' }, error);
        }
    }

    /**
     * Initialize real-time optimization for WebSocket
     */
    public initializeRealtimeOptimization(websocket: WebSocket): void {
        if (this.config.enableRealtimeOptimization) {
            realtimeOptimizer.startOptimization(websocket);
            logger.info('Real-time optimization started for WebSocket', { component: 'PerformanceMonitor' });
        }
    }

    /**
     * Update performance configuration
     */
    public updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Restart reporting if interval changed
        if (newConfig.reportingInterval) {
            this.startPeriodicReporting();
        }

        logger.info('Performance monitor config updated', { component: 'PerformanceMonitor', config: this.config });
    }

    /**
     * Get current configuration
     */
    public getConfig(): PerformanceConfig {
        return { ...this.config };
    }

    /**
     * Get comprehensive metrics including optimization data
     */
    public async getComprehensiveMetrics(): Promise<{
        core: PerformanceMetrics;
        bundle: any;
        assets: any;
        webVitals: any;
        connection: any;
    }> {
        return {
            core: this.getMetrics(),
            bundle: bundleAnalyzer.getMetrics(),
            assets: assetOptimizer.getMetrics(),
            webVitals: Array.from(webVitalsMonitor.getMetrics().entries()),
            connection: realtimeOptimizer.getMetrics()
        };
    }

    public stopMonitoring(): void {
        this.isMonitoring = false;
        
        // Stop core observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // Stop memory monitoring
        if ((this as any).memoryInterval) {
            clearInterval((this as any).memoryInterval);
        }

        // Stop reporting
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
            this.reportingTimer = null;
        }

        // Stop optimization services
        webVitalsMonitor.stopMonitoring();
        realtimeOptimizer.stopOptimization();

        logger.info('Performance monitoring stopped', { component: 'PerformanceMonitor' });
    }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export initialization function
export async function initPerformanceMonitoring(): Promise<void> {
    try {
        await performanceMonitor.startMonitoring();
        logger.info('Enhanced performance monitoring initialized', { component: 'PerformanceMonitor' });
    } catch (error) {
        logger.error('Failed to initialize performance monitoring', { component: 'PerformanceMonitor' }, error);
    }
}

// Export for debugging
export { PerformanceMonitor };
export type { PerformanceMetrics, PerformanceConfig };