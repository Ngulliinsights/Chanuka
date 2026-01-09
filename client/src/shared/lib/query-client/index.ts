/**
 * Query Client Module
 *
 * FSD-structured query client with services, types, and utilities
 */

// Types
export type {
  ApiRequestConfig,
  ApiResponse,
  QueryFunctionConfig,
  QueryClientConfigFSD,
  QueryKeyFactory,
  QueryCacheUtils,
  OfflineSupportConfig,
  ErrorHandlingConfig,
  DevUtilsConfig,
  ApiRequest,
  ApiResponseData,
  QueryFunctionConfigData,
  QueryClientConfigData,
  QueryKeyFactoryData,
  QueryCacheUtilsData,
} from './types/query-client.types';

// Services
export {
  ApiRequestService,
  QueryFunctionFactory,
  QueryKeyFactoryImpl,
  QueryCacheUtilsImpl,
  QueryClientFactory,
  DevUtils,
  apiRequestService,
  queryKeyFactory,
} from './services/query-client.service';

// Utilities
export {
  createQueryKeyFactory,
  createQueryCacheUtils,
  createOfflineSupport,
  createErrorHandling,
  createDevUtils,
  createQueryClientConfig,
  createBillQueryKey,
  createUserQueryKey,
  createCommentQueryKey,
  createSearchQueryKey,
  createAnalyticsQueryKey,
  validateQueryKey,
  normalizeQueryKey,
  createCacheKey,
  isQueryStale,
  getQueryData,
  setQueryData,
  updateQueryData,
} from './utils/query-client-utils';

// Legacy exports for backward compatibility
export {
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  cacheUtils,
  configureOfflineSupport,
  setupGlobalErrorHandler,
  devUtils,
} from '../react-query-config';

