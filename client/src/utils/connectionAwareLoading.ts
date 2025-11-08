import { logger } from './client-core';
// Connection-aware loading strategies for optimal performance

export interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface LoadingStrategy {
  imageQuality: number;
  enablePreloading: boolean;
  lazyLoadThreshold: number;
  chunkPrefetchCount: number;
  enableServiceWorker: boolean;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
}

class ConnectionAwareLoader {
  private connectionInfo: ConnectionInfo;
  private strategy: LoadingStrategy;
  private observers: Array<(strategy: LoadingStrategy) => void> = [];

  constructor() {
    this.connectionInfo = this.getConnectionInfo();
    this.strategy = this.calculateStrategy();
    this.setupConnectionMonitoring();
  }

  public getConnectionInfo(): ConnectionInfo {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false,
      };
    }

    // Fallback for browsers without Network Information API
    return {
      effectiveType: 'unknown',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }

  private calculateStrategy(): LoadingStrategy {
    const { effectiveType, downlink, saveData } = this.connectionInfo;

    // Data saver mode - minimal loading
    if (saveData) {
      return {
        imageQuality: 40,
        enablePreloading: false,
        lazyLoadThreshold: 0.8,
        chunkPrefetchCount: 0,
        enableServiceWorker: true,
        cacheStrategy: 'aggressive',
      };
    }

    // Slow connections
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return {
        imageQuality: 50,
        enablePreloading: false,
        lazyLoadThreshold: 0.6,
        chunkPrefetchCount: 1,
        enableServiceWorker: true,
        cacheStrategy: 'aggressive',
      };
    }

    // Medium connections
    if (effectiveType === '3g' || downlink < 2) {
      return {
        imageQuality: 65,
        enablePreloading: true,
        lazyLoadThreshold: 0.4,
        chunkPrefetchCount: 2,
        enableServiceWorker: true,
        cacheStrategy: 'moderate',
      };
    }

    // Fast connections
    return {
      imageQuality: 80,
      enablePreloading: true,
      lazyLoadThreshold: 0.2,
      chunkPrefetchCount: 3,
      enableServiceWorker: true,
      cacheStrategy: 'moderate',
    };
  }

  private setupConnectionMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.connectionInfo = this.getConnectionInfo();
        const newStrategy = this.calculateStrategy();
        
        if (this.hasStrategyChanged(newStrategy)) {
          this.strategy = newStrategy;
          this.notifyObservers();
        }
      });
    }
  }

  private hasStrategyChanged(newStrategy: LoadingStrategy): boolean {
    return JSON.stringify(this.strategy) !== JSON.stringify(newStrategy);
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.strategy));
  }

  // Public methods
  public getStrategy(): LoadingStrategy {
    return { ...this.strategy };
  }



  public subscribe(callback: (strategy: LoadingStrategy) => void): () => void {
    this.observers.push(callback);
    
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  public shouldLoadResource(priority: 'high' | 'medium' | 'low'): boolean {
    const { effectiveType, saveData } = this.connectionInfo;

    if (saveData) {
      return priority === 'high';
    }

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return priority === 'high';
    }

    if (effectiveType === '3g') {
      return priority !== 'low';
    }

    return true; // Load all resources on fast connections
  }

  public getOptimalImageQuality(): number {
    return this.strategy.imageQuality;
  }

  public shouldPreloadRoute(routePriority: 'high' | 'medium' | 'low'): boolean {
    if (!this.strategy.enablePreloading) {
      return false;
    }

    const { effectiveType } = this.connectionInfo;

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return routePriority === 'high';
    }

    if (effectiveType === '3g') {
      return routePriority !== 'low';
    }

    return true;
  }

  public getChunkPrefetchCount(): number {
    return this.strategy.chunkPrefetchCount;
  }

  public getCacheStrategy(): 'aggressive' | 'moderate' | 'minimal' {
    return this.strategy.cacheStrategy;
  }
}

// Global connection-aware loader instance
export const connectionAwareLoader = new ConnectionAwareLoader();

// React hook for connection-aware loading
export function useConnectionAwareLoading() {
  const [strategy, setStrategy] = React.useState<LoadingStrategy>(
    connectionAwareLoader.getStrategy()
  );

  React.useEffect(() => {
    const unsubscribe = connectionAwareLoader.subscribe(setStrategy);
    return unsubscribe;
  }, []);

  return {
    strategy,
    connectionInfo: connectionAwareLoader.getConnectionInfo(),
    shouldLoadResource: connectionAwareLoader.shouldLoadResource.bind(connectionAwareLoader),
    shouldPreloadRoute: connectionAwareLoader.shouldPreloadRoute.bind(connectionAwareLoader),
    getOptimalImageQuality: connectionAwareLoader.getOptimalImageQuality.bind(connectionAwareLoader),
    getChunkPrefetchCount: connectionAwareLoader.getChunkPrefetchCount.bind(connectionAwareLoader),
    getCacheStrategy: connectionAwareLoader.getCacheStrategy.bind(connectionAwareLoader),
  };
}

// Adaptive resource loading utility
export class AdaptiveResourceLoader {
  private loadQueue: Array<{
    url: string;
    priority: 'high' | 'medium' | 'low';
    type: 'script' | 'style' | 'image' | 'font';
    callback?: () => void;
  }> = [];

  private isProcessing = false;

  public queueResource(
    url: string,
    priority: 'high' | 'medium' | 'low',
    type: 'script' | 'style' | 'image' | 'font',
    callback?: () => void
  ): void {
    this.loadQueue.push({ url, priority, type, callback });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.loadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const maxIterations = 100; // Safety limit to prevent infinite loops
    let iterationCount = 0;
    const startTime = Date.now();
    const maxProcessingTime = 30000; // 30 seconds timeout

    try {
      // Sort by priority
      this.loadQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const strategy = connectionAwareLoader.getStrategy();
      const maxConcurrent = strategy.chunkPrefetchCount || 2;

      while (this.loadQueue.length > 0 && iterationCount < maxIterations) {
        iterationCount++;

        // Check for timeout
        if (Date.now() - startTime > maxProcessingTime) {
          logger.warn('Queue processing timeout reached, stopping to prevent infinite loop', {
            component: 'AdaptiveResourceLoader',
            iterations: iterationCount,
            remainingQueue: this.loadQueue.length
          });
          break;
        }

        const batch = this.loadQueue.splice(0, maxConcurrent);

        await Promise.allSettled(
          batch.map(async (resource) => {
            try {
              if (connectionAwareLoader.shouldLoadResource(resource.priority)) {
                await this.loadResource(resource);
              }
            } catch (error) {
              logger.error('Failed to load resource in batch', {
                component: 'AdaptiveResourceLoader',
                resource: resource.url,
                error
              });
            }
          })
        );

        // Add delay between batches on slow connections
        const { effectiveType } = connectionAwareLoader.getConnectionInfo();
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (iterationCount >= maxIterations) {
        logger.error('Maximum iterations reached in queue processing, possible infinite loop detected', {
          component: 'AdaptiveResourceLoader',
          maxIterations,
          remainingQueue: this.loadQueue.length
        });
      }

      logger.debug('Queue processing completed', {
        component: 'AdaptiveResourceLoader',
        iterations: iterationCount,
        remainingQueue: this.loadQueue.length
      });

    } catch (error) {
      logger.error('Error during queue processing', {
        component: 'AdaptiveResourceLoader',
        error,
        iterations: iterationCount
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async loadResource(resource: {
    url: string;
    type: 'script' | 'style' | 'image' | 'font';
    callback?: () => void;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      let element: HTMLElement;

      switch (resource.type) {
        case 'script':
          element = document.createElement('script');
          (element as HTMLScriptElement).src = resource.url;
          (element as HTMLScriptElement).async = true;
          break;

        case 'style':
          element = document.createElement('link');
          (element as HTMLLinkElement).rel = 'stylesheet';
          (element as HTMLLinkElement).href = resource.url;
          break;

        case 'image':
          element = document.createElement('img');
          (element as HTMLImageElement).src = resource.url;
          break;

        case 'font':
          element = document.createElement('link');
          (element as HTMLLinkElement).rel = 'preload';
          (element as HTMLLinkElement).as = 'font';
          (element as HTMLLinkElement).href = resource.url;
          (element as HTMLLinkElement).crossOrigin = 'anonymous';
          break;

        default:
          reject(new Error(`Unsupported resource type: ${resource.type}`));
          return;
      }

      element.onload = () => {
        resource.callback?.();
        resolve();
      };

      element.onerror = () => {
        reject(new Error(`Failed to load resource: ${resource.url}`));
      };

      document.head.appendChild(element);
    });
  }

  public clearQueue(): void {
    this.loadQueue = [];
  }

  public getQueueStatus(): {
    total: number;
    high: number;
    medium: number;
    low: number;
  } {
    const counts = { total: 0, high: 0, medium: 0, low: 0 };
    
    this.loadQueue.forEach(resource => {
      counts.total++;
      counts[resource.priority]++;
    });

    return counts;
  }
}

// Global adaptive resource loader
export const adaptiveResourceLoader = new AdaptiveResourceLoader();

// Utility functions
export function getOptimalImageSrc(
  baseSrc: string,
  width?: number,
  height?: number,
  quality?: number
): string {
  const optimalQuality = quality || connectionAwareLoader.getOptimalImageQuality();
  
  // In a real implementation, you would integrate with an image optimization service
  // For now, we'll append query parameters that could be handled by a server
  const url = new URL(baseSrc, window.location.origin);
  
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('q', optimalQuality.toString());
  
  return url.toString();
}

export function shouldEnableAnimations(): boolean {
  const { effectiveType, saveData } = connectionAwareLoader.getConnectionInfo();
  
  if (saveData) return false;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
  
  return true;
}

export function getOptimalVideoQuality(): 'low' | 'medium' | 'high' {
  const { effectiveType, downlink } = connectionAwareLoader.getConnectionInfo();
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'low';
  if (effectiveType === '3g' || downlink < 2) return 'medium';
  
  return 'high';
}

// React import for the hook
import * as React from 'react';












































