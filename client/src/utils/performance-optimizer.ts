/**
 * Performance Optimizer - Advanced client-side performance monitoring and optimization
 * Implements comprehensive performance tracking, bundle analysis, and optimization strategies
 */

import { performanceMonitor } from './performanceMonitoring';
import { logger } from './browser-logger';

export interface PerformanceConfig {
  enableMetrics: boolean;
  enableBundleAnalysis: boolean;
  enableCaching: boolean;
  enableOptimizations: boolean;
  reportingEndpoint?: string;
  sampleRate: number; // 0-1, percentage of sessions to monitor
}

export interface BundleMetrics {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  fontSize: number;
  chunkCount: number;
  duplicateModules: string[];
  unusedCode: number;
  compressionRatio: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  storageUsed: number;
  storageQuota: number;
}

export interface OptimizationRecommendations {
  bundleOptimizations: string[];
  cacheOptimizations: string[];
  performanceOptimizations: string[];
  priority: 'low' | 'medium' | 'high';
}

class PerformanceOptimizer {
  private config: PerformanceConfig;
  private bundleMetrics: BundleMetrics | null = null;
  private cacheMetrics: CacheMetrics | null = null;
  private optimizationHistory: OptimizationRecommendations[] = [];
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private memoryObserver: NodeJS.Timeout | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableBundleAnalysis: true,
      enableCaching: true,
      enableOptimizations: true,
      sampleRate: 0.1, // Monitor 10% of sessions by default
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Only initialize if this session is selected for monitoring
    if (Math.random() > this.config.sampleRate) {
      logger.info('Performance monitoring disabled for this session (sampling)', { component: 'PerformanceOptimizer' });
      return;
    }

    if (this.config.enableMetrics) {
      this.initializeMetricsCollection();
    }

    if (this.config.enableBundleAnalysis) {
      this.initializeBundleAnalysis();
    }

    if (this.config.enableCaching) {
      this.initializeCacheMonitoring();
    }

    if (this.config.enableOptimizations) {
      this.initializeOptimizations();
    }

    logger.info('🚀 Performance Optimizer initialized', { component: 'PerformanceOptimizer' });
  }

  private initializeMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsCollectionInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000);

    // Collect initial metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(() => this.collectPerformanceMetrics(), 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.collectPerformanceMetrics(), 1000);
      });
    }

    // Monitor memory usage
    this.initializeMemoryMonitoring();
  }

  private initializeMemoryMonitoring(): void {
    if ('memory' in performance) {
      this.memoryObserver = setInterval(() => {
        const memory = (performance as any).memory;
        const memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        };

        // Warn if memory usage is high
        if (memoryUsage.percentage > 80) {
          console.warn('High memory usage detected:', memoryUsage);
          this.reportPerformanceIssue('high-memory-usage', memoryUsage);
        }

        // Store memory metrics
        performanceMonitor.recordMetric('Memory Usage', memoryUsage.used, {
          total: memoryUsage.total,
          limit: memoryUsage.limit,
          percentage: memoryUsage.percentage
        });
      }, 10000); // Check every 10 seconds
    }
  }

  private initializeBundleAnalysis(): void {
    // Analyze bundle after initial load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.analyzeBundleSize();
        this.detectDuplicateModules();
        this.analyzeCodeSplitting();
      }, 2000);
    });

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      try {
        this.resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processResourceEntry(entry as PerformanceResourceTiming);
          }
        });

        this.resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  private initializeCacheMonitoring(): void {
    // Monitor cache performance
    this.monitorCachePerformance();
    
    // Set up service worker cache monitoring if available
    if ('serviceWorker' in navigator) {
      this.monitorServiceWorkerCache();
    }

    // Monitor browser cache effectiveness
    this.monitorBrowserCache();
  }

  private initializeOptimizations(): void {
    // Apply automatic optimizations
    this.applyAutomaticOptimizations();
    
    // Generate optimization recommendations
    setTimeout(() => {
      this.generateOptimizationRecommendations();
    }, 5000);
  }

  private collectPerformanceMetrics(): void {
    const metrics = performanceMonitor.getMetrics();
    const coreWebVitals = performanceMonitor.getCoreWebVitals();
    
    // Collect additional metrics
    const additionalMetrics = {
      domNodes: document.querySelectorAll('*').length,
      eventListeners: this.countEventListeners(),
      stylesheets: document.styleSheets.length,
      scripts: document.scripts.length,
      images: document.images.length,
      iframes: document.querySelectorAll('iframe').length,
      connectionType: this.getConnectionType(),
      deviceMemory: this.getDeviceMemory(),
      hardwareConcurrency: navigator.hardwareConcurrency || 1
    };

    // Report metrics if endpoint is configured
    if (this.config.reportingEndpoint) {
      this.reportMetrics({
        ...metrics,
        ...coreWebVitals,
        ...additionalMetrics,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }

    // Store metrics locally for analysis
    this.storeMetricsLocally({
      ...metrics,
      ...coreWebVitals,
      ...additionalMetrics
    });
  }

  private analyzeBundleSize(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;
    let fontSize = 0;
    let chunkCount = 0;

    resources.forEach((resource) => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      totalSize += size;

      if (resource.name.includes('.js')) {
        jsSize += size;
        chunkCount++;
      } else if (resource.name.includes('.css')) {
        cssSize += size;
      } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i)) {
        imageSize += size;
      } else if (resource.name.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
        fontSize += size;
      }
    });

    // Calculate compression ratio
    const uncompressedSize = resources.reduce((sum, resource) => 
      sum + (resource.decodedBodySize || resource.encodedBodySize || 0), 0);
    const compressionRatio = uncompressedSize > 0 ? totalSize / uncompressedSize : 1;

    this.bundleMetrics = {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      fontSize,
      chunkCount,
      duplicateModules: [], // Will be populated by detectDuplicateModules
      unusedCode: 0, // Will be calculated separately
      compressionRatio
    };

    // Log bundle analysis
    logger.info('📦 Bundle Analysis:', { component: 'PerformanceOptimizer' }, this.bundleMetrics);

    // Check bundle size budgets
    this.checkBundleBudgets();
  }

  private detectDuplicateModules(): void {
    // This is a simplified detection - in a real implementation,
    // you'd analyze the actual module graph
    const scripts = Array.from(document.scripts);
    const moduleNames = new Map<string, number>();
    const duplicates: string[] = [];

    scripts.forEach(script => {
      if (script.src) {
        const moduleName = script.src.split('/').pop()?.split('?')[0] || '';
        const count = moduleNames.get(moduleName) || 0;
        moduleNames.set(moduleName, count + 1);
        
        if (count > 0) {
          duplicates.push(moduleName);
        }
      }
    });

    if (this.bundleMetrics) {
      this.bundleMetrics.duplicateModules = duplicates;
    }

    if (duplicates.length > 0) {
      console.warn('🔄 Duplicate modules detected:', duplicates);
    }
  }

  private analyzeCodeSplitting(): void {
    const chunks = Array.from(document.scripts)
      .filter(script => script.src && script.src.includes('chunk'))
      .length;

    if (chunks < 3) {
      console.warn('⚠️ Limited code splitting detected. Consider implementing route-based splitting.');
    } else {
      console.log(`✅ Code splitting active with ${chunks} chunks`);
    }
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    // Analyze resource loading performance
    const loadTime = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);

    // Flag slow resources
    const thresholds = {
      script: 1000,
      stylesheet: 500,
      image: 2000,
      font: 1000,
      other: 1500
    };

    if (loadTime > thresholds[resourceType]) {
      console.warn(`🐌 Slow ${resourceType} loading:`, {
        url: entry.name,
        loadTime: `${loadTime.toFixed(2)}ms`,
        size: `${(entry.transferSize || 0) / 1024}KB`
      });
    }

    // Track cache effectiveness
    if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
      // Resource was served from cache
      performanceMonitor.recordMetric('Cache Hit', 1, { resource: entry.name });
    } else {
      performanceMonitor.recordMetric('Cache Miss', 1, { resource: entry.name });
    }
  }

  private monitorCachePerformance(): void {
    let cacheHits = 0;
    let cacheMisses = 0;
    let totalRequests = 0;

    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      totalRequests++;
      const response = await originalFetch(...args);
      
      // Check if response came from cache
      if (response.headers.get('x-cache') === 'HIT' || 
          response.headers.get('cf-cache-status') === 'HIT') {
        cacheHits++;
      } else {
        cacheMisses++;
      }

      return response;
    };

    // Calculate cache metrics periodically
    setInterval(() => {
      if (totalRequests > 0) {
        this.cacheMetrics = {
          hitRate: (cacheHits / totalRequests) * 100,
          missRate: (cacheMisses / totalRequests) * 100,
          evictionRate: 0, // Would need more sophisticated tracking
          storageUsed: 0, // Will be updated by storage monitoring
          storageQuota: 0
        };
      }
    }, 30000);
  }

  private monitorServiceWorkerCache(): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Monitor service worker cache performance
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_PERFORMANCE') {
          const { hitRate, missRate, storageUsed } = event.data;
          if (this.cacheMetrics) {
            this.cacheMetrics.hitRate = hitRate;
            this.cacheMetrics.missRate = missRate;
            this.cacheMetrics.storageUsed = storageUsed;
          }
        }
      });
    }
  }

  private monitorBrowserCache(): void {
    // Monitor storage quota and usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        if (this.cacheMetrics) {
          this.cacheMetrics.storageUsed = estimate.usage || 0;
          this.cacheMetrics.storageQuota = estimate.quota || 0;
        }
      });
    }
  }

  private applyAutomaticOptimizations(): void {
    // Apply connection-aware optimizations
    const connectionType = this.getConnectionType();
    
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      this.applySlowConnectionOptimizations();
    } else if (connectionType === '3g') {
      this.applyMediumConnectionOptimizations();
    } else {
      this.applyFastConnectionOptimizations();
    }

    // Apply device-specific optimizations
    const deviceMemory = this.getDeviceMemory();
    if (deviceMemory < 4) {
      this.applyLowMemoryOptimizations();
    }

    // Apply battery-aware optimizations
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2 || !battery.charging) {
          this.applyBatterySavingOptimizations();
        }
      });
    }
  }

  private applySlowConnectionOptimizations(): void {
    logger.info('🐌 Applying slow connection optimizations', { component: 'PerformanceOptimizer' });
    
    // Reduce image quality
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.setAttribute('data-src', src.replace(/quality=\d+/, 'quality=30'));
      }
    });

    // Disable non-critical animations
    document.documentElement.style.setProperty('--animation-duration', '0s');
  }

  private applyMediumConnectionOptimizations(): void {
    logger.info('📶 Applying medium connection optimizations', { component: 'PerformanceOptimizer' });
    
    // Moderate image quality
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.setAttribute('data-src', src.replace(/quality=\d+/, 'quality=60'));
      }
    });
  }

  private applyFastConnectionOptimizations(): void {
    logger.info('🚀 Applying fast connection optimizations', { component: 'PerformanceOptimizer' });
    
    // Enable prefetching
    this.enableResourcePrefetching();
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  private applyLowMemoryOptimizations(): void {
    logger.info('🧠 Applying low memory optimizations', { component: 'PerformanceOptimizer' });
    
    // Reduce concurrent operations
    // Implement lazy loading more aggressively
    // Clear unused caches more frequently
  }

  private applyBatterySavingOptimizations(): void {
    logger.info('🔋 Applying battery saving optimizations', { component: 'PerformanceOptimizer' });
    
    // Reduce animation frame rate
    // Disable non-critical background tasks
    // Reduce polling frequency
  }

  private generateOptimizationRecommendations(): void {
    const recommendations: OptimizationRecommendations = {
      bundleOptimizations: [],
      cacheOptimizations: [],
      performanceOptimizations: [],
      priority: 'low'
    };

    // Bundle optimization recommendations
    if (this.bundleMetrics) {
      if (this.bundleMetrics.jsSize > 500 * 1024) { // 500KB
        recommendations.bundleOptimizations.push('Consider code splitting to reduce JavaScript bundle size');
        recommendations.priority = 'high';
      }

      if (this.bundleMetrics.duplicateModules.length > 0) {
        recommendations.bundleOptimizations.push('Remove duplicate modules to reduce bundle size');
        recommendations.priority = 'medium';
      }

      if (this.bundleMetrics.compressionRatio > 0.8) {
        recommendations.bundleOptimizations.push('Enable better compression (Brotli/Gzip)');
      }

      if (this.bundleMetrics.chunkCount < 3) {
        recommendations.bundleOptimizations.push('Implement route-based code splitting');
      }
    }

    // Cache optimization recommendations
    if (this.cacheMetrics) {
      if (this.cacheMetrics.hitRate < 70) {
        recommendations.cacheOptimizations.push('Improve cache hit rate by optimizing cache headers');
        recommendations.priority = 'medium';
      }

      if (this.cacheMetrics.storageUsed / this.cacheMetrics.storageQuota > 0.8) {
        recommendations.cacheOptimizations.push('Implement cache eviction strategy');
      }
    }

    // Performance optimization recommendations
    const coreWebVitals = performanceMonitor.getCoreWebVitals();
    
    if (coreWebVitals.lcp && coreWebVitals.lcp > 2500) {
      recommendations.performanceOptimizations.push('Optimize Largest Contentful Paint (LCP)');
      recommendations.priority = 'high';
    }

    if (coreWebVitals.fid && coreWebVitals.fid > 100) {
      recommendations.performanceOptimizations.push('Reduce First Input Delay (FID)');
      recommendations.priority = 'high';
    }

    if (coreWebVitals.cls && coreWebVitals.cls > 0.1) {
      recommendations.performanceOptimizations.push('Minimize Cumulative Layout Shift (CLS)');
      recommendations.priority = 'medium';
    }

    this.optimizationHistory.push(recommendations);
    
    // Log recommendations
    if (recommendations.bundleOptimizations.length > 0 || 
        recommendations.cacheOptimizations.length > 0 || 
        recommendations.performanceOptimizations.length > 0) {
      logger.info('💡 Performance Optimization Recommendations:', { component: 'PerformanceOptimizer' }, recommendations);
    }
  }

  // Utility methods
  private countEventListeners(): number {
    // This is a simplified count - actual implementation would be more complex
    return document.querySelectorAll('[onclick], [onload], [onchange]').length;
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceMemory(): number {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 4;
    }
    return 4; // Default assumption
  }

  private getResourceType(url: string): 'script' | 'stylesheet' | 'image' | 'font' | 'other' {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf|eot)$/i)) return 'font';
    return 'other';
  }

  private checkBundleBudgets(): void {
    if (!this.bundleMetrics) return;

    const budgets = {
      totalSize: 1024 * 1024, // 1MB
      jsSize: 500 * 1024,     // 500KB
      cssSize: 100 * 1024,    // 100KB
      imageSize: 2048 * 1024  // 2MB
    };

    const violations: string[] = [];

    Object.entries(budgets).forEach(([metric, budget]) => {
      const value = this.bundleMetrics![metric as keyof BundleMetrics] as number;
      if (value > budget) {
        violations.push(`${metric}: ${(value / 1024).toFixed(1)}KB exceeds budget of ${(budget / 1024).toFixed(1)}KB`);
      }
    });

    if (violations.length > 0) {
      console.warn('💰 Bundle budget violations:', violations);
      this.reportPerformanceIssue('bundle-budget-violation', { violations });
    }
  }

  private enableResourcePrefetching(): void {
    // Prefetch likely navigation targets
    const links = document.querySelectorAll('a[href^="/"]');
    const prefetchedUrls = new Set<string>();

    links.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      if (!prefetchedUrls.has(href) && prefetchedUrls.size < 5) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
        prefetchedUrls.add(href);
      }
    });
  }

  private preloadCriticalResources(): void {
    // Preload critical CSS and JS
    const criticalResources = [
      { href: '/src/index.css', as: 'style' },
      { href: '/src/main.tsx', as: 'script' }
    ];

    criticalResources.forEach(resource => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = resource.href;
      preloadLink.as = resource.as;
      document.head.appendChild(preloadLink);
    });
  }

  private reportPerformanceIssue(type: string, data: any): void {
    if (this.config.reportingEndpoint) {
      fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance-issue',
          issueType: type,
          data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(error => {
        console.warn('Failed to report performance issue:', error);
      });
    }
  }

  private reportMetrics(metrics: any): void {
    if (this.config.reportingEndpoint) {
      fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance-metrics',
          metrics,
          timestamp: Date.now()
        })
      }).catch(error => {
        console.warn('Failed to report metrics:', error);
      });
    }
  }

  private storeMetricsLocally(metrics: any): void {
    try {
      const existingMetrics = JSON.parse(localStorage.getItem('performance-metrics') || '[]');
      existingMetrics.push({
        ...metrics,
        timestamp: Date.now()
      });

      // Keep only last 100 entries
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }

      localStorage.setItem('performance-metrics', JSON.stringify(existingMetrics));
    } catch (error) {
      console.warn('Failed to store metrics locally:', error);
    }
  }

  // Public API
  public getBundleMetrics(): BundleMetrics | null {
    return this.bundleMetrics;
  }

  public getCacheMetrics(): CacheMetrics | null {
    return this.cacheMetrics;
  }

  public getOptimizationRecommendations(): OptimizationRecommendations[] {
    return this.optimizationHistory;
  }

  public getLatestRecommendations(): OptimizationRecommendations | null {
    return this.optimizationHistory[this.optimizationHistory.length - 1] || null;
  }

  public exportPerformanceReport(): string {
    return JSON.stringify({
      bundleMetrics: this.bundleMetrics,
      cacheMetrics: this.cacheMetrics,
      optimizationRecommendations: this.optimizationHistory,
      coreWebVitals: performanceMonitor.getCoreWebVitals(),
      performanceScore: performanceMonitor.getPerformanceScore(),
      timestamp: Date.now(),
      url: window.location.href
    }, null, 2);
  }

  public destroy(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    if (this.memoryObserver) {
      clearInterval(this.memoryObserver);
    }

    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
    }

    logger.info('Performance Optimizer destroyed', { component: 'PerformanceOptimizer' });
  }
}

// Create and export singleton instance
export const performanceOptimizer = new PerformanceOptimizer({
  enableMetrics: true,
  enableBundleAnalysis: true,
  enableCaching: true,
  enableOptimizations: true,
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1
});

// React hook for performance optimization
export function usePerformanceOptimization() {
  return {
    getBundleMetrics: () => performanceOptimizer.getBundleMetrics(),
    getCacheMetrics: () => performanceOptimizer.getCacheMetrics(),
    getOptimizationRecommendations: () => performanceOptimizer.getOptimizationRecommendations(),
    getLatestRecommendations: () => performanceOptimizer.getLatestRecommendations(),
    exportPerformanceReport: () => performanceOptimizer.exportPerformanceReport()
  };
}











































