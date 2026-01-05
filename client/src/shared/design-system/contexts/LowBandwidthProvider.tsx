/* eslint-disable react-refresh/only-export-components */

/**
 * Low-Bandwidth Provider
 * ====================
 *
 * Context provider for adapting UI to low-bandwidth and offline conditions.
 * Automatically detects network speed and adjusts component rendering.
 *
 * Usage:
 *   <LowBandwidthProvider>
 *     <App />
 *   </LowBandwidthProvider>
 *
 *   // In components:
 *   const { isLowBandwidth, disableImages, offlineMode } = useLowBandwidth();
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { LowBandwidthConfig, defaultLowBandwidthConfig } from '../standards/low-bandwidth';
import React from 'react';

interface LowBandwidthContextType {
  /**
   * Whether low-bandwidth mode is active
   */
  isLowBandwidth: boolean;

  /**
   * Current network type
   */
  networkType?: string;

  /**
   * Estimated network speed
   */
  networkSpeed?: 'slow-2g' | 'fast-2g' | '3g' | '4g';

  /**
   * Data saver mode enabled by browser
   */
  dataSaverEnabled: boolean;

  /**
   * Whether offline
   */
  isOffline: boolean;

  /**
   * Configuration overrides
   */
  config: LowBandwidthConfig;

  /**
   * Update configuration
   */
  setConfig: (config: Partial<LowBandwidthConfig>) => void;
}

const LowBandwidthContext = createContext<LowBandwidthContextType | undefined>(undefined);

/**
 * Low-Bandwidth Provider Component
 */
export function LowBandwidthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LowBandwidthConfig>(defaultLowBandwidthConfig);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  const [networkType, setNetworkType] = useState<string | undefined>();
  const [networkSpeed, setNetworkSpeed] = useState<
    'slow-2g' | 'fast-2g' | '3g' | '4g' | undefined
  >();
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Detect network speed
    const checkConnection = () => {
      const connection = (navigator as unknown as {
        connection?: {
          effectiveType?: 'slow-2g' | 'fast-2g' | '3g' | '4g';
          saveData?: boolean;
          type?: string;
        };
      }).connection;
      if (!connection) return;

      const effectiveType = connection.effectiveType as
        | 'slow-2g'
        | 'fast-2g'
        | '3g'
        | '4g'
        | undefined;
      const saveData = connection.saveData as boolean | undefined;

      setNetworkSpeed(effectiveType);
      setNetworkType(connection.type);
      setDataSaverEnabled(saveData || false);

      // Auto-enable low bandwidth for slow connections
      const shouldUseLowBandwidth = effectiveType === 'slow-2g' || effectiveType === 'fast-2g';
      setIsLowBandwidth(shouldUseLowBandwidth || saveData || false);
    };

    checkConnection();

    const connection = (navigator as unknown as {
      connection?: {
        addEventListener?: (event: string, cb: () => void) => void;
        removeEventListener?: (event: string, cb: () => void) => void;
      };
    }).connection;
    if (connection) {
      connection.addEventListener?.('change', checkConnection);
      return () => connection.removeEventListener?.('change', checkConnection);
    }
  }, []);

  // Detect online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue: LowBandwidthContextType = {
    isLowBandwidth: config.enabled || isLowBandwidth,
    networkType,
    networkSpeed,
    dataSaverEnabled,
    isOffline: config.offlineMode || isOffline,
    config,
    setConfig: (updates: Partial<LowBandwidthConfig>) => {
      setConfig(prev => ({ ...prev, ...updates }));
    },
  };

  return (
    <LowBandwidthContext.Provider value={contextValue}>
      {children}
    </LowBandwidthContext.Provider>
  );
}

/**
 * Hook to access low-bandwidth context
 */
export function useLowBandwidth(): LowBandwidthContextType {
  const context = useContext(LowBandwidthContext);
  if (!context) {
    throw new Error('useLowBandwidth must be used within LowBandwidthProvider');
  }
  return context;
}

/**
 * Component wrapper for conditional rendering based on bandwidth
 */
export interface ConditionalLowBandwidthProps {
  /**
   * Render when low bandwidth is active
   */
  lowBandwidth: ReactNode;
  /**
   * Render when normal bandwidth
   */
  normal: ReactNode;
}

/**
 * Component that switches between low and normal bandwidth renders
 */
export function ConditionalBandwidth({
  lowBandwidth,
  normal,
}: ConditionalLowBandwidthProps) {
  const { isLowBandwidth } = useLowBandwidth();
  return <>{isLowBandwidth ? lowBandwidth : normal}</>;
}

/**
 * Hook to conditionally render based on bandwidth
 */
export function useBandwidthAware<T>(
  lowBandwidthValue: T,
  normalValue: T,
): T {
  const { isLowBandwidth } = useLowBandwidth();
  return isLowBandwidth ? lowBandwidthValue : normalValue;
}
