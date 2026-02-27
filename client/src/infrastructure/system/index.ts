/**
 * System Infrastructure Module
 *
 * Provides system-level infrastructure components and utilities for monitoring
 * application health, system status, and operational metrics.
 *
 * @module infrastructure/system
 * @example
 * ```typescript
 * import { HealthCheck } from '@/infrastructure/system';
 *
 * // Use health check component
 * <HealthCheck onStatusChange={(status) => console.log(status)} />
 * ```
 */

/**
 * Health check component and utilities for monitoring system health.
 * Provides real-time health status monitoring, service availability checks,
 * and system diagnostics.
 *
 * @example
 * ```typescript
 * import { HealthCheck } from '@/infrastructure/system';
 *
 * function App() {
 *   return (
 *     <HealthCheck
 *       interval={30000}
 *       onStatusChange={(status) => {
 *         if (status.healthy === false) {
 *           console.error('System unhealthy:', status.issues);
 *         }
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export * from './HealthCheck';
