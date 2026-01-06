/**
 * Core Hooks
 *
 * Infrastructure and system-level hooks used across the application
 * These hooks manage core concerns: offline detection, API connections, system status
 */

// Infrastructure hooks - these manage system-level concerns
export { useOfflineDetection } from '../../hooks/useOfflineDetection';
export { useConnectionAware } from '../api/hooks/useConnectionAware';
export { useServiceStatus } from '../api/hooks/useServiceStatus';
export { useOnlineStatus } from '../loading/hooks';

// These are placeholder re-exports during migration
// Original files are still in hooks/ directory
// Transition: hooks/ → core/ over next 2 weeks

export { useErrorRecovery } from '../../hooks/useErrorRecovery';
export { useOfflineCapabilities } from '../../hooks/useOfflineCapabilities';

// Error handling
export { useErrorRecovery as useErrorHandling } from '../../hooks/useErrorRecovery';
