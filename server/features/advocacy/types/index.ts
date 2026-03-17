/**
 * Advocacy Types - Re-export from Shared Layer
 * 
 * These types have been migrated to @shared/types/domains/community/advocacy-types.ts
 * This file now simply re-exports them for backward compatibility.
 */

export type {
  CampaignFilters,
  ActionFilters,
  CampaignMetrics,
  ActionTemplate
} from '@shared/types';
    resources: string[];
  };
  customization: {
    requiredFields: string[];
    optionalFields: string[];
    validationRules: Record<string, unknown>;
  };
}

export interface CoalitionOpportunity {
  id: string;
  bill_id: string;
  sharedConcerns: string[];
  potentialPartners: {
    user_id: string;
    organizationName?: string;
    alignmentScore: number;
    complementaryStrengths: string[];
  }[];
  suggestedActions: string[];
  estimatedImpact: number;
}

export interface RepresentativeContact {
  id: string;
  name: string;
  title: string;
  constituency?: string;
  county?: string;
  party?: string;
  committees: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    office?: string;
    socialMedia?: Record<string, string>;
  };
  responsiveness: {
    averageResponseTime?: number;
    responseRate?: number;
    preferredContactMethod?: string;
  };
}

export interface ImpactAssessment {
  campaign_id: string;
  bill_id: string;
  outcomes: {
    billAmended: boolean;
    committeeFeedback: boolean;
    mediaAttention: boolean;
    publicAwareness: number;
    legislativeResponse: boolean;
  };
  attribution: {
    directImpact: number;
    contributingFactors: string[];
    confidence: number;
  };
  participantFeedback: {
    satisfaction: number;
    efficacy: number;
    likelyToParticipateAgain: number;
  };
}

export interface CampaignStrategy {
  objectives: string[];
  targetAudience: {
    demographics: string[];
    counties: string[];
    interests: string[];
  };
  tactics: {
    primary: string[];
    secondary: string[];
    timeline: Record<string, string[]>;
  };
  resources: {
    budget?: number;
    volunteers?: number;
    expertise: string[];
  };
  successMetrics: {
    participation: number;
    engagement: number;
    outcomes: string[];
  };
}

export interface NotificationPreferences {
  campaignUpdates: boolean;
  actionReminders: boolean;
  coalitionOpportunities: boolean;
  impactReports: boolean;
  urgentAlerts: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    ussd: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdvocacyAnalytics {
  campaignPerformance: {
    totalCampaigns: number;
    activeCampaigns: number;
    successRate: number;
    averageParticipation: number;
  };
  userEngagement: {
    totalParticipants: number;
    activeParticipants: number;
    retentionRate: number;
    averageActionsPerUser: number;
  };
  impactMetrics: {
    billsInfluenced: number;
    amendmentsAchieved: number;
    committeeFeedback: number;
    mediaAttention: number;
  };
  geographicDistribution: Record<string, number>;
  demographicBreakdown: Record<string, number>;
}


