/**
 * API Endpoint Registry
 * Centralized registry of all API endpoints with type-safe contracts
 */

import { ApiEndpoint, ApiEndpointWithParams, ApiEndpointWithQuery } from './endpoint';
import {
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  UpdateUserRequestSchema,
  UpdateUserResponseSchema,
  GetUserParamsSchema,
  GetUserResponseSchema,
  ListUsersQuerySchema,
  ListUsersResponseSchema,
  DeleteUserParamsSchema,
  DeleteUserResponseSchema,
} from './user.schemas';
import {
  CreateBillRequestSchema,
  CreateBillResponseSchema,
  UpdateBillRequestSchema,
  UpdateBillResponseSchema,
  GetBillParamsSchema,
  GetBillResponseSchema,
  ListBillsQuerySchema,
  ListBillsResponseSchema,
  DeleteBillParamsSchema,
  DeleteBillResponseSchema,
  GetBillEngagementParamsSchema,
  GetBillEngagementResponseSchema,
} from './bill.schemas';
import {
  CreateNotificationRequestSchema,
  CreateNotificationResponseSchema,
  GetNotificationsRequestSchema,
  GetNotificationsResponseSchema,
  MarkNotificationReadRequestSchema,
  MarkNotificationReadResponseSchema,
  MarkAllNotificationsReadResponseSchema,
  DeleteNotificationRequestSchema,
  DeleteNotificationResponseSchema,
  GetNotificationStatsResponseSchema,
  GetNotificationPreferencesResponseSchema,
  UpdateNotificationPreferencesRequestSchema,
  UpdateNotificationPreferencesResponseSchema,
  TestNotificationFilterRequestSchema,
  TestNotificationFilterResponseSchema,
  GetNotificationServiceStatusResponseSchema,
} from './notification.schemas';
import {
  GetAnalyticsMetricsRequestSchema,
  GetAnalyticsMetricsResponseSchema,
  GetBillAnalyticsRequestSchema,
  GetBillAnalyticsResponseSchema,
  GetUserAnalyticsRequestSchema,
  GetUserAnalyticsResponseSchema,
  TrackEventRequestSchema,
  TrackEventResponseSchema,
} from './analytics.schemas';
import {
  SearchRequestSchema,
  SearchResponseSchema,
  SearchBillsRequestSchema,
  SearchBillsResponseSchema,
  SearchUsersRequestSchema,
  SearchUsersResponseSchema,
  GetSearchSuggestionsRequestSchema,
  GetSearchSuggestionsResponseSchema,
} from './search.schemas';
import {
  GetSystemStatusRequestSchema,
  GetSystemStatusResponseSchema,
  GetSystemMetricsRequestSchema,
  GetSystemMetricsResponseSchema,
  GetAuditLogsRequestSchema,
  GetAuditLogsResponseSchema,
  CreateModerationActionRequestSchema,
  CreateModerationActionResponseSchema,
  GetModerationActionsRequestSchema,
  GetModerationActionsResponseSchema,
  UpdateUserRoleRequestSchema,
  UpdateUserRoleResponseSchema,
  BulkDeleteRequestSchema,
  BulkDeleteResponseSchema,
} from './admin.schemas';
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
} from './user.contract';
import type {
  CreateBillRequest,
  CreateBillResponse,
  UpdateBillRequest,
  UpdateBillResponse,
  GetBillRequest,
  GetBillResponse,
  ListBillsRequest,
  ListBillsResponse,
  DeleteBillRequest,
  DeleteBillResponse,
  GetBillEngagementRequest,
  GetBillEngagementResponse,
} from './bill.contract';
import type {
  CreateNotificationRequest,
  CreateNotificationResponse,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  DeleteNotificationRequest,
  DeleteNotificationResponse,
  GetNotificationStatsResponse,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse,
  TestNotificationFilterRequest,
  TestNotificationFilterResponse,
  GetNotificationServiceStatusResponse,
} from './notification.contract';
import type {
  GetAnalyticsMetricsRequest,
  GetAnalyticsMetricsResponse,
  GetBillAnalyticsRequest,
  GetBillAnalyticsResponse,
  GetUserAnalyticsRequest,
  GetUserAnalyticsResponse,
  TrackEventRequest,
  TrackEventResponse,
} from './analytics.contract';
import type {
  SearchRequest,
  SearchResponse,
  SearchBillsRequest,
  SearchBillsResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  GetSearchSuggestionsRequest,
  GetSearchSuggestionsResponse,
} from './search.contract';
import type {
  GetSystemStatusRequest,
  GetSystemStatusResponse,
  GetSystemMetricsRequest,
  GetSystemMetricsResponse,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  CreateModerationActionRequest,
  CreateModerationActionResponse,
  GetModerationActionsRequest,
  GetModerationActionsResponse,
  UpdateUserRoleRequest,
  UpdateUserRoleResponse,
  BulkDeleteRequest,
  BulkDeleteResponse,
} from './admin.contract';

// ============================================================================
// User Endpoints
// ============================================================================

export const UserEndpoints = {
  /**
   * Create a new user
   * POST /api/users
   */
  create: {
    method: 'POST',
    path: '/api/users',
    requestSchema: CreateUserRequestSchema,
    responseSchema: CreateUserResponseSchema,
    description: 'Create a new user account',
    tags: ['users', 'authentication'],
    requiresAuth: false,
  } as unknown as ApiEndpoint<CreateUserRequest, CreateUserResponse>,

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getById: {
    method: 'GET',
    path: '/api/users/:id',
    requestSchema: GetUserParamsSchema,
    responseSchema: GetUserResponseSchema,
    paramsSchema: GetUserParamsSchema,
    description: 'Get user details by ID',
    tags: ['users'],
    requiresAuth: true,
  } as unknown as ApiEndpointWithParams<GetUserRequest, GetUserResponse, GetUserRequest>,

  /**
   * Update user
   * PUT /api/users/:id
   */
  update: {
    method: 'PUT',
    path: '/api/users/:id',
    requestSchema: UpdateUserRequestSchema,
    responseSchema: UpdateUserResponseSchema,
    paramsSchema: GetUserParamsSchema,
    description: 'Update user information',
    tags: ['users'],
    requiresAuth: true,
    requiredPermissions: ['user:update'],
  } as unknown as ApiEndpointWithParams<UpdateUserRequest, UpdateUserResponse, GetUserRequest>,

  /**
   * List users
   * GET /api/users
   */
  list: {
    method: 'GET',
    path: '/api/users',
    requestSchema: ListUsersQuerySchema,
    responseSchema: ListUsersResponseSchema,
    querySchema: ListUsersQuerySchema,
    description: 'List users with pagination and filtering',
    tags: ['users'],
    requiresAuth: true,
    requiredPermissions: ['user:list'],
  } as unknown as ApiEndpointWithQuery<ListUsersRequest, ListUsersResponse, ListUsersRequest>,

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  delete: {
    method: 'DELETE',
    path: '/api/users/:id',
    requestSchema: DeleteUserParamsSchema,
    responseSchema: DeleteUserResponseSchema,
    paramsSchema: DeleteUserParamsSchema,
    description: 'Delete a user account',
    tags: ['users'],
    requiresAuth: true,
    requiredPermissions: ['user:delete'],
  } as unknown as ApiEndpointWithParams<DeleteUserRequest, DeleteUserResponse, DeleteUserRequest>,
} as const;

// ============================================================================
// Bill Endpoints
// ============================================================================

export const BillEndpoints = {
  /**
   * Create a new bill
   * POST /api/bills
   */
  create: {
    method: 'POST',
    path: '/api/bills',
    requestSchema: CreateBillRequestSchema,
    responseSchema: CreateBillResponseSchema,
    description: 'Create a new bill',
    tags: ['bills', 'legislative'],
    requiresAuth: true,
    requiredPermissions: ['bill:create'],
  } as unknown as ApiEndpoint<CreateBillRequest, CreateBillResponse>,

  /**
   * Get bill by ID
   * GET /api/bills/:id
   */
  getById: {
    method: 'GET',
    path: '/api/bills/:id',
    requestSchema: GetBillParamsSchema,
    responseSchema: GetBillResponseSchema,
    paramsSchema: GetBillParamsSchema,
    description: 'Get bill details by ID',
    tags: ['bills', 'legislative'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithParams<GetBillRequest, GetBillResponse, GetBillRequest>,

  /**
   * Update bill
   * PUT /api/bills/:id
   */
  update: {
    method: 'PUT',
    path: '/api/bills/:id',
    requestSchema: UpdateBillRequestSchema,
    responseSchema: UpdateBillResponseSchema,
    paramsSchema: GetBillParamsSchema,
    description: 'Update bill information',
    tags: ['bills', 'legislative'],
    requiresAuth: true,
    requiredPermissions: ['bill:update'],
  } as unknown as ApiEndpointWithParams<UpdateBillRequest, UpdateBillResponse, GetBillRequest>,

  /**
   * List bills
   * GET /api/bills
   */
  list: {
    method: 'GET',
    path: '/api/bills',
    requestSchema: ListBillsQuerySchema,
    responseSchema: ListBillsResponseSchema,
    querySchema: ListBillsQuerySchema,
    description: 'List bills with pagination, filtering, and sorting',
    tags: ['bills', 'legislative'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithQuery<ListBillsRequest, ListBillsResponse, ListBillsRequest>,

  /**
   * Delete bill
   * DELETE /api/bills/:id
   */
  delete: {
    method: 'DELETE',
    path: '/api/bills/:id',
    requestSchema: DeleteBillParamsSchema,
    responseSchema: DeleteBillResponseSchema,
    paramsSchema: DeleteBillParamsSchema,
    description: 'Delete a bill',
    tags: ['bills', 'legislative'],
    requiresAuth: true,
    requiredPermissions: ['bill:delete'],
  } as unknown as ApiEndpointWithParams<DeleteBillRequest, DeleteBillResponse, DeleteBillRequest>,

  /**
   * Get bill engagement metrics
   * GET /api/bills/:id/engagement
   */
  getEngagement: {
    method: 'GET',
    path: '/api/bills/:id/engagement',
    requestSchema: GetBillEngagementParamsSchema,
    responseSchema: GetBillEngagementResponseSchema,
    paramsSchema: GetBillEngagementParamsSchema,
    description: 'Get engagement metrics for a bill',
    tags: ['bills', 'analytics'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithParams<GetBillEngagementRequest, GetBillEngagementResponse, GetBillEngagementRequest>,
} as const;

// ============================================================================
// Notification Endpoints
// ============================================================================

export const NotificationEndpoints = {
  /**
   * Create a notification
   * POST /api/notifications
   */
  create: {
    method: 'POST',
    path: '/api/notifications',
    requestSchema: CreateNotificationRequestSchema,
    responseSchema: CreateNotificationResponseSchema,
    description: 'Create a new notification',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<CreateNotificationRequest, CreateNotificationResponse>,

  /**
   * Get notifications
   * GET /api/notifications
   */
  list: {
    method: 'GET',
    path: '/api/notifications',
    requestSchema: GetNotificationsRequestSchema,
    responseSchema: GetNotificationsResponseSchema,
    querySchema: GetNotificationsRequestSchema,
    description: 'Get user notifications with pagination',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpointWithQuery<GetNotificationsRequest, GetNotificationsResponse, GetNotificationsRequest>,

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  markRead: {
    method: 'PATCH',
    path: '/api/notifications/:id/read',
    requestSchema: MarkNotificationReadRequestSchema,
    responseSchema: MarkNotificationReadResponseSchema,
    paramsSchema: MarkNotificationReadRequestSchema,
    description: 'Mark a notification as read',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpointWithParams<MarkNotificationReadRequest, MarkNotificationReadResponse, MarkNotificationReadRequest>,

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  markAllRead: {
    method: 'PATCH',
    path: '/api/notifications/read-all',
    requestSchema: GetNotificationsRequestSchema,
    responseSchema: MarkAllNotificationsReadResponseSchema,
    description: 'Mark all notifications as read',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<unknown, MarkAllNotificationsReadResponse>,

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  delete: {
    method: 'DELETE',
    path: '/api/notifications/:id',
    requestSchema: DeleteNotificationRequestSchema,
    responseSchema: DeleteNotificationResponseSchema,
    paramsSchema: DeleteNotificationRequestSchema,
    description: 'Delete a notification',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpointWithParams<DeleteNotificationRequest, DeleteNotificationResponse, DeleteNotificationRequest>,

  /**
   * Get notification stats
   * GET /api/notifications/stats
   */
  getStats: {
    method: 'GET',
    path: '/api/notifications/stats',
    requestSchema: GetNotificationsRequestSchema,
    responseSchema: GetNotificationStatsResponseSchema,
    description: 'Get notification statistics',
    tags: ['notifications'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<unknown, GetNotificationStatsResponse>,

  /**
   * Get notification preferences
   * GET /api/notifications/preferences/enhanced
   */
  getPreferences: {
    method: 'GET',
    path: '/api/notifications/preferences/enhanced',
    requestSchema: GetNotificationsRequestSchema,
    responseSchema: GetNotificationPreferencesResponseSchema,
    description: 'Get user notification preferences',
    tags: ['notifications', 'preferences'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<unknown, GetNotificationPreferencesResponse>,

  /**
   * Update notification preferences
   * PATCH /api/notifications/preferences/channels
   */
  updatePreferences: {
    method: 'PATCH',
    path: '/api/notifications/preferences/channels',
    requestSchema: UpdateNotificationPreferencesRequestSchema,
    responseSchema: UpdateNotificationPreferencesResponseSchema,
    description: 'Update user notification preferences',
    tags: ['notifications', 'preferences'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<UpdateNotificationPreferencesRequest, UpdateNotificationPreferencesResponse>,

  /**
   * Test notification filter
   * POST /api/notifications/test-filter
   */
  testFilter: {
    method: 'POST',
    path: '/api/notifications/test-filter',
    requestSchema: TestNotificationFilterRequestSchema,
    responseSchema: TestNotificationFilterResponseSchema,
    description: 'Test notification filter rules',
    tags: ['notifications', 'testing'],
    requiresAuth: true,
  } as unknown as ApiEndpoint<TestNotificationFilterRequest, TestNotificationFilterResponse>,

  /**
   * Get notification service status
   * GET /api/notifications/status
   */
  getStatus: {
    method: 'GET',
    path: '/api/notifications/status',
    requestSchema: GetNotificationsRequestSchema,
    responseSchema: GetNotificationServiceStatusResponseSchema,
    description: 'Get notification service health status',
    tags: ['notifications', 'monitoring'],
    requiresAuth: false,
  } as unknown as ApiEndpoint<unknown, GetNotificationServiceStatusResponse>,
} as const;

// ============================================================================
// Analytics Endpoints
// ============================================================================

export const AnalyticsEndpoints = {
  /**
   * Get analytics metrics
   * GET /api/analytics
   */
  getMetrics: {
    method: 'GET',
    path: '/api/analytics',
    requestSchema: GetAnalyticsMetricsRequestSchema,
    responseSchema: GetAnalyticsMetricsResponseSchema,
    querySchema: GetAnalyticsMetricsRequestSchema,
    description: 'Get platform analytics metrics',
    tags: ['analytics'],
    requiresAuth: true,
    requiredPermissions: ['analytics:read'],
  } as unknown as ApiEndpointWithQuery<GetAnalyticsMetricsRequest, GetAnalyticsMetricsResponse, GetAnalyticsMetricsRequest>,

  /**
   * Get bill analytics
   * GET /api/analytics/bills/:billId
   */
  getBillAnalytics: {
    method: 'GET',
    path: '/api/analytics/bills/:billId',
    requestSchema: GetBillAnalyticsRequestSchema,
    responseSchema: GetBillAnalyticsResponseSchema,
    paramsSchema: GetBillAnalyticsRequestSchema,
    description: 'Get analytics for a specific bill',
    tags: ['analytics', 'bills'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithParams<GetBillAnalyticsRequest, GetBillAnalyticsResponse, GetBillAnalyticsRequest>,

  /**
   * Get user analytics
   * GET /api/analytics/users/:userId
   */
  getUserAnalytics: {
    method: 'GET',
    path: '/api/analytics/users/:userId',
    requestSchema: GetUserAnalyticsRequestSchema,
    responseSchema: GetUserAnalyticsResponseSchema,
    paramsSchema: GetUserAnalyticsRequestSchema,
    description: 'Get analytics for a specific user',
    tags: ['analytics', 'users'],
    requiresAuth: true,
    requiredPermissions: ['analytics:read'],
  } as unknown as ApiEndpointWithParams<GetUserAnalyticsRequest, GetUserAnalyticsResponse, GetUserAnalyticsRequest>,

  /**
   * Track event
   * POST /api/analytics/track
   */
  trackEvent: {
    method: 'POST',
    path: '/api/analytics/track',
    requestSchema: TrackEventRequestSchema,
    responseSchema: TrackEventResponseSchema,
    description: 'Track an analytics event',
    tags: ['analytics', 'tracking'],
    requiresAuth: false,
  } as unknown as ApiEndpoint<TrackEventRequest, TrackEventResponse>,
} as const;

// ============================================================================
// Search Endpoints
// ============================================================================

export const SearchEndpoints = {
  /**
   * Search across all content
   * GET /api/search
   */
  search: {
    method: 'GET',
    path: '/api/search',
    requestSchema: SearchRequestSchema,
    responseSchema: SearchResponseSchema,
    querySchema: SearchRequestSchema,
    description: 'Search across all content types',
    tags: ['search'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithQuery<SearchRequest, SearchResponse, SearchRequest>,

  /**
   * Search bills
   * GET /api/search/bills
   */
  searchBills: {
    method: 'GET',
    path: '/api/search/bills',
    requestSchema: SearchBillsRequestSchema,
    responseSchema: SearchBillsResponseSchema,
    querySchema: SearchBillsRequestSchema,
    description: 'Search bills specifically',
    tags: ['search', 'bills'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithQuery<SearchBillsRequest, SearchBillsResponse, SearchBillsRequest>,

  /**
   * Search users
   * GET /api/search/users
   */
  searchUsers: {
    method: 'GET',
    path: '/api/search/users',
    requestSchema: SearchUsersRequestSchema,
    responseSchema: SearchUsersResponseSchema,
    querySchema: SearchUsersRequestSchema,
    description: 'Search users specifically',
    tags: ['search', 'users'],
    requiresAuth: true,
  } as unknown as ApiEndpointWithQuery<SearchUsersRequest, SearchUsersResponse, SearchUsersRequest>,

  /**
   * Get search suggestions
   * GET /api/search/suggestions
   */
  getSuggestions: {
    method: 'GET',
    path: '/api/search/suggestions',
    requestSchema: GetSearchSuggestionsRequestSchema,
    responseSchema: GetSearchSuggestionsResponseSchema,
    querySchema: GetSearchSuggestionsRequestSchema,
    description: 'Get search suggestions for autocomplete',
    tags: ['search', 'suggestions'],
    requiresAuth: false,
  } as unknown as ApiEndpointWithQuery<GetSearchSuggestionsRequest, GetSearchSuggestionsResponse, GetSearchSuggestionsRequest>,
} as const;

// ============================================================================
// Admin Endpoints
// ============================================================================

export const AdminEndpoints = {
  /**
   * Get system status
   * GET /api/admin/system/status
   */
  getSystemStatus: {
    method: 'GET',
    path: '/api/admin/system/status',
    requestSchema: GetSystemStatusRequestSchema,
    responseSchema: GetSystemStatusResponseSchema,
    querySchema: GetSystemStatusRequestSchema,
    description: 'Get system health status',
    tags: ['admin', 'monitoring'],
    requiresAuth: true,
    requiredPermissions: ['admin:read'],
  } as unknown as ApiEndpointWithQuery<GetSystemStatusRequest, GetSystemStatusResponse, GetSystemStatusRequest>,

  /**
   * Get system metrics
   * GET /api/admin/system/metrics
   */
  getSystemMetrics: {
    method: 'GET',
    path: '/api/admin/system/metrics',
    requestSchema: GetSystemMetricsRequestSchema,
    responseSchema: GetSystemMetricsResponseSchema,
    querySchema: GetSystemMetricsRequestSchema,
    description: 'Get system performance metrics',
    tags: ['admin', 'monitoring'],
    requiresAuth: true,
    requiredPermissions: ['admin:read'],
  } as unknown as ApiEndpointWithQuery<GetSystemMetricsRequest, GetSystemMetricsResponse, GetSystemMetricsRequest>,

  /**
   * Get audit logs
   * GET /api/admin/audit-logs
   */
  getAuditLogs: {
    method: 'GET',
    path: '/api/admin/audit-logs',
    requestSchema: GetAuditLogsRequestSchema,
    responseSchema: GetAuditLogsResponseSchema,
    querySchema: GetAuditLogsRequestSchema,
    description: 'Get audit logs with filtering',
    tags: ['admin', 'audit'],
    requiresAuth: true,
    requiredPermissions: ['admin:audit:read'],
  } as unknown as ApiEndpointWithQuery<GetAuditLogsRequest, GetAuditLogsResponse, GetAuditLogsRequest>,

  /**
   * Create moderation action
   * POST /api/admin/moderation
   */
  createModerationAction: {
    method: 'POST',
    path: '/api/admin/moderation',
    requestSchema: CreateModerationActionRequestSchema,
    responseSchema: CreateModerationActionResponseSchema,
    description: 'Create a moderation action',
    tags: ['admin', 'moderation'],
    requiresAuth: true,
    requiredPermissions: ['admin:moderate'],
  } as unknown as ApiEndpoint<CreateModerationActionRequest, CreateModerationActionResponse>,

  /**
   * Get moderation actions
   * GET /api/admin/moderation
   */
  getModerationActions: {
    method: 'GET',
    path: '/api/admin/moderation',
    requestSchema: GetModerationActionsRequestSchema,
    responseSchema: GetModerationActionsResponseSchema,
    querySchema: GetModerationActionsRequestSchema,
    description: 'Get moderation action history',
    tags: ['admin', 'moderation'],
    requiresAuth: true,
    requiredPermissions: ['admin:moderate:read'],
  } as unknown as ApiEndpointWithQuery<GetModerationActionsRequest, GetModerationActionsResponse, GetModerationActionsRequest>,

  /**
   * Update user role
   * PUT /api/admin/users/role
   */
  updateUserRole: {
    method: 'PUT',
    path: '/api/admin/users/role',
    requestSchema: UpdateUserRoleRequestSchema,
    responseSchema: UpdateUserRoleResponseSchema,
    description: 'Update a user role',
    tags: ['admin', 'users'],
    requiresAuth: true,
    requiredPermissions: ['admin:users:update'],
  } as unknown as ApiEndpoint<UpdateUserRoleRequest, UpdateUserRoleResponse>,

  /**
   * Bulk delete
   * DELETE /api/admin/bulk-delete
   */
  bulkDelete: {
    method: 'DELETE',
    path: '/api/admin/bulk-delete',
    requestSchema: BulkDeleteRequestSchema,
    responseSchema: BulkDeleteResponseSchema,
    description: 'Bulk delete resources',
    tags: ['admin', 'bulk-operations'],
    requiresAuth: true,
    requiredPermissions: ['admin:delete'],
  } as unknown as ApiEndpoint<BulkDeleteRequest, BulkDeleteResponse>,
} as const;

// ============================================================================
// Endpoint Registry
// ============================================================================

/**
 * Complete endpoint registry
 * Provides type-safe access to all API endpoints
 */
export const ApiEndpoints = {
  users: UserEndpoints,
  bills: BillEndpoints,
  notifications: NotificationEndpoints,
  analytics: AnalyticsEndpoints,
  search: SearchEndpoints,
  admin: AdminEndpoints,
} as const;

/**
 * Get all endpoints as a flat array
 */
export function getAllEndpoints(): ReadonlyArray<ApiEndpoint<unknown, unknown>> {
  const endpoints: ApiEndpoint<unknown, unknown>[] = [];

  for (const category of Object.values(ApiEndpoints)) {
    for (const endpoint of Object.values(category)) {
      endpoints.push(endpoint as ApiEndpoint<unknown, unknown>);
    }
  }

  return endpoints;
}

/**
 * Find endpoint by path and method
 */
export function findEndpoint(
  path: string,
  method: string
): ApiEndpoint<unknown, unknown> | undefined {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.find(
    (endpoint) => endpoint.path === path && endpoint.method === method
  );
}

/**
 * Get endpoints by tag
 */
export function getEndpointsByTag(tag: string): ReadonlyArray<ApiEndpoint<unknown, unknown>> {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.filter((endpoint) => endpoint.tags?.includes(tag));
}
