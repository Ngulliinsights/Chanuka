/**
 * Unified Type Definitions for API Client Architecture
 * 
 * This module provides comprehensive type definitions for the entire API client system.
 * It includes core API types, domain models, service interfaces, and configuration types.
 * All types are designed to be immutable and composable for maximum type safety.
 */

import { ZodSchema } from 'zod';

// ============================================================================
// Core API Request/Response Types
// ============================================================================

/**
 * Represents an outgoing API request with complete metadata.
 * The generic type T represents the request body type.
 */
export interface ApiRequest<T = unknown> {
  readonly id: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: T;
  readonly timeout: number;
  readonly timestamp: string;
  readonly metadata?: RequestMetadata;
}

/**
 * Represents an API response with complete metadata and timing information.
 * The generic type T represents the response data type.
 */
export interface ApiResponse<T = unknown> {
  readonly id: string;
  readonly requestId: string;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
  readonly timestamp: string;
  readonly duration: number;
  readonly cached: boolean;
  readonly fromFallback: boolean;
  readonly message?: string;
  readonly metadata?: ResponseMetadata;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestMetadata {
  readonly correlationId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly retryCount?: number;
}

interface ResponseMetadata {
  readonly serverVersion?: string;
  readonly rateLimit?: RateLimitInfo;
  readonly warnings?: string[];
}

interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}

// ============================================================================
// Request Configuration and Options
// ============================================================================

/**
 * Configuration options for individual API requests.
 * Allows fine-grained control over caching, retries, validation, and more.
 */
export interface RequestOptions {
  readonly timeout?: number;
  readonly retry?: RetryConfig;
  readonly cache?: CacheOptions;
  readonly validate?: ValidationOptions;
  readonly headers?: Readonly<Record<string, string>>;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
  readonly fallbackData?: unknown;
  readonly skipCache?: boolean;
  readonly cacheTTL?: number;
  readonly responseSchema?: ZodSchema;
  readonly signal?: AbortSignal;
  readonly priority?: RequestPriority;
}

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Retry configuration with exponential backoff support.
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly retryableStatusCodes?: ReadonlyArray<number>;
  readonly retryableErrors?: ReadonlyArray<string>;
}

/**
 * Cache configuration for request/response caching.
 */
export interface CacheOptions {
  readonly ttl?: number;
  readonly persist?: boolean;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly key?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly invalidateOn?: ReadonlyArray<CacheInvalidationTrigger>;
}

export type CacheInvalidationTrigger = 'mutation' | 'time' | 'manual' | 'dependency';

/**
 * Validation options for request/response data.
 */
export interface ValidationOptions {
  readonly schema?: ZodSchema;
  readonly strict?: boolean;
  readonly stripUnknown?: boolean;
  readonly coerceTypes?: boolean;
}

// ============================================================================
// Domain Models - Bills and Legislation
// ============================================================================

/**
 * Represents a legislative bill with complete metadata.
 */
export interface Bill {
  readonly id: number;
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly status: BillStatus;
  readonly urgencyLevel: UrgencyLevel;
  readonly introducedDate: string;
  readonly lastUpdated: string;
  readonly sponsors: ReadonlyArray<Sponsor>;
  readonly constitutionalFlags: ReadonlyArray<ConstitutionalFlag>;
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  readonly policyAreas: ReadonlyArray<string>;
  readonly complexity: ComplexityLevel;
  readonly readingTime: number;
  readonly fullText?: string;
  readonly amendments?: ReadonlyArray<Amendment>;
}

export interface Amendment {
  readonly id: number;
  readonly billId: number;
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly proposedDate: string;
  readonly status: AmendmentStatus;
  readonly sponsor: Sponsor;
}

export type AmendmentStatus = 'proposed' | 'debated' | 'passed' | 'rejected' | 'withdrawn';

export interface Sponsor {
  readonly id: number;
  readonly name: string;
  readonly party: string;
  readonly district?: string;
  readonly position: string;
  readonly isPrimary?: boolean;
}

export interface ConstitutionalFlag {
  readonly id: number;
  readonly type: string;
  readonly description: string;
  readonly severity: Severity;
  readonly article?: string;
  readonly clause?: string;
  readonly analysis?: string;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  FLOOR_DEBATE = 'floor_debate',
  PASSED_HOUSE = 'passed_house',
  PASSED_SENATE = 'passed_senate',
  PASSED = 'passed',
  FAILED = 'failed',
  SIGNED = 'signed',
  VETOED = 'vetoed',
  OVERRIDE_ATTEMPT = 'override_attempt'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert'
}

// ============================================================================
// Community and User Models
// ============================================================================

/**
 * Represents a user comment with threading support.
 */
export interface Comment {
  readonly id: string;
  readonly billId: number;
  readonly userId: number;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author: User;
  readonly replies?: ReadonlyArray<Comment>;
  readonly voteCount: number;
  readonly userVote?: VoteType;
  readonly moderated: boolean;
  readonly moderationReason?: string;
  readonly isEdited: boolean;
  readonly isPinned: boolean;
}

export type VoteType = 'up' | 'down';

export interface User {
  readonly id: number;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatar?: string;
  readonly verified: boolean;
  readonly expertStatus: ExpertStatus;
  readonly reputation: number;
  readonly joinedAt: string;
  readonly badges?: ReadonlyArray<Badge>;
  readonly preferences?: UserPreferences;
}

export interface Badge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly earnedAt: string;
}

export enum ExpertStatus {
  NONE = 'none',
  VERIFIED = 'verified',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

/**
 * Represents a discussion thread for a bill.
 */
export interface DiscussionThread {
  readonly id: number;
  readonly billId: number;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly participantCount: number;
  readonly messageCount: number;
  readonly lastActivity: string;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly tags?: ReadonlyArray<string>;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Service interface for bill-related operations.
 */
export interface BillsService extends ApiService {
  getBill(id: number, options?: RequestOptions): Promise<Bill>;
  getBills(params?: BillsQueryParams, options?: RequestOptions): Promise<PaginatedResponse<Bill>>;
  searchBills(query: BillsSearchParams, options?: RequestOptions): Promise<PaginatedResponse<Bill>>;
  recordEngagement(billId: number, type: EngagementType): Promise<void>;
  subscribeToBill(billId: number): Promise<void>;
  unsubscribeFromBill(billId: number): Promise<void>;
}

/**
 * Service interface for community features (comments, discussions).
 */
export interface CommunityService extends ApiService {
  getDiscussionThread(billId: number): Promise<DiscussionThread>;
  getComments(billId: number, params?: CommentsQueryParams): Promise<PaginatedResponse<Comment>>;
  addComment(comment: CommentFormData): Promise<Comment>;
  updateComment(id: number, content: string): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  voteComment(id: number, vote: VoteType): Promise<Comment>;
  reportComment(id: number, reason: string): Promise<void>;
}

/**
 * Service interface for authentication and user management.
 */
export interface AuthService extends ApiService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResult>;
  getCurrentUser(): Promise<User>;
  updateProfile(updates: Partial<UpdateUserProfile>): Promise<User>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

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
// Query Parameters and Search
// ============================================================================

export interface BillsQueryParams extends PaginationParams {
  readonly status?: ReadonlyArray<BillStatus>;
  readonly urgency?: ReadonlyArray<UrgencyLevel>;
  readonly policyAreas?: ReadonlyArray<string>;
  readonly sponsors?: ReadonlyArray<number>;
  readonly dateRange?: DateRange;
  readonly sortBy?: BillSortField;
  readonly sortOrder?: SortOrder;
}

export type BillSortField = 'date' | 'title' | 'urgency' | 'engagement' | 'relevance';
export type SortOrder = 'asc' | 'desc';

export interface BillsSearchParams extends BillsQueryParams {
  readonly query?: string;
  readonly constitutionalFlags?: boolean;
  readonly controversyLevels?: ReadonlyArray<string>;
  readonly minComplexity?: ComplexityLevel;
  readonly maxComplexity?: ComplexityLevel;
}

export interface CommentsQueryParams extends PaginationParams {
  readonly sort?: CommentSortField;
  readonly expertOnly?: boolean;
  readonly parentId?: number;
  readonly includeReplies?: boolean;
}

export type CommentSortField = 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';

export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
}

export interface DateRange {
  readonly start?: string;
  readonly end?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  readonly data: ReadonlyArray<T>;
  readonly pagination: PaginationInfo;
  readonly metadata?: ResponseMetadata;
}

export interface PaginationInfo {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

// ============================================================================
// Form and Input Types
// ============================================================================

export interface CommentFormData {
  readonly billId: number;
  readonly content: string;
  readonly parentId?: number;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

export interface UpdateUserProfile {
  readonly displayName?: string;
  readonly avatar?: string;
  readonly bio?: string;
  readonly preferences?: Partial<UserPreferences>;
}

export interface AuthResult {
  readonly user: User;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export enum EngagementType {
  VIEW = 'view',
  SAVE = 'save',
  SHARE = 'share',
  COMMENT = 'comment',
  VOTE = 'vote'
}

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_SESSION_INVALID = 'AUTH_SESSION_INVALID',

  // Validation errors
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_REQUIRED = 'VALIDATION_MISSING_REQUIRED',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_SCHEMA_MISMATCH = 'VALIDATION_SCHEMA_MISMATCH',

  // Business logic errors
  BUSINESS_ENTITY_NOT_FOUND = 'BUSINESS_ENTITY_NOT_FOUND',
  BUSINESS_DUPLICATE_ENTITY = 'BUSINESS_DUPLICATE_ENTITY',
  BUSINESS_INVALID_STATE = 'BUSINESS_INVALID_STATE',
  BUSINESS_OPERATION_FAILED = 'BUSINESS_OPERATION_FAILED',

  // System errors
  SYSTEM_UNKNOWN_ERROR = 'SYSTEM_UNKNOWN_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_RATE_LIMITED = 'SYSTEM_RATE_LIMITED',
  SYSTEM_CONFIGURATION_ERROR = 'SYSTEM_CONFIGURATION_ERROR'
}

export enum ErrorDomain {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
  CACHE = 'cache',
  WEBSOCKET = 'websocket'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Unified error interface with comprehensive context and recovery information.
 */
export interface UnifiedError {
  readonly id: string;
  readonly code: ErrorCode;
  readonly domain: ErrorDomain;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly context?: ErrorContext;
  readonly cause?: UnifiedError;
  readonly stack?: string;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly reported: boolean;
  readonly timestamp: string;
}

export interface ErrorContext {
  readonly component: string;
  readonly operation: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly timestamp: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheConfig {
  readonly defaultTTL: number;
  readonly maxSize: number;
  readonly storage: CacheStorage;
  readonly compression: boolean;
  readonly encryption: boolean;
  readonly evictionPolicy: EvictionPolicy;
}

export type CacheStorage = 'memory' | 'localStorage' | 'indexedDB';
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';

export interface CacheEntry<T = unknown> {
   data: T;
   readonly timestamp: number;
   readonly ttl: number;
   accessCount: number;
   lastAccessed: number;
   metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
   readonly size: number;
   compressed: boolean;
   encrypted: boolean;
   readonly tags?: ReadonlyArray<string>;
   readonly dependencies?: ReadonlyArray<string>;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketConfig {
  readonly url: string;
  readonly protocols?: ReadonlyArray<string>;
  readonly reconnect: ReconnectConfig;
  readonly heartbeat: HeartbeatConfig;
  readonly message: MessageConfig;
  readonly authentication?: WebSocketAuthConfig;
}

export interface ReconnectConfig {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

export interface HeartbeatConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly timeout: number;
  readonly message?: string;
}

export interface MessageConfig {
  readonly compression: boolean;
  readonly batching: boolean;
  readonly batchSize: number;
  readonly batchInterval: number;
  readonly maxMessageSize?: number;
}

export interface WebSocketAuthConfig {
  readonly type: 'token' | 'session';
  readonly tokenProvider?: () => Promise<string>;
}

export interface Subscription {
  readonly id: string;
  readonly topic: string;
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly callback: (message: unknown) => void;
  readonly priority: SubscriptionPriority;
}

export type SubscriptionPriority = 'low' | 'medium' | 'high';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSING = 'closing'
}

/**
 * Type-safe event map for WebSocket events.
 */
export interface WebSocketEvents {
  connected: { timestamp: string; connectionId: string };
  disconnected: { code: number; reason: string; wasClean: boolean };
  error: { error: Error; context?: string };
  message: { data: unknown; type: string };
  billUpdate: BillUpdate;
  notification: WebSocketNotification;
  batchedUpdates: { updates: ReadonlyArray<unknown> };
  subscribed: { topic: string; subscriptionId: string };
  unsubscribed: { topic: string; subscriptionId: string };
  reconnecting: { attempt: number; maxAttempts: number };
  heartbeat: { sent: boolean; acknowledged: boolean };
}

export type BillSubscriptionType = 
  | 'status_change' 
  | 'new_comment' 
  | 'amendment' 
  | 'voting_scheduled' 
  | 'sponsor_change';

export interface BillUpdate {
  readonly type: BillSubscriptionType;
  readonly data: BillUpdateData;
  readonly timestamp: string;
}

export interface BillUpdateData {
  readonly billId: number;
  readonly oldStatus?: BillStatus;
  readonly newStatus?: BillStatus;
  readonly title?: string;
  readonly viewCount?: number;
  readonly saveCount?: number;
  readonly commentCount?: number;
  readonly shareCount?: number;
  readonly changes?: Readonly<Record<string, unknown>>;
}

export interface WebSocketNotification {
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * User preferences for bill tracking and notifications.
 */
export interface UserPreferences {
  readonly billTracking: BillTrackingPreferences;
  readonly notifications: NotificationPreferences;
  readonly display: DisplayPreferences;
}

export interface BillTrackingPreferences {
  readonly statusChanges: boolean;
  readonly newComments: boolean;
  readonly votingSchedule: boolean;
  readonly amendments: boolean;
  readonly updateFrequency: UpdateFrequency;
  readonly trackedBills: ReadonlyArray<number>;
}

export type UpdateFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export interface NotificationPreferences {
  readonly channels: NotificationChannels;
  readonly quietHours?: QuietHours;
  readonly priority: NotificationPriority;
}

export interface NotificationChannels {
  readonly inApp: boolean;
  readonly email: boolean;
  readonly push: boolean;
}

export interface QuietHours {
  readonly enabled: boolean;
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
}

export interface DisplayPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly density: 'comfortable' | 'compact';
  readonly language: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceConfig {
  readonly api: ApiConfig;
  readonly websocket: WebSocketConfig;
  readonly features: FeatureFlags;
  readonly limits: ServiceLimits;
  readonly monitoring: MonitoringConfig;
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retry: RetryConfig;
  readonly cache: CacheConfig;
  readonly rateLimit?: RateLimitConfig;
}

export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly strategy: 'fixed' | 'sliding';
}

export interface FeatureFlags {
  readonly offlineMode: boolean;
  readonly realTimeUpdates: boolean;
  readonly analytics: boolean;
  readonly errorReporting: boolean;
  readonly performanceMonitoring: boolean;
  readonly experimentalFeatures: boolean;
}

export interface ServiceLimits {
  readonly maxConcurrentRequests: number;
  readonly maxCacheSize: number;
  readonly maxWebSocketSubscriptions: number;
  readonly maxRetryAttempts: number;
}

export interface MonitoringConfig {
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly logLevel: LogLevel;
  readonly sampleRate: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Configuration Management
// ============================================================================

export interface ConfigValidator {
  validate(config: ServiceConfig): ReadonlyArray<string>;
}

export interface ConfigObserver {
  onConfigChange(key: string, newValue: unknown, oldValue: unknown): void;
}

// ============================================================================
// Unified API Client Interface
// ============================================================================

/**
 * Main interface for the unified API client.
 * Provides HTTP methods, service management, and lifecycle control.
 */
export interface UnifiedApiClient {
  // Core HTTP methods
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  // Service management
  registerService(name: string, service: ApiService): void;
  getService<T extends ApiService>(name: string): T;
  hasService(name: string): boolean;

  // Configuration
  configure(config: Partial<ClientConfig>): void;
  getConfig(): Readonly<ClientConfig>;

  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface ClientConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retry: RetryConfig;
  readonly cache: CacheConfig;
  readonly websocket: WebSocketConfig;
  readonly headers: Readonly<Record<string, string>>;
  readonly interceptors?: ClientInterceptors;
}

export interface ClientInterceptors {
  readonly request?: ReadonlyArray<RequestInterceptor>;
  readonly response?: ReadonlyArray<ResponseInterceptor>;
}

export type RequestInterceptor = (
  config: RequestInit & { url: string }
) => RequestInit & { url: string } | Promise<RequestInit & { url: string }>;

export type ResponseInterceptor = (
  response: Response
) => Response | Promise<Response>;