/**
 * User Repository Interface
 *
 * Defines the contract for user data access operations, abstracting away
 * direct schema usage while maintaining the same functionality.
 */

import type { Result, Maybe } from '@shared/core';
import type { User, NewUser, UserProfile, NewUserProfile } from '@shared/schema';

export interface IUserRepository {
  /**
   * Creates a new user record
   * @param user The user data to create
   * @returns Promise resolving to the created user or error
   */
  create(user: NewUser): Promise<Result<User, Error>>;

  /**
   * Retrieves a user by their ID
   * @param id The user ID
   * @returns Promise resolving to the user or null if not found
   */
  findById(id: string): Promise<Result<Maybe<User>, Error>>;

  /**
   * Retrieves a user by their email
   * @param email The user email
   * @returns Promise resolving to the user or null if not found
   */
  findByEmail(email: string): Promise<Result<Maybe<User>, Error>>;

  /**
   * Retrieves users by role
   * @param role The user role
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of users
   */
  findByRole(
    role: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>>;

  /**
   * Retrieves users by county
   * @param county The county name
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of users
   */
  findByCounty(
    county: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>>;

  /**
   * Searches users by name or email
   * @param query Search query string
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of users
   */
  search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
      is_active?: boolean;
    }
  ): Promise<Result<User[], Error>>;

  /**
   * Retrieves active users
   * @param options Query options for pagination
   * @returns Promise resolving to array of active users
   */
  findActive(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<Result<User[], Error>>;

  /**
   * Updates an existing user
   * @param id The user ID
   * @param updates The fields to update
   * @returns Promise resolving to the updated user or error
   */
  update(id: string, updates: Partial<NewUser>): Promise<Result<User, Error>>;

  /**
   * Updates user profile information
   * @param userId The user ID
   * @param profile The profile data to update
   * @returns Promise resolving to success result
   */
  updateProfile(userId: string, profile: Partial<NewUserProfile>): Promise<Result<UserProfile, Error>>;

  /**
   * Retrieves user profile by user ID
   * @param userId The user ID
   * @returns Promise resolving to the user profile or null if not found
   */
  getProfileByUserId(userId: string): Promise<Result<Maybe<UserProfile>, Error>>;

  /**
   * Updates user authentication tokens
   * @param id The user ID
   * @param tokens The tokens to update
   * @returns Promise resolving to success result
   */
  updateAuthTokens(
    id: string,
    tokens: {
      verification_token?: string;
      verification_expires_at?: Date;
      password_reset_token?: string;
      password_reset_expires_at?: Date;
    }
  ): Promise<Result<void, Error>>;

  /**
   * Updates user security settings
   * @param id The user ID
   * @param security The security settings to update
   * @returns Promise resolving to success result
   */
  updateSecuritySettings(
    id: string,
    security: {
      two_factor_enabled?: boolean;
      two_factor_secret?: string;
      backup_codes?: string[];
    }
  ): Promise<Result<void, Error>>;

  /**
   * Deletes a user by ID
   * @param id The user ID
   * @returns Promise resolving to success result
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Retrieves users with lazy-loaded profiles
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of users with lazy profile loading
   */
  findWithLazyProfiles(options?: {
    limit?: number;
    offset?: number;
    role?: string;
    is_active?: boolean;
  }): Promise<Result<Array<User & { loadProfile: () => Promise<Result<UserProfile, Error>> }>, Error>>;

  /**
   * Gets the total count of users matching criteria
   * @param criteria Optional filtering criteria
   * @returns Promise resolving to the count
   */
  count(criteria?: {
    role?: string;
    county?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }): Promise<Result<number, Error>>;

  /**
   * Creates multiple users in a single batch operation
   * @param users Array of user data to create
   * @returns Promise resolving to array of created users or error
   */
  createBatch(users: NewUser[]): Promise<Result<User[], Error>>;

  /**
   * Updates multiple users in a single batch operation
   * @param updates Array of user updates with IDs
   * @returns Promise resolving to array of updated users or error
   */
  updateBatch(updates: Array<{ id: string; data: Partial<NewUser> }>): Promise<Result<User[], Error>>;

  /**
   * Deletes multiple users in a single batch operation
   * @param ids Array of user IDs to delete
   * @returns Promise resolving to success result
   */
  deleteBatch(ids: string[]): Promise<Result<void, Error>>;
}