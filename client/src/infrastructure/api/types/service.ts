/**
 * Service Interface Types
 *
 * Type definitions for service layer interfaces
 */

import type { LoginCredentials, AuthResult, UpdateUserProfile } from './auth';
import type { BillsQueryParams, BillsSearchParams } from './bill';
import type { PaginatedResponse, VoteType } from './common';
import type { DiscussionThread, CommentsQueryParams, CommentFormData } from './community';
import type { EngagementType } from './engagement';
import type { RequestOptions } from './request';

// ============================================================================
// Base Service Interface
// ============================================================================

/**
 * Base interface that all services must implement.
 */
export interface ApiService {
  readonly name: string;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
  configure?(config: Record<string, unknown>): Promise<void>;
}

// ============================================================================
// Service Implementations
// ============================================================================

/**
 * Service interface for bill-related operations.
 */
export interface BillsService extends ApiService {
  getBill(id: number, options?: RequestOptions): Promise<unknown>;
  getBills(
    params?: BillsQueryParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<unknown>>;
  searchBills(
    query: BillsSearchParams,
    options?: RequestOptions
  ): Promise<PaginatedResponse<unknown>>;
  recordEngagement(billId: number, type: EngagementType): Promise<void>;
  subscribeToBill(billId: number): Promise<void>;
  unsubscribeFromBill(billId: number): Promise<void>;
}

/**
 * Service interface for community features (comments, discussions).
 */
export interface CommunityService extends ApiService {
  getDiscussionThread(billId: number): Promise<DiscussionThread>;
  getComments(billId: number, params?: CommentsQueryParams): Promise<PaginatedResponse<unknown>>;
  addComment(comment: CommentFormData): Promise<unknown>;
  updateComment(id: number, content: string): Promise<unknown>;
  deleteComment(id: number): Promise<void>;
  voteComment(id: number, vote: VoteType): Promise<unknown>;
  reportComment(id: number, reason: string): Promise<void>;
}

/**
 * Service interface for authentication and user management.
 */
export interface AuthService extends ApiService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResult>;
  getCurrentUser(): Promise<unknown>;
  updateProfile(updates: Partial<UpdateUserProfile>): Promise<unknown>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}
