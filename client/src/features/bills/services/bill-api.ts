import { api } from '../../../services/api';
import type {
  Bill,
  BillsQueryParams,
  BillsResponse,
  CommentPayload,
  EngagementPayload,
  BillCategoriesResponse,
  BillStatusesResponse,
  Comment
} from '../types';

/**
 * Bills API service - handles all bill-related API calls
 * Centralizes API endpoints and response handling for the bills feature
 */
export const billApi = {
  /**
   * Get all bills with optional filtering and pagination
   */
  async getAll(params: BillsQueryParams = {}): Promise<BillsResponse> {
    const url = new URL('/api/bills', api.getBaseUrl());

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    return api.get(url.pathname + url.search);
  },

  /**
   * Get a single bill by ID
   */
  async getById(id: string | number): Promise<Bill> {
    return api.get(`/api/bills/${id}`);
  },

  /**
   * Get comments for a specific bill
   */
  async getComments(bill_id: string | number): Promise<Comment[]> { return api.get(`/api/bills/${bill_id }/comments`);
  },

  /**
   * Add a comment to a bill
   */
  async addComment(bill_id: string | number, comment: CommentPayload): Promise<Comment> { return api.post(`/api/bills/${bill_id }/comments`, comment);
  },

  /**
   * Record user engagement with a bill
   */
  async recordEngagement(bill_id: string | number, engagement: EngagementPayload): Promise<void> { return api.post(`/api/bills/${bill_id }/engagement`, engagement);
  },

  /**
   * Get bill sponsors
   */
  async getSponsors(bill_id: string | number): Promise<any[]> { return api.get(`/api/bills/${bill_id }/sponsors`);
  },

  /**
   * Get bill analysis
   */
  async getAnalysis(bill_id: string | number): Promise<any> { return api.get(`/api/bills/${bill_id }/analysis`);
  },

  /**
   * Get available bill categories
   */
  async getCategories(): Promise<BillCategoriesResponse> {
    return api.get('/api/bills/meta/categories');
  },

  /**
   * Get available bill statuses
   */
  async getStatuses(): Promise<BillStatusesResponse> {
    return api.get('/api/bills/meta/statuses');
  },

  /**
   * Track a bill for notifications
   */
  async trackBill(bill_id: string | number): Promise<void> { return api.post(`/api/bills/${bill_id }/track`);
  },

  /**
   * Untrack a bill
   */
  async untrackBill(bill_id: string | number): Promise<void> { return api.delete(`/api/bills/${bill_id }/track`);
  }
};





































