/**
 * Authentication Type Definitions
 * 
 * Type-safe interfaces for authenticated requests and user data
 */

import { Request } from 'express';

/**
 * User data attached to authenticated requests
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly name?: string;
  readonly verification_status?: string;
  readonly is_active?: boolean | null;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  requestId?: string;
  startTime?: number;
}

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
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

/**
 * Type guard to check if a request has a user with a specific role
 */
export function hasRole(req: Request, role: string): boolean {
  if (!isAuthenticatedRequest(req)) {
    return false;
  }
  
  return req.user?.role === role;
}

/**
 * Get user ID from authenticated request
 * Returns null if request is not authenticated
 */
export function getUserId(req: Request): string | null {
  if (!isAuthenticatedRequest(req)) {
    return null;
  }
  
  return req.user?.id || null;
}
