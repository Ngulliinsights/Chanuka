/**
 * Shared Constants Module
 *
 * Centralized definition of constants used across client and server:
 * - Error codes and messages
 * - System limits and thresholds
 * - Feature flags and toggles
 * - Business logic constants
 *
 * @example
 * // Error handling
 * import { ERROR_CODES, ERROR_MESSAGES } from '@shared/constants';
 *
 * // Limits
 * import { REQUEST_LIMITS, TIME_LIMITS } from '@shared/constants';
 *
 * // Feature flags
 * import { FEATURE_FLAGS, isFeatureEnabled } from '@shared/constants';
 */

export {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
  type ErrorCode,
} from './error-codes';

export {
  REQUEST_LIMITS,
  TIME_LIMITS,
  BUSINESS_LIMITS,
  DATA_LIMITS,
  FEATURE_LIMITS,
  getTimeLimitSeconds,
  getTimeLimitMinutes,
  getFileSizeMB,
} from './limits';

export {
  FEATURE_FLAGS,
  FEATURE_FLAG_CATEGORIES,
  isFeatureEnabled,
  getEnabledFeaturesInCategory,
  isCategoryEnabled,
  type FeatureFlagKey,
  type FeatureFlagValue,
} from './feature-flags';
