/**
 * Bill Types - Unified Type System
 *
 * Centralized export point for all bill-related types including
 * legislation, analysis, analytics, and authentication.
 *
 * @module shared/types/bill
 *
 * @example
 * // Import base bill types
 * import type { Bill, BillStatus, BillAnalysis } from '@client/lib/types/bill';
 *
 * // Import analytics types
 * import type { BillAnalytics, EngagementAnalytics } from '@client/lib/types/bill';
 *
 * // Import service types
 * import type { PaginatedBillsResponse, BillEngagementMetrics } from '@client/lib/types/bill';
 *
 * // Import auth types
 * import type { User, UserRole, ExtendedUser } from '@client/lib/types/bill';
 */

// ============================================================================
// Bill Base Types
// ============================================================================

export type {
  Bill,
  BillStatus,
  BillStatusType,
  UrgencyLevel,
  UrgencyLevelType,
  ComplexityLevel,
  ComplexityLevelType,
  Sponsor,
  ExtendedBill,
  BillAmendment,
  RelatedBill,
  BillAnalysis,
  SentimentAnalysis,
  FinancialImpact,
  HealthSafetyImpact,
  EnvironmentalImpact,
  BillsQueryParams,
  BillsSearchParams,
  BillFilters,
  AdvancedBillSearch,
  BillCategory,
  BillAction,
  BillVersion,
  CommitteeAssignment,
  VoteRecord,
} from './bill-base';

export {
  isBill,
  isBillAnalysis,
  isExtendedBill,
} from './bill-base';

// ============================================================================
// Bill Analytics Types
// ============================================================================

export type {
  BillAnalytics,
  DemographicsAnalysis,
  AnalyticsTimeline,
  AnalyticsSummary,
  CategoryAnalytics,
  TrendingBill,
  UserEngagementSummary,
  EngagementAnalytics,
  GeographicAnalytics,
  DemographicSegmentAnalytics,
  CommentAnalytics,
  CommentStat,
  CommentTimelineEntry,
  ShareAnalytics,
  ShareTimelineEntry,
  VoteAnalytics,
  VoteTimelineEntry,
  AnalyticsFilters,
  AnalyticsQueryParams,
  AnalyticsResponse,
  PaginatedAnalyticsResponse,
} from './bill-analytics';

export {
  isBillAnalytics,
  isUserEngagementSummary,
} from './bill-analytics';

// ============================================================================
// Bill Services Types
// ============================================================================

export type {
  PaginatedBillsResponse,
  BillResponse,
  BillAnalysisResponse,
  CreateResponse as BillCreateResponse,
  UpdateResponse as BillUpdateResponse,
  DeleteResponse as BillDeleteResponse,
  ListResponse as BillListResponse,
  ErrorResponse as BillErrorResponse,
  BillTimeline,
  BillHistory,
  BillChange,
  CommitteeAssignmentResponse,
  VoteSummaryResponse,
  BillEngagementMetrics,
  BillTrackingPreference,
  BillNotification,
  BatchBillOperation,
  BatchOperationResponse as BillBatchOperationResponse,
  BillSearchResult,
  SearchResponse,
  BillComparison,
  BillDifference,
  BillAggregation,
  AggregationValue,
  SyncRequest as BillSyncRequest,
  SyncResponse as BillSyncResponse,
  CachedItem as BillCachedItem,
} from './bill-services';

export {
  isPaginatedBillsResponse,
  isBillEngagementMetrics,
} from './bill-services';

// ============================================================================
// Authentication and User Types
// ============================================================================

export type {
  UserRole as BillUserRole,
  UserPermission,
  User,
  ExtendedUser,
  SocialLinks,
  UserPreferences,
  UserStats,
  ExpertUser,
  LegislatorUser,
  AuthCredentials,
  AuthResponse,
  TokenPayload,
  SessionInfo,
  OAuthProvider,
  RolePermissions,
  AccessControlEntry,
  ResourceAccessLevel,
  ResourcePermission,
  UserAccount,
  UserRegistration,
  UserUpdateRequest,
  PasswordChangeRequest,
  PasswordResetRequest,
  TwoFactorSetup,
  TwoFactorVerification,
  AuditLogEntry,
  ActivityLog,
} from './auth-types';

export {
  UserRoleEnum,
  isUser,
  isExtendedUser,
  isExpertUser,
  isLegislatorUser,
} from './auth-types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default bill object
 *
 * @example
 * const bill = createBillDefaults({ title: 'My Bill' });
 */
export function createBillDefaults(overrides?: Partial<any>): any {
  return {
    id: 0,
    billNumber: 'HB-0000',
    title: overrides?.title || 'Untitled Bill',
    summary: overrides?.summary || '',
    status: 'introduced',
    urgency: 'medium',
    complexity: 'medium',
    introducedDate: new Date().toISOString(),
    lastActionDate: new Date().toISOString(),
    sponsors: [],
    tags: [],
    policyAreas: [],
    ...overrides,
  };
}

/**
 * Create a default user object
 *
 * @example
 * const user = createUserDefaults({ name: 'John Doe' });
 */
export function createUserDefaults(overrides?: Partial<any>): any {
  return {
    id: '',
    name: overrides?.name || 'Anonymous User',
    email: overrides?.email || '',
    role: 'guest',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Format a bill for display
 *
 * @example
 * const formatted = formatBillForDisplay(bill);
 */
export function formatBillForDisplay(bill: any): string {
  return `${bill.billNumber}: ${bill.title}`;
}

/**
 * Get user role label
 *
 * @example
 * const label = getUserRoleLabel('expert'); // 'Expert'
 */
export function getUserRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrator',
    expert: 'Expert',
    citizen: 'Citizen',
    guest: 'Guest',
    legislator: 'Legislator',
    staff: 'Staff',
    public: 'Public',
  };
  return labels[role] || role;
}

/**
 * Check if user has permission
 *
 * @example
 * if (hasPermission(user, 'create:comment')) { ... }
 */
export function hasPermission(user: any, permission: string): boolean {
  const rolePermissions: Record<string, readonly string[]> = {
    admin: ['create:comment', 'edit:comment', 'delete:comment', 'create:analysis', 'moderate:content', 'view:analytics', 'manage:users', 'manage:system'],
    expert: ['create:comment', 'edit:comment', 'create:analysis', 'submit:insight', 'view:analytics'],
    legislator: ['create:comment', 'edit:comment', 'view:draft'],
    citizen: ['create:comment', 'track:bills'],
    guest: [],
  };

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

/**
 * Format bill status for display
 *
 * @example
 * const formatted = formatBillStatus('passed'); // 'Passed'
 */
export function formatBillStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get bill status color
 *
 * @example
 * const color = getBillStatusColor('passed'); // 'green'
 */
export function getBillStatusColor(status: string): string {
  const colors: Record<string, string> = {
    introduced: 'blue',
    committee: 'purple',
    floor_debate: 'orange',
    passed_house: 'yellow',
    passed_senate: 'yellow',
    passed: 'green',
    failed: 'red',
    signed: 'green',
    vetoed: 'red',
    override_attempt: 'orange',
  };
  return colors[status] || 'gray';
}

/**
 * Get urgency level color
 *
 * @example
 * const color = getUrgencyColor('critical'); // 'red'
 */
export function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };
  return colors[urgency] || 'gray';
}

/**
 * Calculate engagement score
 *
 * @example
 * const score = calculateEngagementScore(metrics);
 */
export function calculateEngagementScore(metrics: any): number {
  if (!metrics) return 0;
  const views = metrics.views || 0;
  const comments = metrics.comments_count || 0;
  const votes = metrics.votes_count || 0;
  const shares = metrics.shares_count || 0;

  // Weighted calculation
  return (views * 0.1 + comments * 2 + votes * 1.5 + shares * 2) / 100;
}

/**
 * Check if user can edit bill
 *
 * @example
 * if (canEditBill(currentUser, bill)) { ... }
 */
export function canEditBill(user: any, bill: any): boolean {
  return user.id === bill.ownerId || hasPermission(user, 'manage:system');
}

/**
 * Check if user can delete bill
 *
 * @example
 * if (canDeleteBill(currentUser, bill)) { ... }
 */
export function canDeleteBill(user: any, bill: any): boolean {
  return hasPermission(user, 'manage:system');
}

/**
 * Format engagement metrics
 *
 * @example
 * const formatted = formatEngagementMetrics(metrics);
 */
export function formatEngagementMetrics(metrics: any): Record<string, string> {
  return {
    views: `${metrics.views?.toLocaleString() || '0'} views`,
    comments: `${metrics.comments_count || 0} comments`,
    votes: `${metrics.votes_count || 0} votes`,
    shares: `${metrics.shares_count || 0} shares`,
    engagement: `${(metrics.engagement_score || 0).toFixed(1)}/10`,
  };
}

/**
 * Get days until deadline
 *
 * @example
 * const days = getDaysUntilDeadline(deadline);
 */
export function getDaysUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
