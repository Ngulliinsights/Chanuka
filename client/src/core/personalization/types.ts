/**
 * Personalization Types
 *
 * Types for user persona detection and personalized experiences
 */

export type PersonaType = 'novice' | 'intermediate' | 'expert';

export interface PersonaMetrics {
  // Activity metrics
  loginCount: number;
  daysActive: number;
  totalTimeSpent: number; // in minutes

  // Engagement metrics
  billsViewed: number;
  billsBookmarked: number;
  commentsPosted: number;
  searchesPerformed: number;

  // Advanced feature usage
  advancedFiltersUsed: number;
  analyticsViewed: number;
  expertToolsUsed: number;
  apiCallsMade: number;

  // Content interaction depth
  averageTimePerBill: number; // in minutes
  fullTextReadsCount: number;
  analysisViewsCount: number;

  // Social engagement
  discussionsParticipated: number;
  expertInsightsShared: number;
  verificationContributions: number;
}

export interface PersonaClassification {
  type: PersonaType;
  confidence: number; // 0-1 scale
  reasons: string[];
  suggestedFeatures: string[];
  nextLevelRequirements?: string[];
}

export interface PersonaPreferences {
  defaultView: 'list' | 'grid' | 'cards';
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  contentComplexity: 'simple' | 'detailed' | 'technical';
  dashboardLayout: 'compact' | 'standard' | 'expanded';
  showAdvancedFeatures: boolean;
  enableExpertMode: boolean;
}

export interface PersonaThresholds {
  novice: {
    maxLoginCount: number;
    maxDaysActive: number;
    maxBillsViewed: number;
    maxAdvancedFeatureUsage: number;
  };
  intermediate: {
    minLoginCount: number;
    minDaysActive: number;
    minBillsViewed: number;
    minEngagementActions: number;
    maxExpertFeatureUsage: number;
  };
  expert: {
    minLoginCount: number;
    minDaysActive: number;
    minAdvancedFeatureUsage: number;
    minExpertContributions: number;
  };
}

export interface PersonaDetectionConfig {
  thresholds: PersonaThresholds;
  weights: {
    activity: number;
    engagement: number;
    expertise: number;
    consistency: number;
  };
  minimumDataPoints: number;
  confidenceThreshold: number;
}

export interface UserPersonaProfile {
  userId: string;
  currentPersona: PersonaType;
  confidence: number;
  lastUpdated: string;
  metrics: PersonaMetrics;
  preferences: PersonaPreferences;
  history: Array<{
    persona: PersonaType;
    confidence: number;
    detectedAt: string;
    reason: string;
  }>;
}
