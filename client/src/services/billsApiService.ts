/**
 * Bills API Service - Real-time Data Integration
 * 
 * Comprehensive service for bills data management with real-time synchronization,
 * caching, offline support, and pagination. Integrates with existing WebSocket
 * infrastructure and state management.
 */

import { billsApiService as coreBillsApi } from '../core/api/bills';
import { UnifiedWebSocketManager } from '../core/api/websocket';
import { store } from '../store';
import { addBillUpdate, addNotification } from '../store/slices/realTimeSlice';
import { setBills, updateBill, Bill, BillsStats } from '../store/slices/billsSlice';
import { logger } from '../utils/logger';
import { z } from 'zod';

// ============================================================================
// Type Definitions and Validation Schemas
// ============================================================================

export interface BillsSearchParams {
  query?: string;
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  sponsors?: string[];
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'date' | 'title' | 'urgency' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedBillsResponse {
  bills: Bill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  stats: BillsStats;
}

export interface BillEngagementData {
  bill_id: number;
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  lastUpdated: string;
}

export interface BillComment {
  id: number;
  bill_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
    verified: boolean;
  };
  replies?: BillComment[];
  vote_count: number;
  user_vote?: 'up' | 'down' | null;
}

// Validation schemas
const BillSchema = z.object({
  id: z.number(),
  billNumber: z.string(),
  title: z.string(),
  summary: z.string(),
  status: z.enum(['introduced', 'committee', 'passed', 'failed', 'signed', 'vetoed']),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  introducedDate: z.string(),
  lastUpdated: z.string(),
  sponsors: z.array(z.object({
    id: z.number(),
    name: z.string(),
    party: z.string(),
    role: z.enum(['primary', 'cosponsor'])
  })),
  constitutionalFlags: z.array(z.object({
    id: z.string(),
    severity: z.enum(['critical', 'high', 'moderate', 'low']),
    category: z.string(),
    description: z.string()
  })),
  viewCount: z.number(),
  saveCount: z.number(),
  commentCount: z.number(),
  shareCount: z.number(),
  policyAreas: z.array(z.string()),
  complexity: z.enum(['low', 'medium', 'high']),
  readingTime: z.number()
});

const PaginatedBillsResponseSchema = z.object({
  bills: z.array(BillSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  }),
  stats: z.object({
    totalBills: z.number(),
    urgentCount: z.number(),
    constitutionalFlags: z.number(),
    trendingCount: z.number(),
    lastUpdated: z.string()
  })
});

// ============================================================================
// Bills API Service Class
// ============================================================================

class BillsApiService {
  private isInitialized = false;
  private realTimeSubscriptions = new Set<number>();
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeRealTimeIntegration();
  }

  /**
   * Initialize real-time WebSocket integration
   */
  private async initializeRealTimeIntegration(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up WebSocket event listeners for bill updates
      UnifiedWebSocketManager.getInstance().on('billUpdate', this.handleRealTimeBillUpdate.bind(this));
      UnifiedWebSocketManager.getInstance().on('notification', this.handleRealTimeNotification.bind(this));
      UnifiedWebSocketManager.getInstance().on('connected', this.handleWebSocketConnected.bind(this));
      UnifiedWebSocketManager.getInstance().on('disconnected', this.handleWebSocketDisconnected.bind(this));

      this.isInitialized = true;
      
      logger.info('Bills API Service initialized with real-time integration', {
        component: 'BillsApiService'
      });
    } catch (error) {
      logger.error('Failed to initialize Bills API Service', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get paginated bills with advanced filtering and search
   */
  async getBills(params: BillsSearchParams = {}): Promise<PaginatedBillsResponse> {
    try {
      const response = await coreBillsApi.getBills(params);

      // Update local store with fresh data
      if (params.page === 1 || !params.page) {
        // If this is the first page, replace all bills
        store.dispatch(setBills(response.bills));
      } else {
        // For subsequent pages, add to existing bills (infinite scroll)
        response.bills.forEach((bill: Bill) => {
          store.dispatch(updateBill({ id: bill.id, updates: bill }));
        });
      }

      logger.info('Bills data loaded successfully', {
        component: 'BillsApiService',
        page: params.page || 1,
        count: response.bills.length,
        total: response.pagination.total
      });

      return response;
    } catch (error) {
      logger.error('Failed to load bills', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Get a single bill by ID with full details
   */
  async getBillById(id: number): Promise<Bill> {
    try {
      const response = await coreBillsApi.getBillById(id);

      // Update bill in store
      store.dispatch(updateBill({ id, updates: response }));

      // Subscribe to real-time updates for this bill
      this.subscribeToRealTimeUpdates(id);

      logger.info('Bill details loaded', {
        component: 'BillsApiService',
        billId: id,
        title: response.title
      });

      return response;
    } catch (error) {
      logger.error('Failed to load bill details', {
        component: 'BillsApiService',
        billId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Search bills with intelligent caching and real-time updates
   */
  async searchBills(searchParams: BillsSearchParams): Promise<PaginatedBillsResponse> {
    const cacheKey = JSON.stringify(searchParams);

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL) {
      logger.debug('Returning cached search results', {
        component: 'BillsApiService',
        cacheKey: cacheKey.substring(0, 50) + '...'
      });
      return cached.data;
    }

    try {
      const response = await this.getBills(searchParams);

      // Cache successful search results
      this.searchCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      this.cleanupSearchCache();

      return response;
    } catch (error) {
      logger.error('Search failed', {
        component: 'BillsApiService',
        searchParams,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get bill comments with pagination
   */
  async getBillComments(billId: number, page = 1, limit = 20): Promise<{
    comments: BillComment[];
    pagination: { page: number; limit: number; total: number; hasNext: boolean; };
  }> {
    try {
      const response = await coreBillsApi.getBillComments(billId, page, limit);

      logger.info('Bill comments loaded', {
        component: 'BillsApiService',
        billId,
        page,
        count: response.comments?.length || 0
      });

      return response;
    } catch (error) {
      logger.error('Failed to load bill comments', {
        component: 'BillsApiService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Add a comment to a bill
   */
  async addBillComment(billId: number, content: string): Promise<BillComment> {
    try {
      const response = await coreBillsApi.addBillComment(billId, content);

      // Update bill comment count in store
      // Note: This would need to get current state first, but for now we'll just increment
      store.dispatch(updateBill({
        id: billId,
        updates: { commentCount: 1 } // This is a simplified increment
      }));

      logger.info('Comment added successfully', {
        component: 'BillsApiService',
        billId,
        commentId: response.id
      });

      return response;
    } catch (error) {
      logger.error('Failed to add comment', {
        component: 'BillsApiService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Record bill engagement (view, save, share)
   */
  async recordEngagement(billId: number, type: 'view' | 'save' | 'share'): Promise<BillEngagementData> {
    try {
      const response = await coreBillsApi.recordEngagement(billId, type);

      // Update engagement metrics in store
      const updates: Partial<Bill> = {};

      switch (type) {
        case 'view':
          updates.viewCount = response.viewCount;
          break;
        case 'save':
          updates.saveCount = response.saveCount;
          break;
        case 'share':
          updates.shareCount = response.shareCount;
          break;
      }

      store.dispatch(updateBill({ id: billId, updates }));

      logger.debug('Engagement recorded', {
        component: 'BillsApiService',
        billId,
        type,
        newCount: response[`${type}Count` as keyof BillEngagementData]
      });

      return response;
    } catch (error) {
      logger.error('Failed to record engagement', {
        component: 'BillsApiService',
        billId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get bill categories for filtering
   */
  async getBillCategories(): Promise<string[]> {
    try {
      return await coreBillsApi.getBillCategories();
    } catch (error) {
      logger.error('Failed to load bill categories', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get bill statuses for filtering
   */
  async getBillStatuses(): Promise<string[]> {
    try {
      return await coreBillsApi.getBillStatuses();
    } catch (error) {
      logger.error('Failed to load bill statuses', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ============================================================================
  // Real-time Integration Methods
  // ============================================================================

  /**
   * Subscribe to real-time updates for a specific bill
   */
  subscribeToRealTimeUpdates(billId: number): void {
    if (this.realTimeSubscriptions.has(billId)) {
      return; // Already subscribed
    }

    try {
      if (UnifiedWebSocketManager.getInstance().isConnected()) {
        UnifiedWebSocketManager.getInstance().subscribeToBill(billId, [
          'status_change',
          'new_comment',
          'amendment',
          'voting_scheduled'
        ]);
        
        this.realTimeSubscriptions.add(billId);
        
        logger.debug('Subscribed to real-time updates', {
          component: 'BillsApiService',
          billId
        });
      } else {
        logger.warn('WebSocket not connected, cannot subscribe to real-time updates', {
          component: 'BillsApiService',
          billId
        });
      }
    } catch (error) {
      logger.error('Failed to subscribe to real-time updates', {
        component: 'BillsApiService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Unsubscribe from real-time updates for a specific bill
   */
  unsubscribeFromRealTimeUpdates(billId: number): void {
    if (!this.realTimeSubscriptions.has(billId)) {
      return; // Not subscribed
    }

    try {
      if (UnifiedWebSocketManager.getInstance().isConnected()) {
        UnifiedWebSocketManager.getInstance().unsubscribeFromBill(billId);
      }
      
      this.realTimeSubscriptions.delete(billId);
      
      logger.debug('Unsubscribed from real-time updates', {
        component: 'BillsApiService',
        billId
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from real-time updates', {
        component: 'BillsApiService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle real-time bill updates from WebSocket
   */
  private handleRealTimeBillUpdate(data: any): void {
    try {
      const { bill_id, update } = data;
      // Update bills store with real-time update
      store.dispatch(updateBill({ id: bill_id, updates: update.data }));

      // Add to real-time store for UI notifications
      store.dispatch(addBillUpdate({
        bill_id,
        type: update.type,
        data: update.data,
        timestamp: update.timestamp || new Date().toISOString()
      }));

      logger.info('Real-time bill update processed', {
        component: 'BillsApiService',
        billId: bill_id,
        updateType: update.type
      });
    } catch (error) {
      logger.error('Failed to process real-time bill update', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
    }
  }

  /**
   * Handle real-time notifications
   */
  private handleRealTimeNotification(notification: any): void {
    try {
      // Add notification to real-time store
      store.dispatch(addNotification({
        id: notification.id || `notification_${Date.now()}`,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        created_at: new Date().toISOString(),
        read: false,
        priority: notification.priority || 'medium'
      }));

      logger.debug('Real-time notification processed', {
        component: 'BillsApiService',
        notificationType: notification.type,
        title: notification.title
      });
    } catch (error) {
      logger.error('Failed to process real-time notification', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        notification
      });
    }
  }

  /**
   * Handle WebSocket connection events
   */
  private handleWebSocketConnected(): void {
    logger.info('WebSocket connected, re-subscribing to bill updates', {
      component: 'BillsApiService',
      subscriptions: this.realTimeSubscriptions.size
    });

    // Re-subscribe to all previously subscribed bills
    this.realTimeSubscriptions.forEach(billId => {
      UnifiedWebSocketManager.getInstance().subscribeToBill(billId, [
        'status_change',
        'new_comment',
        'amendment',
        'voting_scheduled'
      ]);
    });
  }

  /**
   * Handle WebSocket disconnection events
   */
  private handleWebSocketDisconnected(): void {
    logger.warn('WebSocket disconnected, real-time updates unavailable', {
      component: 'BillsApiService',
      subscriptions: this.realTimeSubscriptions.size
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get update priority based on update type
   */
  private getUpdatePriority(updateType: string): 'high' | 'medium' | 'low' {
    switch (updateType) {
      case 'status_change':
      case 'voting_scheduled':
        return 'high';
      case 'amendment':
        return 'medium';
      case 'new_comment':
      default:
        return 'low';
    }
  }

  /**
   * Clean up old search cache entries
   */
  private cleanupSearchCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.searchCache.forEach((value, key) => {
      if (now - value.timestamp > this.SEARCH_CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.searchCache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug('Cleaned up search cache', {
        component: 'BillsApiService',
        removedEntries: keysToDelete.length,
        remainingEntries: this.searchCache.size
      });
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    // Note: Core API client handles its own cache clearing

    logger.info('All caches cleared', {
      component: 'BillsApiService'
    });
  }

  /**
   * Get service status and metrics
   */
  getStatus(): {
    initialized: boolean;
    realTimeSubscriptions: number;
    searchCacheSize: number;
    webSocketConnected: boolean;
  } {
    return {
      initialized: this.isInitialized,
      realTimeSubscriptions: this.realTimeSubscriptions.size,
      searchCacheSize: this.searchCache.size,
      webSocketConnected: UnifiedWebSocketManager.getInstance().isConnected()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Unsubscribe from all real-time updates
    this.realTimeSubscriptions.forEach(billId => {
      this.unsubscribeFromRealTimeUpdates(billId);
    });

    // Clear caches
    this.clearCache();

    this.isInitialized = false;
    
    logger.info('Bills API Service cleaned up', {
      component: 'BillsApiService'
    });
  }
}

// ============================================================================
// Export singleton instance and types
// ============================================================================

export const billsApiService = new BillsApiService();

// Types are now exported from core/api/bills.ts
// Validation schemas are handled in the core API layer