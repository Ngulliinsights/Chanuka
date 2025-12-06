/**
 * Connection and network utilities for loading components
 * Following navigation component patterns for utility organization
 */

import { ConnectionType } from '@client/types';

import { CONNECTION_THRESHOLDS } from '@client/constants';

export interface ConnectionInfo {
  isOnline: boolean;
  connectionType: ConnectionType;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkAdapter {
  getConnectionInfo(): ConnectionInfo;
  onConnectionChange(callback: (info: ConnectionInfo) => void): () => void;
  isSlowConnection(): boolean;
  shouldReduceQuality(): boolean;
}

/**
 * Browser Network Information API utilities
 */

export function getNetworkConnection(): any {
  return (navigator as any).connection || 
         (navigator as any).mozConnection || 
         (navigator as any).webkitConnection;
}

export function hasNetworkAPI(): boolean {
  return typeof getNetworkConnection() !== 'undefined';
}

export function getConnectionInfo(): ConnectionInfo {
  const connection = getNetworkConnection();
  const isOnline = navigator.onLine;
  
  if (!connection) {
    return {
      isOnline,
      connectionType: isOnline ? 'fast' : 'offline',
    };
  }

  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink;
  const rtt = connection.rtt;
  const saveData = connection.saveData;

  // Determine connection type based on effective type and metrics
  let connectionType: ConnectionType = 'fast';
  
  if (!isOnline) {
    connectionType = 'offline';
  } else if (
    effectiveType === 'slow-2g' || 
    effectiveType === '2g' ||
    (rtt && rtt > CONNECTION_THRESHOLDS.SLOW_CONNECTION_RTT) ||
    (downlink && downlink < CONNECTION_THRESHOLDS.SLOW_CONNECTION_DOWNLINK)
  ) {
    connectionType = 'slow';
  }

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
}

/**
 * Connection monitoring utilities
 */

export function createConnectionMonitor(): NetworkAdapter {
  let currentInfo = getConnectionInfo();
  const listeners: Array<(info: ConnectionInfo) => void> = [];

  const notifyListeners = () => {
    listeners.forEach(listener => listener(currentInfo));
  };

  const updateConnectionInfo = () => {
    const newInfo = getConnectionInfo();
    const hasChanged = JSON.stringify(newInfo) !== JSON.stringify(currentInfo);
    
    if (hasChanged) {
      currentInfo = newInfo;
      notifyListeners();
    }
  };

  // Listen for online/offline events
  const handleOnline = () => {
    updateConnectionInfo();
  };

  const handleOffline = () => {
    currentInfo = { ...currentInfo, isOnline: false, connectionType: 'offline' };
    notifyListeners();
  };

  // Listen for connection changes
  const handleConnectionChange = () => {
    updateConnectionInfo();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  const connection = getNetworkConnection();
  if (connection) {
    connection.addEventListener('change', handleConnectionChange);
  }

  return {
    getConnectionInfo: () => currentInfo,
    
    onConnectionChange: (callback: (info: ConnectionInfo) => void) => {
      listeners.push(callback);
      
      // Return cleanup function
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
    
    isSlowConnection: () => {
      return currentInfo.connectionType === 'slow';
    },
    
    shouldReduceQuality: () => {
      return currentInfo.connectionType === 'slow' || currentInfo.saveData === true;
    },
  };
}

/**
 * Connection-aware loading strategies
 */

export function getOptimalTimeout(baseTimeout: number, connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'slow':
      return baseTimeout * 2; // Double timeout for slow connections
    case 'offline':
      return baseTimeout * 0.5; // Shorter timeout for offline detection
    case 'fast':
    default:
      return baseTimeout;
  }
}

export function getOptimalRetryDelay(baseDelay: number, connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'slow':
      return baseDelay * 1.5; // Longer delays for slow connections
    case 'offline':
      return baseDelay * 3; // Much longer delays when offline
    case 'fast':
    default:
      return baseDelay;
  }
}

export function getOptimalConcurrency(baseConcurrency: number, connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'slow':
      return Math.max(1, Math.floor(baseConcurrency / 2)); // Reduce concurrency
    case 'offline':
      return 1; // Only one operation at a time when offline
    case 'fast':
    default:
      return baseConcurrency;
  }
}

export function shouldPreload(connectionType: ConnectionType, saveData?: boolean): boolean {
  if (saveData) return false;
  return connectionType === 'fast';
}

export function shouldUseLazyLoading(connectionType: ConnectionType, saveData?: boolean): boolean {
  if (saveData) return true;
  return connectionType === 'slow';
}

/**
 * Adaptive loading utilities
 */

export interface AdaptiveLoadingConfig {
  enableAdaptation: boolean;
  slowConnectionThreshold: number;
  offlineRetryDelay: number;
  qualityReduction: boolean;
  preloadingEnabled: boolean;
}

export function createAdaptiveLoader(config: AdaptiveLoadingConfig) {
  const monitor = createConnectionMonitor();
  
  return {
    getConnectionInfo: monitor.getConnectionInfo,
    onConnectionChange: monitor.onConnectionChange,
    
    adaptTimeout: (baseTimeout: number) => {
      if (!config.enableAdaptation) return baseTimeout;
      return getOptimalTimeout(baseTimeout, monitor.getConnectionInfo().connectionType);
    },
    
    adaptRetryDelay: (baseDelay: number) => {
      if (!config.enableAdaptation) return baseDelay;
      return getOptimalRetryDelay(baseDelay, monitor.getConnectionInfo().connectionType);
    },
    
    adaptConcurrency: (baseConcurrency: number) => {
      if (!config.enableAdaptation) return baseConcurrency;
      return getOptimalConcurrency(baseConcurrency, monitor.getConnectionInfo().connectionType);
    },
    
    shouldPreload: () => {
      if (!config.enableAdaptation || !config.preloadingEnabled) return true;
      const info = monitor.getConnectionInfo();
      return shouldPreload(info.connectionType, info.saveData);
    },
    
    shouldReduceQuality: () => {
      if (!config.enableAdaptation || !config.qualityReduction) return false;
      return monitor.shouldReduceQuality();
    },
    
    getRecommendedStrategy: () => {
      const info = monitor.getConnectionInfo();
      
      if (!info.isOnline) {
        return {
          strategy: 'offline',
          timeout: config.offlineRetryDelay,
          concurrency: 1,
          preload: false,
          quality: 'low',
        };
      }
      
      if (info.connectionType === 'slow') {
        return {
          strategy: 'conservative',
          timeout: 'extended',
          concurrency: 'reduced',
          preload: false,
          quality: info.saveData ? 'low' : 'medium',
        };
      }
      
      return {
        strategy: 'aggressive',
        timeout: 'normal',
        concurrency: 'normal',
        preload: true,
        quality: 'high',
      };
    },
  };
}

/**
 * Connection testing utilities
 */

export async function testConnection(url: string = '/favicon.ico', timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function measureConnectionSpeed(
  testUrl: string = '/favicon.ico',
  testSize: number = 1024
): Promise<{ speed: number; latency: number } | null> {
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${testUrl}?t=${Date.now()}`, {
      cache: 'no-cache',
    });
    
    if (!response.ok) return null;
    
    const data = await response.arrayBuffer();
    const endTime = performance.now();
    
    const duration = endTime - startTime; // milliseconds
    const size = data.byteLength || testSize;
    const speed = (size * 8) / (duration / 1000); // bits per second
    
    return {
      speed: speed / 1000000, // Mbps
      latency: duration,
    };
  } catch {
    return null;
  }
}

/**
 * Offline detection utilities
 */

export function createOfflineDetector(
  testInterval: number = 30000,
  testUrl: string = '/favicon.ico'
) {
  let isOnline = navigator.onLine;
  let testTimer: NodeJS.Timeout;
  const listeners: Array<(online: boolean) => void> = [];
  
  const notifyListeners = () => {
    listeners.forEach(listener => listener(isOnline));
  };
  
  const testOnlineStatus = async () => {
    const online = await testConnection(testUrl, 5000);
    if (online !== isOnline) {
      isOnline = online;
      notifyListeners();
    }
  };
  
  const handleOnline = () => {
    isOnline = true;
    notifyListeners();
  };
  
  const handleOffline = () => {
    isOnline = false;
    notifyListeners();
  };
  
  // Start periodic testing
  const startTesting = () => {
    testTimer = setInterval(testOnlineStatus, testInterval);
  };
  
  const stopTesting = () => {
    if (testTimer) {
      clearInterval(testTimer);
    }
  };
  
  // Listen for browser events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  startTesting();
  
  return {
    isOnline: () => isOnline,
    
    onStatusChange: (callback: (online: boolean) => void) => {
      listeners.push(callback);
      
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
    
    testNow: testOnlineStatus,
    
    destroy: () => {
      stopTesting();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    },
  };
}

/**
 * Connection quality assessment
 */

export function assessConnectionQuality(info: ConnectionInfo): 'poor' | 'fair' | 'good' | 'excellent' {
  if (!info.isOnline) return 'poor';
  
  const { effectiveType, downlink, rtt } = info;
  
  // Use effective type if available
  if (effectiveType) {
    switch (effectiveType) {
      case 'slow-2g':
        return 'poor';
      case '2g':
        return 'poor';
      case '3g':
        return 'fair';
      case '4g':
        return 'good';
      default:
        return 'excellent';
    }
  }
  
  // Use metrics if available
  let score = 0;
  
  if (downlink !== undefined) {
    if (downlink >= 10) score += 2;
    else if (downlink >= 5) score += 1;
    else if (downlink >= 1.5) score += 0;
    else score -= 1;
  }
  
  if (rtt !== undefined) {
    if (rtt <= 100) score += 2;
    else if (rtt <= 300) score += 1;
    else if (rtt <= 1000) score += 0;
    else score -= 1;
  }
  
  if (score >= 3) return 'excellent';
  if (score >= 1) return 'good';
  if (score >= -1) return 'fair';
  return 'poor';
}

