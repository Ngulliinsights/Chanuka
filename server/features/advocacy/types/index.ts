// ============================================================================
// ADVOCACY COORDINATION - Type Definitions
// ============================================================================

export interface CampaignFilters {
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  bill_id?: string;
  organizerId?: string;
  category?: string;
  county?: string;
  start_date?: Date;
  end_date?: Date;
  minParticipants?: number;
  maxParticipants?: number;
}

export interface ActionFilters {
  campaign_id?: string;
  user_id?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  actionType?: 'contact_representative' | 'attend_hearing' | 'submit_comment' | 'share_content' | 'organize_meeting' | 'petition_signature';
  due_date?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CampaignMetrics {
  totalParticipants: number;
  activeParticipants: number;
  completedActions: number;
  pendingActions: number;
  engagementRate: number;
  impactScore: number;
  reachMetrics: {
    counties: number;
    demographics: Record<string, number>;
    channels: Record<string, number>;
  };
}

export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  actionType: string;
  estimatedTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  template: {
    subject?: string;
    body?: string;
    instructions: string;
    resources: string[];
  };
  customization: {
    requiredFields: string[];
    optionalFields: string[];
    validationRules: Record<string, any>;
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


