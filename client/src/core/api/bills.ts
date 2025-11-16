/**
 * Bills API Service
 * Core API communication layer for bills functionality
 * Extracted from services/billsApiService.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { ApiResponse } from './types';
import { logger } from '../../utils/logger';

// Re-export types from the main bills service for convenience
export type {
  BillsSearchParams,
  PaginatedBillsResponse,
  BillEngagementData,
  BillComment
} from '../../services/billsApiService';

// Bill type will be imported from services/billsApiService

/**
 * Bills API Service Class
 * Handles all bills-related API communication
 */
export class BillsApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Get paginated bills with advanced filtering and search
   */
  async getBills(params: any = {}): Promise<any> {
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

    // Build query parameters
    const queryParams = new URLSearchParams();

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

    const endpoint = `${this.baseUrl}/bills?${queryParams.toString()}`;

    try {
      const response = await globalApiClient.get(endpoint, {
        timeout: 10000, // Default timeout
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });

      logger.info('Bills data loaded successfully', {
        component: 'BillsApi',
        page,
        count: (response.data as any)?.bills?.length || 0,
        total: (response.data as any)?.pagination?.total || 0
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bills', {
        component: 'BillsApi',
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Get a single bill by ID with full details
   */
  async getBillById(id: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/${id}`, {
        timeout: 10000,
        cacheTTL: 15 * 60 * 1000 // 15 minutes
      });

      logger.info('Bill details loaded', {
        component: 'BillsApi',
        billId: id,
        title: (response.data as any)?.title
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bill details', {
        component: 'BillsApi',
        billId: id,
        error
      });
      throw error;
    }
  }

  /**
   * Get bill comments with pagination
   */
  async getBillComments(billId: number, page = 1, limit = 20): Promise<any> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    try {
      const response = await globalApiClient.get(
        `${this.baseUrl}/bills/${billId}/comments?${queryParams.toString()}`,
        {
          timeout: 10000,
          cacheTTL: 5 * 60 * 1000 // 5 minutes
        }
      );

      logger.info('Bill comments loaded', {
        component: 'BillsApi',
        billId,
        page,
        count: (response.data as any)?.comments?.length || 0
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bill comments', {
        component: 'BillsApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Add a comment to a bill
   */
  async addBillComment(billId: number, content: string): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/bills/${billId}/comments`,
        { content },
        { timeout: 10000, skipCache: true }
      );

      logger.info('Comment added successfully', {
        component: 'BillsApi',
        billId,
        commentId: (response.data as any)?.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to add comment', {
        component: 'BillsApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Record bill engagement (view, save, share)
   */
  async recordEngagement(billId: number, type: 'view' | 'save' | 'share'): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/bills/${billId}/engagement`,
        { type },
        { timeout: 5000, skipCache: true } // Shorter timeout for real-time actions
      );

      logger.debug('Engagement recorded', {
        component: 'BillsApi',
        billId,
        type,
        newCount: (response.data as any)?.[`${type}Count`]
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to record engagement', {
        component: 'BillsApi',
        billId,
        type,
        error
      });
      throw error;
    }
  }

  /**
   * Get bill categories for filtering
   */
  async getBillCategories(): Promise<string[]> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/categories`, {
        timeout: 10000,
        cacheTTL: 60 * 60 * 1000 // 1 hour - categories don't change often
      });

      return response.data as string[];
    } catch (error) {
      logger.error('Failed to load bill categories', {
        component: 'BillsApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get bill statuses for filtering
   */
  async getBillStatuses(): Promise<string[]> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/statuses`, {
        timeout: 10000,
        cacheTTL: 60 * 60 * 1000 // 1 hour - statuses don't change often
      });

      return response.data as string[];
    } catch (error) {
      logger.error('Failed to load bill statuses', {
        component: 'BillsApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get bill sponsors
   */
  async getBillSponsors(billId: number): Promise<any[]> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/${billId}/sponsors`, {
        timeout: 10000,
        cacheTTL: 30 * 60 * 1000 // 30 minutes
      });

      return response.data as any[];
    } catch (error) {
      logger.error('Failed to load bill sponsors', {
        component: 'BillsApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Get bill analysis
   */
  async getBillAnalysis(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/${billId}/analysis`, {
        timeout: 10000,
        cacheTTL: 10 * 60 * 1000 // 10 minutes
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to load bill analysis', {
        component: 'BillsApi',
        billId,
        error
      });
      throw error;
    }
  }
}

// Global bills API service instance
export const billsApiService = new BillsApiService();