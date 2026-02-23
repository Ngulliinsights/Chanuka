/**
 * Authentication Type Definitions
 * 
 * Re-exports canonical types from shared and provides middleware-specific extensions.
 * All base auth types come from @shared/core/types/auth.types.
 */

import { Request } from 'express';
import type { AuthenticatedRequest } from '@shared/core/types/auth.types';

// Re-export canonical types for backward compatibility
export type { AuthenticatedRequest, AuthenticatedUser } from '@shared/core/types/auth.types';
export { isAuthenticated, hasRole, getUserId } from '@shared/core/types/auth.types';

/**
 * Extended Request interface with data retention preferences
 */
export interface PrivacyRequest extends AuthenticatedRequest {
  dataRetentionPrefs?: {
    retainActivityLogs?: boolean;
    retainSearchHistory?: boolean;
    retainEngagementData?: boolean;
    retentionPeriodDays?: number;
  };
}

/**
 * Type guard to check if a request has an authenticated user
 * @deprecated Use isAuthenticated from @shared/core/types/auth.types instead
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}
