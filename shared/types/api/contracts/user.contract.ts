/**
 * User API Contracts
 * Type-safe API contracts for user-related endpoints
 */

import { User } from '../../domains/authentication';
import { UserId } from '../../core/branded';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create User Request
 */
export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  role?: string;
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  email?: string;
  username?: string;
  role?: string;
  status?: string;
  profile?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
  };
}

/**
 * Get User Request (path params)
 */
export interface GetUserRequest {
  id: UserId;
}

/**
 * List Users Request (query params)
 */
export interface ListUsersRequest {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

/**
 * Delete User Request (path params)
 */
export interface DeleteUserRequest {
  id: UserId;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Create User Response
 */
export interface CreateUserResponse {
  user: User;
  token: string;
}

/**
 * Get User Response
 */
export interface GetUserResponse {
  user: User;
}

/**
 * Update User Response
 */
export interface UpdateUserResponse {
  user: User;
}

/**
 * List Users Response
 */
export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Delete User Response
 */
export interface DeleteUserResponse {
  success: boolean;
  message: string;
}
