/**
 * Enhanced Offline Detection Hook
 * Provides comprehensive offline detection with connection quality assessment
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/lib/utils/logger';

export interface ConnectionQuality {
  type: 'offline' | 'slow' | 'fast' | 'unknown';
  latency?: number;
  downlink?: number;
  effectiveType?: string;
}

export interface OfflineDetectionState {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  lastOnlineTime: number | null;
  lastOfflineTime: number | null;
  connectionAttempts: number;
  isReconnecting: boolean;
}

export function useOfflineDetection(): OfflineDetectionState & {
  checkConnection: () => Promise<boolean>;
  forceReconnect: () => Promise<void>;
} {
  const [state, setState] = useState<OfflineDetectionState>({
    isOnline: navigator.onLine,
    connectionQuality: { type: 'unknown' },
    lastOnlineTime: null,
    lastOfflineTime: null,
    connectionAttempts: 0,
    isReconnecting: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQualityRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Update connection quality with debouncing
  const updateConnectionQuality = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const quality: ConnectionQuality = {
            type: 'fast',
            downlink: connection.downlink,
            effectiveType: connection.effectiveType,
          };

          // Determine quality based on effective type and downlink
          if (!navigator.onLine) {
            quality.type = 'offline';
          } else if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            quality.type = 'slow';
          } else if (connection.effectiveType === '3g' && connection.downlink < 1) {
            quality.type = 'slow';
          }

          // Only update if quality has actually changed and component is mounted
          const qualityKey = JSON.stringify(quality);
          if (lastQualityRef.current !== qualityKey && isMountedRef.current) {
            lastQualityRef.current = qualityKey;
            setState(prev => ({ ...prev, connectionQuality: quality }));
          }
        }
      }
    }, 150); // 150ms debounce
  }, []);

  // Check connection by making a small request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isReconnecting: true }));
      }

      // Try to fetch a small resource with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/symbol.svg', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnline: isConnected,
          lastOnlineTime: isConnected ? Date.now() : prev.lastOnlineTime,
          lastOfflineTime: !isConnected ? Date.now() : prev.lastOfflineTime,
          connectionAttempts: prev.connectionAttempts + 1,
          isReconnecting: false,
        }));
      }

      return isConnected;
    } catch (error) {
      logger.warn('Connection check failed', { component: 'useOfflineDetection', error });

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnline: false,
          lastOfflineTime: Date.now(),
          connectionAttempts: prev.connectionAttempts + 1,
          isReconnecting: false,
        }));
      }

      return false;
    }
  }, []);

  // Force reconnect attempt
  const forceReconnect = useCallback(async () => {
    logger.info('Forcing reconnection attempt', { component: 'useOfflineDetection' });
    await checkConnection();
  }, [checkConnection]);

  // Listen for online/offline events
  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      logger.info('Browser reports online', { component: 'useOfflineDetection' });
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnline: true,
          lastOnlineTime: Date.now(),
          connectionAttempts: 0,
        }));
      }
      updateConnectionQuality();
    };

    const handleOffline = () => {
      logger.warn('Browser reports offline', { component: 'useOfflineDetection' });
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnline: false,
          lastOfflineTime: Date.now(),
          connectionQuality: { type: 'offline' },
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection quality check
    updateConnectionQuality();

    // Periodic connection quality updates
    const qualityInterval = setInterval(updateConnectionQuality, 30000); // Every 30 seconds

    return () => {
      isMountedRef.current = false;

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [updateConnectionQuality]);

  // Listen for connection changes
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const handleConnectionChange = () => {
          updateConnectionQuality();
        };

        connection.addEventListener('change', handleConnectionChange);
        return () => connection.removeEventListener('change', handleConnectionChange);
      }
    }

    return undefined;
  }, [updateConnectionQuality]);

  // Auto-check connection when coming back online
  useEffect(() => {
    if (state.isOnline && state.lastOfflineTime) {
      // Verify the connection is actually working
      const verifyConnection = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const isActuallyOnline = await checkConnection();
        if (!isActuallyOnline) {
          logger.warn('Connection verification failed', { component: 'useOfflineDetection' });
        }
      };
      verifyConnection();
    }
  }, [state.isOnline, state.lastOfflineTime, checkConnection]);

  return {
    ...state,
    checkConnection,
    forceReconnect,
  };
}
