/**
 * Asset Utilities - Optimized Consolidated Module
 *
 * This module provides comprehensive asset management capabilities:
 * - Intelligent asset loading with retry logic and fallback strategies
 * - Advanced image optimization with modern format support (WebP, AVIF)
 * - Lazy loading with intersection observer for performance
 * - Network-aware loading that adapts to connection quality
 * - Progressive enhancement based on device capabilities
 * - Performance monitoring and metrics tracking
 *
 * The module automatically initializes in browser environments and provides
 * both imperative APIs and React hooks for flexible integration.
 */

import { useState, useEffect, useRef } from 'react';

import { logger } from './logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AssetLoadConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  priority: 'high' | 'medium' | 'low';
  connectionAware?: boolean;
}

export interface AssetLoadResult {
  success: boolean;
  error?: Error;
  retries: number;
  loadTime: number;
  fromCache: boolean;
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  currentAsset?: string;
  phase: 'preload' | 'critical' | 'lazy' | 'complete';
}

export interface AssetFallbackStrategy {
  primary: string;
  fallbacks: string[];
  offlineFallback?: string;
  degradedMode?: string;
}

export interface AssetLoadingOptions {
  lazy?: boolean;
  priority?: 'high' | 'low' | 'auto';
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  quality?: number;
}

export interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableAVIF: boolean;
  enableLazyLoading: boolean;
  enableProgressiveJPEG: boolean;
  compressionQuality: number;
  maxWidth: number;
  maxHeight: number;
}

export interface AssetMetrics {
  totalAssets: number;
  totalSize: number;
  optimizedAssets: number;
  lazyLoadedAssets: number;
  cacheHitRate: number;
  averageLoadTime: number;
}

export enum EnhancementLevel {
  FULL = 'full',
  REDUCED = 'reduced',
  BASIC = 'basic',
  MINIMAL = 'minimal',
}

export interface FeatureAvailability {
  charts: boolean;
  maps: boolean;
  analytics: boolean;
  animations: boolean;
  images: boolean;
  fonts: boolean;
}

type AssetType = 'script' | 'style' | 'image' | 'font' | 'critical';
type FallbackAssetType = 'images' | 'scripts' | 'styles';

interface AssetFallbacks {
  images: Record<string, AssetFallbackStrategy>;
  fonts?: Record<string, AssetFallbackStrategy>;
  scripts: Record<string, AssetFallbackStrategy>;
  styles: Record<string, AssetFallbackStrategy>;
  priorities: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
}

// ============================================================================
// CONSTANTS AND DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_CONFIGS: Record<AssetType, AssetLoadConfig> = {
  critical: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    priority: 'high',
    connectionAware: true,
  },
  script: {
    maxRetries: 2,
    retryDelay: 1500,
    timeout: 15000,
    priority: 'medium',
    connectionAware: true,
  },
  style: {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 8000,
    priority: 'high',
    connectionAware: false,
  },
  image: {
    maxRetries: 1,
    retryDelay: 2000,
    timeout: 12000,
    priority: 'low',
    connectionAware: true,
  },
  font: {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 8000,
    priority: 'medium',
    connectionAware: true,
  },
};

// Minimal inline SVG placeholders for offline use
const DEFAULT_ASSET_FALLBACKS: AssetFallbacks = {
  images: {
    logo: {
      primary: '/logo.svg',
      fallbacks: ['/logo.png', '/logo.jpg'],
      offlineFallback:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkMxMy4xIDIgMTQgMi45IDE0IDRWMjBDMTQgMjEuMSAxMy4xIDIyIDEyIDIyQzEwLjkgMjIgMTAgMjEuMSAxMCAyMFY0QzEwIDIuOSAxMC45IDIgMTIgMloiIGZpbGw9IiM2QjcyODAiLz48L3N2Zz4=',
    },
    avatar: {
      primary: '/avatar.jpg',
      fallbacks: ['/avatar.png', '/default-avatar.svg'],
      offlineFallback:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0U1RTdFQiIvPjxwYXRoIGQ9Ik0yMCAyMEMyMi43NjE0IDIwIDI1IDE3Ljc2MTQgMjUgMTVDMjUgMTIuMjM4NiAyMi43NjE0IDEwIDIwIDEwQzE3LjIzODYgMTAgMTUgMTIuMjM4NiAxNSAxNUMxNSAxNy43NjE0IDE3LjIzODYgMjAgMjAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+PHBhdGggZD0iTTMwIDI4QzMwIDI0LjY4NjMgMjYuNDI3MSAyMiAyMiAyMkgxOEMxMy41NzI5IDIyIDEwIDI0LjY4NjMgMTAgMjhWMzBIMzBWMjhaIiBmaWxsPSIjOUNBM0FGIi8+PC9zdmc+',
    },
  },
  scripts: {
    analytics: {
      primary: '/js/analytics.js',
      fallbacks: ['/js/analytics.min.js'],
      degradedMode: 'no-analytics',
    },
  },
  styles: {
    theme: {
      primary: '/css/theme.css',
      fallbacks: ['/css/theme-fallback.css'],
      offlineFallback: '/css/theme-basic.css',
    },
  },
  priorities: {
    critical: ['logo', 'theme'],
    high: ['analytics', 'icons'],
    medium: ['charts', 'maps'],
    low: ['background-images', 'decorative-assets'],
  },
};

// ============================================================================
// CORE ASSET LOADER CLASS
// ============================================================================

/**
 * AssetLoader handles the low-level mechanics of loading individual assets.
 * It manages retry logic, timeout handling, and maintains a cache of loaded assets
 * to prevent duplicate network requests. This class is the foundation for all
 * asset loading operations in the system.
 */
export class AssetLoader {
  private loadingAssets = new Map<string, Promise<AssetLoadResult>>();
  private loadedAssets = new Set<string>();
  private failedAssets = new Map<string, { timestamp: number; attempts: number }>();
  private readonly FAILURE_COOLDOWN = 30000; // 30 seconds before retry

  /**
   * Loads an asset with automatic retry logic and caching.
   * If the asset is already loading, returns the existing promise to prevent duplicates.
   * If previously loaded successfully, returns immediately from cache.
   */
  async loadAsset(
    url: string,
    type: AssetType,
    config?: Partial<AssetLoadConfig>
  ): Promise<AssetLoadResult> {
    // Return existing loading promise if asset is already being fetched
    if (this.loadingAssets.has(url)) {
      return this.loadingAssets.get(url)!;
    }

    // Return cached success immediately
    if (this.loadedAssets.has(url)) {
      return {
        success: true,
        retries: 0,
        loadTime: 0,
        fromCache: true,
      };
    }

    // Check if we should skip due to recent failure
    const failureInfo = this.failedAssets.get(url);
    if (failureInfo && Date.now() - failureInfo.timestamp < this.FAILURE_COOLDOWN) {
      return {
        success: false,
        error: new Error('Asset recently failed, cooling down'),
        retries: failureInfo.attempts,
        loadTime: 0,
        fromCache: false,
      };
    }

    const loadPromise = this.performAssetLoad(url, type, config);
    this.loadingAssets.set(url, loadPromise);

    try {
      const result = await loadPromise;

      if (result.success) {
        this.loadedAssets.add(url);
        this.failedAssets.delete(url);
      } else {
        this.failedAssets.set(url, {
          timestamp: Date.now(),
          attempts: result.retries,
        });
      }

      return result;
    } finally {
      this.loadingAssets.delete(url);
    }
  }

  private async performAssetLoad(
    url: string,
    type: AssetType,
    config?: Partial<AssetLoadConfig>
  ): Promise<AssetLoadResult> {
    const finalConfig = { ...DEFAULT_CONFIGS[type], ...config };
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        await this.loadAssetByType(url, type, finalConfig.timeout);

        const loadTime = Date.now() - startTime;

        logger.debug('Asset loaded successfully', {
          component: 'AssetLoader',
          url,
          type,
          loadTime,
          retries,
        });

        return {
          success: true,
          retries,
          loadTime,
          fromCache: false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Asset load failed');
        retries = attempt;

        if (attempt < finalConfig.maxRetries) {
          // Exponential backoff with jitter to prevent thundering herd
          const backoffDelay = finalConfig.retryDelay * Math.pow(1.5, attempt);
          const jitter = Math.random() * 500;

          logger.warn('Asset load failed, retrying', {
            component: 'AssetLoader',
            url,
            type,
            attempt: attempt + 1,
            nextRetryIn: Math.round(backoffDelay + jitter),
            error: lastError.message,
          });

          await this.delay(backoffDelay + jitter);
        }
      }
    }

    const loadTime = Date.now() - startTime;

    logger.error(
      'Asset load failed after all retries',
      {
        component: 'AssetLoader',
        url,
        type,
        retries,
      },
      lastError
    );

    return {
      success: false,
      error: lastError || new Error('Asset load failed'),
      retries,
      loadTime,
      fromCache: false,
    };
  }

  /**
   * Loads the asset using the appropriate DOM API based on type.
   * Each asset type requires different loading strategies to ensure proper
   * execution order and error handling.
   */
  private loadAssetByType(url: string, type: AssetType, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Asset load timeout after ${timeout}ms: ${url}`));
      }, timeout);

      const cleanup = () => clearTimeout(timeoutId);

      // Validate URL format before attempting load
      try {
        new URL(url, window.location.origin);
      } catch (error) {
        cleanup();
        reject(new Error(`Invalid asset URL: ${url}`));
        return;
      }

      switch (type) {
        case 'script':
        case 'critical':
          this.loadScript(url, resolve, reject, cleanup);
          break;
        case 'style':
          this.loadStylesheet(url, resolve, reject, cleanup);
          break;
        case 'image':
          this.loadImage(url, resolve, reject, cleanup);
          break;
        case 'font':
          this.loadFont(url, resolve, reject, cleanup);
          break;
        default:
          cleanup();
          reject(new Error(`Unsupported asset type: ${type}`));
      }
    });
  }

  private loadScript(
    url: string,
    resolve: () => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ): void {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous'; // Enable CORS for better error reporting

    script.onload = () => {
      cleanup();
      resolve();
    };

    script.onerror = _event => {
      cleanup();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  }

  private loadStylesheet(
    url: string,
    resolve: () => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';

    link.onload = () => {
      cleanup();
      resolve();
    };

    link.onerror = () => {
      cleanup();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      reject(new Error(`Failed to load stylesheet: ${url}`));
    };

    document.head.appendChild(link);
  }

  private loadImage(
    url: string,
    resolve: () => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ): void {
    const img = new Image();

    img.onload = () => {
      cleanup();
      resolve();
    };

    img.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${url}`));
    };

    // Setting crossOrigin helps with CORS and tainted canvas issues
    img.crossOrigin = 'anonymous';
    img.src = url;
  }

  private loadFont(
    url: string,
    resolve: () => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ): void {
    // Use modern FontFace API if available
    if ('fonts' in document && 'FontFace' in window) {
      const fontName = `loaded-font-${Date.now()}`;
      const font = new FontFace(fontName, `url(${url})`);

      font
        .load()
        .then(loadedFont => {
          document.fonts.add(loadedFont);
          cleanup();
          resolve();
        })
        .catch(() => {
          cleanup();
          reject(new Error(`Failed to load font: ${url}`));
        });
    } else {
      // Fallback to stylesheet method for older browsers
      this.loadStylesheet(url, resolve, reject, cleanup);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      loaded: this.loadedAssets.size,
      failed: this.failedAssets.size,
      loading: this.loadingAssets.size,
    };
  }

  clearCache(): void {
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.loadingAssets.clear();
  }
}

// ============================================================================
// IMAGE OPTIMIZER CLASS
// ============================================================================

/**
 * ImageOptimizer provides intelligent image loading and optimization.
 * It automatically detects browser capabilities (WebP, AVIF support),
 * implements lazy loading with intersection observer, and generates
 * optimized image URLs with appropriate compression and formats.
 */
export class ImageOptimizer {
  private static instance: ImageOptimizer;
  private config: ImageOptimizationConfig;
  private loadedAssets: Map<string, { size: number; loadTime: number; optimized: boolean }> =
    new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private lazyImages: Set<HTMLImageElement> = new Set();
  private formatSupport: { webp: boolean; avif: boolean } | null = null;

  private constructor() {
    this.config = {
      enableWebP: false,
      enableAVIF: false,
      enableLazyLoading: 'IntersectionObserver' in window,
      enableProgressiveJPEG: true,
      compressionQuality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    // Asynchronously detect format support
    this.detectFormatSupport().then(support => {
      this.formatSupport = support;
      this.config.enableWebP = support.webp;
      this.config.enableAVIF = support.avif;
      logger.info('Image format support detected', { component: 'ImageOptimizer', support });
    });

    this.initializeLazyLoading();
  }

  public static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  /**
   * Detects modern image format support using actual image loading tests.
   * This is more reliable than canvas.toDataURL() which can give false positives.
   */
  private async detectFormatSupport(): Promise<{ webp: boolean; avif: boolean }> {
    const testImage = (_format: string, dataUri: string): Promise<boolean> => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = dataUri;
      });
    };

    // Minimal valid WebP image (1x1 transparent pixel)
    const webpData =
      'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    // Minimal valid AVIF image (1x1 transparent pixel)
    const avifData =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

    const [webp, avif] = await Promise.all([
      testImage('webp', webpData),
      testImage('avif', avifData),
    ]);

    return { webp, avif };
  }

  private initializeLazyLoading(): void {
    if (!this.config.enableLazyLoading) {
      logger.warn('Lazy loading not supported, images will load immediately', {
        component: 'ImageOptimizer',
      });
      return;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Configure intersection observer with appropriate margins and thresholds
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.intersectionObserver?.unobserve(img);
            this.lazyImages.delete(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading slightly before image enters viewport
        threshold: 0.01,
      }
    );
  }

  /**
   * Optimizes an image URL by adding format, quality, and size parameters.
   * Automatically selects the best available format based on browser support.
   */
  public optimizeImageUrl(src: string, options: AssetLoadingOptions = {}): string {
    try {
      const url = new URL(src, window.location.origin);
      const params = new URLSearchParams(url.search);

      // Determine optimal format
      if (options.format === 'auto' || (!options.format && this.formatSupport)) {
        if (this.config.enableAVIF && this.formatSupport?.avif) {
          params.set('format', 'avif');
        } else if (this.config.enableWebP && this.formatSupport?.webp) {
          params.set('format', 'webp');
        }
      } else if (options.format) {
        params.set('format', options.format);
      }

      // Set quality parameter
      const quality = options.quality ?? this.config.compressionQuality;
      params.set('quality', quality.toString());

      // Add responsive sizing hints if provided
      if (options.sizes) {
        params.set('sizes', options.sizes);
      }

      url.search = params.toString();
      return url.toString();
    } catch (error) {
      logger.warn('Failed to optimize image URL, using original', {
        component: 'ImageOptimizer',
        src,
        error,
      });
      return src;
    }
  }

  /**
   * Creates an optimized image element with lazy loading and fallback handling.
   * The image will use modern formats when available and load efficiently.
   */
  public createOptimizedImage(
    src: string,
    alt: string,
    options: AssetLoadingOptions = {}
  ): HTMLImageElement {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = options.lazy !== false ? 'lazy' : 'eager';
    img.decoding = 'async'; // Enable async image decoding for better performance

    const optimizedSrc = this.optimizeImageUrl(src, options);

    if (options.lazy !== false && this.config.enableLazyLoading) {
      // Store optimized source for later loading
      img.dataset.src = optimizedSrc;
      img.dataset.originalSrc = src;
      img.src = this.generatePlaceholder(100, 100);

      this.lazyImages.add(img);
      this.intersectionObserver?.observe(img);
    } else {
      img.src = optimizedSrc;
      this.trackImageLoad(img, optimizedSrc);
    }

    // Fallback to original source on error
    img.onerror = () => {
      if (img.src !== src) {
        logger.warn('Optimized image failed, trying original', {
          component: 'ImageOptimizer',
          src,
        });
        img.src = src;
      }
    };

    return img;
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    const startTime = performance.now();

    img.onload = () => {
      const loadTime = performance.now() - startTime;
      this.trackImageLoad(img, src, loadTime);
      img.classList.add('loaded'); // Add class for CSS transitions
    };

    img.onerror = () => {
      logger.warn('Failed to lazy load image', { component: 'ImageOptimizer', src });
      const originalSrc = img.dataset.originalSrc;
      if (originalSrc && originalSrc !== src) {
        img.src = originalSrc;
      }
    };

    img.src = src;
  }

  private trackImageLoad(img: HTMLImageElement, src: string, loadTime?: number): void {
    const actualLoadTime = loadTime ?? 0;
    // Estimate size based on dimensions (rough approximation)
    const estimatedSize = (img.naturalWidth || 0) * (img.naturalHeight || 0) * 0.5;

    this.loadedAssets.set(src, {
      size: estimatedSize,
      loadTime: actualLoadTime,
      optimized: src.includes('format=') || src.includes('quality='),
    });

    if (loadTime) {
      logger.debug('Image loaded', {
        component: 'ImageOptimizer',
        src,
        loadTime: Math.round(actualLoadTime),
        dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
        optimized: src.includes('format='),
      });
    }
  }

  /**
   * Generates a lightweight placeholder using canvas or SVG fallback.
   * This provides a better visual experience during lazy loading.
   */
  private generatePlaceholder(width: number, height: number): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f3f4f6');
        gradient.addColorStop(1, '#e5e7eb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      logger.debug('Canvas placeholder generation failed, using SVG', {
        component: 'ImageOptimizer',
      });
    }

    // SVG fallback for environments where canvas isn't available
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';
  }

  /**
   * Preloads critical images that should be available immediately.
   * This is useful for hero images, logos, and above-the-fold content.
   */
  public async preloadCriticalImages(urls: string[]): Promise<void> {
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
          logger.warn('Failed to preload critical image', { component: 'ImageOptimizer', url });
          reject(new Error(`Failed to preload ${url}`));
        };

        img.src = this.optimizeImageUrl(url, { priority: 'high', lazy: false });
      });
    });

    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    logger.info('Critical images preloaded', {
      component: 'ImageOptimizer',
      successful,
      total: urls.length,
    });
  }

  public getMetrics(): AssetMetrics {
    const assets = Array.from(this.loadedAssets.values());
    const totalAssets = assets.length;
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const optimizedAssets = assets.filter(asset => asset.optimized).length;
    const totalLoadTime = assets.reduce((sum, asset) => sum + asset.loadTime, 0);
    const averageLoadTime = totalAssets > 0 ? totalLoadTime / totalAssets : 0;

    return {
      totalAssets,
      totalSize,
      optimizedAssets,
      lazyLoadedAssets: this.lazyImages.size,
      cacheHitRate: 0, // Would need additional tracking for accurate cache hit rate
      averageLoadTime,
    };
  }

  /**
   * Optimizes all existing images on the page.
   * Useful for progressively enhancing server-rendered content.
   */
  public optimizeExistingImages(): void {
    const images = document.querySelectorAll('img:not([data-optimized])');

    images.forEach(img => {
      const htmlImg = img as HTMLImageElement;
      const src = htmlImg.src;

      if (src && !src.startsWith('data:')) {
        htmlImg.dataset.optimized = 'true';
        htmlImg.dataset.originalSrc = src;

        const optimizedSrc = this.optimizeImageUrl(src, { format: 'auto' });
        if (optimizedSrc !== src) {
          htmlImg.src = optimizedSrc;
        }
      }
    });

    logger.info('Existing images optimized', { component: 'ImageOptimizer', count: images.length });
  }

  public cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    this.lazyImages.clear();
    this.loadedAssets.clear();
  }

  public updateConfig(newConfig: Partial<ImageOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Image optimization config updated', {
      component: 'ImageOptimizer',
      config: this.config,
    });
  }

  public getConfig(): ImageOptimizationConfig {
    return { ...this.config };
  }
}

// ============================================================================
// ASSET LOADING MANAGER CLASS
// ============================================================================

/**
 * AssetLoadingManager orchestrates high-level asset loading operations.
 * It provides network-aware loading, progress tracking, fallback strategies,
 * and performance monitoring. This is the main interface for loading multiple
 * assets with intelligent retry and fallback behavior.
 */
export class AssetLoadingManager {
  private loadingProgress: LoadingProgress = {
    loaded: 0,
    total: 0,
    phase: 'preload',
  };

  private progressCallbacks: Array<(progress: LoadingProgress) => void> = [];
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private assetLoader = new AssetLoader();
  private connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.detectConnectionType();
    this.setupConnectionMonitoring();
    this.setupPerformanceMonitoring();
  }

  /**
   * Detects the user's connection speed to optimize loading strategies.
   * Slow connections receive fewer parallel requests and lower priority assets.
   */
  private detectConnectionType(): void {
    if (typeof navigator === 'undefined') return;

    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }
    ).connection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || connection.saveData;
      this.connectionType = isSlow ? 'slow' : 'fast';

      logger.info('Connection type detected', {
        component: 'AssetLoadingManager',
        type: this.connectionType,
        effectiveType,
      });
    }
  }

  private setupConnectionMonitoring(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Network connection restored', { component: 'AssetLoadingManager' });
      this.notifyProgressCallbacks();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Network connection lost', { component: 'AssetLoadingManager' });
      this.notifyProgressCallbacks();
    });
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.analyzeResourcePerformance(resourceEntry);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.debug('Performance monitoring setup failed', {
        component: 'AssetLoadingManager',
        error,
      });
    }
  }

  private analyzeResourcePerformance(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    const isFromCache = entry.transferSize === 0 && entry.decodedBodySize > 0;

    // Alert on slow non-cached resources
    if (loadTime > 3000 && !isFromCache) {
      logger.warn('Slow resource detected', {
        component: 'AssetLoadingManager',
        name: entry.name,
        loadTime: Math.round(loadTime),
        size: entry.transferSize,
      });
    }
  }

  /**
   * Registers a callback to receive loading progress updates.
   * Returns an unsubscribe function to remove the callback.
   */
  public onProgress(callback: (progress: LoadingProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private notifyProgressCallbacks(): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.loadingProgress);
      } catch (error) {
        logger.error(
          'Progress callback error',
          { component: 'AssetLoadingManager' },
          error as Error
        );
      }
    });
  }

  private updateProgress(updates: Partial<LoadingProgress>): void {
    this.loadingProgress = { ...this.loadingProgress, ...updates };
    this.notifyProgressCallbacks();
  }

  /**
   * Loads a single asset with retry logic and fallback support.
   * Automatically adapts to network conditions and applies appropriate strategies.
   */
  public async loadAsset(
    url: string,
    type: AssetType,
    config?: Partial<AssetLoadConfig>,
    assetKey?: string
  ): Promise<AssetLoadResult> {
    // Check cache first
    if (this.loadedAssets.has(url)) {
      return {
        success: true,
        retries: 0,
        loadTime: 0,
        fromCache: true,
      };
    }

    // Don't retry recently failed assets
    if (this.failedAssets.has(url)) {
      return {
        success: false,
        error: new Error('Asset failed recently'),
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }

    const finalConfig = this.buildConfig(type, config, assetKey);
    const fallbackStrategy = assetKey ? this.getFallbackStrategy(type, assetKey) : undefined;

    try {
      const result = await this.performLoadWithFallback(url, type, finalConfig, fallbackStrategy);

      if (result.success) {
        this.loadedAssets.add(url);
        this.failedAssets.delete(url);
      } else {
        this.failedAssets.add(url);
        // Clear failure flag after cooldown period
        setTimeout(() => this.failedAssets.delete(url), 30000);
      }

      return result;
    } catch (error) {
      this.failedAssets.add(url);
      return {
        success: false,
        error: error as Error,
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }
  }

  private buildConfig(
    type: AssetType,
    config?: Partial<AssetLoadConfig>,
    assetKey?: string
  ): AssetLoadConfig {
    const baseConfig = { ...DEFAULT_CONFIGS[type], ...config };
    const priority = assetKey ? getAssetPriority(assetKey) : baseConfig.priority;

    // Adjust config based on priority and connection
    if (priority === 'critical') {
      baseConfig.maxRetries = Math.max(baseConfig.maxRetries, 3);
      baseConfig.timeout = Math.max(baseConfig.timeout, 10000);
    }

    if (this.connectionType === 'slow') {
      baseConfig.maxRetries = Math.max(1, baseConfig.maxRetries - 1);
      baseConfig.retryDelay *= 1.5;
    }

    return baseConfig;
  }

  private getFallbackStrategy(
    type: AssetType,
    assetKey: string
  ): AssetFallbackStrategy | undefined {
    const fallbackType = type === 'critical' ? 'scripts' : (`${type}s` as FallbackAssetType);
    return getAssetFallback(fallbackType, assetKey);
  }

  private async performLoadWithFallback(
    url: string,
    type: AssetType,
    config: AssetLoadConfig,
    fallbackStrategy?: AssetFallbackStrategy
  ): Promise<AssetLoadResult> {
    const startTime = performance.now();
    let currentUrl = url;
    let retries = 0;

    // Skip if offline and connection-aware
    if (config.connectionAware && !this.isOnline) {
      if (fallbackStrategy?.offlineFallback) {
        currentUrl = fallbackStrategy.offlineFallback;
        logger.info('Using offline fallback', {
          component: 'AssetLoadingManager',
          url: currentUrl,
        });
      } else {
        return {
          success: false,
          error: new Error('Device is offline'),
          retries: 0,
          loadTime: 0,
          fromCache: false,
        };
      }
    }

    // Try primary URL, then fallbacks
    const urlsToTry = [currentUrl];
    if (fallbackStrategy?.fallbacks) {
      urlsToTry.push(...fallbackStrategy.fallbacks);
    }

    for (const tryUrl of urlsToTry) {
      try {
        const result = await this.assetLoader.loadAsset(tryUrl, type, config);

        if (result.success) {
          return {
            ...result,
            loadTime: performance.now() - startTime,
            retries,
          };
        }

        retries++;
      } catch (error) {
        retries++;
        logger.debug('Asset load attempt failed', {
          component: 'AssetLoadingManager',
          url: tryUrl,
          attempt: retries,
        });
      }
    }

    return {
      success: false,
      error: new Error('All load attempts failed'),
      retries,
      loadTime: performance.now() - startTime,
      fromCache: false,
    };
  }

  /**
   * Loads multiple assets with intelligent concurrency control.
   * Automatically batches requests based on connection speed and priority.
   */
  public async loadAssets(
    assets: Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }>,
    phase: LoadingProgress['phase'] = 'critical'
  ): Promise<AssetLoadResult[]> {
    this.updateProgress({ total: assets.length, loaded: 0, phase });

    // Filter assets based on connection
    const filteredAssets = this.filterAssetsByConnection(assets);
    const results: AssetLoadResult[] = [];

    // Determine concurrency based on connection
    const concurrency = this.connectionType === 'slow' ? 2 : 4;
    const batches = this.createBatches(filteredAssets, concurrency);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(asset => this.loadAssetWithProgress(asset))
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason,
            retries: 0,
            loadTime: 0,
            fromCache: false,
          });
        }
      });

      this.updateProgress({ loaded: results.length });
    }

    this.updateProgress({ phase: 'complete' });
    return results;
  }

  private filterAssetsByConnection(
    assets: Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }>
  ): Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }> {
    return assets.filter(asset => {
      const config = { ...DEFAULT_CONFIGS[asset.type], ...asset.config };

      // Skip if offline and connection-aware
      if (config.connectionAware && !this.isOnline) {
        return false;
      }

      // Skip low priority on slow connections
      if (this.connectionType === 'slow' && config.priority === 'low') {
        return false;
      }

      return true;
    });
  }

  private async loadAssetWithProgress(asset: {
    url: string;
    type: AssetType;
    config?: Partial<AssetLoadConfig>;
  }): Promise<AssetLoadResult> {
    this.updateProgress({ currentAsset: asset.url });
    return this.loadAsset(asset.url, asset.type, asset.config);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  public getLoadingStats() {
    return {
      loaded: this.loadedAssets.size,
      failed: this.failedAssets.size,
      progress: { ...this.loadingProgress },
      connectionType: this.connectionType,
      isOnline: this.isOnline,
    };
  }

  public clearCache(): void {
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.assetLoader.clearCache();
  }
}

// ============================================================================
// FALLBACK SYSTEM
// ============================================================================

let fallbackConfig: AssetFallbacks = DEFAULT_ASSET_FALLBACKS;

export function initializeAssetFallbacks(customConfig?: Partial<AssetFallbacks>): void {
  if (customConfig) {
    fallbackConfig = {
      images: { ...fallbackConfig.images, ...customConfig.images },
      scripts: { ...fallbackConfig.scripts, ...customConfig.scripts },
      styles: { ...fallbackConfig.styles, ...customConfig.styles },
      fonts: { ...fallbackConfig.fonts, ...customConfig.fonts },
      priorities: { ...fallbackConfig.priorities, ...customConfig.priorities },
    };
  }

  logger.info('Asset fallback system initialized', { component: 'AssetFallbacks' });
}

export function getAssetFallback(
  type: FallbackAssetType,
  key: string
): AssetFallbackStrategy | undefined {
  return fallbackConfig[type]?.[key];
}

export function getAssetPriority(assetKey: string): 'critical' | 'high' | 'medium' | 'low' {
  const { critical, high, medium } = fallbackConfig.priorities;

  if (critical.includes(assetKey)) return 'critical';
  if (high.includes(assetKey)) return 'high';
  if (medium.includes(assetKey)) return 'medium';
  return 'low';
}

export function setAssetFallback(
  type: FallbackAssetType,
  key: string,
  strategy: AssetFallbackStrategy
): void {
  if (!fallbackConfig[type]) {
    fallbackConfig[type] = {};
  }
  fallbackConfig[type][key] = strategy;
  logger.debug('Asset fallback configured', { component: 'AssetFallbacks', type, key });
}

// ============================================================================
// ENHANCEMENT DETECTION
// ============================================================================

export function determineEnhancementLevel(): EnhancementLevel {
  if (typeof navigator === 'undefined') return EnhancementLevel.FULL;

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  const isSlowConnection =
    connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;
  const perfMemory = (performance as Performance & { memory?: { jsHeapSizeLimit?: number } })
    .memory;
  const hasLimitedMemory = perfMemory?.jsHeapSizeLimit
    ? perfMemory.jsHeapSizeLimit < 1000000000
    : false;

  if (isSlowConnection && isLowEndDevice && hasLimitedMemory) {
    return EnhancementLevel.MINIMAL;
  } else if (isSlowConnection || isLowEndDevice) {
    return EnhancementLevel.BASIC;
  } else if (hasLimitedMemory) {
    return EnhancementLevel.REDUCED;
  }

  return EnhancementLevel.FULL;
}

export function getFeatureAvailability(): FeatureAvailability {
  const level = determineEnhancementLevel();

  const features: Record<EnhancementLevel, FeatureAvailability> = {
    [EnhancementLevel.MINIMAL]: {
      charts: false,
      maps: false,
      analytics: false,
      animations: false,
      images: true,
      fonts: true,
    },
    [EnhancementLevel.BASIC]: {
      charts: false,
      maps: false,
      analytics: true,
      animations: false,
      images: true,
      fonts: true,
    },
    [EnhancementLevel.REDUCED]: {
      charts: true,
      maps: false,
      analytics: true,
      animations: false,
      images: true,
      fonts: true,
    },
    [EnhancementLevel.FULL]: {
      charts: true,
      maps: true,
      analytics: true,
      animations: true,
      images: true,
      fonts: true,
    },
  };

  return features[level];
}

export function applyDegradedMode(): void {
  if (typeof document === 'undefined') return;

  const features = getFeatureAvailability();

  if (!features.animations) {
    document.documentElement.style.setProperty('--animation-duration', '0s');
    document.documentElement.style.setProperty('--transition-duration', '0s');
  }

  if (!features.charts) document.documentElement.classList.add('no-charts');
  if (!features.maps) document.documentElement.classList.add('no-maps');

  logger.info('Degraded mode applied', { component: 'AssetFallback', features });
}

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAssetLoading(
  assets: Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }>
) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LoadingProgress>({
    loaded: 0,
    total: 0,
    phase: 'preload',
  });
  const [errors, setErrors] = useState<Error[]>([]);
  const managerRef = useRef(null as AssetLoadingManager | null);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new AssetLoadingManager();
    }

    const manager = managerRef.current;
    const unsubscribe = manager.onProgress(setProgress);

    manager
      .loadAssets(assets)
      .then((results: AssetLoadResult[]) => {
        const failedResults = results.filter((r: AssetLoadResult) => !r.success);
        if (failedResults.length > 0) {
          setErrors(
            failedResults
              .map((r: AssetLoadResult) => r.error)
              .filter((e): e is Error => e !== undefined)
          );
        }
        setLoading(false);
      })
      .catch((error: Error) => {
        setErrors([error]);
        setLoading(false);
      });

    return () => {
      unsubscribe();
    };
  }, [assets]);

  return { loading, progress, errors };
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const assetLoader = new AssetLoader();
export const imageOptimizer = ImageOptimizer.getInstance();
export const assetLoadingManager = new AssetLoadingManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const loadAsset = (
  url: string,
  type: AssetType,
  config?: Partial<AssetLoadConfig>,
  assetKey?: string
): Promise<AssetLoadResult> => assetLoadingManager.loadAsset(url, type, config, assetKey);

export const loadAssets = (
  assets: Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }>,
  phase?: LoadingProgress['phase']
): Promise<AssetLoadResult[]> => assetLoadingManager.loadAssets(assets, phase);

export const preloadCriticalAssets = (): Promise<void> => {
  const criticalAssets = [
    { url: '/src/main.tsx', type: 'critical' as AssetType },
    { url: '/src/index.css', type: 'style' as AssetType },
    { url: '/Chanuka_logo.svg', type: 'image' as AssetType },
  ];

  return assetLoadingManager
    .loadAssets(criticalAssets, 'preload')
    .then(() => logger.info('Critical assets preloaded', { component: 'AssetLoadingManager' }))
    .catch(error => {
      logger.error(
        'Failed to preload critical assets',
        { component: 'AssetLoadingManager' },
        error
      );
      throw error;
    });
};

export const createOptimizedImage = (
  src: string,
  alt: string,
  options?: AssetLoadingOptions
): HTMLImageElement => imageOptimizer.createOptimizedImage(src, alt, options);

export const optimizeImageUrl = (src: string, options?: AssetLoadingOptions): string =>
  imageOptimizer.optimizeImageUrl(src, options);

export const getAssetMetrics = (): AssetMetrics => imageOptimizer.getMetrics();

export const optimizeExistingImages = (): void => imageOptimizer.optimizeExistingImages();

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeAssetFallbacks();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeExistingImages();
      applyDegradedMode();
    });
  } else {
    optimizeExistingImages();
    applyDegradedMode();
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  AssetLoader,
  ImageOptimizer,
  AssetLoadingManager,
  assetLoader,
  imageOptimizer,
  assetLoadingManager,
  loadAsset,
  loadAssets,
  preloadCriticalAssets,
  createOptimizedImage,
  optimizeImageUrl,
  getAssetMetrics,
  optimizeExistingImages,
  initializeAssetFallbacks,
  getAssetFallback,
  getAssetPriority,
  setAssetFallback,
  determineEnhancementLevel,
  getFeatureAvailability,
  applyDegradedMode,
  useAssetLoading,
};
