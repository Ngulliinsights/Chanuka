/**
 * ============================================================================
 * BILLS API SERVICE
 * ============================================================================
 * Handles all bills-related API operations with consistent error handling,
 * caching strategies, and comprehensive logging.
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';
import { globalErrorHandler } from './errors';

// Type imports for internal use
import type {
  BillsSearchParams,
  PaginatedBillsResponse,
  BillEngagementData,
  BillComment
} from '../../services/billsApiService';

// Type re-exports for convenience
export type {
  BillsSearchParams,
  PaginatedBillsResponse,
  BillEngagementData,
  BillComment
};

import type { Bill, Sponsor } from './types';

// Additional response interfaces
interface BillAnalysis {
  billId: number;
  summary: string;
  impactAssessment: string;
  controversyAnalysis: string;
  plainLanguageSummary: string;
  keyPoints: string[];
}

interface BillCommentsResponse {
  comments: BillComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

interface BillsQueryParams {
  query?: string;
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  sponsors?: string[];
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class BillsApiService {
  private readonly defaultTimeout = 10000;
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  /**
   * Retrieves paginated bills with comprehensive filtering capabilities.
   * Supports full-text search, status filtering, policy area categorization,
   * and multiple sorting options to help users find relevant legislation.
   */
  async getBills(params: BillsQueryParams = {}): Promise<PaginatedBillsResponse> {
    const {
      query,
      status,
      urgency,
      policyAreas,
      sponsors,
      constitutionalFlags,
      controversyLevels,
      dateRange,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = params;

    const queryParams = new URLSearchParams();

    // Build query parameters only for defined values
    if (query) queryParams.append('q', query);
    if (status?.length) queryParams.append('status', status.join(','));
    if (urgency?.length) queryParams.append('urgency', urgency.join(','));
    if (policyAreas?.length) queryParams.append('policy_areas', policyAreas.join(','));
    if (sponsors?.length) queryParams.append('sponsors', sponsors.join(','));
    if (constitutionalFlags) queryParams.append('constitutional_flags', 'true');
    if (controversyLevels?.length) queryParams.append('controversy', controversyLevels.join(','));
    if (dateRange?.start) queryParams.append('date_start', dateRange.start);
    if (dateRange?.end) queryParams.append('date_end', dateRange.end);

    queryParams.append('sort_by', sortBy);
    queryParams.append('sort_order', sortOrder);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    try {
      const response = await globalApiClient.get<PaginatedBillsResponse>(
        `/api/bills?${queryParams.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.defaultCacheTTL
        }
      );

      logger.info('Bills loaded successfully', {
        component: 'BillsApiService',
        page,
        count: response.data.bills.length,
        total: response.data.pagination.total
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bills', { component: 'BillsApiService', error, params });
      throw await this.handleError(error, 'getBills');
    }
  }

  /**
   * Fetches complete details for a specific bill including full text,
   * sponsor information, timeline, and current status.
   */
  async getBillById(id: number): Promise<Bill> {
    try {
      const response = await globalApiClient.get<Bill>(`/api/bills/${id}`, {
        timeout: this.defaultTimeout,
        cacheTTL: 15 * 60 * 1000 // Cache bill details longer as they change less frequently
      });

      logger.info('Bill details loaded', {
        component: 'BillsApiService',
        billId: id,
        title: response.data.title
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bill details', { component: 'BillsApiService', billId: id, error });
      throw await this.handleError(error, 'getBillById', { billId: id });
    }
  }

  /**
   * Retrieves paginated comments for a bill, enabling community discussion
   * and expert analysis around proposed legislation.
   */
  async getBillComments(billId: number, page = 1, limit = 20): Promise<BillCommentsResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    try {
      const response = await globalApiClient.get<BillCommentsResponse>(
        `/api/bills/${billId}/comments?${queryParams.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.defaultCacheTTL
        }
      );

      logger.info('Bill comments loaded', {
        component: 'BillsApiService',
        billId,
        page,
        count: response.data.comments.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bill comments', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillComments', { billId });
    }
  }

  /**
   * Submits a new comment on a bill, contributing to civic discourse.
   * Comments are immediately visible and skip caching to ensure real-time updates.
   */
  async addBillComment(billId: number, content: string): Promise<BillComment> {
    try {
      const response = await globalApiClient.post<BillComment>(
        `/api/bills/${billId}/comments`,
        { content },
        { timeout: this.defaultTimeout, skipCache: true }
      );

      logger.info('Comment added successfully', {
        component: 'BillsApiService',
        billId,
        commentId: response.data.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to add comment', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'addBillComment', { billId });
    }
  }

  /**
   * Records user engagement metrics (views, saves, shares) to track
   * bill popularity and help surface relevant content to other users.
   */
  async recordEngagement(billId: number, type: 'view' | 'save' | 'share'): Promise<BillEngagementData> {
    try {
      const response = await globalApiClient.post<BillEngagementData>(
        `/api/bills/${billId}/engagement`,
        { type },
        { timeout: 5000, skipCache: true } // Faster timeout for real-time tracking
      );

      logger.debug('Engagement recorded', {
        component: 'BillsApiService',
        billId,
        type,
        newCount: response.data[`${type}Count` as keyof BillEngagementData]
      });

      return response.data;
    } catch (error) {
      // Log but don't throw - engagement tracking shouldn't break user experience
      logger.warn('Failed to record engagement', { component: 'BillsApiService', billId, type, error });
      return null as any;
    }
  }

  /**
   * Fetches available bill categories for filtering, with extended caching
   * since categories rarely change.
   */
  async getBillCategories(): Promise<string[]> {
    try {
      const response = await globalApiClient.get<string[]>(`/api/bills/categories`, {
        timeout: this.defaultTimeout,
        cacheTTL: 60 * 60 * 1000 // 1 hour cache
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill categories', { component: 'BillsApiService', error });
      throw await this.handleError(error, 'getBillCategories');
    }
  }

  /**
   * Fetches available bill statuses for filtering.
   */
  async getBillStatuses(): Promise<string[]> {
    try {
      const response = await globalApiClient.get<string[]>(`/api/bills/statuses`, {
        timeout: this.defaultTimeout,
        cacheTTL: 60 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill statuses', { component: 'BillsApiService', error });
      throw await this.handleError(error, 'getBillStatuses');
    }
  }

  /**
   * Retrieves sponsor information for a bill.
   */
  async getBillSponsors(billId: number): Promise<Sponsor[]> {
    try {
      const response = await globalApiClient.get<Sponsor[]>(`/api/bills/${billId}/sponsors`, {
        timeout: this.defaultTimeout,
        cacheTTL: 30 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill sponsors', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillSponsors', { billId });
    }
  }

  /**
   * Fetches AI-powered analysis of a bill including impact assessment,
   * controversy analysis, and plain-language summaries.
   */
  async getBillAnalysis(billId: number): Promise<BillAnalysis> {
    try {
      const response = await globalApiClient.get<BillAnalysis>(`/api/bills/${billId}/analysis`, {
        timeout: this.defaultTimeout,
        cacheTTL: 10 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill analysis', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillAnalysis', { billId });
    }
  }

  /**
   * Centralized error handling that uses the global error handler
   * and enriches errors with context information.
   */
  private async handleError(error: any, operation: string, context?: Record<string, any>): Promise<Error> {
    await globalErrorHandler.handleError(error as Error, {
      component: 'BillsApiService',
      operation,
      ...context
    });
    return error as Error;
  }
}

export const billsApiService = new BillsApiService();

/**
 * ============================================================================
 * SYSTEM API SERVICE
 * ============================================================================
 * Provides system monitoring, health checks, and administrative functionality.
 */

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'up' | 'down' | 'degraded';
    cache: 'up' | 'down' | 'degraded';
    websocket: 'up' | 'down' | 'degraded';
    external_apis: 'up' | 'down' | 'degraded';
  };
}

export interface SystemStats {
  users: {
    total: number;
    active_today: number;
    active_this_week: number;
    new_this_month: number;
  };
  bills: {
    total: number;
    active: number;
    passed: number;
    failed: number;
  };
  discussions: {
    total: number;
    active: number;
    comments_today: number;
  };
  performance: {
    avg_response_time: number;
    requests_per_minute: number;
    error_rate: number;
  };
  storage: {
    used_gb: number;
    total_gb: number;
    utilization_percent: number;
  };
}

export interface SystemActivity {
  recent_events: Array<{
    id: string;
    type: 'user_login' | 'bill_created' | 'comment_added' | 'vote_cast' | 'system_alert';
    description: string;
    timestamp: string;
    user_id?: string;
    metadata?: Record<string, any>;
  }>;
  active_users: Array<{
    user_id: string;
    last_activity: string;
    current_page?: string;
  }>;
  system_load: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
}

export interface SystemSchema {
  version: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primary_key: boolean;
    }>;
    row_count: number;
  }>;
  migrations: Array<{
    id: string;
    name: string;
    applied_at: string;
  }>;
}

export interface SystemEnvironment {
  node_version: string;
  environment: 'development' | 'staging' | 'production';
  database_url: string;
  redis_url?: string;
  websocket_url: string;
  api_base_url: string;
  features: Record<string, boolean>;
  config: Record<string, any>;
}

export class SystemApiService {
  private readonly baseUrl: string;
  private readonly systemEndpoint: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.systemEndpoint = `${baseUrl}/system`;
  }

  /**
   * Retrieves current system health across all service components.
   * This provides a quick overview of system status for monitoring dashboards.
   */
  async getHealth(): Promise<SystemHealth> {
    try {
      const response = await globalApiClient.get<SystemHealth>(`${this.systemEndpoint}/health`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system health', { component: 'SystemApiService', error });
      throw await this.handleError(error, 'Failed to retrieve system health');
    }
  }

  /**
   * Fetches comprehensive system statistics including user metrics,
   * bill counts, performance data, and resource utilization.
   */
  async getStats(): Promise<SystemStats> {
    try {
      const response = await globalApiClient.get<SystemStats>(`${this.systemEndpoint}/stats`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system stats', { component: 'SystemApiService', error });
      throw await this.handleError(error, 'Failed to retrieve system statistics');
    }
  }

  /**
   * Gets real-time activity data including recent events, active users,
   * and current system load metrics.
   */
  async getActivity(): Promise<SystemActivity> {
    try {
      const response = await globalApiClient.get<SystemActivity>(`${this.systemEndpoint}/activity`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system activity', { component: 'SystemApiService', error });
      throw await this.handleError(error, 'Failed to retrieve system activity');
    }
  }

  /**
   * Retrieves database schema information including table structures
   * and migration history for administrative purposes.
   */
  async getSchema(): Promise<SystemSchema> {
    try {
      const response = await globalApiClient.get<SystemSchema>(`${this.systemEndpoint}/schema`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system schema', { component: 'SystemApiService', error });
      throw await this.handleError(error, 'Failed to retrieve database schema');
    }
  }

  /**
   * Gets environment configuration including runtime settings,
   * feature flags, and deployment information.
   */
  async getEnvironment(): Promise<SystemEnvironment> {
    try {
      const response = await globalApiClient.get<SystemEnvironment>(`${this.systemEndpoint}/environment`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system environment', { component: 'SystemApiService', error });
      throw await this.handleError(error, 'Failed to retrieve environment information');
    }
  }

  private async handleError(error: any, defaultMessage: string): Promise<Error> {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      defaultMessage;

    const systemError = new Error(errorMessage);
    await globalErrorHandler.handleError(systemError, {
      component: 'SystemApiService',
      operation: 'system_operation',
      status: error?.response?.status
    });

    return systemError;
  }
}

export const systemApiService = new SystemApiService();