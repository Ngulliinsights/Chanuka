/**
 * Bills API Service - Real-time Data Integration
 * 
 * Comprehensive service for bills data management with real-time synchronization,
 * caching, offline support, and pagination. Integrates with existing WebSocket
 * infrastructure and state management.
 */

import { billsApiService as coreBillsApi } from '../core/api/bills';
import { webSocketService } from './webSocketService';
import { stateManagementService } from './stateManagementService';
import { Bill, BillsStats } from '../store/slices/billsSlice';
import { logger } from '../utils/logger';
import { globalConfig } from '../core/api/config';

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



// ============================================================================
// Bills API Service Class
// ============================================================================

class BillsApiService {
  private isInitialized = false;
  private realTimeSubscriptions = new Set<number>();
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly SEARCH_CACHE_TTL = globalConfig.get('api').cache.defaultTTL;

  constructor() {
    this.initializeRealTimeIntegration();
  }

  /**
   * Initialize real-time WebSocket integration
   */
  private async initializeRealTimeIntegration(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // WebSocket integration is now handled by webSocketService
      // No direct WebSocket management needed here
      this.isInitialized = true;
      
      logger.info('Bills API Service initialized', {
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

      // Update local store with fresh data using state management service
      if (params.page === 1 || !params.page) {
        // If this is the first page, replace all bills
        stateManagementService.setBills(response.bills);
      } else {
        // For subsequent pages, add to existing bills (infinite scroll)
        response.bills.forEach((bill: Bill) => {
          stateManagementService.updateBill(bill.id, bill);
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

      // Update bill in store using state management service
      stateManagementService.updateBill(id, response);

      // Subscribe to real-time updates for this bill using WebSocket service
      webSocketService.subscribe({ type: 'bill', id });

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

      // Update bill comment count in store using state management service
      const currentBill = stateManagementService.getBill(billId);
      if (currentBill) {
        stateManagementService.updateBill(billId, {
          commentCount: (currentBill.commentCount || 0) + 1
        });
      }

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

      // Update engagement metrics in store using state management service
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

      stateManagementService.updateBill(billId, updates);

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
      webSocketService.subscribe({ type: 'bill', id: billId });
      this.realTimeSubscriptions.add(billId);
      
      logger.debug('Subscribed to real-time updates', {
        component: 'BillsApiService',
        billId
      });
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
      webSocketService.unsubscribe({ type: 'bill', id: billId });
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

  // ============================================================================
  // Utility Methods
  // ============================================================================


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
      webSocketConnected: webSocketService.isConnected()
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