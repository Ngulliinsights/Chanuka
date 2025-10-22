import { UserRole, NavigationSection } from '..\types\navigation';
import { logger } from '@shared/core';

/**
 * Represents a single step in a user journey
 */
export interface JourneyStep {
  pageId: string;
  timestamp: Date;
  timeSpent: number; // in milliseconds
  userRole: UserRole;
  section: NavigationSection;
  referrer?: string;
  exitPoint?: boolean;
  interactionCount?: number;
}

/**
 * Represents a complete user journey session
 */
export interface UserJourney {
  sessionId: string;
  userId?: string;
  userRole: UserRole;
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
  userRoles: UserRole[];
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
  public startJourney(sessionId: string, userId?: string, userRole: UserRole = 'public'): void {
    const journey: UserJourney = {
      sessionId,
      userId,
      userRole,
      startTime: new Date(),
      steps: [],
      completed: false,
      totalTimeSpent: 0,
      conversionEvents: []
    };

    this.activeJourneys.set(sessionId, journey);
    this.sessionStartTimes.set(sessionId, new Date());
  }

  /**
   * Track a page visit step in the journey
   */
  public trackStep(
    sessionId: string,
    pageId: string,
    section: NavigationSection,
    referrer?: string,
    interactionCount?: number
  ): void {
    const journey = this.activeJourneys.get(sessionId);
    if (!journey) {
      // Auto-start journey if not exists
      this.startJourney(sessionId);
      return this.trackStep(sessionId, pageId, section, referrer, interactionCount);
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
      userRole: journey.userRole,
      section,
      referrer,
      interactionCount
    };

    journey.steps.push(step);
    journey.totalTimeSpent += timeSpent;

    this.pageStartTimes.set(`${sessionId}-${pageId}`, now);
  }

  /**
   * Track a conversion event
   */
  public trackConversionEvent(sessionId: string, eventName: string): void {
    const journey = this.activeJourneys.get(sessionId);
    if (journey && this.conversionEvents.has(eventName)) {
      journey.conversionEvents.push(eventName);
    }
  }

  /**
   * Mark a journey as completed
   */
  public completeJourney(sessionId: string, goalAchieved: boolean = false): void {
    const journey = this.activeJourneys.get(sessionId);
    if (!journey) return;

    journey.endTime = new Date();
    journey.completed = true;
    journey.goalAchieved = goalAchieved;

    // Calculate final time spent
    if (journey.steps.length > 0) {
      const lastStep = journey.steps[journey.steps.length - 1];
      const finalTimeSpent = journey.endTime.getTime() - lastStep.timestamp.getTime();
      lastStep.timeSpent = finalTimeSpent;
      journey.totalTimeSpent += finalTimeSpent;
    }

    // Calculate bounce rate
    journey.bounceRate = journey.steps.length <= 1 ? 1 : 0;

    // Store completed journey
    this.journeys.set(sessionId, journey);
    this.activeJourneys.delete(sessionId);
    this.sessionStartTimes.delete(sessionId);
  }

  /**
   * End a journey (user left without completing)
   */
  public endJourney(sessionId: string): void {
    const journey = this.activeJourneys.get(sessionId);
    if (!journey) return;

    // Mark last step as exit point
    if (journey.steps.length > 0) {
      journey.steps[journey.steps.length - 1].exitPoint = true;
    }

    this.completeJourney(sessionId, false);
  }

  /**
   * Get journey analytics
   */
  public getJourneyAnalytics(
    startDate?: Date,
    endDate?: Date,
    userRole?: UserRole
  ): JourneyAnalytics {
    const filteredJourneys = this.getFilteredJourneys(startDate, endDate, userRole);
    
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
    startDate?: Date,
    endDate?: Date,
    userRole?: UserRole
  ): UserJourney[] {
    return Array.from(this.journeys.values()).filter(journey => {
      if (startDate && journey.startTime < startDate) return false;
      if (endDate && journey.startTime > endDate) return false;
      if (userRole && journey.userRole !== userRole) return false;
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
      userRoles: Set<UserRole>;
    }>();

    journeys.forEach(journey => {
      if (journey.steps.length < 2) return;

      const path = journey.steps.map(step => step.pageId);
      const pathKey = path.join(' -> ');
      
      const existing = pathMap.get(pathKey) || {
        frequency: 0,
        totalTime: 0,
        completions: 0,
        userRoles: new Set<UserRole>()
      };

      existing.frequency++;
      existing.totalTime += journey.totalTimeSpent;
      existing.userRoles.add(journey.userRole);
      
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
        userRoles: Array.from(data.userRoles)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Calculate drop-off points
   */
  private calculateDropOffPoints(journeys: UserJourney[]): DropOffPoint[] {
    const pageStats = new Map<string, {
      visits: number;
      exits: number;
      totalTimeBeforeExit: number;
      nextSteps: Map<string, number>;
    }>();

    journeys.forEach(journey => {
      journey.steps.forEach((step, index) => {
        const stats = pageStats.get(step.pageId) || {
          visits: 0,
          exits: 0,
          totalTimeBeforeExit: 0,
          nextSteps: new Map<string, number>()
        };

        stats.visits++;

        if (step.exitPoint || index === journey.steps.length - 1) {
          stats.exits++;
          stats.totalTimeBeforeExit += step.timeSpent;
        }

        // Track next steps
        if (index < journey.steps.length - 1) {
          const nextStep = journey.steps[index + 1].pageId;
          stats.nextSteps.set(nextStep, (stats.nextSteps.get(nextStep) || 0) + 1);
        }

        pageStats.set(step.pageId, stats);
      });
    });

    return Array.from(pageStats.entries())
      .map(([pageId, stats]) => ({
        pageId,
        dropOffRate: stats.visits > 0 ? stats.exits / stats.visits : 0,
        averageTimeBeforeExit: stats.exits > 0 ? stats.totalTimeBeforeExit / stats.exits : 0,
        commonNextSteps: Array.from(stats.nextSteps.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([step]) => step),
        improvementSuggestions: this.generateImprovementSuggestions(pageId, stats)
      }))
      .filter(point => point.dropOffRate > 0.1) // Only show significant drop-off points
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  /**
   * Generate improvement suggestions for drop-off points
   */
  private generateImprovementSuggestions(
    pageId: string,
    stats: { visits: number; exits: number; totalTimeBeforeExit: number; nextSteps: Map<string, number> }
  ): string[] {
    const suggestions: string[] = [];
    const dropOffRate = stats.exits / stats.visits;
    const avgTime = stats.totalTimeBeforeExit / stats.exits;

    if (dropOffRate > 0.5) {
      suggestions.push('High drop-off rate - consider improving page content or navigation');
    }

    if (avgTime < 10000) { // Less than 10 seconds
      suggestions.push('Users leave quickly - improve initial page load or add engaging content');
    }

    if (stats.nextSteps.size < 2) {
      suggestions.push('Limited navigation options - add more relevant links or calls-to-action');
    }

    if (pageId.includes('/bills/') && !pageId.includes('/analysis')) {
      suggestions.push('Consider adding direct link to bill analysis');
    }

    return suggestions;
  }

  /**
   * Calculate conversion funnels
   */
  private calculateConversionFunnels(journeys: UserJourney[]): ConversionFunnel[] {
    const funnels: ConversionFunnel[] = [];

    // Bill Research Funnel
    const billResearchSteps = ['/', '/bills', '/bills/:id', '/bills/:id/analysis'];
    funnels.push(this.calculateFunnelMetrics('Bill Research', billResearchSteps, journeys));

    // Community Engagement Funnel
    const communitySteps = ['/', '/community', '/bills/:id', '/bills/:id/comments'];
    funnels.push(this.calculateFunnelMetrics('Community Engagement', communitySteps, journeys));

    // User Onboarding Funnel
    const onboardingSteps = ['/', '/onboarding', '/dashboard', '/profile'];
    funnels.push(this.calculateFunnelMetrics('User Onboarding', onboardingSteps, journeys));

    return funnels;
  }

  /**
   * Calculate metrics for a specific funnel
   */
  private calculateFunnelMetrics(
    name: string,
    steps: string[],
    journeys: UserJourney[]
  ): ConversionFunnel {
    const stepCounts = new Array(steps.length).fill(0);
    let totalConversions = 0;

    journeys.forEach(journey => {
      const journeyPages = journey.steps.map(step => 
        step.pageId.replace(/\/\d+/g, '/:id') // Normalize dynamic routes
      );

      let currentStep = 0;
      journeyPages.forEach(pageId => {
        if (currentStep < steps.length && pageId === steps[currentStep]) {
          stepCounts[currentStep]++;
          currentStep++;
        }
      });

      if (currentStep === steps.length) {
        totalConversions++;
      }
    });

    const conversionRates = stepCounts.map((count, index) => 
      index === 0 ? 1 : (stepCounts[0] > 0 ? count / stepCounts[0] : 0)
    );

    const dropOffPoints = conversionRates.map((rate, index) => 
      index === 0 ? 0 : conversionRates[index - 1] - rate
    );

    return {
      name,
      steps,
      conversionRates,
      dropOffPoints,
      totalConversions
    };
  }

  /**
   * Get journey optimization recommendations
   */
  public getOptimizationRecommendations(
    startDate?: Date,
    endDate?: Date
  ): JourneyOptimization[] {
    const analytics = this.getJourneyAnalytics(startDate, endDate);
    const recommendations: JourneyOptimization[] = [];

    // Analyze drop-off points
    analytics.dropOffPoints.forEach(dropOff => {
      if (dropOff.dropOffRate > 0.3) {
        recommendations.push({
          pageId: dropOff.pageId,
          optimizationType: 'reduce_friction',
          priority: dropOff.dropOffRate > 0.5 ? 'high' : 'medium',
          description: `High drop-off rate (${(dropOff.dropOffRate * 100).toFixed(1)}%) - ${dropOff.improvementSuggestions.join(', ')}`,
          expectedImpact: Math.min(dropOff.dropOffRate * 0.5, 0.8),
          implementationEffort: 'medium'
        });
      }
    });

    // Analyze conversion funnels
    analytics.conversionFunnels.forEach(funnel => {
      funnel.dropOffPoints.forEach((dropOff, index) => {
        if (dropOff > 0.2 && index > 0) {
          recommendations.push({
            pageId: funnel.steps[index],
            optimizationType: 'improve_navigation',
            priority: dropOff > 0.4 ? 'high' : 'medium',
            description: `${funnel.name} funnel has ${(dropOff * 100).toFixed(1)}% drop-off at step ${index + 1}`,
            expectedImpact: dropOff * 0.6,
            implementationEffort: 'low'
          });
        }
      });
    });

    // Analyze popular paths for optimization opportunities
    analytics.popularPaths.forEach(path => {
      if (path.completionRate < 0.5 && path.frequency > 5) {
        recommendations.push({
          pageId: path.path[path.path.length - 1],
          optimizationType: 'add_guidance',
          priority: 'medium',
          description: `Popular path with low completion rate (${(path.completionRate * 100).toFixed(1)}%) - add user guidance`,
          expectedImpact: (1 - path.completionRate) * 0.4,
          implementationEffort: 'low'
        });
      }
    });

    return recommendations
      .sort((a, b) => {
        // Sort by priority and expected impact
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority];
        const bPriority = priorityWeight[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.expectedImpact - a.expectedImpact;
      })
      .slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Get user journey by session ID
   */
  public getJourney(sessionId: string): UserJourney | undefined {
    return this.journeys.get(sessionId) || this.activeJourneys.get(sessionId);
  }

  /**
   * Get all journeys for a user
   */
  public getUserJourneys(userId: string): UserJourney[] {
    return Array.from(this.journeys.values()).filter(journey => journey.userId === userId);
  }

  /**
   * Clear all journey data (for testing)
   */
  public clearAllData(): void {
    this.journeys.clear();
    this.activeJourneys.clear();
    this.sessionStartTimes.clear();
    this.pageStartTimes.clear();
  }

  /**
   * Export journey data for analysis
   */
  public exportJourneyData(format: 'json' | 'csv' = 'json'): string {
    const journeys = Array.from(this.journeys.values());
    
    if (format === 'json') {
      return JSON.stringify(journeys, null, 2);
    }
    
    // CSV format
    const headers = [
      'sessionId', 'userId', 'userRole', 'startTime', 'endTime', 
      'completed', 'goalAchieved', 'totalTimeSpent', 'stepCount', 
      'conversionEvents', 'bounceRate'
    ];
    
    const rows = journeys.map(journey => [
      journey.sessionId,
      journey.userId || '',
      journey.userRole,
      journey.startTime.toISOString(),
      journey.endTime?.toISOString() || '',
      journey.completed.toString(),
      journey.goalAchieved?.toString() || '',
      journey.totalTimeSpent.toString(),
      journey.steps.length.toString(),
      journey.conversionEvents.join(';'),
      journey.bounceRate?.toString() || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Get journey completion rate for a specific goal
   */
  public getGoalCompletionRate(goalName: string): number {
    const goalSteps = this.journeyGoals.get(goalName);
    if (!goalSteps) return 0;

    const relevantJourneys = Array.from(this.journeys.values()).filter(journey => {
      const journeyPages = journey.steps.map(step => 
        step.pageId.replace(/\/\d+/g, '/:id')
      );
      
      // Check if journey contains all goal steps in order
      let goalIndex = 0;
      for (const page of journeyPages) {
        if (goalIndex < goalSteps.length && page === goalSteps[goalIndex]) {
          goalIndex++;
        }
      }
      
      return goalIndex > 0; // Journey attempted this goal
    });

    if (relevantJourneys.length === 0) return 0;

    const completedGoals = relevantJourneys.filter(journey => {
      const journeyPages = journey.steps.map(step => 
        step.pageId.replace(/\/\d+/g, '/:id')
      );
      
      let goalIndex = 0;
      for (const page of journeyPages) {
        if (goalIndex < goalSteps.length && page === goalSteps[goalIndex]) {
          goalIndex++;
        }
      }
      
      return goalIndex === goalSteps.length; // Completed all steps
    });

    return completedGoals.length / relevantJourneys.length;
  }
}











































