/**
 * Recommendation Engine Types
 * 
 * Type definitions for the recommendation engine feature
 */

export interface Recommendation {
  id: string;
  type: 'bill' | 'topic' | 'user' | 'action';
  score: number;
  reason: string;
  metadata: Record<string, any>;
}

export interface BillRecommendation extends Recommendation {
  type: 'bill';
  metadata: {
    billId: number;
    billNumber: string;
    title: string;
    status: string;
    introducedDate?: string;
    summary?: string;
  };
}

export interface RecommendationResponse {
  success: boolean;
  data: Recommendation[];
  count: number;
  responseTime: number;
}

export interface SimilarBillsResponse {
  success: boolean;
  data: BillRecommendation[];
  count: number;
  responseTime: number;
}

export interface TrendingBillsResponse {
  success: boolean;
  data: BillRecommendation[];
  count: number;
  responseTime: number;
}

export interface EngagementTrackingRequest {
  bill_id: number;
  engagement_type: 'view' | 'comment' | 'share' | 'click';
}

export interface EngagementTrackingResponse {
  success: boolean;
  message: string;
  responseTime: number;
}
