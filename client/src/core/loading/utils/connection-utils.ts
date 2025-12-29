/**
 * Connection-aware loading utilities
 * Provides adaptive loading strategies based on network conditions
 */

import { ConnectionType, ConnectionInfo } from '@client/shared/types';

/**
 * Get connection multiplier for adaptive timeouts and delays
 */
export function getConnectionMultiplier(connectionType: ConnectionType | undefined): number {
  switch (connectionType) {
    case 'cellular':
      return 1.5;
    case 'none':
      return 3;
    default:
      return 1;
  }
}

/**
 * Determine if operation should be skipped based on online status and priority
 */
export function shouldSkipOperation(
  isOnline: boolean,
  priority: 'low' | 'normal' | 'high' | 'critical'
): boolean {
  if (!isOnline) return priority === 'low';
  return false;
}

/**
 * Get optimal batch size for operations based on connection speed
 */
export function getOptimalBatchSize(connectionType: ConnectionType | undefined): number {
  switch (connectionType) {
    case 'cellular':
      return 1;
    case 'none':
      return 1;
    default:
      return 3;
  }
}

/**
 * Detect connection type from navigator connection API
 */
export function detectConnectionType(): ConnectionInfo {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      online: navigator.onLine,
      connectionType: mapEffectiveTypeToConnectionType(connection.effectiveType),
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      lastChecked: new Date(),
    };
  }

  // Fallback detection
  return {
    online: navigator.onLine,
    connectionType: navigator.onLine ? 'wifi' : 'none',
    lastChecked: new Date(),
  };
}

/**
 * Map navigator.connection.effectiveType to our ConnectionType
 */
function mapEffectiveTypeToConnectionType(effectiveType?: string): ConnectionType {
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'none';
    case '3g':
      return 'cellular';
    case '4g':
      return 'wifi';
    default:
      return navigator.onLine ? 'wifi' : 'none';
  }
}

/**
 * Check if connection is suitable for high-priority operations
 */
export function isConnectionSuitableForPriority(
  connectionInfo: ConnectionInfo,
  priority: 'low' | 'normal' | 'high' | 'critical'
): boolean {
  if (!connectionInfo.online) {
    return priority === 'critical';
  }

  if (connectionInfo.connectionType === 'cellular') {
    return priority !== 'low';
  }

  return true;
}

/**
 * Get adaptive timeout based on connection
 */
export function getAdaptiveTimeout(
  baseTimeout: number,
  connectionType: ConnectionType | undefined
): number {
  const multiplier = getConnectionMultiplier(connectionType);
  return baseTimeout * multiplier;
}

/**
 * Get adaptive retry delay based on connection
 */
export function getAdaptiveRetryDelay(
  baseDelay: number,
  connectionType: ConnectionType | undefined,
  retryCount: number
): number {
  const multiplier = getConnectionMultiplier(connectionType);
  return baseDelay * multiplier * Math.pow(1.5, retryCount);
}