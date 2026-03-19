/**
 * User API Contracts
 * Type-safe API contracts for user-related endpoints
 */

import { z } from 'zod';
import { User } from '../../domains/authentication';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  GetUserParamsSchema,
  ListUsersQuerySchema,
  DeleteUserParamsSchema,
} from './user.schemas';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create User Request
 */
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Update User Request
 */
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/**
 * Get User Request (path params)
 */
export type GetUserRequest = z.infer<typeof GetUserParamsSchema>;

/**
 * List Users Request (query params)
 */
export type ListUsersRequest = z.infer<typeof ListUsersQuerySchema>;

/**
 * Delete User Request (path params)
 */
export type DeleteUserRequest = z.infer<typeof DeleteUserParamsSchema>;
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
