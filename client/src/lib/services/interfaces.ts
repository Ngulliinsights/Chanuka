/**
 * Service Interface Definitions
 *
 * Provides standardized interfaces for all service types with:
 * - Common service lifecycle methods
 * - Error handling contracts
 * - Configuration interfaces
 * - Health check contracts
 * - Service metadata interfaces
 */

import { CacheService } from './cache';
import { ServiceError, ServiceLifecycleInterface, ServiceConfig } from './factory';

// ============================================================================
// CORE SERVICE INTERFACES
// ============================================================================

/**
 * Base service interface with common lifecycle methods
 */
export interface BaseService extends ServiceLifecycleInterface {
  /** Service identifier */
  readonly id: string;
  /** Service configuration */
  readonly config: ServiceConfig;
  /** Service cache instance */
  readonly cache?: CacheService;

  /** Initialize service with configuration */
  init(config?: ServiceConfig): Promise<void>;
  /** Dispose service resources */
  dispose(): Promise<void>;
  /** Health check for service status */
  healthCheck(): Promise<boolean>;
  /** Get service information */
  getInfo(): {
    name: string;
    version?: string;
    description?: string;
    dependencies?: string[];
  };
  /** Get service statistics */
  getStatistics(): Promise<Record<string, unknown>>;
}

// ============================================================================
// AUTHENTICATION SERVICE INTERFACES
// ============================================================================

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  expiresAt: string;
  requiresTwoFactor?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'expert' | 'official' | 'admin';
  verified: boolean;
  twoFactorEnabled: boolean;
  avatar_url?: string;
  preferences: UserPreferences;
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  dashboard_layout: 'compact' | 'comfortable' | 'spacious';
  default_bill_view: 'grid' | 'list';
  auto_save_drafts: boolean;
  show_onboarding_tips: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  activity_visibility: 'public' | 'private' | 'friends';
  data_sharing: boolean;
  analytics_tracking: boolean;
  marketing_emails: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthService extends BaseService {
  /** Authenticate user with credentials */
  login(credentials: AuthCredentials): Promise<AuthSession>;
  /** Register new user */
  register(data: RegisterData): Promise<AuthSession>;
  /** Logout current user */
  logout(): Promise<void>;
  /** Get current authenticated user */
  getCurrentUser(forceRefresh?: boolean): Promise<AuthUser>;
  /** Refresh authentication tokens */
  refreshTokens(): Promise<AuthTokens>;
  /** Verify email address */
  verifyEmail(token: string): Promise<void>;
  /** Request password reset */
  requestPasswordReset(email: string): Promise<void>;
  /** Reset password with token */
  resetPassword(token: string, newPassword: string): Promise<void>;
  /** Enable two-factor authentication */
  enableTwoFactor(): Promise<{ qrCode: string; secret: string }>;
  /** Verify two-factor setup */
  verifyTwoFactorSetup(token: string): Promise<void>;
  /** Disable two-factor authentication */
  disableTwoFactor(password: string): Promise<void>;
  /** Validate two-factor token */
  validateTwoFactorToken(token: string): Promise<boolean>;
}

// ============================================================================
// USER PROFILE SERVICE INTERFACES
// ============================================================================

export interface UserProfile extends AuthUser {
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  cover_image_url?: string;
  civic_engagement_score: number;
  badges: UserBadge[];
  achievements: UserAchievement[];
  activity_summary: ActivitySummary;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  category: 'engagement' | 'expertise' | 'community' | 'achievement';
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  completed_at?: string;
  reward_points: number;
}

export interface ActivitySummary {
  bills_tracked: number;
  comments_posted: number;
  discussions_started: number;
  votes_cast: number;
  expert_contributions: number;
  community_score: number;
  streak_days: number;
  last_active: string;
}

export interface UserProfileService extends BaseService {
  /** Get user profile by ID */
  getUserProfile(userId?: string): Promise<UserProfile>;
  /** Update user profile */
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  /** Update user preferences */
  updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences>;
  /** Update user avatar */
  updateAvatar(file: File): Promise<string>;
  /** Update cover image */
  updateCoverImage(file: File): Promise<string>;
  /** Get user statistics */
  getUserStatistics(userId?: string): Promise<ActivitySummary>;
  /** Get user badges */
  getUserBadges(userId?: string): Promise<UserBadge[]>;
  /** Get user achievements */
  getUserAchievements(userId?: string): Promise<UserAchievement[]>;
  /** Get user activity history */
  getActivityHistory(userId?: string, options?: {
    page?: number;
    limit?: number;
    filters?: Record<string, unknown>;
  }): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

// ============================================================================
// DASHBOARD SERVICE INTERFACES
// ============================================================================

export interface DashboardData {
  profile: UserProfile;
  recent_activity: UserEngagementHistory[];
  saved_bills: SavedBill[];
  trending_bills: SavedBill[];
  recommendations: Recommendation[];
  notifications: Notification[];
  civic_score_trend: Array<{ date: string; score: number }>;
}

export interface Recommendation {
  billId: number;
  title: string;
  relevanceScore: number;
  reason: string;
}

export interface Notification {
  id: string;
  type: 'bill_update' | 'comment' | 'recommendation' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardService extends BaseService {
  /** Get comprehensive dashboard data */
  getDashboardData(): Promise<DashboardData>;
  /** Get dashboard widgets configuration */
  getDashboardWidgets(): Promise<DashboardWidget[]>;
  /** Update dashboard layout */
  updateDashboardLayout(layout: DashboardLayout): Promise<void>;
  /** Get user metrics */
  getUserMetrics(timeRange?: 'day' | 'week' | 'month' | 'year'): Promise<UserMetrics>;
  /** Get bill recommendations */
  getBillRecommendations(limit?: number): Promise<Recommendation[]>;
  /** Get unread notifications count */
  getUnreadNotificationsCount(): Promise<number>;
  /** Mark notification as read */
  markNotificationAsRead(notificationId: string): Promise<void>;
  /** Get notifications */
  getNotifications(page?: number, limit?: number): Promise<Notification[]>;
  /** Clear all notifications */
  clearNotifications(): Promise<void>;
}

export interface DashboardWidget {
  id: string;
  type: 'activity' | 'recommendations' | 'notifications' | 'metrics' | 'saved_bills';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  columns: number;
  rows: number;
  gap: number;
}

export interface UserMetrics {
  total_bills_tracked: number;
  total_comments: number;
  total_votes: number;
  average_engagement_time: number;
  civic_score: number;
  community_rank: number;
  activity_trend: Array<{ date: string; value: number }>;
}

// ============================================================================
// ENGAGEMENT SERVICE INTERFACES
// ============================================================================

export interface UserEngagementHistory {
  id: string;
  user_id: string;
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface EngagementFilters {
  action_types?: string[];
  entity_types?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface EngagementAnalytics {
  total_actions: number;
  action_breakdown: Record<string, number>;
  most_active_day: string;
  most_active_hour: number;
  engagement_trend: Array<{ date: string; count: number }>;
  top_entities: Array<{ id: string; type: string; count: number }>;
  average_session_duration: number;
}

export interface EngagementService extends BaseService {
  /** Track user engagement */
  trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /** Get engagement history */
  getEngagementHistory(options?: {
    page?: number;
    limit?: number;
    filters?: EngagementFilters;
  }): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
    analytics: EngagementAnalytics;
  }>;

  /** Get engagement statistics */
  getEngagementStats(userId?: string): Promise<EngagementAnalytics>;
  /** Get user session data */
  getSessionData(): Promise<{
    sessionId: string;
    startTime: string;
    lastActivity: string;
    pageViews: number;
    actions: number;
  }>;
  /** End current session */
  endSession(): Promise<void>;
  /** Get user streak information */
  getUserStreak(userId?: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_active: string;
    next_milestone: number;
  }>;
}

// ============================================================================
// ACHIEVEMENTS SERVICE INTERFACES
// ============================================================================

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'engagement' | 'expertise' | 'community' | 'milestone';
  criteria: AchievementCriteria;
  reward_points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  hidden?: boolean;
}

export interface AchievementCriteria {
  type: 'count' | 'time' | 'milestone' | 'combination';
  target: number;
  reset_period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  conditions?: Record<string, unknown>;
}

export interface UserAchievementProgress {
  achievement_id: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  completed_at?: string;
  last_updated: string;
}

export interface AchievementService extends BaseService {
  /** Get all achievement definitions */
  getAchievementDefinitions(): Promise<AchievementDefinition[]>;
  /** Get user achievements */
  getUserAchievements(userId?: string): Promise<{
    earned: UserAchievement[];
    progress: UserAchievementProgress[];
    next_milestones: AchievementDefinition[];
  }>;
  /** Check achievement progress */
  checkAchievementProgress(achievementId: string, userId?: string): Promise<UserAchievementProgress>;
  /** Award achievement to user */
  awardAchievement(achievementId: string, userId?: string): Promise<UserAchievement>;
  /** Get achievement statistics */
  getAchievementStats(userId?: string): Promise<{
    total_earned: number;
    total_points: number;
    completion_rate: number;
    top_categories: Array<{ category: string; count: number }>;
  }>;
  /** Get leaderboard */
  getLeaderboard(category?: string, limit?: number): Promise<Array<{
    user_id: string;
    username: string;
    total_points: number;
    rank: number;
  }>>;
}

// ============================================================================
// SAVED BILLS SERVICE INTERFACES
// ============================================================================

export interface SavedBill {
  id: string;
  bill_id: string;
  user_id: string;
  saved_at: string;
  notes?: string;
  tags: string[];
  notification_enabled: boolean;
  bill: {
    id: string;
    title: string;
    bill_number: string;
    status: string;
    urgency_level: string;
    last_updated: string;
  };
}

export interface SavedBillFilters {
  status?: string[];
  urgency?: string[];
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SavedBillsService extends BaseService {
  /** Get saved bills */
  getSavedBills(options?: {
    page?: number;
    limit?: number;
    filters?: SavedBillFilters;
  }): Promise<{
    bills: SavedBill[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /** Save a bill */
  saveBill(billId: string, notes?: string, tags?: string[]): Promise<SavedBill>;
  /** Remove saved bill */
  unsaveBill(billId: string): Promise<void>;
  /** Update saved bill */
  updateSavedBill(billId: string, updates: {
    notes?: string;
    tags?: string[];
    notification_enabled?: boolean;
  }): Promise<SavedBill>;
  /** Get bill tags */
  getBillTags(billId: string): Promise<string[]>;
  /** Add tag to bill */
  addBillTag(billId: string, tag: string): Promise<void>;
  /** Remove tag from bill */
  removeBillTag(billId: string, tag: string): Promise<void>;
  /** Get saved bill count */
  getSavedBillCount(): Promise<number>;
  /** Bulk save bills */
  bulkSaveBills(billIds: string[]): Promise<SavedBill[]>;
  /** Bulk remove saved bills */
  bulkUnsaveBills(billIds: string[]): Promise<void>;
}

// ============================================================================
// NOTIFICATION SERVICE INTERFACES
// ============================================================================

export interface NotificationConfig {
  id: string;
  type: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: ('email' | 'push' | 'sms')[];
  frequency: 'immediate' | 'daily' | 'weekly';
  conditions: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: string;
  type: string;
  subject: string;
  body: string;
  html_body?: string;
  variables: string[];
}

export interface NotificationService extends BaseService {
  /** Send notification */
  sendNotification(notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    channels?: ('email' | 'push' | 'sms')[];
  }): Promise<string>;

  /** Get user notifications */
  getUserNotifications(userId?: string, options?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
    types?: string[];
  }): Promise<Notification[]>;

  /** Mark notification as read */
  markAsRead(notificationId: string, userId?: string): Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead(userId?: string): Promise<void>;
  /** Delete notification */
  deleteNotification(notificationId: string, userId?: string): Promise<void>;
  /** Get notification settings */
  getNotificationSettings(userId?: string): Promise<NotificationPreferences>;
  /** Update notification settings */
  updateNotificationSettings(settings: Partial<NotificationPreferences>, userId?: string): Promise<NotificationPreferences>;
  /** Get notification templates */
  getNotificationTemplates(): Promise<NotificationTemplate[]>;
  /** Create notification template */
  createNotificationTemplate(template: NotificationTemplate): Promise<NotificationTemplate>;
  /** Update notification template */
  updateNotificationTemplate(id: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  /** Delete notification template */
  deleteNotificationTemplate(id: string): Promise<void>;
}

// ============================================================================
// CACHE SERVICE INTERFACES
// ============================================================================

export interface CacheConfig {
  name: string;
  maxSize?: number;
  defaultTTL?: number;
  storageBackend?: 'memory' | 'indexeddb' | 'localstorage' | 'hybrid';
  compression?: boolean;
  warming?: boolean;
  metrics?: boolean;
  invalidationStrategy?: 'ttl' | 'lru' | 'lfu' | 'fifo';
  persistent?: boolean;
}

export interface CacheMetrics {
  totalOperations: number;
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
  avgAccessTime: number;
  efficiency: number;
}

export interface CacheServiceInterface extends BaseService {
  /** Get item from cache */
  get<T>(key: string): Promise<T | null>;
  /** Set item in cache */
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  /** Delete item from cache */
  delete(key: string): Promise<void>;
  /** Clear all cache entries */
  clear(): Promise<void>;
  /** Get cache metrics */
  getMetrics(): CacheMetrics;
  /** Warm cache with predefined data */
  warmCache(): Promise<void>;
  /** Register cache warming task */
  registerWarmingTask(key: string, task: () => Promise<unknown>): void;
  /** Get cache statistics */
  getStatistics(): Promise<{
    metrics: CacheMetrics;
    storageInfo: {
      backend: string;
      available: boolean;
      size: number;
      keys: number;
    };
    warmingTasks: number;
  }>;
}

// ============================================================================
// SERVICE FACTORY INTERFACES
// ============================================================================

export interface ServiceRegistration {
  id: string;
  factory: (container: ServiceContainer) => unknown;
  lifecycle: 'singleton' | 'transient' | 'scoped';
  dependencies: string[];
  config?: Record<string, unknown>;
  metadata?: {
    version?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ServiceContainer {
  register(registration: ServiceRegistration): this;
  registerMany(registrations: ServiceRegistration[]): this;
  resolve<T>(id: string): T;
  isRegistered(id: string): boolean;
  getRegistration(id: string): ServiceRegistration | undefined;
  getRegisteredServices(): string[];
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  getHealthStatus(id: string): Promise<'healthy' | 'unhealthy' | 'unknown'>;
  getStatistics(): {
    totalServices: number;
    singletonServices: number;
    scopedServices: number;
    transientServices: number;
    initialized: boolean;
  };
}

// ============================================================================
// SERVICE HEALTH AND MONITORING INTERFACES
// ============================================================================

export interface ServiceHealth {
  id: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
  dependencies: ServiceDependency[];
  metrics: Record<string, unknown>;
}

export interface ServiceDependency {
  id: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  type: 'required' | 'optional';
  lastCheck: string;
}

export interface HealthCheckService extends BaseService {
  /** Perform health check on all services */
  checkAllServices(): Promise<ServiceHealth[]>;
  /** Perform health check on specific service */
  checkService(serviceId: string): Promise<ServiceHealth>;
  /** Get service dependencies */
  getServiceDependencies(serviceId: string): Promise<ServiceDependency[]>;
  /** Get health check configuration */
  getHealthCheckConfig(serviceId: string): Promise<{
    interval: number;
    timeout: number;
    retries: number;
    endpoints: string[];
  }>;
  /** Update health check configuration */
  updateHealthCheckConfig(serviceId: string, config: Partial<{
    interval: number;
    timeout: number;
    retries: number;
    endpoints: string[];
  }>): Promise<void>;
  /** Get health check history */
  getHealthCheckHistory(serviceId: string, limit?: number): Promise<Array<{
    timestamp: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    error: string | null;
  }>>;
}

// ============================================================================
// SERVICE CONFIGURATION INTERFACES
// ============================================================================

export interface ServiceConfiguration {
  id: string;
  version: string;
  description?: string;
  dependencies: string[];
  options: Record<string, unknown>;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  limits: {
    rateLimit?: number;
    timeout?: number;
    maxRetries?: number;
    maxSize?: number;
  };
  security: {
    encryption?: boolean;
    authentication?: boolean;
    authorization?: boolean;
    auditLogging?: boolean;
  };
}

export interface ConfigurationService extends BaseService {
  /** Get service configuration */
  getConfiguration(serviceId: string): Promise<ServiceConfiguration>;
  /** Update service configuration */
  updateConfiguration(serviceId: string, config: Partial<ServiceConfiguration>): Promise<ServiceConfiguration>;
  /** Get configuration schema */
  getConfigurationSchema(serviceId: string): Promise<Record<string, unknown>>;
  /** Validate configuration */
  validateConfiguration(serviceId: string, config: Partial<ServiceConfiguration>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  /** Get configuration history */
  getConfigurationHistory(serviceId: string, limit?: number): Promise<Array<{
    timestamp: string;
    config: ServiceConfiguration;
    changedBy: string;
    reason: string;
  }>>;
  /** Rollback configuration */
  rollbackConfiguration(serviceId: string, version: string): Promise<ServiceConfiguration>;
}

// Interfaces are exported inline above; no bulk re-export needed here.
