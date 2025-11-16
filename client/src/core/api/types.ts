// Unified Type Definitions for API Client Architecture
// Based on the consolidated API client design specifications

import { ZodSchema } from 'zod';

// Base API Types
export interface ApiRequest<T = any> {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: T;
  timeout: number;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  timestamp: string;
  duration: number;
  cached: boolean;
  fromFallback: boolean;
}

// Request/Response Options
export interface RequestOptions {
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheOptions;
  validate?: ValidationOptions;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  fallbackData?: any;
  skipCache?: boolean;
  cacheTTL?: number;
  responseSchema?: ZodSchema<any>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CacheOptions {
  ttl?: number;
  persist?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  key?: string;
}

export interface ValidationOptions {
  schema?: any;
  strict?: boolean;
}

// Domain Types
export interface Bill {
  id: number;
  billNumber: string;
  title: string;
  summary: string;
  status: BillStatus;
  urgencyLevel: UrgencyLevel;
  introducedDate: string;
  lastUpdated: string;
  sponsors: Sponsor[];
  constitutionalFlags: ConstitutionalFlag[];
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  policyAreas: string[];
  complexity: ComplexityLevel;
  readingTime: number;
}

export interface Comment {
  id: number;
  billId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  replies?: Comment[];
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  moderated: boolean;
  moderationReason?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  expertStatus?: ExpertStatus;
  reputation: number;
  joinedAt: string;
}

export interface DiscussionThread {
  id: number;
  billId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  lastActivity: string;
  pinned: boolean;
  locked: boolean;
}

export interface Sponsor {
  id: number;
  name: string;
  party: string;
  district?: string;
  position: string;
}

export interface ConstitutionalFlag {
  id: number;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Error Enums (moved from errors.ts for consistency)
export enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_REQUIRED = 'VALIDATION_MISSING_REQUIRED',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Business logic errors
  BUSINESS_ENTITY_NOT_FOUND = 'BUSINESS_ENTITY_NOT_FOUND',
  BUSINESS_DUPLICATE_ENTITY = 'BUSINESS_DUPLICATE_ENTITY',
  BUSINESS_INVALID_STATE = 'BUSINESS_INVALID_STATE',

  // System errors
  SYSTEM_UNKNOWN_ERROR = 'SYSTEM_UNKNOWN_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_RATE_LIMITED = 'SYSTEM_RATE_LIMITED'
}

export enum ErrorDomain {
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Unified Error Interface
export interface UnifiedError {
  id: string;
  code: ErrorCode;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  context?: {
    component: string;
    operation: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    timestamp: string;
  };
  cause?: UnifiedError;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
  reported: boolean;
}

// Enums
export enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  PASSED = 'passed',
  FAILED = 'failed',
  SIGNED = 'signed',
  VETOED = 'vetoed'
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
  HIGH = 'high'
}

export enum ExpertStatus {
  NONE = 'none',
  VERIFIED = 'verified',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator'
}

// Service Interfaces
export interface BillsService {
  getBill(id: number): Promise<Bill>;
  getBills(params?: BillsQueryParams): Promise<PaginatedResponse<Bill>>;
  searchBills(query: BillsSearchParams): Promise<PaginatedResponse<Bill>>;
  recordEngagement(billId: number, type: EngagementType): Promise<void>;
}

export interface CommunityService {
  getDiscussionThread(billId: number): Promise<DiscussionThread>;
  getComments(billId: number, params?: CommentsQueryParams): Promise<PaginatedResponse<Comment>>;
  addComment(comment: CommentFormData): Promise<Comment>;
  updateComment(id: number, content: string): Promise<Comment>;
  voteComment(id: number, vote: 'up' | 'down'): Promise<Comment>;
  reportComment(id: number, reason: string): Promise<void>;
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResult>;
  getCurrentUser(): Promise<User>;
  updateProfile(updates: Partial<User>): Promise<User>;
}

// Query and Response Types
export interface BillsQueryParams {
  status?: BillStatus[];
  urgency?: UrgencyLevel[];
  policyAreas?: string[];
  sponsors?: number[];
  dateRange?: DateRange;
  sortBy?: 'date' | 'title' | 'urgency' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BillsSearchParams extends BillsQueryParams {
  query?: string;
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
}

export interface CommentsQueryParams {
  sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
  expertOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata?: {
    timestamp: string;
    duration: number;
  };
}

export interface DateRange {
  start?: string;
  end?: string;
}

export enum EngagementType {
  VIEW = 'view',
  SAVE = 'save',
  SHARE = 'share',
  COMMENT = 'comment'
}

// Form Types
export interface CommentFormData {
  billId: number;
  content: string;
  parentId?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// Repository Pattern Types
export interface Repository<T, K = number> {
  findById(id: K): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findByCriteria(criteria: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
  delete(id: K): Promise<boolean>;
  exists(id: K): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: SortOptions;
  include?: string[];
  filter?: Record<string, any>;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Cache Types
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  compression: boolean;
  encryption: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  metadata: {
    size: number;
    compressed: boolean;
    encrypted: boolean;
  };
}

// Enhanced WebSocket Types with strategic features
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number; // 45-second timeout for stale connection detection
  };
  message: {
    compression: boolean;
    batching: boolean;
    batchSize: number;
    batchInterval: number;
  };
}

export interface Subscription {
  id: string;
  topic: string;
  filters?: Record<string, any>;
  callback: (message: any) => void;
  priority: 'high' | 'medium' | 'low';
}

// Connection State Management
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Enhanced type-safe event map with proper typing
export interface WebSocketEvents {
  connected: { timestamp: string };
  disconnected: { code: number; reason: string };
  error: any;
  message: any;
  billUpdate: { bill_id: number; update: any; timestamp: string };
  notification: any;
  batchedUpdates: any;
  preferences: any;
  preferencesUpdated: any;
  subscribed: { bill_id: number };
  unsubscribed: { bill_id: number };
}

// Bill-specific subscription types
export type BillSubscriptionType = 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';

// User preferences for bill tracking
export interface UserPreferences {
  billTracking: {
    statusChanges: boolean;
    newComments: boolean;
    votingSchedule: boolean;
    amendments: boolean;
    updateFrequency: 'immediate' | 'hourly' | 'daily';
    notificationChannels: {
      inApp: boolean;
      email: boolean;
      push: boolean;
    };
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
}

// Bill update interface
export interface BillUpdate {
  type: BillSubscriptionType;
  data: {
    bill_id: number;
    oldStatus?: string;
    newStatus?: string;
    title?: string;
    [key: string]: any;
  };
  timestamp: string;
}

// WebSocket notification interface
export interface WebSocketNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
}

// Service Registry Types
export interface ApiService {
  name: string;
  initialize?(): Promise<void>;
  cleanup?(): void;
}

// Configuration Types
export interface ServiceConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retry: RetryConfig;
    cache: CacheConfig;
  };
  websocket: WebSocketConfig;
  features: Record<string, boolean>;
  limits: {
    maxConcurrentRequests: number;
    maxCacheSize: number;
    maxWebSocketSubscriptions: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface ConfigValidator {
  validate(config: ServiceConfig): string[];
}

export interface ConfigObserver {
  onConfigChange(key: string, newValue: any, oldValue: any): void;
}

// Unified API Client Types
export interface UnifiedApiClient {
  // Core HTTP methods
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  // Service management
  registerService(name: string, service: ApiService): void;
  getService<T extends ApiService>(name: string): T;

  // Configuration
  configure(config: ClientConfig): void;
  getConfig(): ClientConfig;

  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): void;
}

export interface ClientConfig {
  baseUrl: string;
  timeout: number;
  retry: RetryConfig;
  cache: CacheConfig;
  websocket: WebSocketConfig;
  headers: Record<string, string>;
}