import { UserRole, NavigationSection } from '../types/navigation';

/**
 * Represents a single step in a user journey
 */
export interface JourneyStep {
  pageId: string;
  timestamp: Date;
  timeSpent: number; // in milliseconds
  user_role: UserRole;
  section: NavigationSection;
  referrer?: string;
  exitPoint?: boolean;
  interactionCount?: number;
}

/**
 * Represents a complete user journey session
 */
export interface UserJourney {
  session_id: string;
  user_id?: string;
  user_role: UserRole;
  startTime: Date;
  endTime?: Date;
  steps: JourneyStep[];
  completed: boolean;
  goalAchieved?: boolean;
  totalTimeSpent: number;
  bounceRate?: number;
  conversionEvents: string[];
}

/**
 * Represents journey analytics data
 */
export interface JourneyAnalytics {
  totalJourneys: number;
  completedJourneys: number;
  averageJourneyLength: number;
  averageTimeSpent: number;
  completionRate: number;
  bounceRate: number;
  popularPaths: PathAnalytics[];
  dropOffPoints: DropOffPoint[];
  conversionFunnels: ConversionFunnel[];
}

/**
 * Represents path analytics
 */
export interface PathAnalytics {
  path: string[];
  frequency: number;
  averageCompletionTime: number;
  completionRate: number;
  user_roles: UserRole[];
}

/**
 * Represents drop-off analysis
 */
export interface DropOffPoint {
  pageId: string;
  dropOffRate: number;
  averageTimeBeforeExit: number;
  commonNextSteps: string[];
  improvementSuggestions: string[];
}

/**
 * Represents conversion funnel data
 */
export interface ConversionFunnel {
  name: string;
  steps: string[];
  conversionRates: number[];
  dropOffPoints: number[];
  totalConversions: number;
}

/**
 * Journey optimization recommendations
 */
export interface JourneyOptimization {
  pageId: string;
  optimizationType: 'reduce_friction' | 'improve_navigation' | 'add_guidance' | 'simplify_flow';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number; // 0-1 scale
  implementationEffort: 'low' | 'medium' | 'high';
}

/**
 * User journey tracking and analytics service
 */
export class UserJourneyTracker {
  private static instance: UserJourneyTracker;
  private journeys: Map<string, UserJourney> = new Map();
  private activeJourneys: Map<string, UserJourney> = new Map();
  private journeyGoals: Map<string, string[]> = new Map();
  private conversionEvents: Set<string> = new Set();
  private sessionStartTimes: Map<string, Date> = new Map();
  private pageStartTimes: Map<string, Date> = new Map();

  private constructor() {
    this.initializeJourneyGoals();
    this.initializeConversionEvents();
  }

  public static getInstance(): UserJourneyTracker {
    if (!UserJourneyTracker.instance) {
      UserJourneyTracker.instance = new UserJourneyTracker();
    }
    return UserJourneyTracker.instance;
  }

  /**
   * Initialize predefined journey goals
   */
  private initializeJourneyGoals(): void {
    this.journeyGoals.set('bill_research', [
      '/',
      '/bills',
      '/bills/:id',
      '/bills/:id/analysis'
    ]);

    this.journeyGoals.set('community_engagement', [
      '/',
      '/community',
      '/bills/:id',
      '/bills/:id/comments'
    ]);

    this.journeyGoals.set('expert_verification', [
      '/',
      '/expert-verification',
      '/bills/:id',
      '/bills/:id/analysis'
    ]);

    this.journeyGoals.set('user_onboarding', [
      '/',
      '/onboarding',
      '/dashboard',
      '/profile'
    ]);

    this.journeyGoals.set('admin_workflow', [
      '/admin',
      '/admin/database',
      '/bills',
      '/community'
    ]);
  }

  /**
   * Initialize conversion events
   */
  private initializeConversionEvents(): void {
    this.conversionEvents.add('bill_analysis_viewed');
    this.conversionEvents.add('comment_posted');
    this.conversionEvents.add('expert_verification_completed');
    this.conversionEvents.add('user_registered');
    this.conversionEvents.add('profile_completed');
    this.conversionEvents.add('bill_tracked');
    this.conversionEvents.add('search_performed');
  }

  /**
   * Start tracking a new user journey
   */
  public startJourney(session_id: string, user_id?: string, user_role: UserRole = 'public'): void {
    const journey: UserJourney = {
      session_id,
      user_id,
      user_role,
      startTime: new Date(),
      steps: [],
      completed: false,
      totalTimeSpent: 0,
      conversionEvents: []
    };

    this.activeJourneys.set(session_id, journey);
    this.sessionStartTimes.set(session_id, new Date());
  }

  /**
   * Track a page visit step in the journey
   */
  public trackStep(
    session_id: string,
    pageId: string,
    section: NavigationSection,
    referrer?: string,
    interactionCount?: number
  ): void {
    const journey = this.activeJourneys.get(session_id);
    if (!journey) {
      // Auto-start journey if not exists
      this.startJourney(session_id);
      return this.trackStep(session_id, pageId, section, referrer, interactionCount);
    }

    // Calculate time spent on previous page
    const previousStep = journey.steps[journey.steps.length - 1];
    const now = new Date();
    let timeSpent = 0;

    if (previousStep) {
      timeSpent = now.getTime() - previousStep.timestamp.getTime();
      previousStep.timeSpent = timeSpent;
    }

    // Create new step
    const step: JourneyStep = {
      pageId,
      timestamp: now,
      timeSpent: 0, // Will be calculated when next step is tracked
      user_role: journey.user_role,
      section,
      referrer,
      interactionCount
    };

    journey.steps.push(step);
    journey.totalTimeSpent += timeSpent;

    this.pageStartTimes.set(`${session_id}-${pageId}`, now);
  }

  /**
   * Track a conversion event
   */
  public trackConversionEvent(session_id: string, eventName: string): void {
    const journey = this.activeJourneys.get(session_id);
    if (journey && this.conversionEvents.has(eventName)) {
      journey.conversionEvents.push(eventName);
    }
  }

  /**
   * Mark a journey as completed
   */
  public completeJourney(session_id: string, goalAchieved: boolean = false): void {
    const journey = this.activeJourneys.get(session_id);
    if (!journey) return;

    journey.endTime = new Date();
    journey.completed = true;
    journey.goalAchieved = goalAchieved;

    // Calculate final time spent - Fixed: Added null check
    if (journey.steps.length > 0) {
      const lastStep = journey.steps[journey.steps.length - 1];
      if (lastStep && journey.endTime) {
        const finalTimeSpent = journey.endTime.getTime() - lastStep.timestamp.getTime();
        lastStep.timeSpent = finalTimeSpent;
        journey.totalTimeSpent += finalTimeSpent;
      }
    }

    // Calculate bounce rate - Fixed: Consider meaningful engagement (time spent > 5s or interactions > 0)
    const meaningfulEngagement = journey.totalTimeSpent > 5000 || journey.steps.some(step => (step.interactionCount || 0) > 0);
    journey.bounceRate = (journey.steps.length <= 1 && !meaningfulEngagement) ? 1 : 0;

    // Store completed journey
    this.journeys.set(session_id, journey);
    this.activeJourneys.delete(session_id);
    this.sessionStartTimes.delete(session_id);

    // Clean up pageStartTimes for this session to prevent memory leaks
    for (const key of this.pageStartTimes.keys()) {
      if (key.startsWith(`${session_id}-`)) {
        this.pageStartTimes.delete(key);
      }
    }
  }

  /**
   * End a journey (user left without completing)
   */
  public endJourney(session_id: string): void {
    const journey = this.activeJourneys.get(session_id);
    if (!journey) return;

    // Mark last step as exit point - Fixed: Added null check
    if (journey.steps.length > 0) {
      const lastStep = journey.steps[journey.steps.length - 1];
      if (lastStep) {
        lastStep.exitPoint = true;
      }
    }

    this.completeJourney(session_id, false);
  }

  /**
   * Get journey analytics
   */
  public getJourneyAnalytics(
    start_date?: Date,
    end_date?: Date,
    user_role?: UserRole
  ): JourneyAnalytics {
    const filteredJourneys = this.getFilteredJourneys(start_date, end_date, user_role);

    const totalJourneys = filteredJourneys.length;
    const completedJourneys = filteredJourneys.filter(j => j.completed).length;
    const totalSteps = filteredJourneys.reduce((sum, j) => sum + j.steps.length, 0);
    const totalTime = filteredJourneys.reduce((sum, j) => sum + j.totalTimeSpent, 0);
    const bounces = filteredJourneys.filter(j => j.bounceRate === 1).length;

    return {
      totalJourneys,
      completedJourneys,
      averageJourneyLength: totalJourneys > 0 ? totalSteps / totalJourneys : 0,
      averageTimeSpent: totalJourneys > 0 ? totalTime / totalJourneys : 0,
      completionRate: totalJourneys > 0 ? completedJourneys / totalJourneys : 0,
      bounceRate: totalJourneys > 0 ? bounces / totalJourneys : 0,
      popularPaths: this.calculatePopularPaths(filteredJourneys),
      dropOffPoints: this.calculateDropOffPoints(filteredJourneys),
      conversionFunnels: this.calculateConversionFunnels(filteredJourneys)
    };
  }

  /**
   * Get filtered journeys based on criteria
   */
  private getFilteredJourneys(
    start_date?: Date,
    end_date?: Date,
    user_role?: UserRole
  ): UserJourney[] {
    return Array.from(this.journeys.values()).filter(journey => {
      if (start_date && journey.startTime < start_date) return false;
      if (end_date && journey.startTime > end_date) return false;
      if (user_role && journey.user_role !== user_role) return false;
      return true;
    });
  }

  /**
   * Calculate popular paths
   */
  private calculatePopularPaths(journeys: UserJourney[]): PathAnalytics[] {
    const pathMap = new Map<string, {
      frequency: number;
      totalTime: number;
      completions: number;
      user_roles: Set<UserRole>;
    }>();

    journeys.forEach(journey => {
      if (journey.steps.length < 2) return;

      const path = journey.steps.map(step => step.pageId);
      const pathKey = path.join(' -> ');

      const existing = pathMap.get(pathKey) || {
        frequency: 0,
        totalTime: 0,
        completions: 0,
        user_roles: new Set<UserRole>()
      };

      existing.frequency++;
      existing.totalTime += journey.totalTimeSpent;
      existing.user_roles.add(journey.user_role);

      if (journey.completed) {
        existing.completions++;
      }

      pathMap.set(pathKey, existing);
    });

    return Array.from(pathMap.entries())
      .map(([pathKey, data]) => ({
        path: pathKey.split(' -> '),
        frequency: data.frequency,
        averageCompletionTime: data.frequency > 0 ? data.totalTime / data.frequency : 0,
        completionRate: data.frequency > 0 ? data.completions / data.frequency : 0,
        user_roles: Array.from(data.user_roles)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Calculate drop-off points
   */
  private calculateDropOffPoints(journeys: UserJourney[]): DropOffPoint[] {
    const pageExits = new Map<string, {
      exits: number;
      totalVisits: number;
      totalTimeBeforeExit: number;
      nextSteps: Map<string, number>;
    }>();

    journeys.forEach(journey => {
      journey.steps.forEach((step, index) => {
        const pageId = step.pageId;
        const existing = pageExits.get(pageId) || {
          exits: 0,
          totalVisits: 0,
          totalTimeBeforeExit: 0,
          nextSteps: new Map<string, number>()
        };

        existing.totalVisits++;

        // Check if this is an exit point
        if (step.exitPoint || index === journey.steps.length - 1) {
          existing.exits++;
          existing.totalTimeBeforeExit += step.timeSpent;
        } else if (index < journey.steps.length - 1) {
          // Track next step
          const nextStep = journey.steps[index + 1];
          if (nextStep) {
            const nextCount = existing.nextSteps.get(nextStep.pageId) || 0;
            existing.nextSteps.set(nextStep.pageId, nextCount + 1);
          }
        }

        pageExits.set(pageId, existing);
      });
    });

    return Array.from(pageExits.entries())
      .map(([pageId, data]) => ({
        pageId,
        dropOffRate: data.totalVisits > 0 ? data.exits / data.totalVisits : 0,
        averageTimeBeforeExit: data.exits > 0 ? data.totalTimeBeforeExit / data.exits : 0,
        commonNextSteps: Array.from(data.nextSteps.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([step]) => step),
        improvementSuggestions: this.generateImprovementSuggestions(pageId, data.exits / data.totalVisits)
      }))
      .filter(point => point.dropOffRate > 0.1) // Only show significant drop-off points
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  /**
   * Calculate conversion funnels
   */
  private calculateConversionFunnels(journeys: UserJourney[]): ConversionFunnel[] {
    const funnels: ConversionFunnel[] = [];

    // Define common funnels
    const funnelDefinitions = [
      {
        name: 'Bill Research Funnel',
        steps: ['/', '/bills', '/bills/:id', '/bills/:id/analysis']
      },
      {
        name: 'Community Engagement Funnel',
        steps: ['/', '/community', '/bills/:id', '/bills/:id/comments']
      },
      {
        name: 'User Onboarding Funnel',
        steps: ['/', '/onboarding', '/dashboard', '/profile']
      }
    ];

    funnelDefinitions.forEach(definition => {
      const stepCounts = new Array(definition.steps.length).fill(0);
      let totalConversions = 0;

      journeys.forEach(journey => {
        const journeyPages = journey.steps.map(step => step.pageId);
        let currentStep = 0;

        journeyPages.forEach(pageId => {
          if (currentStep < definition.steps.length &&
            (definition.steps[currentStep] === pageId ||
              (definition.steps[currentStep]?.includes(':id') && pageId.includes('bills/')))) {
            stepCounts[currentStep]++;
            currentStep++;
          }
        });

        if (currentStep === definition.steps.length) {
          totalConversions++;
        }
      });

      const conversionRates = stepCounts.map((count, index) =>
        index === 0 ? 1 : (stepCounts[0] > 0 ? count / stepCounts[0] : 0)
      );

      const dropOffPoints = conversionRates.map((rate, index) =>
        index === 0 ? 0 : (conversionRates[index - 1] || 0) - rate
      );

      funnels.push({
        name: definition.name,
        steps: definition.steps,
        conversionRates,
        dropOffPoints,
        totalConversions
      });
    });

    return funnels;
  }

  /**
   * Generate improvement suggestions for drop-off points
   */
  private generateImprovementSuggestions(pageId: string, dropOffRate: number): string[] {
    const suggestions: string[] = [];

    if (dropOffRate > 0.5) {
      suggestions.push('High drop-off rate detected - consider simplifying page content');
      suggestions.push('Add clear call-to-action buttons');
      suggestions.push('Improve page loading performance');
    } else if (dropOffRate > 0.3) {
      suggestions.push('Moderate drop-off - consider adding navigation hints');
      suggestions.push('Review page layout and user flow');
    }

    // Page-specific suggestions
    if (pageId.includes('bills')) {
      suggestions.push('Add bill summary or key highlights');
      suggestions.push('Improve bill readability with better formatting');
    } else if (pageId.includes('community')) {
      suggestions.push('Encourage user engagement with prompts');
      suggestions.push('Show recent activity to increase interest');
    }

    return suggestions;
  }


  /**
   * Get journey optimization recommendations
   */
  public getOptimizationRecommendations(
    start_date?: Date,
    end_date?: Date,
    user_role?: UserRole
  ): JourneyOptimization[] {
    const analytics = this.getJourneyAnalytics(start_date, end_date, user_role);
    const recommendations: JourneyOptimization[] = [];

    // Analyze drop-off points for optimization opportunities
    analytics.dropOffPoints.forEach(dropOff => {
      if (dropOff.dropOffRate > 0.3) {
        recommendations.push({
          pageId: dropOff.pageId,
          optimizationType: 'reduce_friction',
          priority: dropOff.dropOffRate > 0.5 ? 'high' : 'medium',
          description: `High drop-off rate (${(dropOff.dropOffRate * 100).toFixed(1)}%) detected on ${dropOff.pageId}`,
          expectedImpact: Math.min(dropOff.dropOffRate * 0.7, 0.9),
          implementationEffort: 'medium'
        });
      }
    });

    // Analyze conversion funnels
    analytics.conversionFunnels.forEach(funnel => {
      funnel.dropOffPoints.forEach((dropOff, index) => {
        if (dropOff > 0.2 && index < funnel.steps.length - 1) {
          const pageId = funnel.steps[index];
          if (pageId) {
            recommendations.push({
              pageId,
              optimizationType: 'improve_navigation',
              priority: dropOff > 0.4 ? 'high' : 'medium',
              description: `Significant drop-off in ${funnel.name} at step ${index + 1}`,
              expectedImpact: dropOff * 0.6,
              implementationEffort: 'low'
            });
          }
        }
      });
    });

    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 10);
  }

  /**
   * Get active journey count
   */
  public getActiveJourneyCount(): number {
    return this.activeJourneys.size;
  }

  /**
   * Get journey by session ID
   */
  public getJourney(session_id: string): UserJourney | undefined {
    return this.journeys.get(session_id) || this.activeJourneys.get(session_id);
  }

  /**
   * Clear old journeys (for memory management)
   */
  public clearOldJourneys(olderThanDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    for (const [sessionId, journey] of this.journeys.entries()) {
      if (journey.startTime < cutoffDate) {
        this.journeys.delete(sessionId);
      }
    }

    // Also clear stale active journeys (inactive for more than 24 hours)
    const activeCutoffDate = new Date();
    activeCutoffDate.setHours(activeCutoffDate.getHours() - 24);

    for (const [sessionId, journey] of this.activeJourneys.entries()) {
      if (journey.startTime < activeCutoffDate) {
        this.activeJourneys.delete(sessionId);
        this.sessionStartTimes.delete(sessionId);

        // Clean up pageStartTimes for stale active journeys
        for (const key of this.pageStartTimes.keys()) {
          if (key.startsWith(`${sessionId}-`)) {
            this.pageStartTimes.delete(key);
          }
        }
      }
    }
  }
}