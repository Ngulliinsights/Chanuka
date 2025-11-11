/**
 * Connection-aware loading utilities
 * Provides adaptive loading strategies based on network conditions
 */

import { ConnectionType, ConnectionInfo, LoadingPriority } from '../types';

/**
 * Get connection multiplier for adaptive timeouts and delays
 */
export function getConnectionMultiplier(connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'slow':
      return 2;
    case 'offline':
      return 3;
    default:
      return 1;
  }
}

/**
 * Determine if operation should be skipped based on connection and priority
 */
export function shouldSkipOperation(
  isOnline: boolean,
  connectionType: ConnectionType,
  priority: LoadingPriority
): boolean {
  if (!isOnline) return priority === 'low';
  if (connectionType === 'slow') return priority === 'low';
  return false;
}

/**
 * Get optimal batch size for operations based on connection speed
 */
export function getOptimalBatchSize(connectionType: ConnectionType): number {
  switch (connectionType) {
    case 'slow':
      return 1;
    case 'offline':
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
      type: mapEffectiveTypeToConnectionType(connection.effectiveType),
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  // Fallback detection
  return {
    type: navigator.onLine ? 'fast' : 'offline',
  };
}

/**
 * Map navigator.connection.effectiveType to our ConnectionType
 */
function mapEffectiveTypeToConnectionType(effectiveType?: string): ConnectionType {
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'offline';
    case '3g':
      return 'slow';
    case '4g':
      return 'fast';
    default:
      return navigator.onLine ? 'fast' : 'offline';
  }
}

/**
 * Check if connection is suitable for high-priority operations
 */
export function isConnectionSuitableForPriority(
  connectionInfo: ConnectionInfo,
  priority: LoadingPriority
): boolean {
  if (!navigator.onLine) {
    return priority === 'high';
  }

  if (connectionInfo.type === 'slow') {
    return priority !== 'low';
  }

  return true;
}

/**
 * Get adaptive timeout based on connection
 */
export function getAdaptiveTimeout(
  baseTimeout: number,
  connectionType: ConnectionType
): number {
  const multiplier = getConnectionMultiplier(connectionType);
  return baseTimeout * multiplier;
}

/**
 * Get adaptive retry delay based on connection
 */
export function getAdaptiveRetryDelay(
  baseDelay: number,
  connectionType: ConnectionType,
  retryCount: number
): number {
  const multiplier = getConnectionMultiplier(connectionType);
  return baseDelay * multiplier * Math.pow(1.5, retryCount);
}