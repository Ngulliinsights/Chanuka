import { api } from '..\..\..\services\api';
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
  async getComments(billId: string | number): Promise<Comment[]> {
    return api.get(`/api/bills/${billId}/comments`);
  },

  /**
   * Add a comment to a bill
   */
  async addComment(billId: string | number, comment: CommentPayload): Promise<Comment> {
    return api.post(`/api/bills/${billId}/comments`, comment);
  },

  /**
   * Record user engagement with a bill
   */
  async recordEngagement(billId: string | number, engagement: EngagementPayload): Promise<void> {
    return api.post(`/api/bills/${billId}/engagement`, engagement);
  },

  /**
   * Get bill sponsors
   */
  async getSponsors(billId: string | number): Promise<any[]> {
    return api.get(`/api/bills/${billId}/sponsors`);
  },

  /**
   * Get bill analysis
   */
  async getAnalysis(billId: string | number): Promise<any> {
    return api.get(`/api/bills/${billId}/analysis`);
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
  async trackBill(billId: string | number): Promise<void> {
    return api.post(`/api/bills/${billId}/track`);
  },

  /**
   * Untrack a bill
   */
  async untrackBill(billId: string | number): Promise<void> {
    return api.delete(`/api/bills/${billId}/track`);
  }
};




































