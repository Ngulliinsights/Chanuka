import type {
  Bill,
  BillAnalysis,
  BillsSearchParams,
  PaginatedBillsResponse,
  Sponsor,
  BillCategory,
} from '@client/lib/types/bill';
import { logger } from '@client/lib/utils/logger';

import { globalApiClient } from './client';

// Re-export unified bill types for backward compatibility
export type {
  BillAnalysis,
  Sponsor,
  BillCategory,
  BillsSearchParams,
  PaginatedBillsResponse,
} from '@client/lib/types/bill';

export interface Comment {
  id: number;
  billId: number;
  userId: number;
  content: string;
  parentId?: number;
  upvotes: number;
  downvotes: number;
  isEndorsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentPayload {
  content: string;
  parentId?: number;
}

export interface CommentVotePayload {
  type: 'up' | 'down';
}

export interface EngagementPayload {
  type: 'view' | 'share' | 'save' | 'vote';
  metadata?: Record<string, unknown>;
}

export interface Poll {
  id: number;
  billId: number;
  question: string;
  options: PollOption[];
  totalVotes: number;
  endDate?: string;
  createdAt: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface CreatePollPayload {
  question: string;
  options: string[];
  endDate?: string;
}

// Sponsor and BillAnalysis are now imported from @client/lib/types/bill

export interface SponsorshipAnalysis {
  billId: number;
  totalSponsors: number;
  partyDistribution: Record<string, number>;
  financialConnections: FinancialConnection[];
  networkStrength: number;
}

export interface FinancialConnection {
  sponsorId: number;
  sponsorName: string;
  contributions: {
    source: string;
    amount: number;
    date: string;
  }[];
  totalAmount: number;
}

export interface SponsorAnalysis {
  sponsorId: number;
  name: string;
  votingRecord: {
    alignment: number;
    totalVotes: number;
  };
  financialBackers: {
    name: string;
    amount: number;
  }[];
  influenceScore: number;
}

export interface FinancialNetworkAnalysis {
  billId: number;
  totalContributions: number;
  topDonors: {
    name: string;
    amount: number;
    connections: number;
  }[];
  industryBreakdown: Record<string, number>;
  networkDensity: number;
}

// BillCategory is now imported from @client/lib/types/bill

export interface BillStatus {
  id: string;
  name: string;
  description: string;
  order: number;
}

// ============================================================================
// Service
// ============================================================================

export class BillsApiService {
  private readonly endpoint = '/bills';

  // ==========================================================================
  // Core Bill Operations
  // ==========================================================================

  /**
   * Fetch paginated bills with optional filters
   * @param params - Search and filter parameters
   * @returns Paginated list of bills
   */
  async getBills(params: BillsSearchParams = {}): Promise<PaginatedBillsResponse> {
    try {
      const queryParams: Record<string, string> = {
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '10',
      };

      // Only add optional parameters if they exist
      if (params.query) {
        queryParams.query = params.query;
      }
      if (params.category) {
        queryParams.category = params.category;
      }
      if (params.status && params.status.length > 0) {
        queryParams.status = params.status.join(',');
      }

      const response = await globalApiClient.get<PaginatedBillsResponse>(this.endpoint, {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bills', { error, params });
      throw error;
    }
  }

  /**
   * Get a single bill by ID with full details
   * @param id - Bill ID
   * @returns Complete bill data
   */
  async getBillById(id: string | number): Promise<Bill> {
    try {
      const response = await globalApiClient.get<Bill>(`${this.endpoint}/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch bill ${id}`, { error });
      throw error;
    }
  }

  /**
   * Toggle tracking status for a bill
   * @param id - Bill ID
   * @param tracking - True to track, false to untrack
   */
  async trackBill(id: string | number, tracking: boolean): Promise<void> {
    try {
      const action = tracking ? 'track' : 'untrack';
      await globalApiClient.post(`${this.endpoint}/${id}/${action}`);
      logger.info(`Bill ${id} ${action}ed successfully`);
    } catch (error) {
      logger.error(`Failed to ${tracking ? 'track' : 'untrack'} bill ${id}`, { error });
      throw error;
    }
  }

  // ==========================================================================
  // Comments & Community Engagement
  // ==========================================================================

  /**
   * Get all comments for a specific bill
   * @param billId - Bill ID
   * @returns Array of comments
   */
  async getBillComments(billId: number | string): Promise<Comment[]> {
    try {
      const response = await globalApiClient.get<Comment[]>(`${this.endpoint}/${billId}/comments`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch comments for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Add a new comment to a bill
   * @param billId - Bill ID
   * @param data - Comment content and optional parent ID
   * @returns Created comment
   */
  async addBillComment(billId: number | string, data: CommentPayload): Promise<Comment> {
    try {
      const response = await globalApiClient.post<Comment>(
        `${this.endpoint}/${billId}/comments`,
        data
      );
      logger.info(`Comment added to bill ${billId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to add comment to bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Vote on a comment (upvote or downvote)
   * @param commentId - Comment ID
   * @param type - Vote type ('up' or 'down')
   * @returns Updated comment
   */
  async voteOnComment(commentId: number | string, type: 'up' | 'down'): Promise<Comment> {
    try {
      const response = await globalApiClient.post<Comment>(`/comments/${commentId}/vote`, { type });
      return response.data;
    } catch (error) {
      logger.error(`Failed to vote on comment ${commentId}`, { error });
      throw error;
    }
  }

  /**
   * Endorse a comment (expert feature)
   * @param commentId - Comment ID
   * @returns Updated comment with endorsement
   */
  async endorseComment(commentId: number | string): Promise<Comment> {
    try {
      const response = await globalApiClient.post<Comment>(`/comments/${commentId}/endorse`);
      logger.info(`Comment ${commentId} endorsed`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to endorse comment ${commentId}`, { error });
      throw error;
    }
  }

  /**
   * Record user engagement with a bill (view, share, save, vote)
   * @param billId - Bill ID
   * @param data - Engagement type and optional metadata
   */
  async recordEngagement(billId: number | string, data: EngagementPayload): Promise<void> {
    try {
      await globalApiClient.post(`${this.endpoint}/${billId}/engagement`, data);
      logger.info(`Engagement recorded for bill ${billId}: ${data.type}`);
    } catch (error) {
      logger.error(`Failed to record engagement for bill ${billId}`, { error });
      throw error;
    }
  }

  // ==========================================================================
  // Polls
  // ==========================================================================

  /**
   * Create a user poll attached to a bill
   * @param billId - Bill ID
   * @param data - Poll question and options
   * @returns Created poll
   */
  async createBillPoll(billId: number | string, data: CreatePollPayload): Promise<Poll> {
    try {
      const response = await globalApiClient.post<Poll>(`${this.endpoint}/${billId}/polls`, data);
      logger.info(`Poll created for bill ${billId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to create poll for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get all polls for a bill
   * @param billId - Bill ID
   * @returns Array of polls
   */
  async getBillPolls(billId: number | string): Promise<Poll[]> {
    try {
      const response = await globalApiClient.get<Poll[]>(`${this.endpoint}/${billId}/polls`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch polls for bill ${billId}`, { error });
      throw error;
    }
  }

  // ==========================================================================
  // Sponsors & Analysis
  // ==========================================================================

  /**
   * Get list of all sponsors for a bill
   * @param billId - Bill ID
   * @returns Array of sponsors
   */
  async getBillSponsors(billId: number | string): Promise<Sponsor[]> {
    try {
      const response = await globalApiClient.get<Sponsor[]>(`${this.endpoint}/${billId}/sponsors`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sponsors for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get comprehensive analysis of a bill
   * @param billId - Bill ID
   * @returns Detailed bill analysis
   */
  async getBillAnalysis(billId: number | string): Promise<BillAnalysis> {
    try {
      const response = await globalApiClient.get<BillAnalysis>(
        `${this.endpoint}/${billId}/analysis`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch analysis for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get sponsorship analysis including financial connections
   * @param billId - Bill ID
   * @returns Sponsorship analysis data
   */
  async getBillSponsorshipAnalysis(billId: number | string): Promise<SponsorshipAnalysis> {
    try {
      const response = await globalApiClient.get<SponsorshipAnalysis>(
        `${this.endpoint}/${billId}/analysis/sponsorship`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sponsorship analysis for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get analysis of the primary sponsor
   * @param billId - Bill ID
   * @returns Primary sponsor analysis
   */
  async getBillPrimarySponsorAnalysis(billId: number | string): Promise<SponsorAnalysis> {
    try {
      const response = await globalApiClient.get<SponsorAnalysis>(
        `${this.endpoint}/${billId}/analysis/sponsor/primary`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch primary sponsor analysis for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get co-sponsor network analysis
   * @param billId - Bill ID
   * @returns Co-sponsors network data
   */
  async getBillCoSponsorsAnalysis(billId: number | string): Promise<SponsorAnalysis[]> {
    try {
      const response = await globalApiClient.get<SponsorAnalysis[]>(
        `${this.endpoint}/${billId}/analysis/sponsor/co`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch co-sponsors analysis for bill ${billId}`, { error });
      throw error;
    }
  }

  /**
   * Get financial network analysis for a bill
   * @param billId - Bill ID
   * @returns Financial network data
   */
  async getBillFinancialNetworkAnalysis(
    billId: number | string
  ): Promise<FinancialNetworkAnalysis> {
    try {
      const response = await globalApiClient.get<FinancialNetworkAnalysis>(
        `${this.endpoint}/${billId}/analysis/financial`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch financial network analysis for bill ${billId}`, { error });
      throw error;
    }
  }

  // ==========================================================================
  // Metadata
  // ==========================================================================

  /**
   * Get available bill categories
   * @returns Array of bill categories
   */
  async getBillCategories(): Promise<BillCategory[]> {
    try {
      const response = await globalApiClient.get<BillCategory[]>(
        `${this.endpoint}/meta/categories`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bill categories', { error });
      throw error;
    }
  }

  /**
   * Get available bill statuses
   * @returns Array of bill statuses
   */
  async getBillStatuses(): Promise<BillStatus[]> {
    try {
      const response = await globalApiClient.get<BillStatus[]>(`${this.endpoint}/meta/statuses`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bill statuses', { error });
      throw error;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const billsApiService = new BillsApiService();
