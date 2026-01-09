/**
 * Config Module Exports
 *
 * Centralized exports for all configuration modules in the graph database layer.
 */

export {
  GraphConfigManager,
  getGraphConfig,
  initializeGraphConfig,
  resetGraphConfig,
  createDriverConfig,
  validateConnectionUri,
  type Neo4jConnectionConfig,
  type GraphFeatureFlags,
  type GraphEnvironment,
} from './graph-config';

export default {
  graphConfig: () => import('./graph-config'),
};
