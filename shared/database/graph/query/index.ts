/**
 * Query Module Exports
 *
 * Centralized exports for all graph database queries.
 */

export {
  getMostEngagedUsers,
  getTrendingBills,
  getUserActivity,
} from './engagement-queries';

export {
  aggregateBillsByStatus,
  findRelatedBills,
  getNodeDegrees,
} from './advanced-queries';

export {
  getConnectedNodes,
  findShortestPath,
} from './network-queries';

export default {
  engagementQueries: () => import('./engagement-queries'),
  advancedQueries: () => import('./advanced-queries'),
  networkQueries: () => import('./network-queries'),
};
