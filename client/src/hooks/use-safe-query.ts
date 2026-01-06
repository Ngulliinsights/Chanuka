/**
 * Re-export of the safe query hooks from the core API module
 * This provides a convenient import path for components
 */

export {
  useSafeQuery,
  useAdminQuery,
  useCoordinatedQueries,
  type SafeQueryOptions,
} from '@client/core/api/hooks/use-safe-query';

export default useSafeQuery;
