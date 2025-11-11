/**
 * Bills Repository
 *
 * Domain-specific repository for bills data that extends the unified API client.
 * Provides clean interfaces for bill operations including CRUD, search, engagement tracking,
 * and real-time updates through WebSocket integration.
 */

import { UnifiedApiClientImpl, globalApiClient } from '../core/api/client';
import {
  Bill,
  BillsSearchParams,
  PaginatedResponse,
  BillsQueryParams,
  BillsSearchParams as CoreBillsSearchParams,
  Comment,
  CommentFormData,
  EngagementType
} from '../core/api/types';
import { UnifiedWebSocketManager } from '../core/api/websocket';
import { logger } from '../utils/logger';

export interface BillsRepositoryConfig {
  baseEndpoint: string;
  cacheTTL: {
    bills: number;
    search: number;
    engagement: number;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
}

export class BillsRepository extends UnifiedApiClientImpl {
  private config: BillsRepositoryConfig;
  private webSocketService: UnifiedWebSocketManager;

  constructor(config: BillsRepositoryConfig) {
    super({
      baseUrl: globalApiClient.getConfig().baseUrl,
      timeout: globalApiClient.getConfig().timeout,
      retry: globalApiClient.getConfig().retry,
      cache: globalApiClient.getConfig().cache,
      websocket: globalApiClient.getConfig().websocket,
      headers: globalApiClient.getConfig().headers
    });

    this.config = config;
    this.webSocketService = new UnifiedWebSocketManager({
      url: 'ws://localhost:8080',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 45000
      },
      message: {
        compression: false,
        batching: true,
        batchSize: 10,
        batchInterval: 1000
      }
    });
    this.initializeWebSocketIntegration();
  }

  /**
   * Initialize WebSocket integration for real-time bill updates
   */
  private initializeWebSocketIntegration(): void {
    this.webSocketService.on('billUpdate', this.handleRealTimeBillUpdate.bind(this));
    this.webSocketService.on('billEngagement', this.handleRealTimeEngagementUpdate.bind(this));
  }

  /**
   * Get paginated bills with advanced filtering
   */
  async getBills(params: BillsQueryParams = {}): Promise<PaginatedResponse<Bill>> {
    const endpoint = `${this.config.baseEndpoint}/bills`;
    const queryParams = this.buildQueryParams(params);

    const response = await this.get<PaginatedResponse<Bill>>(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.bills }
    });

    return response.data;
  }

  /**
   * Search bills with intelligent caching
   */
  async searchBills(searchParams: BillsSearchParams): Promise<PaginatedResponse<Bill>> {
    const endpoint = `${this.config.baseEndpoint}/bills/search`;
    const queryParams = this.buildQueryParams(searchParams);

    const response = await this.get<PaginatedResponse<Bill>>(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.search }
    });

    return response.data;
  }

  /**
   * Get a single bill by ID with full details
   */
  async getBillById(id: number): Promise<Bill> {
    const endpoint = `${this.config.baseEndpoint}/bills/${id}`;

    const response = await this.get<Bill>(endpoint, {
      cache: { ttl: this.config.cacheTTL.bills }
    });

    // Subscribe to real-time updates for this bill
    this.subscribeToBillUpdates(id);

    return response.data;
  }

  /**
   * Record bill engagement (view, save, share, comment)
   */
  async recordEngagement(billId: number, type: EngagementType): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/engagement`;

    await this.post(endpoint, { type }, {
      cache: { ttl: this.config.cacheTTL.engagement }
    });

    logger.debug('Engagement recorded', { billId, type });
  }

  /**
   * Get bill comments with pagination
   */
  async getBillComments(
    billId: number,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Comment>> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/comments`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.min(limit, this.config.pagination.maxLimit).toString()
    });

    const response = await this.get<PaginatedResponse<Comment>>(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.bills }
    });

    return response.data;
  }

  /**
   * Add a comment to a bill
   */
  async addComment(commentData: CommentFormData): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/bills/${commentData.billId}/comments`;

    const response = await this.post<Comment>(endpoint, {
      content: commentData.content,
      parentId: commentData.parentId
    });

    return response.data;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: number, content: string): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}`;

    const response = await this.patch<Comment>(endpoint, { content });

    return response.data;
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: number, vote: 'up' | 'down'): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}/vote`;

    const response = await this.post<Comment>(endpoint, { vote });

    return response.data;
  }

  /**
   * Report a comment
   */
  async reportComment(commentId: number, reason: string): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}/report`;

    await this.post(endpoint, { reason });
  }

  /**
   * Get bill categories for filtering
   */
  async getCategories(): Promise<string[]> {
    const endpoint = `${this.config.baseEndpoint}/bills/categories`;

    const response = await this.get<string[]>(endpoint, {
      cache: { ttl: this.config.cacheTTL.bills }
    });

    return response.data;
  }

  /**
   * Get bill statuses for filtering
   */
  async getStatuses(): Promise<string[]> {
    const endpoint = `${this.config.baseEndpoint}/bills/statuses`;

    const response = await this.get<string[]>(endpoint, {
      cache: { ttl: this.config.cacheTTL.bills }
    });

    return response.data;
  }

  /**
   * Subscribe to real-time updates for a specific bill
   */
  private subscribeToBillUpdates(billId: number): void {
    this.webSocketService.subscribe(`bill:${billId}`, ['status_change', 'new_comment', 'engagement_update']);
    logger.debug('Subscribed to bill updates', { billId });
  }

  /**
   * Handle real-time bill updates from WebSocket
   */
  private handleRealTimeBillUpdate(data: any): void {
    try {
      const { billId, update } = data;
      logger.info('Real-time bill update received', { billId, updateType: update.type });

      // Invalidate cache for the updated bill
      this.invalidateBillCache(billId);

      // Emit event for store to handle
      this.emit('billUpdate', { billId, update });
    } catch (error) {
      logger.error('Failed to handle real-time bill update', { error });
    }
  }

  /**
   * Handle real-time engagement updates
   */
  private handleRealTimeEngagementUpdate(data: any): void {
    try {
      const { billId, engagement } = data;
      logger.debug('Real-time engagement update received', { billId, type: engagement.type });

      // Emit event for store to handle
      this.emit('engagementUpdate', { billId, engagement });
    } catch (error) {
      logger.error('Failed to handle real-time engagement update', { error });
    }
  }

  /**
   * Invalidate cache for a specific bill
   */
  private invalidateBillCache(billId: number): void {
    // Implementation would clear specific cache entries
    logger.debug('Bill cache invalidated', { billId });
  }

  /**
   * Build query parameters from search/filter options
   */
  private buildQueryParams(params: any): URLSearchParams {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    return queryParams;
  }

  /**
   * Event emitter for real-time updates
   */
  private eventListeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners[event];
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}

// Default configuration
const defaultConfig: BillsRepositoryConfig = {
  baseEndpoint: '/api',
  cacheTTL: {
    bills: 5 * 60 * 1000, // 5 minutes
    search: 2 * 60 * 1000, // 2 minutes
    engagement: 30 * 1000 // 30 seconds
  },
  pagination: {
    defaultLimit: 12,
    maxLimit: 100
  }
};

// Export singleton instance
export const billsRepository = new BillsRepository(defaultConfig);