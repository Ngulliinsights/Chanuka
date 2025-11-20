// Re-export common types for backward compatibility
export type {
  ApiResponse,
  ApiError,
  ResponseMetadata,
  PaginatedResponse,
  ErrorResponse,
  User,
  UserRole,
  UserProfile,
  Bill,
  BillStatus,
  BillSection,
  ConflictIndicator,
  Sponsor,
  Affiliation,
  TransparencyInfo,
  // BillAnalysis, // Moved to server/features/bills/types/analysis.ts
  SentimentAnalysis,
  Expert,
  VerificationTask,
  VerificationStatus,
  VerificationRequest,
  Comment,
  Notification,
  NotificationType,
  SearchFilters,
  BillFilters,
  BillEngagement,
  BillEngagementStats,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  HealthCheckResponse
} from './common.js';

// Import analysis types from domain features
export type { BillAnalysis } from '../features/bills/types/analysis.js';
export type { SponsorshipAnalysis } from '../features/sponsors/types/analysis.js';

// Legacy types for backward compatibility

// Legacy functions for backward compatibility (deprecated)

import type { ApiResponse, ErrorResponse, ResponseMetadata } from './common.js';

/**
 * @deprecated Use ApiResponseWrapper from '@shared/core/utils/api-utils.ts instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  metadata?: ResponseMetadata
): ApiResponse<T> {
  console.warn('createApiResponse is deprecated. Use ApiResponseWrapper from \'@shared/core/src/utils/api-utils.ts\' instead.');
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error: { code: 'GENERIC_ERROR', message: error } }),
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'database',
      version: '1.0.0',
      ...metadata,
    },
  };
}

/**
 * @deprecated Use ApiResponseWrapper from '@shared/core/utils/api-utils.ts instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 */
export function createErrorResponse(error: string, code?: string, details?: Record<string, unknown>): ErrorResponse {
  console.warn('createErrorResponse is deprecated. Use ApiResponseWrapper from \'@shared/core/src/utils/api-utils.ts\' instead.');
  return {
    error,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}



















































