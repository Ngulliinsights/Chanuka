import { logger } from '../utils/logger';
import { preloadCriticalResources } from './serviceWorker';

// Asset loading configuration
export interface AssetLoadConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  priority: 'high' | 'medium' | 'low';
  connectionAware: boolean;
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

// Default configuration for different asset types
const DEFAULT_CONFIGS: Record<string, AssetLoadConfig> = {
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

// Asset loading manager
export class AssetLoadingManager {
  private loadingProgress: LoadingProgress = {
    loaded: 0,
    total: 0,
    phase: 'preload',
  };
  
  private progressCallbacks: ((progress: LoadingProgress) => void)[] = [];
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private loadPromises = new Map<string, Promise<AssetLoadResult>>();
  
  // Connection monitoring
  private connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  private isOnline = navigator.onLine;

  constructor() {
    this.setupConnectionMonitoring();
    this.setupPerformanceMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Monitor connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionType = () => {
        const effectiveType = connection.effectiveType;
        this.connectionType = effectiveType === '4g' ? 'fast' : 'slow';
      };

      updateConnectionType();
      connection.addEventListener('change', updateConnectionType);
    }
  }

  private setupPerformanceMonitoring() {
    // Monitor resource loading performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.handleResourcePerformance(resourceEntry);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  private handleResourcePerformance(entry: PerformanceResourceTiming) {
    const loadTime = entry.responseEnd - entry.startTime;
    const isFromCache = entry.transferSize === 0 && entry.decodedBodySize > 0;
    
    // Log slow loading assets
    if (loadTime > 3000 && !isFromCache) {
      console.warn(`Slow asset loading detected: ${entry.name} took ${loadTime}ms`);
    }
  }

  // Subscribe to loading progress updates
  onProgress(callback: (progress: LoadingProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private updateProgress(updates: Partial<LoadingProgress>) {
    this.loadingProgress = { ...this.loadingProgress, ...updates };
    this.progressCallbacks.forEach(callback => callback(this.loadingProgress));
  }

  // Load a single asset with retry logic
  async loadAsset(
    url: string,
    type: 'script' | 'style' | 'image' | 'font' | 'critical',
    config?: Partial<AssetLoadConfig>
  ): Promise<AssetLoadResult> {
    // Return cached promise if already loading
    if (this.loadPromises.has(url)) {
      return this.loadPromises.get(url)!;
    }

    // Return success if already loaded
    if (this.loadedAssets.has(url)) {
      return {
        success: true,
        retries: 0,
        loadTime: 0,
        fromCache: true,
      };
    }

    // Return failure if already failed recently (within 30 seconds)
    if (this.failedAssets.has(url)) {
      return {
        success: false,
        error: new Error('Asset failed to load recently'),
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }

    const finalConfig = { ...DEFAULT_CONFIGS[type], ...config };
    const loadPromise = this.performAssetLoad(url, type, finalConfig);
    this.loadPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      if (result.success) {
        this.loadedAssets.add(url);
        // Remove from failed assets if it was there
        this.failedAssets.delete(url);
      } else {
        this.failedAssets.add(url);
        // Remove from failed assets after 30 seconds to allow retry
        setTimeout(() => {
          this.failedAssets.delete(url);
        }, 30000);
      }
      return result;
    } finally {
      this.loadPromises.delete(url);
    }
  }

  private async performAssetLoad(
    url: string,
    type: string,
    config: AssetLoadConfig
  ): Promise<AssetLoadResult> {
    const startTime = performance.now();
    let retries = 0;
    let lastError: Error | undefined;

    // Check connection and adjust config if needed
    if (config.connectionAware && !this.isOnline) {
      return {
        success: false,
        error: new Error('Device is offline'),
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }

    if (config.connectionAware && this.connectionType === 'slow' && config.priority === 'low') {
      // Skip low priority assets on slow connections
      return {
        success: false,
        error: new Error('Skipped due to slow connection'),
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }

    while (retries <= config.maxRetries) {
      try {
        const loadResult = await this.loadAssetByType(url, type, config.timeout);
        const loadTime = performance.now() - startTime;
        
        return {
          success: true,
          retries,
          loadTime,
          fromCache: loadResult.fromCache,
        };
      } catch (error) {
        lastError = error as Error;
        retries++;
        
        if (retries <= config.maxRetries) {
          // Exponential backoff with jitter
          const delay = config.retryDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.warn(`Retrying asset load (${retries}/${config.maxRetries}): ${url}`, error);
        }
      }
    }

    const loadTime = performance.now() - startTime;
    return {
      success: false,
      error: lastError,
      retries,
      loadTime,
      fromCache: false,
    };
  }

  private async loadAssetByType(
    url: string,
    type: string,
    timeout: number
  ): Promise<{ fromCache: boolean }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Asset load timeout: ${url}`));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
      };

      switch (type) {
        case 'script':
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
        case 'critical':
          this.loadCriticalResource(url, resolve, reject, cleanup);
          break;
        default:
          cleanup();
          reject(new Error(`Unknown asset type: ${type}`));
      }
    });
  }

  private loadScript(
    url: string,
    resolve: (value: { fromCache: boolean }) => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ) {
    const script = document.createElement('script');
    script.src = url;
    script.type = 'module';
    script.crossOrigin = 'anonymous';
    
    const handleLoad = () => {
      cleanup();
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      resolve({ fromCache: false });
    };

    const handleError = (event: Event | string) => {
      cleanup();
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      document.head.removeChild(script);
      reject(new Error(`Failed to load script: ${url}`));
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    
    document.head.appendChild(script);
  }

  private loadStylesheet(
    url: string,
    resolve: (value: { fromCache: boolean }) => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';
    
    const handleLoad = () => {
      cleanup();
      link.removeEventListener('load', handleLoad);
      link.removeEventListener('error', handleError);
      resolve({ fromCache: false });
    };

    const handleError = () => {
      cleanup();
      link.removeEventListener('load', handleLoad);
      link.removeEventListener('error', handleError);
      document.head.removeChild(link);
      reject(new Error(`Failed to load stylesheet: ${url}`));
    };

    link.addEventListener('load', handleLoad);
    link.addEventListener('error', handleError);
    
    document.head.appendChild(link);
  }

  private loadImage(
    url: string,
    resolve: (value: { fromCache: boolean }) => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ) {
    const img = new Image();
    
    const handleLoad = () => {
      cleanup();
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      resolve({ fromCache: img.complete });
    };

    const handleError = () => {
      cleanup();
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    img.src = url;
  }

  private loadFont(
    url: string,
    resolve: (value: { fromCache: boolean }) => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ) {
    if ('FontFace' in window) {
      // Use modern Font Loading API
      const fontName = `font-${Date.now()}`;
      const font = new FontFace(fontName, `url(${url})`);
      
      font.load()
        .then(() => {
          cleanup();
          document.fonts.add(font);
          resolve({ fromCache: false });
        })
        .catch((error) => {
          cleanup();
          reject(new Error(`Failed to load font: ${url} - ${error.message}`));
        });
    } else {
      // Fallback for older browsers
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'font';
      link.crossOrigin = 'anonymous';
      
      const handleLoad = () => {
        cleanup();
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleError);
        resolve({ fromCache: false });
      };

      const handleError = () => {
        cleanup();
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleError);
        document.head.removeChild(link);
        reject(new Error(`Failed to load font: ${url}`));
      };

      link.addEventListener('load', handleLoad);
      link.addEventListener('error', handleError);
      
      document.head.appendChild(link);
    }
  }

  private loadCriticalResource(
    url: string,
    resolve: (value: { fromCache: boolean }) => void,
    reject: (error: Error) => void,
    cleanup: () => void
  ) {
    // Use fetch for critical resources to have more control
    fetch(url, {
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'default',
    })
      .then(response => {
        cleanup();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const fromCache = response.headers.get('x-cache') === 'HIT' || 
                          response.headers.get('cf-cache-status') === 'HIT';
        resolve({ fromCache });
      })
      .catch(error => {
        cleanup();
        reject(new Error(`Failed to load critical resource: ${url} - ${error.message}`));
      });
  }

  // Load multiple assets with progress tracking
  async loadAssets(
    assets: Array<{ url: string; type: 'script' | 'style' | 'image' | 'font' | 'critical'; config?: Partial<AssetLoadConfig> }>,
    phase: LoadingProgress['phase'] = 'critical'
  ): Promise<AssetLoadResult[]> {
    this.updateProgress({
      total: assets.length,
      loaded: 0,
      phase,
    });

    const results: AssetLoadResult[] = [];
    
    // Load assets with concurrency control
    const concurrency = this.connectionType === 'slow' ? 2 : 4;
    const chunks = this.chunkArray(assets, concurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (asset, index) => {
        this.updateProgress({
          currentAsset: asset.url,
        });
        
        const result = await this.loadAsset(asset.url, asset.type, asset.config);
        
        this.updateProgress({
          loaded: this.loadingProgress.loaded + 1,
        });
        
        return result;
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Preload critical assets for the application
  async preloadCriticalAssets(): Promise<void> {
    const criticalAssets = [
      { url: '/src/main.tsx', type: 'critical' as const },
      { url: '/src/index.css', type: 'style' as const },
      { url: '/src/App.tsx', type: 'critical' as const },
      { url: '/Chanuka_logo.svg', type: 'image' as const },
      { url: '/Chanuka_logo.png', type: 'image' as const },
    ];

    try {
      await this.loadAssets(criticalAssets, 'preload');
      logger.info('Critical assets preloaded successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Failed to preload critical assets:', { component: 'SimpleTool' }, error);
    }
  }

  // Get loading statistics
  getLoadingStats() {
    return {
      loaded: this.loadedAssets.size,
      failed: this.failedAssets.size,
      progress: this.loadingProgress,
      connectionType: this.connectionType,
      isOnline: this.isOnline,
    };
  }

  // Clear cache and reset state
  reset() {
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.loadPromises.clear();
    this.loadingProgress = {
      loaded: 0,
      total: 0,
      phase: 'preload',
    };
  }
}

// Global asset loading manager instance
export const assetLoadingManager = new AssetLoadingManager();

// Hook for using asset loading in React components
export function useAssetLoading() {
  const [progress, setProgress] = React.useState<LoadingProgress>({
    loaded: 0,
    total: 0,
    phase: 'preload',
  });

  React.useEffect(() => {
    const unsubscribe = assetLoadingManager.onProgress(setProgress);
    return unsubscribe;
  }, []);

  return {
    progress,
    loadAsset: assetLoadingManager.loadAsset.bind(assetLoadingManager),
    loadAssets: assetLoadingManager.loadAssets.bind(assetLoadingManager),
    preloadCriticalAssets: assetLoadingManager.preloadCriticalAssets.bind(assetLoadingManager),
    getStats: assetLoadingManager.getLoadingStats.bind(assetLoadingManager),
  };
}

// Utility function to setup asset preloading based on user interaction
export function setupAssetPreloading() {
  // Preload assets on first user interaction
  const preloadOnInteraction = () => {
    assetLoadingManager.preloadCriticalAssets();
    
    // Remove listeners after first interaction
    document.removeEventListener('click', preloadOnInteraction);
    document.removeEventListener('keydown', preloadOnInteraction);
    document.removeEventListener('touchstart', preloadOnInteraction);
  };

  document.addEventListener('click', preloadOnInteraction, { once: true });
  document.addEventListener('keydown', preloadOnInteraction, { once: true });
  document.addEventListener('touchstart', preloadOnInteraction, { once: true });
}

// Import React for the hook
import React from 'react';






