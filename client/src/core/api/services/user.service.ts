/**
 * User API Service
 * Type-safe user API calls using endpoint contracts
 */

import { UserEndpoints } from '@shared/types/api/contracts';
import type {
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUserRequest,
  GetUserResponse,
  ListUsersRequest,
  ListUsersResponse,
  DeleteUserRequest,
  DeleteUserResponse,
} from '@shared/types/api/contracts';
import { contractApiClient } from '../contract-client';
import type { EndpointCallResult } from '@shared/types/api/contracts';

/**
 * User API Service
 * Provides type-safe methods for user-related API calls
 */
export const userApiService = {
  /**
   * Create a new user
   */
  async create(request: CreateUserRequest): Promise<EndpointCallResult<CreateUserResponse>> {
    return contractApiClient.call(UserEndpoints.create, request);
  },

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<EndpointCallResult<GetUserResponse>> {
    return contractApiClient.callWithParams(
      UserEndpoints.getById,
      { id: userId },
      undefined
    );
  },

  /**
   * Update user
   */
  async update(
    userId: string,
    request: UpdateUserRequest
  ): Promise<EndpointCallResult<UpdateUserResponse>> {
    return contractApiClient.callWithParams(
      UserEndpoints.update,
      { id: userId },
      request
    );
  },

  /**
   * List users with pagination and filtering
   */
  async list(query?: ListUsersRequest): Promise<EndpointCallResult<ListUsersResponse>> {
    return contractApiClient.callWithQuery(
      UserEndpoints.list,
      query || {}
    );
  },

  /**
   * Delete user
   */
  async delete(userId: string): Promise<EndpointCallResult<DeleteUserResponse>> {
    return contractApiClient.callWithParams(
      UserEndpoints.delete,
      { id: userId },
      undefined
    );
  },
};
