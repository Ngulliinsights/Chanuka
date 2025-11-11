/**
 * Asset Optimization Utility
 * Handles image loading optimization, lazy loading, and asset management
 */

import { logger } from './logger';

interface AssetLoadingOptions {
  lazy?: boolean;
  priority?: 'high' | 'low' | 'auto';
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  quality?: number;
}

interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableAVIF: boolean;
  enableLazyLoading: boolean;
  enableProgressiveJPEG: boolean;
  compressionQuality: number;
  maxWidth: number;
  maxHeight: number;
}

interface AssetMetrics {
  totalAssets: number;
  totalSize: number;
  optimizedAssets: number;
  lazyLoadedAssets: number;
  cacheHitRate: number;
  averageLoadTime: number;
}

class AssetOptimizer {
  private static instance: AssetOptimizer;
  private config: ImageOptimizationConfig;
  private loadedAssets: Map<string, { size: number; loadTime: number; optimized: boolean }> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private lazyImages: Set<HTMLImageElement> = new Set();

  private constructor() {
    this.config = {
      enableWebP: this.supportsWebP(),
      enableAVIF: this.supportsAVIF(),
      enableLazyLoading: 'IntersectionObserver' in window,
      enableProgressiveJPEG: true,
      compressionQuality: 85,
      maxWidth: 1920,
      maxHeight: 1080
    };

    this.initializeLazyLoading();
  }

  public static getInstance(): AssetOptimizer {
    if (!AssetOptimizer.instance) {
      AssetOptimizer.instance = new AssetOptimizer();
    }
    return AssetOptimizer.instance;
  }

  /**
   * Initialize lazy loading with Intersection Observer
   */
  private initializeLazyLoading(): void {
    if (!this.config.enableLazyLoading) {
      logger.warn('Lazy loading not supported, falling back to immediate loading', { component: 'AssetOptimizer' });
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.intersectionObserver?.unobserve(img);
            this.lazyImages.delete(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check AVIF support
   */
  private supportsAVIF(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch {
      return false;
    }
  }

  /**
   * Optimize image URL based on browser capabilities and options
   */
  public optimizeImageUrl(src: string, options: AssetLoadingOptions = {}): string {
    const url = new URL(src, window.location.origin);
    const params = new URLSearchParams(url.search);

    // Add format optimization
    if (options.format === 'auto') {
      if (this.config.enableAVIF) {
        params.set('format', 'avif');
      } else if (this.config.enableWebP) {
        params.set('format', 'webp');
      }
    } else if (options.format) {
      params.set('format', options.format);
    }

    // Add quality parameter
    if (options.quality) {
      params.set('quality', options.quality.toString());
    } else {
      params.set('quality', this.config.compressionQuality.toString());
    }

    // Add responsive sizing
    if (options.sizes) {
      params.set('sizes', options.sizes);
    }

    url.search = params.toString();
    return url.toString();
  }

  /**
   * Create optimized image element with lazy loading
   */
  public createOptimizedImage(
    src: string, 
    alt: string, 
    options: AssetLoadingOptions = {}
  ): HTMLImageElement {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = options.lazy !== false ? 'lazy' : 'eager';
    
    // Set up responsive images with srcset
    const optimizedSrc = this.optimizeImageUrl(src, options);
    
    if (options.lazy !== false && this.config.enableLazyLoading) {
      // Use data attributes for lazy loading
      img.dataset.src = optimizedSrc;
      img.src = this.generatePlaceholder(100, 100); // Tiny placeholder
      
      // Add to lazy loading queue
      this.lazyImages.add(img);
      this.intersectionObserver?.observe(img);
    } else {
      img.src = optimizedSrc;
      this.trackImageLoad(img, optimizedSrc);
    }

    // Add error handling
    img.onerror = () => {
      logger.warn(`Failed to load optimized image: ${src}`, { component: 'AssetOptimizer' });
      // Fallback to original image
      img.src = src;
    };

    return img;
  }

  /**
   * Load image and track performance
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    const startTime = performance.now();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      this.trackImageLoad(img, src, loadTime);
    };

    img.onerror = () => {
      logger.warn(`Failed to lazy load image: ${src}`, { component: 'AssetOptimizer' });
      // Try fallback
      const originalSrc = img.dataset.originalSrc;
      if (originalSrc && originalSrc !== src) {
        img.src = originalSrc;
      }
    };

    img.src = src;
  }

  /**
   * Track image loading performance
   */
  private trackImageLoad(img: HTMLImageElement, src: string, loadTime?: number): void {
    const actualLoadTime = loadTime || 0;
    
    // Estimate size based on image dimensions (rough approximation)
    const estimatedSize = (img.naturalWidth || 0) * (img.naturalHeight || 0) * 0.5; // Rough bytes estimate
    
    this.loadedAssets.set(src, {
      size: estimatedSize,
      loadTime: actualLoadTime,
      optimized: src.includes('format=') || src.includes('quality=')
    });

    logger.debug(`Image loaded: ${src}`, {
      component: 'AssetOptimizer',
      loadTime: actualLoadTime,
      size: estimatedSize,
      optimized: src.includes('format=')
    });
  }

  /**
   * Generate placeholder image
   */
  private generatePlaceholder(width: number, height: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create a simple gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Preload critical images
   */
  public preloadCriticalImages(urls: string[]): Promise<void[]> {
    const preloadPromises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        const startTime = performance.now();
        
        img.onload = () => {
          const loadTime = performance.now() - startTime;
          this.trackImageLoad(img, url, loadTime);
          resolve();
        };
        
        img.onerror = () => {
          logger.warn(`Failed to preload critical image: ${url}`, { component: 'AssetOptimizer' });
          reject(new Error(`Failed to preload ${url}`));
        };
        
        img.src = this.optimizeImageUrl(url, { priority: 'high' });
      });
    });

    return Promise.allSettled(preloadPromises).then(results => {
      const successful = results.filter(result => result.status === 'fulfilled');
      logger.info(`Preloaded ${successful.length}/${urls.length} critical images`, { component: 'AssetOptimizer' });
      return successful.map(() => undefined);
    });
  }

  /**
   * Get asset loading metrics
   */
  public getMetrics(): AssetMetrics {
    const assets = Array.from(this.loadedAssets.values());
    const totalAssets = assets.length;
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const optimizedAssets = assets.filter(asset => asset.optimized).length;
    const averageLoadTime = totalAssets > 0 
      ? assets.reduce((sum, asset) => sum + asset.loadTime, 0) / totalAssets 
      : 0;

    return {
      totalAssets,
      totalSize,
      optimizedAssets,
      lazyLoadedAssets: this.lazyImages.size,
      cacheHitRate: 0, // Would need cache API integration
      averageLoadTime
    };
  }

  /**
   * Optimize existing images on the page
   */
  public optimizeExistingImages(): void {
    const images = document.querySelectorAll('img:not([data-optimized])');
    
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      const src = htmlImg.src;
      
      if (src && !src.startsWith('data:')) {
        // Mark as optimized to avoid re-processing
        htmlImg.dataset.optimized = 'true';
        
        // Store original src for fallback
        htmlImg.dataset.originalSrc = src;
        
        // Apply optimization
        const optimizedSrc = this.optimizeImageUrl(src, { format: 'auto' });
        if (optimizedSrc !== src) {
          htmlImg.src = optimizedSrc;
          this.trackImageLoad(htmlImg, optimizedSrc);
        }
      }
    });

    logger.info(`Optimized ${images.length} existing images`, { component: 'AssetOptimizer' });
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.lazyImages.clear();
    this.loadedAssets.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ImageOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Asset optimization config updated', { component: 'AssetOptimizer', config: this.config });
  }

  /**
   * Get current configuration
   */
  public getConfig(): ImageOptimizationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const assetOptimizer = AssetOptimizer.getInstance();

// Export types
export type { AssetLoadingOptions, ImageOptimizationConfig, AssetMetrics };