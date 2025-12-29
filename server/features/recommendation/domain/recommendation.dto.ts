 
import type { Bill } from '@shared/schema';

export interface PlainBill extends Bill {}

export interface PersonalizedRecommendationsDto {
  bills: PlainBill[];
  scores: number[];
}

export interface SimilarBillsDto {
  bill: PlainBill;
  similarityScore: number;
}

export interface TrendingBillsDto {
  bill: PlainBill;
  trendScore: number;
}

export interface CollaborativeRecommendationsDto {
  bills: PlainBill[];
  scores: number[];
}

export interface EngagementTrackingDto { user_id: string;
  bill_id: number;
  engagement_type: 'view' | 'comment' | 'share';
  }








































