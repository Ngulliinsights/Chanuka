import { logger } from './logger';
import type { OfflineDetectionState } from '@client/hooks/useOfflineDetection';
import {
  DEFAULT_ASSET_FALLBACKS,
  getAssetFallback,
  getAssetPriority,
  determineEnhancementLevel,
  getFeatureAvailability,
  applyDegradedMode,
  initializeAssetFallbacks,
  EnhancementLevel
} from './asset-fallback-config';
import React from 'react';

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

// Extended progress type for callbacks that includes connection state
export interface LoadingProgressWithConnection extends LoadingProgress {
  connectionState?: OfflineDetectionState;
}

// Valid asset type keys - this ensures type safety throughout
type AssetType = 'script' | 'style' | 'image' | 'font' | 'critical';

// Default configuration for different asset types
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

// Helper function to safely get default config
function getDefaultConfig(type: AssetType): AssetLoadConfig {
  return DEFAULT_CONFIGS[type];
}

// Asset loading manager
export class AssetLoadingManager {
  private loadingProgress: LoadingProgress = {
    loaded: 0,
    total: 0,
    phase: 'preload',
  };
  
  private progressCallbacks: ((progress: LoadingProgressWithConnection) => void)[] = [];
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private loadPromises = new Map<string, Promise<AssetLoadResult>>();

  private notifyProgressCallbacks() {
    // Create progress object with properly typed connectionState
    // Only include connectionState if it exists (not undefined)
    const progress: LoadingProgressWithConnection = {
      ...this.loadingProgress,
      ...(this.connectionState && { connectionState: this.connectionState })
    };
    this.progressCallbacks.forEach(callback => callback(progress));
  }
  
  // Connection monitoring
  private connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  private isOnline = navigator.onLine;
  private connectionState: OfflineDetectionState | null = null;

  constructor() {
    this.setupConnectionMonitoring();
    this.setupPerformanceMonitoring();
    this.initializeFallbackSystem();
  }

  private initializeFallbackSystem() {
    if (typeof window !== 'undefined') {
      initializeAssetFallbacks();
    }
  }

  public updateConnectionState(state: OfflineDetectionState) {
    this.connectionState = state;
    this.isOnline = state.isOnline;
    this.connectionType = state.connectionQuality.type === 'fast' ? 'fast' :
                         state.connectionQuality.type === 'slow' ? 'slow' : 'unknown';
    this.handleConnectionUpdate();
  }

  private setupConnectionMonitoring() {
    // Basic offline detection as fallback
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleConnectionUpdate();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleConnectionUpdate();
    });
  }

  private handleConnectionUpdate() {
    // Re-evaluate loading strategy based on connection state
    if (!this.isOnline) {
      this.handleOfflineMode();
    } else {
      this.handleOnlineMode();
    }
    
    // Notify progress callbacks of connection state change
    this.notifyProgressCallbacks();
  }

  private handleOfflineMode() {
    logger.warn('Network is offline, switching to fallback mode');
    // Pause any non-critical loading
    this.pauseNonCriticalLoading();
    // Attempt to use cached resources
    this.activateFallbackMode();
  }

  private handleOnlineMode() {
    logger.info('Network is online, resuming normal operation');
    // Resume loading if previously paused
    this.resumeLoading();
    // Check for any failed assets that need retry
    this.retryFailedAssets();
  }

  private pauseNonCriticalLoading() {
    // Implementation will be added in a separate change
  }

  private activateFallbackMode() {
    // Implementation will be added in a separate change
  }

  private resumeLoading() {
    // Implementation will be added in a separate change
  }

  private retryFailedAssets() {
    // Implementation will be added in a separate change
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
  onProgress(callback: (progress: LoadingProgressWithConnection) => void): () => void {
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
    this.notifyProgressCallbacks();
  }

  // Load a single asset with retry logic and fallbacks
  async loadAsset(
    url: string,
    type: AssetType,
    config?: Partial<AssetLoadConfig>,
    assetKey?: string
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

    // Get default config for this asset type using our safe helper
    const defaultConfig = getDefaultConfig(type);

    // Merge configurations with proper type safety
    // We use nullish coalescing to ensure each property has a defined value
    const finalConfig: AssetLoadConfig = {
      maxRetries: config?.maxRetries ?? defaultConfig.maxRetries,
      retryDelay: config?.retryDelay ?? defaultConfig.retryDelay,
      timeout: config?.timeout ?? defaultConfig.timeout,
      priority: config?.priority ?? defaultConfig.priority,
      connectionAware: config?.connectionAware ?? defaultConfig.connectionAware,
    };

    // Get fallback strategy if asset key is provided
    const fallbackStrategy = assetKey ? getAssetFallback(type + 's' as keyof typeof DEFAULT_ASSET_FALLBACKS, assetKey) : null;
    const priority = assetKey ? getAssetPriority(assetKey) : 'medium';

    // Adjust config based on priority
    if (priority === 'critical') {
      finalConfig.maxRetries = Math.max(finalConfig.maxRetries, 3);
      finalConfig.timeout = Math.min(finalConfig.timeout, 5000);
    }

    const loadPromise = this.performAssetLoadWithFallback(url, type, finalConfig, fallbackStrategy);
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

  private async performAssetLoadWithFallback(
    url: string,
    type: string,
    config: AssetLoadConfig,
    fallbackStrategy?: any
  ): Promise<AssetLoadResult> {
    const startTime = performance.now();
    let retries = 0;
    let lastError: Error | undefined;
    let currentUrl = url;

    // Check connection and adjust config if needed
    if (config.connectionAware && !this.isOnline) {
      logger.warn('Asset loading skipped due to offline status', { component: 'AssetLoadingManager', url });
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
      logger.info('Skipping low priority asset on slow connection', { component: 'AssetLoadingManager', url });
      return {
        success: false,
        error: new Error('Skipped due to slow connection'),
        retries: 0,
        loadTime: 0,
        fromCache: false,
      };
    }

    // Adjust retry config based on connection quality
    if (this.connectionType === 'slow') {
      config.maxRetries = Math.max(1, config.maxRetries - 1); // Reduce retries on slow connections
      config.retryDelay = config.retryDelay * 1.5; // Increase delay
    }

    while (retries <= config.maxRetries) {
      try {
        const loadResult = await this.loadAssetByType(currentUrl, type, config.timeout);
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

        // Try fallback URL if available
        if (fallbackStrategy && currentUrl === url && fallbackStrategy.fallbacks && fallbackStrategy.fallbacks.length > 0) {
          currentUrl = fallbackStrategy.fallbacks[0];
          logger.info('Trying fallback URL', { component: 'AssetLoadingManager', original: url, fallback: currentUrl });
          continue;
        }

        // Try offline fallback if available
        if (fallbackStrategy && fallbackStrategy.offlineFallback && !this.isOnline && currentUrl !== fallbackStrategy.offlineFallback) {
          currentUrl = fallbackStrategy.offlineFallback;
          logger.info('Using offline fallback', { component: 'AssetLoadingManager', url: currentUrl });
          continue;
        }

        if (retries <= config.maxRetries) {
          // Exponential backoff with jitter
          const delay = config.retryDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          console.warn(`Retrying asset load (${retries}/${config.maxRetries}): ${currentUrl}`, error);
        }
      }
    }

    const loadTime = performance.now() - startTime;
    
    // Build result object conditionally to satisfy exactOptionalPropertyTypes
    // If lastError exists, include it; otherwise, omit the error property entirely
    const result: AssetLoadResult = {
      success: false,
      retries,
      loadTime,
      fromCache: false,
    };
    
    // Only add error property if we have an actual error
    if (lastError) {
      result.error = lastError;
    }
    
    return result;
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

    const handleError = () => {
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
    assets: Array<{ url: string; type: AssetType; config?: Partial<AssetLoadConfig> }>,
    phase: LoadingProgress['phase'] = 'critical'
  ): Promise<AssetLoadResult[]> {
    this.updateProgress({
      total: assets.length,
      loaded: 0,
      phase,
    });

    const results: AssetLoadResult[] = [];

    // Filter assets based on offline status and connection quality
    const filteredAssets = assets.filter(asset => {
      const defaultConfig = getDefaultConfig(asset.type);
      const config = { ...defaultConfig, ...asset.config };

      if (config.connectionAware && !this.isOnline) {
        logger.debug('Skipping asset due to offline status', { component: 'AssetLoadingManager', url: asset.url });
        return false;
      }

      if (config.connectionAware && this.connectionType === 'slow' && config.priority === 'low') {
        logger.debug('Skipping low priority asset on slow connection', { component: 'AssetLoadingManager', url: asset.url });
        return false;
      }

      return true;
    });

    if (filteredAssets.length !== assets.length) {
      logger.info(`Filtered ${assets.length - filteredAssets.length} assets due to connection conditions`, {
        component: 'AssetLoadingManager',
        total: assets.length,
        filtered: filteredAssets.length
      });
    }

    // Load assets with concurrency control
    const concurrency = this.connectionType === 'slow' ? 2 : 4;
    const chunks = this.chunkArray(filteredAssets, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (asset) => {
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
    const criticalAssets: Array<{ url: string; type: AssetType }> = [
      { url: '/src/main.tsx', type: 'critical' },
      { url: '/src/index.css', type: 'style' },
      { url: '/src/App.tsx', type: 'critical' },
      { url: '/Chanuka_logo.svg', type: 'image' },
      { url: '/Chanuka_logo.png', type: 'image' },
    ];

    try {
      await this.loadAssets(criticalAssets, 'preload');
      logger.info('Critical assets preloaded successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Failed to preload critical assets:', { component: 'Chanuka' }, error);
    }
  }

  // Get loading statistics with enhancement level
  getLoadingStats() {
    const loaded = Array.from(this.loadedAssets);
    const failed = Array.from(this.failedAssets);
    const enhancementLevel = determineEnhancementLevel(loaded, failed);
    const featureAvailability = getFeatureAvailability(loaded, failed);

    return {
      loaded: this.loadedAssets.size,
      failed: this.failedAssets.size,
      progress: this.loadingProgress,
      connectionType: this.connectionType,
      isOnline: this.connectionState?.isOnline ?? true,
      connectionQuality: this.connectionState?.connectionQuality ?? 'unknown',
      lastOnlineTime: this.connectionState?.lastOnlineTime,
      lastOfflineTime: this.connectionState?.lastOfflineTime,
      enhancementLevel,
      featureAvailability,
      loadedAssets: loaded,
      failedAssets: failed,
    };
  }

  // Apply degraded mode based on current loading state
  applyDegradedMode(): void {
    const stats = this.getLoadingStats();
    applyDegradedMode(stats.enhancementLevel);
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

  const [enhancementLevel, setEnhancementLevel] = React.useState<EnhancementLevel>(EnhancementLevel.FULL);

  React.useEffect(() => {
    const unsubscribe = assetLoadingManager.onProgress((newProgress) => {
      setProgress(newProgress);
      // Update enhancement level when progress changes
      const stats = assetLoadingManager.getLoadingStats();
      setEnhancementLevel(stats.enhancementLevel);
    });
    return unsubscribe;
  }, []);

  return {
    progress,
    enhancementLevel,
    loadAsset: (url: string, type: AssetType, config?: Partial<AssetLoadConfig>, assetKey?: string) =>
      assetLoadingManager.loadAsset(url, type, config, assetKey),
    loadAssets: assetLoadingManager.loadAssets.bind(assetLoadingManager),
    preloadCriticalAssets: assetLoadingManager.preloadCriticalAssets.bind(assetLoadingManager),
    getStats: assetLoadingManager.getLoadingStats.bind(assetLoadingManager),
    applyDegradedMode: assetLoadingManager.applyDegradedMode.bind(assetLoadingManager),
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