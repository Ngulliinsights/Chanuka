/**
 * Core Hooks Module
 *
 * Infrastructure and system-level React hooks used across the application.
 * These hooks manage core concerns: offline detection, API connections,
 * system status, error recovery, and offline capabilities.
 *
 * @module infrastructure/hooks
 * @example
 * ```typescript
 * import { useOfflineDetection, useConnectionAware, useErrorRecovery } from '@/infrastructure/hooks';
 *
 * function MyComponent() {
 *   const isOffline = useOfflineDetection();
 *   const { isConnected } = useConnectionAware();
 *   const { recover } = useErrorRecovery();
 *
 *   return <div>Status: {isOffline ? 'Offline' : 'Online'}</div>;
 * }
 * ```
 */

/**
 * Hook for detecting offline/online status with automatic reconnection detection.
 *
 * @returns Boolean indicating if the application is offline
 * @example
 * ```typescript
 * function App() {
 *   const isOffline = useOfflineDetection();
 *   return isOffline ? <OfflineBanner /> : <OnlineContent />;
 * }
 * ```
 */
export { useOfflineDetection } from '@client/lib/hooks/useOfflineDetection';

/**
 * Hook for connection-aware API operations with automatic retry logic.
 *
 * @returns Connection status and utilities for connection-aware operations
 * @example
 * ```typescript
 * function DataFetcher() {
 *   const { isConnected, executeWhenOnline } = useConnectionAware();
 *
 *   const fetchData = () => executeWhenOnline(async () => {
 *     return await api.getData();
 *   });
 * }
 * ```
 */
export { useConnectionAware } from '../api/hooks/useConnectionAware';

/**
 * Hook for monitoring service health and availability status.
 *
 * @returns Service status information including health checks and availability
 * @example
 * ```typescript
 * function ServiceMonitor() {
 *   const { isHealthy, services } = useServiceStatus();
 *   return <StatusIndicator healthy={isHealthy} services={services} />;
 * }
 * ```
 */
export { useServiceStatus } from '../api/hooks/useServiceStatus';

/**
 * Hook for real-time online/offline status monitoring.
 *
 * @returns Boolean indicating current online status
 * @example
 * ```typescript
 * function NetworkStatus() {
 *   const isOnline = useOnlineStatus();
 *   return <Badge color={isOnline ? 'green' : 'red'}>{isOnline ? 'Online' : 'Offline'}</Badge>;
 * }
 * ```
 */
export { useOnlineStatus } from '../loading/hooks';

/**
 * Hook for error recovery with automatic retry strategies.
 *
 * @returns Error recovery utilities including recover function and recovery status
 * @example
 * ```typescript
 * function DataComponent() {
 *   const { recover, isRecovering } = useErrorRecovery();
 *
 *   const handleError = async (error) => {
 *     const result = await recover(error, { strategy: 'retry' });
 *     if (result.success) {
 *       console.log('Recovered successfully');
 *     }
 *   };
 * }
 * ```
 */
export { useErrorRecovery } from '@client/lib/hooks/use-error-recovery';

/**
 * Hook for managing offline capabilities including data caching and sync.
 *
 * @returns Offline capability utilities for data persistence and synchronization
 * @example
 * ```typescript
 * function OfflineForm() {
 *   const { saveOffline, syncWhenOnline } = useOfflineCapabilities();
 *
 *   const handleSubmit = async (data) => {
 *     await saveOffline('form-data', data);
 *     await syncWhenOnline();
 *   };
 * }
 * ```
 */
export { useOfflineCapabilities } from '@client/lib/hooks/use-offline-capabilities';

/**
 * Alias for useErrorRecovery - provides error handling capabilities.
 *
 * @returns Error handling utilities
 * @example
 * ```typescript
 * function Component() {
 *   const { handleError } = useErrorHandling();
 *   // Use for error handling
 * }
 * ```
 */
export { useErrorRecovery as useErrorHandling } from '@client/lib/hooks/use-error-recovery';
