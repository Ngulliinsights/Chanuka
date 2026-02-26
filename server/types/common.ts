// Consolidated type definitions for the application
// This file provides unified interfaces to replace duplicate and inconsistent type definitions

// Import types needed for local use in this file
import type { BillStatusValue } from '@shared/types';

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  source: 'database' | 'cache' | 'fallback' | 'static';
  executionTime?: number;
  cacheHit?: boolean;
  version: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ===== USER TYPES (re-exported from canonical source) =====

export type {
  User,
  UserProfile,
  UserPreferences,
  AuthenticatedUser,
  AuthenticatedRequest,
  CustomSession,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SessionValidationResult,
  AuthorizationContext,
  PermissionCheckResult,
  SessionConfig,
  OAuthProvider,
  SocialProfile,
  CreateUserPayload,
  UpdateUserPayload,
} from '@shared/types/domains/authentication/user';

export {
  UserRole,
  UserStatus,
  VerificationStatus,
  AnonymityLevel,
  ROLE_HIERARCHY,
  isAuthenticated,
  hasRole,
  getUserId,
  isUser,
} from '@shared/types';

// ===== BILL TYPES (re-exported from canonical source) =====

export type {
  Bill,
  ExtendedBill,
  BillAction,
  BillAmendment,
  RelatedBill,
  Sponsor,
  Committee,
  BillCommitteeAssignment,
  BillEngagementMetrics,
  ConstitutionalFlag,
} from '@shared/types/domains/legislative/bill';

export {
  BillStatus,
  BillPriority,
  BillType,
  Chamber,
  type BillStatusValue,
  type VoteType,
  type VoteResult,
  type SponsorRole,
  type SponsorType,
  type CommitteeType,
  type AmendmentStatus,
  type BillRelationship,
  type ConstitutionalSeverity,
} from '@shared/types';

// ===== SERVER-SPECIFIC BILL TYPES =====

export interface BillSection {
  number: string;
  title: string;
  content?: string;
  conflict_level?: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsors?: string[];
  description?: string;
}

export interface ConflictIndicator {
  type: 'financial' | 'political' | 'personal' | 'professional';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  section?: string;
  sponsor_id?: number;
}

// ===== SPONSOR TYPES (Server-specific extensions) =====

export interface Affiliation {
  organization: string;
  role: string;
  type: 'committee' | 'professional' | 'financial' | 'board' | 'advisory' | 'executive' | 'political' | 'academic';
  conflictType?: 'direct' | 'indirect' | 'minor';
  start_date?: Date;
  end_date?: Date;
}

export interface TransparencyInfo {
  disclosure: 'complete' | 'partial' | 'none';
  lastUpdated?: Date;
  publicStatements?: number;
  complianceScore?: number;
}

export interface FinancialBreakdown {
  primarySponsor: number;
  coSponsorsTotal: number;
  industryContributions: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  type: 'financial' | 'governance' | 'legislative';
}

export interface ImplementationWorkarounds {
  totalImplemented: number;
  totalExecutiveOrders: number;
  totalCourtChallenges: number;
  lastUpdated: string;
  implementations: WorkaroundImplementation[];
}

export interface WorkaroundImplementation {
  id: string;
  type: string;
  title: string;
  dateImplemented: string;
  status: 'active' | 'under-review' | 'blocked';
  originalProvisions: string[];
  similarityScore: number;
  courtChallenges: CourtChallenge[];
}

export interface CourtChallenge {
  case: string;
  status: string;
  keyArgument: string;
  hearingDate: string;
}

export interface AnalysisMethodology {
  verificationSources: VerificationSource[];
  analysisStages: string[];
}

export interface VerificationSource {
  name: string;
  weight: number;
  reliability: 'high' | 'medium' | 'low';
}

// ===== ANALYSIS TYPES =====
// Note: BillAnalysis moved to server/features/bills/types/analysis.ts

export interface SentimentAnalysis {
  positive: number;
  negative: number;
  neutral: number;
  overall: 'positive' | 'negative' | 'neutral';
}

// ===== EXPERT TYPES =====

export interface Expert {
  id: number;
  name: string;
  email: string;
  expertise: string[];
  qualifications: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  reputation_score: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VerificationTask {
  id: number;
  analysis_id: number;
  expertId: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'disputed';
  assignedAt: Date;
  completedAt?: Date;
  feedback?: string;
  confidence?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface VerificationRequest { bill_id: number;
  expertId: number;
  verification_status: string;
  confidence?: number;
  feedback?: string;
  metadata?: Record<string, unknown>;
 }

// Note: VerificationStatus enum is exported from @shared/types above

// ===== COMMENT TYPES (re-exported from canonical source) =====

export type {
  Comment,
  CommentEntity,
  CommentThread,
  CommentWithUser,
  CreateCommentPayload,
  CreateCommentInput,
  UpdateCommentPayload,
  UpdateCommentInput,
} from '@shared/types/domains/legislative/comment';

export {
  CommentStatus,
  ModerationStatus,
  type CommentModerationStatus,
  isComment,
} from '@shared/types';

// ===== NOTIFICATION TYPES =====

export interface Notification { id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
 }

export type NotificationType =
  | 'bill_status_change'
  | 'new_comment'
  | 'expert_verification'
  | 'system_alert'
  | 'bill_deadline';

// ===== SEARCH AND FILTER TYPES =====

export interface SearchFilters {
  query?: string;
  status?: BillStatusValue[];
  category?: string[];
  sponsor?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface BillFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ===== ENGAGEMENT TYPES =====

export interface BillEngagement { bill_id: number;
  user_id: number;
  views: number;
  comments: number;
  shares: number;
  lastEngaged: Date;
  isTracked: boolean;
  }

export interface BillEngagementStats {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  totalEngagements: number;
  averageEngagementTime?: number;
}

// ===== AUTHENTICATION TYPES =====
// LoginRequest, RegisterRequest, AuthResponse re-exported from @shared/core/types/auth.types above

// ===== SYSTEM HEALTH TYPES =====

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: 'connected' | 'disconnected' | 'error';
  cache?: 'connected' | 'disconnected' | 'error';
  externalApis?: Record<string, 'healthy' | 'degraded' | 'down'>;
  timestamp: string;
  uptime?: number;
  version: string;
}

// ===== UTILITY TYPES =====

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ===== LEGACY TYPE ALIASES (for backward compatibility) =====

export type ApiResponseType<T> = ApiResponse<T>;
// BillType is already exported from @shared/types above
export type ExpertType = Expert;
