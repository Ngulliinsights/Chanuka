import { useState, useEffect } from 'react';
import { logger } from '..\utils\browser-logger';

/**
 * Detailed information about the user's network connection
 */
export interface ConnectionInfo {
  isOnline: boolean;
  connectionType: 'slow' | 'fast' | 'offline';
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/**
 * Hook that monitors network connection status and quality in real-time.
 * 
 * Uses the Network Information API when available to provide detailed
 * connection metrics. Falls back to basic online/offline detection otherwise.
 * 
 * Connection quality is determined by:
 * - Effective connection type (slow-2g, 2g, 3g, 4g)
 * - Downlink speed in Mbps
 * - Round-trip time in milliseconds
 */
export function useConnectionAware(): ConnectionInfo {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline: navigator.onLine,
    connectionType: 'fast',
  });

  useEffect(() => {
    /**
     * Updates connection information based on all available network metrics.
     * This comprehensive approach ensures accurate quality assessment even
     * when the effective type alone might be misleading.
     */
    const updateConnectionInfo = () => {
      const isOnline = navigator.onLine;

      // Handle offline state immediately
      if (!isOnline) {
        setConnectionInfo({
          isOnline: false,
          connectionType: 'offline',
        });
        return;
      }

      // Try to get connection object with vendor prefixes for compatibility
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (!connection) {
        // Network Information API not available - assume fast connection
        setConnectionInfo({
          isOnline: true,
          connectionType: 'fast',
        });
        return;
      }

      // Extract metrics from the connection object
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      const rtt = connection.rtt;

      // Determine connection quality using multi-factor analysis
      let connectionType: 'slow' | 'fast' = 'fast';

      // Primary check: very slow effective types are always slow
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        connectionType = 'slow';
      } 
      // Secondary check: 3g with poor metrics is considered slow
      else if (effectiveType === '3g' && (downlink < 1.5 || rtt > 300)) {
        connectionType = 'slow';
      }
      // Tertiary check: any connection with critically poor metrics
      else if (downlink < 0.5 || rtt > 500) {
        connectionType = 'slow';
      }

      setConnectionInfo({
        isOnline: true,
        connectionType,
        effectiveType,
        downlink,
        rtt,
      });
    };

    // Perform initial connection assessment
    updateConnectionInfo();

    // Set up event listeners for connection changes
    window.addEventListener('online', updateConnectionInfo);
    window.addEventListener('offline', updateConnectionInfo);

    // Listen for connection quality changes if API is available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    // Cleanup function to remove all event listeners
    return () => {
      window.removeEventListener('online', updateConnectionInfo);
      window.removeEventListener('offline', updateConnectionInfo);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return connectionInfo;
}

/**
 * Advanced hook that provides adaptive loading strategies based on connection quality.
 * 
 * This hook helps optimize user experience by adjusting loading behavior,
 * timeouts, and resource quality based on network conditions.
 */
export function useAdaptiveLoading() {
  const connectionInfo = useConnectionAware();

  /**
   * Determines if content should be preloaded based on priority and connection.
   * 
   * Strategy:
   * - High priority: Always preload when online
   * - Medium priority: Only on fast connections
   * - Low priority: Only on very fast connections (>2 Mbps downlink)
   */
  const shouldPreload = (priority: 'high' | 'medium' | 'low' = 'medium'): boolean => {
    if (!connectionInfo.isOnline) return false;
    
    switch (priority) {
      case 'high':
        return true;
      case 'medium':
        return connectionInfo.connectionType === 'fast';
      case 'low':
        return connectionInfo.connectionType === 'fast' && 
               (connectionInfo.downlink || 0) > 2;
      default:
        return false;
    }
  };

  /**
   * Returns appropriate timeout duration for loading operations.
   * Slower connections get more time to complete requests.
   */
  const getLoadingTimeout = (): number => {
    return connectionInfo.connectionType === 'slow' ? 10000 : 5000;
  };

  /**
   * Determines if progressive loading (skeleton screens, lazy loading) should be used.
   * This improves perceived performance on slow connections.
   */
  const shouldShowProgressiveLoading = (): boolean => {
    return connectionInfo.connectionType === 'slow';
  };

  /**
   * Returns recommended image quality based on connection speed.
   * Serves lower quality images on slow connections to reduce data usage.
   */
  const getImageQuality = (): 'high' | 'medium' | 'low' => {
    if (connectionInfo.connectionType === 'offline') return 'low';
    if (connectionInfo.connectionType === 'slow') return 'low';
    
    // For fast connections, check if it's exceptionally fast
    return (connectionInfo.downlink || 0) > 5 ? 'high' : 'medium';
  };

  /**
   * Returns overall loading strategy name for easy conditional rendering.
   */
  const getLoadingStrategy = (): 'offline' | 'conservative' | 'aggressive' => {
    if (!connectionInfo.isOnline) return 'offline';
    if (connectionInfo.connectionType === 'slow') return 'conservative';
    return 'aggressive';
  };

  return {
    connectionInfo,
    shouldPreload,
    getLoadingTimeout,
    shouldShowProgressiveLoading,
    getImageQuality,
    strategy: getLoadingStrategy(),
  };
}