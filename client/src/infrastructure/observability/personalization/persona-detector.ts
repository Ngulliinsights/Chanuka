/**
 * PersonaDetector Utility
 *
 * Detects user persona (novice, intermediate, expert) based on activity and preferences
 * Requirements: 4.1, 4.2, 7.1
 */

import type { UserActivity } from '../../lib/types/analytics';
import type { User } from '../auth/types';

import type {
  PersonaType,
  PersonaMetrics,
  PersonaClassification,
  PersonaPreferences,
  PersonaDetectionConfig,
  PersonaThresholds,
  UserPersonaProfile,
} from './types';

export class PersonaDetector {
  private config: PersonaDetectionConfig;

  constructor(config?: Partial<PersonaDetectionConfig>) {
    this.config = {
      thresholds: {
        novice: {
          maxLoginCount: 10,
          maxDaysActive: 7,
          maxBillsViewed: 5,
          maxAdvancedFeatureUsage: 2,
        },
        intermediate: {
          minLoginCount: 5,
          minDaysActive: 7,
          minBillsViewed: 3,
          minEngagementActions: 5,
          maxExpertFeatureUsage: 10,
        },
        expert: {
          minLoginCount: 20,
          minDaysActive: 14,
          minAdvancedFeatureUsage: 10,
          minExpertContributions: 3,
        },
      },
      weights: {
        activity: 0.3,
        engagement: 0.3,
        expertise: 0.25,
        consistency: 0.15,
      },
      minimumDataPoints: 3,
      confidenceThreshold: 0.6,
      ...config,
    };
  }

  /**
   * Detect user persona based on user data and activity
   */
  async detectPersona(
    user: User,
    activityHistory: UserActivity[] = [],
    existingProfile?: UserPersonaProfile
  ): Promise<PersonaClassification> {
    const metrics = this.calculateMetrics(user, activityHistory);

    // Check if we have enough data for reliable detection
    if (!this.hasMinimumDataPoints(metrics)) {
      return this.getDefaultPersona(user);
    }

    const scores = this.calculatePersonaScores(metrics, user);
    const classification = this.classifyPersona(scores, metrics);

    // Apply consistency check if we have existing profile
    if (existingProfile) {
      return this.applyConsistencyCheck(classification, existingProfile);
    }

    return classification;
  }

  /**
   * Calculate user metrics from activity data
   */
  private calculateMetrics(user: User, activityHistory: UserActivity[]): PersonaMetrics {
    const now = new Date();
    const accountAge = Math.floor(
      (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Group activities by type
    const activityByType = activityHistory.reduce(
      (acc, activity) => {
        acc[activity.action] = (acc[activity.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate time-based metrics
    const totalDuration = activityHistory.reduce(
      (sum, activity) => sum + (activity.duration || 0),
      0
    );

    const billViews = activityHistory.filter(a => a.action === 'view' && a.target_type === 'bill');

    const averageTimePerBill =
      billViews.length > 0
        ? billViews.reduce((sum, view) => sum + (view.duration || 0), 0) / billViews.length / 60
        : 0;

    // Advanced feature detection
    const advancedActions = activityHistory.filter(
      a =>
        a.metadata?.advanced_filter ||
        a.metadata?.export_data ||
        a.metadata?.api_call ||
        a.target_type === 'analytics'
    );

    const expertActions = activityHistory.filter(
      a =>
        a.metadata?.expert_analysis ||
        a.metadata?.verification_contribution ||
        (a.action === 'share' && a.metadata?.expert_insight) ||
        a.target_type === 'analytics'
    );

    return {
      // Activity metrics
      loginCount: user.login_count || 1,
      daysActive: Math.min(accountAge, 365), // Cap at 1 year for calculation
      totalTimeSpent: Math.floor(totalDuration / 60), // Convert to minutes

      // Engagement metrics
      billsViewed: activityByType.view || 0,
      billsBookmarked: activityByType.bookmark || 0,
      commentsPosted: activityByType.comment || 0,
      searchesPerformed: activityByType.search || 0,

      // Advanced feature usage
      advancedFiltersUsed: advancedActions.length,
      analyticsViewed: activityHistory.filter(a => a.target_type === 'analytics').length,
      expertToolsUsed: expertActions.length,
      apiCallsMade: activityHistory.filter(a => a.metadata?.api_call).length,

      // Content interaction depth
      averageTimePerBill,
      fullTextReadsCount: activityHistory.filter(a => a.metadata?.full_text_read).length,
      analysisViewsCount: activityHistory.filter(
        a => a.target_type === 'bill' && a.metadata?.section === 'analysis'
      ).length,

      // Social engagement
      discussionsParticipated: activityHistory.filter(
        a => a.action === 'comment' || (a.action === 'view' && a.target_type === 'comment')
      ).length,
      expertInsightsShared: activityHistory.filter(a => a.metadata?.expert_insight).length,
      verificationContributions: activityHistory.filter(a => a.metadata?.verification_contribution)
        .length,
    };
  }

  /**
   * Calculate persona scores for each type
   */
  private calculatePersonaScores(metrics: PersonaMetrics, user: User): Record<PersonaType, number> {
    const { thresholds, weights } = this.config;

    // Novice score - higher for less experienced users
    const noviceScore = this.calculateNoviceScore(metrics, thresholds.novice, weights);

    // Intermediate score - balanced engagement
    const intermediateScore = this.calculateIntermediateScore(
      metrics,
      thresholds.intermediate,
      weights
    );

    // Expert score - high advanced usage and contributions
    const expertScore = this.calculateExpertScore(metrics, thresholds.expert, weights, user);

    return {
      novice: noviceScore,
      intermediate: intermediateScore,
      expert: expertScore,
    };
  }

  private calculateNoviceScore(
    metrics: PersonaMetrics,
    thresholds: PersonaThresholds['novice'],
    weights: PersonaDetectionConfig['weights']
  ): number {
    let score = 0;

    // Activity indicators (inverse scoring - less activity = higher novice score)
    const activityScore = Math.max(
      0,
      1 -
        (metrics.loginCount / thresholds.maxLoginCount +
          metrics.daysActive / thresholds.maxDaysActive +
          metrics.billsViewed / thresholds.maxBillsViewed) /
          3
    );

    // Low engagement indicators
    const engagementScore = Math.max(
      0,
      1 -
        (metrics.commentsPosted / 5 +
          metrics.searchesPerformed / 10 +
          metrics.billsBookmarked / 3) /
          3
    );

    // Minimal advanced feature usage
    const expertiseScore = Math.max(
      0,
      1 - metrics.advancedFiltersUsed / thresholds.maxAdvancedFeatureUsage
    );

    // Short session times
    const consistencyScore = metrics.averageTimePerBill < 2 ? 0.8 : 0.2;

    score =
      activityScore * weights.activity +
      engagementScore * weights.engagement +
      expertiseScore * weights.expertise +
      consistencyScore * weights.consistency;

    return Math.min(1, Math.max(0, score));
  }

  private calculateIntermediateScore(
    metrics: PersonaMetrics,
    thresholds: PersonaThresholds['intermediate'],
    weights: PersonaDetectionConfig['weights']
  ): number {
    let score = 0;

    // Moderate activity
    const activityScore =
      ((metrics.loginCount >= thresholds.minLoginCount ? 0.8 : 0.2) +
        (metrics.daysActive >= thresholds.minDaysActive ? 0.8 : 0.2) +
        (metrics.billsViewed >= thresholds.minBillsViewed ? 0.8 : 0.2)) /
      3;

    // Regular engagement
    const totalEngagement =
      metrics.commentsPosted +
      metrics.searchesPerformed +
      metrics.billsBookmarked +
      metrics.discussionsParticipated;
    const engagementScore =
      totalEngagement >= thresholds.minEngagementActions
        ? 0.8
        : totalEngagement / thresholds.minEngagementActions;

    // Some advanced features but not expert level
    const expertiseScore =
      metrics.advancedFiltersUsed > 0 &&
      metrics.advancedFiltersUsed <= thresholds.maxExpertFeatureUsage
        ? 0.7
        : 0.3;

    // Consistent moderate usage
    const consistencyScore =
      metrics.averageTimePerBill >= 2 && metrics.averageTimePerBill <= 8 ? 0.8 : 0.4;

    score =
      activityScore * weights.activity +
      engagementScore * weights.engagement +
      expertiseScore * weights.expertise +
      consistencyScore * weights.consistency;

    return Math.min(1, Math.max(0, score));
  }

  private calculateExpertScore(
    metrics: PersonaMetrics,
    thresholds: PersonaThresholds['expert'],
    weights: PersonaDetectionConfig['weights'],
    user: User
  ): number {
    let score = 0;

    // High activity
    const activityScore =
      ((metrics.loginCount >= thresholds.minLoginCount
        ? 1
        : metrics.loginCount / thresholds.minLoginCount) +
        (metrics.daysActive >= thresholds.minDaysActive
          ? 1
          : metrics.daysActive / thresholds.minDaysActive)) /
      2;

    // Deep engagement
    const engagementScore = Math.min(
      1,
      (metrics.commentsPosted / 20 +
        metrics.analysisViewsCount / 10 +
        metrics.fullTextReadsCount / 15) /
        3
    );

    // Advanced feature usage and contributions
    const expertiseScore =
      (metrics.advancedFiltersUsed >= thresholds.minAdvancedFeatureUsage ? 0.3 : 0) +
      (metrics.expertToolsUsed >= 5 ? 0.3 : 0) +
      (metrics.verificationContributions >= thresholds.minExpertContributions ? 0.4 : 0);

    // Role-based bonus
    const roleBonus = user.role === 'expert' || user.role === 'official' ? 0.2 : 0;

    // Consistent deep usage
    const consistencyScore =
      metrics.averageTimePerBill >= 5 && metrics.expertInsightsShared > 0 ? 1 : 0.5;

    score =
      activityScore * weights.activity +
      engagementScore * weights.engagement +
      (expertiseScore + roleBonus) * weights.expertise +
      consistencyScore * weights.consistency;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Classify persona based on scores
   */
  private classifyPersona(
    scores: Record<PersonaType, number>,
    metrics: PersonaMetrics
  ): PersonaClassification {
    const sortedPersonas = Object.entries(scores).sort(([, a], [, b]) => b - a) as [
      PersonaType,
      number,
    ][];

    const [topPersona, topScore] = sortedPersonas[0];
    const [secondPersona, secondScore] = sortedPersonas[1];

    // Confidence is based on the gap between top two scores
    const confidence = Math.min(1, topScore + (topScore - secondScore) * 0.5);

    const reasons = this.generateReasons(topPersona, metrics);
    const suggestedFeatures = this.getSuggestedFeatures(topPersona);
    const nextLevelRequirements = this.getNextLevelRequirements(topPersona, metrics);

    return {
      type: topPersona,
      confidence,
      reasons,
      suggestedFeatures,
      nextLevelRequirements,
    };
  }

  /**
   * Generate human-readable reasons for persona classification
   */
  private generateReasons(persona: PersonaType, metrics: PersonaMetrics): string[] {
    const reasons: string[] = [];

    switch (persona) {
      case 'novice':
        if (metrics.loginCount <= 5) reasons.push('New to the platform');
        if (metrics.billsViewed <= 3) reasons.push('Limited bill exploration');
        if (metrics.commentsPosted === 0) reasons.push('No community participation yet');
        if (metrics.averageTimePerBill < 2) reasons.push('Quick browsing pattern');
        break;

      case 'intermediate':
        if (metrics.loginCount >= 5) reasons.push('Regular platform usage');
        if (metrics.billsViewed >= 5) reasons.push('Active bill exploration');
        if (metrics.commentsPosted > 0) reasons.push('Community participation');
        if (metrics.searchesPerformed >= 3) reasons.push('Uses search functionality');
        break;

      case 'expert':
        if (metrics.advancedFiltersUsed > 0) reasons.push('Uses advanced features');
        if (metrics.expertToolsUsed > 0) reasons.push('Accesses expert tools');
        if (metrics.verificationContributions > 0) reasons.push('Contributes to verification');
        if (metrics.averageTimePerBill >= 5) reasons.push('Deep content engagement');
        if (metrics.expertInsightsShared > 0) reasons.push('Shares expert insights');
        break;
    }

    return reasons.length > 0 ? reasons : ['Based on overall usage patterns'];
  }

  /**
   * Get suggested features for persona
   */
  private getSuggestedFeatures(persona: PersonaType): string[] {
    switch (persona) {
      case 'novice':
        return [
          'Getting started guide',
          'Popular bills widget',
          'Civic education content',
          'Simple search interface',
          'Basic notifications',
        ];

      case 'intermediate':
        return [
          'Bill tracking dashboard',
          'Advanced search filters',
          'Community discussions',
          'Bill analysis summaries',
          'Personalized recommendations',
        ];

      case 'expert':
        return [
          'Advanced analytics dashboard',
          'Expert verification tools',
          'API access',
          'Data export functionality',
          'Professional insights panel',
        ];

      default:
        return [];
    }
  }

  /**
   * Get requirements to reach next persona level
   */
  private getNextLevelRequirements(
    persona: PersonaType,
    metrics: PersonaMetrics
  ): string[] | undefined {
    switch (persona) {
      case 'novice':
        const requirements: string[] = [];
        if (metrics.loginCount < 5) requirements.push('Visit the platform more regularly');
        if (metrics.billsViewed < 5) requirements.push('Explore more bills');
        if (metrics.commentsPosted === 0) requirements.push('Participate in discussions');
        if (metrics.searchesPerformed < 3) requirements.push('Use the search functionality');
        return requirements;

      case 'intermediate':
        const expertRequirements: string[] = [];
        if (metrics.advancedFiltersUsed < 5) expertRequirements.push('Use advanced search filters');
        if (metrics.verificationContributions === 0)
          expertRequirements.push('Contribute to bill verification');
        if (metrics.expertInsightsShared === 0) expertRequirements.push('Share expert insights');
        if (metrics.averageTimePerBill < 5)
          expertRequirements.push('Spend more time analyzing bills');
        return expertRequirements;

      case 'expert':
        return undefined; // Already at highest level
    }
  }

  /**
   * Check if we have minimum data points for reliable detection
   */
  private hasMinimumDataPoints(metrics: PersonaMetrics): boolean {
    const dataPoints = [
      metrics.loginCount,
      metrics.billsViewed,
      metrics.searchesPerformed,
      metrics.totalTimeSpent,
    ].filter(value => value > 0).length;

    return dataPoints >= this.config.minimumDataPoints;
  }

  /**
   * Get default persona for new users
   */
  private getDefaultPersona(user: User): PersonaClassification {
    // Check user role for initial classification
    const roleBasedPersona: PersonaType =
      user.role === 'expert' || user.role === 'official' ? 'intermediate' : 'novice';

    return {
      type: roleBasedPersona,
      confidence: 0.5, // Low confidence due to lack of data
      reasons: ['New user - classification based on account type'],
      suggestedFeatures: this.getSuggestedFeatures(roleBasedPersona),
      nextLevelRequirements: this.getNextLevelRequirements(roleBasedPersona, {} as PersonaMetrics),
    };
  }

  /**
   * Apply consistency check to avoid frequent persona changes
   */
  private applyConsistencyCheck(
    newClassification: PersonaClassification,
    existingProfile: UserPersonaProfile
  ): PersonaClassification {
    const daysSinceLastUpdate = Math.floor(
      (Date.now() - new Date(existingProfile.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    );

    // If classification is the same, just update confidence
    if (newClassification.type === existingProfile.currentPersona) {
      return {
        ...newClassification,
        confidence: Math.max(newClassification.confidence, existingProfile.confidence * 0.9),
      };
    }

    // For persona changes, require higher confidence and some time passage
    const requiredConfidence = daysSinceLastUpdate < 7 ? 0.8 : this.config.confidenceThreshold;

    if (newClassification.confidence < requiredConfidence) {
      return {
        type: existingProfile.currentPersona,
        confidence: existingProfile.confidence * 0.95, // Slight decay
        reasons: ['Maintaining current persona - insufficient confidence for change'],
        suggestedFeatures: this.getSuggestedFeatures(existingProfile.currentPersona),
      };
    }

    return newClassification;
  }

  /**
   * Get default preferences for a persona
   */
  getDefaultPreferences(persona: PersonaType): PersonaPreferences {
    switch (persona) {
      case 'novice':
        return {
          defaultView: 'cards',
          notificationFrequency: 'weekly',
          contentComplexity: 'simple',
          dashboardLayout: 'compact',
          showAdvancedFeatures: false,
          enableExpertMode: false,
        };

      case 'intermediate':
        return {
          defaultView: 'list',
          notificationFrequency: 'daily',
          contentComplexity: 'detailed',
          dashboardLayout: 'standard',
          showAdvancedFeatures: true,
          enableExpertMode: false,
        };

      case 'expert':
        return {
          defaultView: 'grid',
          notificationFrequency: 'immediate',
          contentComplexity: 'technical',
          dashboardLayout: 'expanded',
          showAdvancedFeatures: true,
          enableExpertMode: true,
        };
    }
  }
}

// Export singleton instance with default configuration
export const personaDetector = new PersonaDetector();

// Export factory function for custom configurations
export const createPersonaDetector = (config?: Partial<PersonaDetectionConfig>) =>
  new PersonaDetector(config);
