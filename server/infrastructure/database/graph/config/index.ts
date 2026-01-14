/**
 * Graph Database Configuration Exports
 *
 * Centralized exports for all graph database configuration.
 * Provides both class-based and constant-based configuration options.
 */

// Class-based configuration manager
export {
  GraphConfigManager,
  getGraphConfig,
  initializeGraphConfig,
  resetGraphConfig,
  createDriverConfig,
  validateConnectionUri,
} from './graph-config';

// Configuration constants
export {
  NEO4J_CONFIG,
  SYNC_CONFIG,
  QUERY_CONFIG,
  CACHE_CONFIG,
  ENGAGEMENT_CONFIG,
  validateConfig,
} from './graph-config';

// Additional configuration from the root level
export {
  PERFORMANCE_CONFIG,
  MONITORING_CONFIG,
  SECURITY_CONFIG,
  FEATURE_FLAGS,
  CONSISTENCY_CONFIG,
  RECOMMENDATION_CONFIG,
  getConfigSummary,
} from '../graph-config';
