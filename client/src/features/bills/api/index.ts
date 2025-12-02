/**
 * Bills API Layer
 * Feature-Sliced Design - API Layer for Bills Feature
 */

import { globalApiClient } from '@client/core/api/client';
import { logger } from '@client/utils/logger';
import { globalErrorHandler } from '@client/core/api/errors';
import { mockBills, mockBillsStats } from '@client/data/mock/bills';
import type { Bill, Sponsor, BillsQueryParams } from '../model/types';

// API-specific types
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

export interface BillsStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

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

export class BillsApiService {
  private readonly defaultTimeout = 10000;
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  /**
   * Retrieves paginated bills with comprehensive filtering capabilities.
   * Supports full-text search, status filtering, policy area categorization,
   * and multiple sorting options to help users find relevant legislation.
   * Falls back to mock data when server is unavailable.
   */
  async getBills(params: BillsSearchParams = {}): Promise<PaginatedBillsResponse> {
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

      // Validate response structure
      if (!response.data || !response.data.bills) {
        throw new Error('Invalid response structure: missing bills data');
      }

      logger.info('Bills loaded successfully', {
        component: 'BillsApiService',
        page,
        count: response.data.bills.length,
        total: response.data.pagination?.total || 0
      });

      return response.data;
    } catch (error) {
      logger.warn('Server unavailable, falling back to mock data', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });

      // Fallback to mock data when server is unavailable
      return this.getMockBillsResponse(params);
    }
  }

  /**
   * Fetches complete details for a specific bill including full text,
   * sponsor information, timeline, and current status.
   * Falls back to mock data when server is unavailable.
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
      logger.warn('Server unavailable, falling back to mock data for bill details', {
        component: 'BillsApiService',
        billId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to mock data - transform to model Bill type
      const mockBill = mockBills.find(bill => bill.id === id);
      if (mockBill) {
        return this.transformMockBillToModelBill(mockBill);
      }

      // If specific bill not found, return first mock bill with updated ID
      const fallbackBill = this.transformMockBillToModelBill({ ...mockBills[0], id });
      return fallbackBill;
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
   * Records a vote on a comment (upvote or downvote).
   */
  async voteOnComment(commentId: string, voteType: 'up' | 'down'): Promise<void> {
    try {
      await globalApiClient.post(`/api/comments/${commentId}/vote`, { type: voteType }, {
        timeout: this.defaultTimeout,
        skipCache: true
      });

      logger.debug('Comment vote recorded', {
        component: 'BillsApiService',
        commentId,
        voteType
      });
    } catch (error) {
      logger.error('Failed to vote on comment', { component: 'BillsApiService', commentId, voteType, error });
      throw await this.handleError(error, 'voteOnComment', { commentId });
    }
  }

  /**
   * Endorses a comment, increasing its credibility score.
   */
  async endorseComment(commentId: string, endorsements: number): Promise<void> {
    try {
      await globalApiClient.post(`/api/comments/${commentId}/endorse`, { endorsements }, {
        timeout: this.defaultTimeout,
        skipCache: true
      });

      logger.debug('Comment endorsed', {
        component: 'BillsApiService',
        commentId,
        endorsements
      });
    } catch (error) {
      logger.error('Failed to endorse comment', { component: 'BillsApiService', commentId, endorsements, error });
      throw await this.handleError(error, 'endorseComment', { commentId });
    }
  }

  /**
   * Creates a poll for a bill discussion.
   */
  async createBillPoll(billId: number, question: string, options: string[], section?: string): Promise<any> {
    try {
      const response = await globalApiClient.post(`/api/bills/${billId}/polls`, {
        question,
        options,
        section
      }, {
        timeout: this.defaultTimeout,
        skipCache: true
      });

      logger.info('Poll created successfully', {
        component: 'BillsApiService',
        billId,
        pollId: (response.data as any)?.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create poll', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'createBillPoll', { billId });
    }
  }

  /**
   * Fetches sponsorship analysis for a bill.
   */
  async getBillSponsorshipAnalysis(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`/api/sponsorship/bills/${billId}/analysis`, {
        timeout: this.defaultTimeout,
        cacheTTL: 30 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill sponsorship analysis', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillSponsorshipAnalysis', { billId });
    }
  }

  /**
   * Fetches primary sponsor analysis for a bill.
   */
  async getBillPrimarySponsorAnalysis(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`/api/sponsorship/bills/${billId}/primary-sponsor`, {
        timeout: this.defaultTimeout,
        cacheTTL: 30 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill primary sponsor analysis', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillPrimarySponsorAnalysis', { billId });
    }
  }

  /**
   * Fetches co-sponsors analysis for a bill.
   */
  async getBillCoSponsorsAnalysis(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`/api/sponsorship/bills/${billId}/co-sponsors`, {
        timeout: this.defaultTimeout,
        cacheTTL: 30 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill co-sponsors analysis', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillCoSponsorsAnalysis', { billId });
    }
  }

  /**
   * Fetches financial network analysis for a bill.
   */
  async getBillFinancialNetworkAnalysis(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`/api/sponsorship/bills/${billId}/financial-network`, {
        timeout: this.defaultTimeout,
        cacheTTL: 30 * 60 * 1000
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load bill financial network analysis', { component: 'BillsApiService', billId, error });
      throw await this.handleError(error, 'getBillFinancialNetworkAnalysis', { billId });
    }
  }

  /**
   * Transform mock bill data to model Bill type
   */
  private transformMockBillToModelBill(mockBill: any): Bill {
    return {
      id: mockBill.id.toString(),
      title: mockBill.title,
      summary: mockBill.summary,
      status: mockBill.status,
      category: mockBill.policyAreas?.[0] || 'General',
      introduced_date: mockBill.introducedDate,
      last_action_date: mockBill.lastUpdated,
      sponsors: mockBill.sponsors?.map((s: any) => ({
        id: s.id.toString(),
        name: s.name,
        party: s.party,
        district: s.district,
        role: s.position,
        conflictOfInterest: []
      })) || [],
      comments: [], // Mock data doesn't have comments
      analysis: undefined,
      trackingCount: mockBill.viewCount || 0,
      engagementMetrics: {
        views: mockBill.viewCount || 0,
        shares: mockBill.shareCount || 0,
        comments: mockBill.commentCount || 0,
        bookmarks: 0,
        last_engaged_at: mockBill.lastUpdated
      }
    };
  }

  /**
   * Provides mock data response when server is unavailable.
   * Applies basic filtering and pagination to mock data.
   */
  private getMockBillsResponse(params: BillsSearchParams): PaginatedBillsResponse {
    let filteredBills = [...mockBills];

    // Apply basic filtering
    if (params.status?.length) {
      filteredBills = filteredBills.filter(bill =>
        params.status!.includes(bill.status)
      );
    }

    if (params.urgency?.length) {
      filteredBills = filteredBills.filter(bill =>
        params.urgency!.includes(bill.urgencyLevel)
      );
    }

    if (params.policyAreas?.length) {
      filteredBills = filteredBills.filter(bill =>
        bill.policyAreas.some(area => params.policyAreas!.includes(area))
      );
    }

    if (params.constitutionalFlags) {
      filteredBills = filteredBills.filter(bill =>
        bill.constitutionalFlags.length > 0
      );
    }

    if (params.query) {
      const searchTerm = params.query.toLowerCase();
      filteredBills = filteredBills.filter(bill =>
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.summary.toLowerCase().includes(searchTerm) ||
        bill.billNumber.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const sortBy = params.sortBy || 'date';
    const sortOrder = params.sortOrder || 'desc';

    filteredBills.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'urgency':
          const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          comparison = (urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] || 0) -
                      (urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder] || 0);
          break;
        case 'engagement':
          comparison = (a.viewCount + a.commentCount + a.shareCount) -
                      (b.viewCount + b.commentCount + b.shareCount);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 12;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBills = filteredBills.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredBills.length / limit);

    return {
      bills: paginatedBills.map(bill => this.transformMockBillToModelBill(bill)),
      pagination: {
        page,
        limit,
        total: filteredBills.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      stats: mockBillsStats
    };
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