/**
 * Bundle Analysis Utility
 * Provides runtime bundle analysis and optimization recommendations
 */

import { logger } from './logger';

interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  largestChunk: {
    name: string;
    size: number;
  };
  duplicateModules: string[];
  unusedModules: string[];
  criticalPath: string[];
}

interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
  dependencies: string[];
  loadTime?: number;
}

interface OptimizationRecommendation {
  type: 'code-splitting' | 'tree-shaking' | 'compression' | 'lazy-loading' | 'preloading';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation: string;
}

class BundleAnalyzer {
  private static instance: BundleAnalyzer;
  private chunks: Map<string, ChunkInfo> = new Map();
  private metrics: BundleMetrics | null = null;
  private isAnalyzing = false;

  private constructor() {}

  public static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer();
    }
    return BundleAnalyzer.instance;
  }

  /**
   * Analyze current bundle composition and performance
   */
  public async analyzeBundles(): Promise<BundleMetrics> {
    if (this.isAnalyzing) {
      logger.warn('Bundle analysis already in progress', { component: 'BundleAnalyzer' });
      return this.metrics || this.getDefaultMetrics();
    }

    this.isAnalyzing = true;

    try {
      logger.info('Starting bundle analysis...', { component: 'BundleAnalyzer' });

      // Collect chunk information from performance entries
      await this.collectChunkInfo();

      // Analyze bundle composition
      this.metrics = await this.calculateMetrics();

      // Generate optimization recommendations
      const recommendations = this.generateRecommendations();

      logger.info('Bundle analysis completed', { 
        component: 'BundleAnalyzer',
        metrics: this.metrics,
        recommendations: recommendations.length
      });

      return this.metrics;
    } catch (error) {
      logger.error('Bundle analysis failed', { component: 'BundleAnalyzer' }, error);
      return this.getDefaultMetrics();
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Collect information about loaded chunks from performance entries
   */
  private async collectChunkInfo(): Promise<void> {
    if (!window.performance) {
      logger.warn('Performance API not available for bundle analysis', { component: 'BundleAnalyzer' });
      return;
    }

    try {
      // Get all resource entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      // Filter JavaScript chunks
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && 
        (resource.name.includes('/assets/') || resource.name.includes('chunk'))
      );

      for (const resource of jsResources) {
        const chunkName = this.extractChunkName(resource.name);
        const size = this.estimateResourceSize(resource);

        this.chunks.set(chunkName, {
          name: chunkName,
          size,
          modules: [], // Would need build-time analysis for accurate module info
          dependencies: [],
          loadTime: resource.duration
        });
      }

      logger.debug(`Collected info for ${this.chunks.size} chunks`, { component: 'BundleAnalyzer' });
    } catch (error) {
      logger.error('Failed to collect chunk info', { component: 'BundleAnalyzer' }, error);
    }
  }

  /**
   * Extract chunk name from resource URL
   */
  private extractChunkName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('-')[0] || filename.split('.')[0] || 'unknown';
  }

  /**
   * Estimate resource size from performance timing
   */
  private estimateResourceSize(resource: PerformanceResourceTiming): number {
    // Use transferSize if available (modern browsers)
    if ('transferSize' in resource && resource.transferSize > 0) {
      return resource.transferSize;
    }

    // Fallback: estimate based on response time and typical compression ratios
    const estimatedSize = Math.max(resource.duration * 1000, 10000); // Rough estimate
    return estimatedSize;
  }

  /**
   * Calculate bundle metrics
   */
  private async calculateMetrics(): Promise<BundleMetrics> {
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    
    // Estimate gzipped size (typically 70% of original)
    const gzippedSize = Math.round(totalSize * 0.7);

    // Find largest chunk
    const largestChunk = chunks.reduce((largest, chunk) => 
      chunk.size > largest.size ? chunk : largest,
      { name: 'none', size: 0 }
    );

    return {
      totalSize,
      gzippedSize,
      chunkCount: chunks.length,
      largestChunk,
      duplicateModules: [], // Would need build-time analysis
      unusedModules: [], // Would need runtime usage tracking
      criticalPath: this.identifyCriticalPath()
    };
  }

  /**
   * Identify critical rendering path resources
   */
  private identifyCriticalPath(): string[] {
    const criticalChunks = Array.from(this.chunks.values())
      .filter(chunk => 
        chunk.name.includes('main') || 
        chunk.name.includes('app') || 
        chunk.name.includes('vendor')
      )
      .sort((a, b) => (a.loadTime || 0) - (b.loadTime || 0))
      .map(chunk => chunk.name);

    return criticalChunks.slice(0, 3); // Top 3 critical chunks
  }

  /**
   * Generate optimization recommendations based on analysis
   */
  public generateRecommendations(): OptimizationRecommendation[] {
    if (!this.metrics) {
      return [];
    }

    const recommendations: OptimizationRecommendation[] = [];

    // Check bundle size
    if (this.metrics.totalSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push({
        type: 'code-splitting',
        priority: 'high',
        description: 'Bundle size exceeds 2MB threshold',
        impact: 'Reduce initial load time by 30-50%',
        implementation: 'Implement route-based code splitting and lazy loading'
      });
    }

    // Check chunk count
    if (this.metrics.chunkCount < 3) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'medium',
        description: 'Too few chunks - missing optimization opportunities',
        impact: 'Improve caching and parallel loading',
        implementation: 'Split vendor libraries and feature modules into separate chunks'
      });
    }

    // Check largest chunk
    if (this.metrics.largestChunk.size > 500 * 1024) { // 500KB
      recommendations.push({
        type: 'tree-shaking',
        priority: 'high',
        description: `Largest chunk (${this.metrics.largestChunk.name}) is too large`,
        impact: 'Reduce chunk size by 20-40%',
        implementation: 'Enable tree shaking and remove unused dependencies'
      });
    }

    // Check compression
    const compressionRatio = this.metrics.gzippedSize / this.metrics.totalSize;
    if (compressionRatio > 0.8) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        description: 'Poor compression ratio detected',
        impact: 'Reduce transfer size by 15-25%',
        implementation: 'Enable Brotli compression and optimize asset formats'
      });
    }

    return recommendations;
  }

  /**
   * Get current bundle metrics
   */
  public getMetrics(): BundleMetrics | null {
    return this.metrics;
  }

  /**
   * Get chunk information
   */
  public getChunks(): ChunkInfo[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Monitor chunk loading performance
   */
  public monitorChunkLoading(): void {
    if (!window.performance) return;

    // Monitor new resource loads
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
          const chunkName = this.extractChunkName(entry.name);
          const resource = entry as PerformanceResourceTiming;
          
          logger.debug(`Chunk loaded: ${chunkName}`, {
            component: 'BundleAnalyzer',
            size: resource.transferSize || 'unknown',
            loadTime: resource.duration
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      const meta: Record<string, unknown> =
        typeof error === 'object' && error !== null
          ? (error as Record<string, unknown>)
          : { error: String(error) };

      logger.warn('Failed to setup chunk loading monitor', { component: 'BundleAnalyzer' }, meta);
    }
  }

  /**
   * Get default metrics for fallback
   */
  private getDefaultMetrics(): BundleMetrics {
    return {
      totalSize: 0,
      gzippedSize: 0,
      chunkCount: 0,
      largestChunk: { name: 'unknown', size: 0 },
      duplicateModules: [],
      unusedModules: [],
      criticalPath: []
    };
  }

  /**
   * Export analysis report
   */
  public exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      chunks: this.getChunks(),
      recommendations: this.generateRecommendations()
    };

    return JSON.stringify(report, null, 2);
  }
}

// Export singleton instance
export const bundleAnalyzer = BundleAnalyzer.getInstance();

// Export types
export type { BundleMetrics, ChunkInfo, OptimizationRecommendation };