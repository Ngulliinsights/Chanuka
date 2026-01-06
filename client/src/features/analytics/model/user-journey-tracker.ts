/**
 * User Journey Tracker - Analytics Feature
 *
 * Tracks user navigation patterns and journey analytics
 */

export type UserRole = 'admin' | 'expert' | 'citizen' | 'guest';
export type NavigationSection = 'legislative' | 'community' | 'admin' | 'user' | 'tools';

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
  averageTimeSpent: number;
  completionRate: number;
  userRoles: UserRole[];
}

/**
 * Represents drop-off points in user journeys
 */
export interface DropOffPoint {
  pageId: string;
  section: NavigationSection;
  dropOffRate: number;
  averageTimeBeforeDropOff: number;
  commonPreviousPages: string[];
}

/**
 * Represents conversion funnel data
 */
export interface ConversionFunnel {
  name: string;
  steps: string[];
  conversionRates: number[];
  dropOffPoints: number[];
  averageTimePerStep: number[];
}

class UserJourneyTracker {
  private currentJourney: UserJourney | null = null;
  private journeyHistory: UserJourney[] = [];
  private currentStepStart: number = Date.now();

  startJourney(userId?: string, userRole: UserRole = 'guest'): string {
    const sessionId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentJourney = {
      session_id: sessionId,
      user_id: userId,
      user_role: userRole,
      startTime: new Date(),
      steps: [],
      completed: false,
      totalTimeSpent: 0,
      conversionEvents: [],
    };

    this.currentStepStart = Date.now();
    return sessionId;
  }

  trackPageVisit(pageId: string, section: NavigationSection, referrer?: string): void {
    if (!this.currentJourney) {
      this.startJourney();
    }

    const now = Date.now();
    const timeSpent = now - this.currentStepStart;

    // Mark previous step as completed if exists
    if (this.currentJourney!.steps.length > 0) {
      const lastStep = this.currentJourney!.steps[this.currentJourney!.steps.length - 1];
      lastStep.timeSpent = timeSpent;
    }

    const step: JourneyStep = {
      pageId,
      timestamp: new Date(),
      timeSpent: 0, // Will be updated on next page visit
      user_role: this.currentJourney!.user_role,
      section,
      referrer,
      interactionCount: 0,
    };

    this.currentJourney!.steps.push(step);
    this.currentStepStart = now;
  }

  trackInteraction(interactionType: string): void {
    if (!this.currentJourney || this.currentJourney.steps.length === 0) return;

    const currentStep = this.currentJourney.steps[this.currentJourney.steps.length - 1];
    currentStep.interactionCount = (currentStep.interactionCount || 0) + 1;

    // Track conversion events
    if (this.isConversionEvent(interactionType)) {
      this.currentJourney.conversionEvents.push(interactionType);
    }
  }

  endJourney(goalAchieved: boolean = false): UserJourney | null {
    if (!this.currentJourney) return null;

    const now = Date.now();

    // Update last step time
    if (this.currentJourney.steps.length > 0) {
      const lastStep = this.currentJourney.steps[this.currentJourney.steps.length - 1];
      lastStep.timeSpent = now - this.currentStepStart;
      lastStep.exitPoint = true;
    }

    this.currentJourney.endTime = new Date();
    this.currentJourney.completed = true;
    this.currentJourney.goalAchieved = goalAchieved;
    this.currentJourney.totalTimeSpent = this.currentJourney.steps.reduce(
      (total, step) => total + step.timeSpent,
      0
    );

    // Calculate bounce rate (single page visit with minimal time)
    if (this.currentJourney.steps.length === 1 && this.currentJourney.totalTimeSpent < 30000) {
      this.currentJourney.bounceRate = 1;
    } else {
      this.currentJourney.bounceRate = 0;
    }

    this.journeyHistory.push(this.currentJourney);
    const completedJourney = this.currentJourney;
    this.currentJourney = null;

    return completedJourney;
  }

  getJourneyAnalytics(timeRange?: { start: Date; end: Date }): JourneyAnalytics {
    let journeys = this.journeyHistory;

    if (timeRange) {
      journeys = journeys.filter(
        journey =>
          journey.startTime >= timeRange.start && (journey.endTime || new Date()) <= timeRange.end
      );
    }

    const totalJourneys = journeys.length;
    const completedJourneys = journeys.filter(j => j.completed).length;
    const totalTime = journeys.reduce((sum, j) => sum + j.totalTimeSpent, 0);
    const totalSteps = journeys.reduce((sum, j) => sum + j.steps.length, 0);

    return {
      totalJourneys,
      completedJourneys,
      averageJourneyLength: totalJourneys > 0 ? totalSteps / totalJourneys : 0,
      averageTimeSpent: totalJourneys > 0 ? totalTime / totalJourneys : 0,
      completionRate: totalJourneys > 0 ? completedJourneys / totalJourneys : 0,
      bounceRate: this.calculateBounceRate(journeys),
      popularPaths: this.calculatePopularPaths(journeys),
      dropOffPoints: this.calculateDropOffPoints(journeys),
      conversionFunnels: this.calculateConversionFunnels(journeys),
    };
  }

  private isConversionEvent(interactionType: string): boolean {
    const conversionEvents = [
      'bill_vote',
      'comment_submit',
      'expert_verification_request',
      'profile_complete',
      'newsletter_signup',
    ];
    return conversionEvents.includes(interactionType);
  }

  private calculateBounceRate(journeys: UserJourney[]): number {
    if (journeys.length === 0) return 0;
    const bounces = journeys.filter(j => j.bounceRate === 1).length;
    return bounces / journeys.length;
  }

  private calculatePopularPaths(journeys: UserJourney[]): PathAnalytics[] {
    const pathMap = new Map<string, PathAnalytics>();

    journeys.forEach(journey => {
      const path = journey.steps.map(step => step.pageId);
      const pathKey = path.join(' -> ');

      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, {
          path,
          frequency: 0,
          averageTimeSpent: 0,
          completionRate: 0,
          userRoles: [],
        });
      }

      const pathAnalytics = pathMap.get(pathKey)!;
      pathAnalytics.frequency++;
      pathAnalytics.averageTimeSpent += journey.totalTimeSpent;
      if (journey.completed) pathAnalytics.completionRate++;
      if (!pathAnalytics.userRoles.includes(journey.user_role)) {
        pathAnalytics.userRoles.push(journey.user_role);
      }
    });

    // Calculate averages
    pathMap.forEach(analytics => {
      analytics.averageTimeSpent /= analytics.frequency;
      analytics.completionRate /= analytics.frequency;
    });

    return Array.from(pathMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private calculateDropOffPoints(journeys: UserJourney[]): DropOffPoint[] {
    const dropOffMap = new Map<
      string,
      {
        total: number;
        dropOffs: number;
        timeBeforeDropOff: number[];
        previousPages: string[];
      }
    >();

    journeys.forEach(journey => {
      journey.steps.forEach((step, index) => {
        const key = `${step.pageId}_${step.section}`;

        if (!dropOffMap.has(key)) {
          dropOffMap.set(key, {
            total: 0,
            dropOffs: 0,
            timeBeforeDropOff: [],
            previousPages: [],
          });
        }

        const data = dropOffMap.get(key)!;
        data.total++;

        if (step.exitPoint) {
          data.dropOffs++;
          data.timeBeforeDropOff.push(step.timeSpent);

          if (index > 0) {
            data.previousPages.push(journey.steps[index - 1].pageId);
          }
        }
      });
    });

    return Array.from(dropOffMap.entries())
      .map(([key, data]) => {
        const [pageId, section] = key.split('_');
        return {
          pageId,
          section: section as NavigationSection,
          dropOffRate: data.total > 0 ? data.dropOffs / data.total : 0,
          averageTimeBeforeDropOff:
            data.timeBeforeDropOff.length > 0
              ? data.timeBeforeDropOff.reduce((sum, time) => sum + time, 0) /
                data.timeBeforeDropOff.length
              : 0,
          commonPreviousPages: [...new Set(data.previousPages)],
        };
      })
      .filter(point => point.dropOffRate > 0.1) // Only significant drop-off points
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  private calculateConversionFunnels(journeys: UserJourney[]): ConversionFunnel[] {
    // Define common conversion funnels
    const funnels = [
      {
        name: 'Bill Engagement',
        steps: ['/', '/bills', '/bills/:id', '/bills/:id/comments'],
      },
      {
        name: 'User Onboarding',
        steps: ['/', '/auth', '/onboarding', '/dashboard'],
      },
      {
        name: 'Expert Verification',
        steps: ['/', '/expert-verification', '/profile', '/dashboard'],
      },
    ];

    return funnels.map(funnel => {
      const stepCounts = new Array(funnel.steps.length).fill(0);
      const stepTimes = new Array(funnel.steps.length).fill(0);

      journeys.forEach(journey => {
        const journeyPages = journey.steps.map(step => step.pageId);

        funnel.steps.forEach((step, index) => {
          const stepPattern = step.replace(':id', '\\d+');
          const regex = new RegExp(stepPattern);

          if (journeyPages.some(page => regex.test(page))) {
            stepCounts[index]++;

            const matchingStep = journey.steps.find(s => regex.test(s.pageId));
            if (matchingStep) {
              stepTimes[index] += matchingStep.timeSpent;
            }
          }
        });
      });

      const conversionRates = stepCounts.map((count, index) =>
        index === 0 ? 1 : count / stepCounts[0]
      );

      const dropOffPoints = stepCounts.map((count, index) =>
        index === 0 ? 0 : (stepCounts[index - 1] - count) / stepCounts[index - 1]
      );

      const averageTimePerStep = stepTimes.map((time, index) =>
        stepCounts[index] > 0 ? time / stepCounts[index] : 0
      );

      return {
        name: funnel.name,
        steps: funnel.steps,
        conversionRates,
        dropOffPoints,
        averageTimePerStep,
      };
    });
  }
}

export const userJourneyTracker = new UserJourneyTracker();
