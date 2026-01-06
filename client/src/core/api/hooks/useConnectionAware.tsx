import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';

/**
 * Network Information API interface for connection monitoring
 */
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/**
 * Extended Navigator interface with connection properties
 */
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

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

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<ConnectionInfo | null>(null);
  const isMountedRef = useRef(true);

  const debouncedUpdateConnectionInfo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const isOnline = navigator.onLine;

      // Handle offline state immediately
      if (!isOnline) {
        const newInfo = {
          isOnline: false,
          connectionType: 'offline' as const,
        };

        // Use stable comparison for offline state
        const hasChanged =
          !lastUpdateRef.current ||
          lastUpdateRef.current.isOnline !== false ||
          lastUpdateRef.current.connectionType !== 'offline';

        if (hasChanged) {
          lastUpdateRef.current = newInfo;
          setConnectionInfo(newInfo);
        }
        return;
      }

      // Try to get connection object with vendor prefixes for compatibility
      const connection =
        (navigator as NavigatorWithConnection).connection ||
        (navigator as NavigatorWithConnection).mozConnection ||
        (navigator as NavigatorWithConnection).webkitConnection;

      if (!connection) {
        // Network Information API not available - assume fast connection
        const newInfo = {
          isOnline: true,
          connectionType: 'fast' as const,
        };

        // Use stable comparison for fallback state
        const hasChanged =
          !lastUpdateRef.current ||
          lastUpdateRef.current.isOnline !== true ||
          lastUpdateRef.current.connectionType !== 'fast';

        if (hasChanged) {
          lastUpdateRef.current = newInfo;
          setConnectionInfo(newInfo);
        }
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
      else if (effectiveType === '3g' && ((downlink && downlink < 1.5) || (rtt && rtt > 300))) {
        connectionType = 'slow';
      }
      // Tertiary check: any connection with critically poor metrics
      else if ((downlink && downlink < 0.5) || (rtt && rtt > 500)) {
        connectionType = 'slow';
      }

      const newInfo = {
        isOnline: true,
        connectionType,
        effectiveType,
        downlink,
        rtt,
      };

      // Use stable comparison instead of JSON.stringify to avoid property order issues
      const hasChanged =
        !lastUpdateRef.current ||
        lastUpdateRef.current.isOnline !== newInfo.isOnline ||
        lastUpdateRef.current.connectionType !== newInfo.connectionType ||
        lastUpdateRef.current.effectiveType !== newInfo.effectiveType ||
        Math.abs((lastUpdateRef.current.downlink || 0) - (newInfo.downlink || 0)) > 0.1 ||
        Math.abs((lastUpdateRef.current.rtt || 0) - (newInfo.rtt || 0)) > 10;

      // Only update if the connection info has actually changed and component is mounted
      if (hasChanged && isMountedRef.current) {
        lastUpdateRef.current = newInfo;
        setConnectionInfo(newInfo);
      }
    }, 200); // 200ms debounce for connection changes
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Perform initial connection assessment
    debouncedUpdateConnectionInfo();

    // Set up event listeners for connection changes
    window.addEventListener('online', debouncedUpdateConnectionInfo);
    window.addEventListener('offline', debouncedUpdateConnectionInfo);

    // Listen for connection quality changes if API is available
    const connection =
      (navigator as NavigatorWithConnection).connection ||
      (navigator as NavigatorWithConnection).mozConnection ||
      (navigator as NavigatorWithConnection).webkitConnection;

    if (connection) {
      connection.addEventListener('change', debouncedUpdateConnectionInfo);
    }

    // Cleanup function to remove all event listeners
    return () => {
      isMountedRef.current = false;

      window.removeEventListener('online', debouncedUpdateConnectionInfo);
      window.removeEventListener('offline', debouncedUpdateConnectionInfo);

      if (connection) {
        connection.removeEventListener('change', debouncedUpdateConnectionInfo);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedUpdateConnectionInfo]);

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
        return connectionInfo.connectionType === 'fast' && (connectionInfo.downlink || 0) > 2;
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
