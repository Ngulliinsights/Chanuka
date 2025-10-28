import { AlertType } from '../value-objects/alert-type';
import { SmartFilteringConfig } from '../value-objects/smart-filtering-config';
import { Priority } from '../value-objects/priority';

/**
 * Smart Filtering Service
 * Handles intelligent filtering of alerts based on user preferences and behavior
 */
export class SmartFilteringService {
  /**
   * Processes smart filtering for an alert
   */
  async processFiltering(
    userId: string,
    alertType: AlertType,
    alertData: any,
    config: SmartFilteringConfig
  ): Promise<SmartFilteringResult> {
    if (!config.enabled) {
      return {
        shouldSend: true,
        confidence: 1.0
      };
    }

    // Calculate user interest score
    const userInterestScore = await this.calculateUserInterestScore(userId, alertData);

    // Calculate engagement history score
    const engagementScore = await this.calculateEngagementHistoryScore(userId, alertData);

    // Calculate trending score
    const trendingScore = await this.calculateTrendingScore(alertData);

    // Calculate overall confidence
    const confidence = config.calculateConfidence(
      userInterestScore,
      engagementScore,
      trendingScore
    );

    // Check for duplicates
    if (config.duplicateFiltering) {
      const isDuplicate = await this.checkForDuplicate(userId, alertType, alertData);
      if (isDuplicate) {
        return {
          shouldSend: false,
          filteredReason: 'Duplicate alert detected',
          confidence: 1.0
        };
      }
    }

    // Check for spam
    if (config.spamFiltering) {
      const isSpam = await this.checkForSpam(userId, alertType);
      if (isSpam) {
        return {
          shouldSend: false,
          filteredReason: 'Spam alert detected',
          confidence: 0.9
        };
      }
    }

    // Determine if should send based on confidence threshold
    const shouldSend = config.shouldSendAlert(confidence);

    // Calculate adjusted priority based on confidence
    let adjustedPriority: Priority | undefined;
    if (confidence >= 0.8) {
      adjustedPriority = Priority.HIGH;
    } else if (confidence >= 0.6) {
      adjustedPriority = Priority.NORMAL;
    } else if (shouldSend) {
      adjustedPriority = Priority.LOW;
    }

    return {
      shouldSend,
      filteredReason: shouldSend ? undefined : `Low confidence: ${confidence.toFixed(2)}`,
      adjustedPriority,
      confidence
    };
  }

  /**
   * Calculates user interest score based on user's explicit interests
   */
  private async calculateUserInterestScore(userId: string, alertData: any): Promise<number> {
    try {
      // This would integrate with user profile service to get user interests
      // For now, return a default score
      const userInterests = await this.getUserInterests(userId);

      if (userInterests.length === 0) {
        return 0.5; // Neutral score when no interests defined
      }

      let matchScore = 0;
      let totalChecks = 0;

      // Check bill category match
      if (alertData.billCategory) {
        totalChecks++;
        if (userInterests.some(interest =>
          interest.toLowerCase() === alertData.billCategory.toLowerCase()
        )) {
          matchScore += 1;
        }
      }

      // Check keyword matches
      if (alertData.keywords && Array.isArray(alertData.keywords)) {
        for (const keyword of alertData.keywords) {
          totalChecks++;
          if (userInterests.some(interest =>
            interest.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(interest.toLowerCase())
          )) {
            matchScore += 0.5;
          }
        }
      }

      return totalChecks > 0 ? Math.min(matchScore / totalChecks, 1.0) : 0.5;
    } catch (error) {
      console.error('Error calculating user interest score:', error);
      return 0.5;
    }
  }

  /**
   * Calculates engagement history score based on past user behavior
   */
  private async calculateEngagementHistoryScore(userId: string, alertData: any): Promise<number> {
    try {
      // This would integrate with engagement tracking service
      // For now, return a default score
      const engagementHistory = await this.getUserEngagementHistory(userId);

      if (engagementHistory.totalBillsTracked === 0) {
        return 0.5;
      }

      if (alertData.billCategory) {
        const categoryEngagement = engagementHistory.topCategories?.find(
          cat => cat.category.toLowerCase() === alertData.billCategory.toLowerCase()
        );

        if (categoryEngagement) {
          return Math.min(
            categoryEngagement.engagementCount / engagementHistory.totalBillsTracked,
            1.0
          );
        }
      }

      return 0.5;
    } catch (error) {
      console.error('Error calculating engagement history score:', error);
      return 0.5;
    }
  }

  /**
   * Calculates trending score based on current engagement levels
   */
  private async calculateTrendingScore(alertData: any): Promise<number> {
    // Normalize engagement count to 0-1 scale
    if (alertData.engagementCount && typeof alertData.engagementCount === 'number') {
      // Assuming max engagement of 1000 for normalization
      return Math.min(alertData.engagementCount / 1000, 1.0);
    }

    return 0.5;
  }

  /**
   * Checks for duplicate alerts within a time window
   */
  private async checkForDuplicate(
    userId: string,
    alertType: AlertType,
    alertData: any
  ): Promise<boolean> {
    try {
      // This would check recent delivery logs for duplicates
      // For now, implement basic duplicate detection
      const recentAlerts = await this.getRecentAlerts(userId, 24); // Last 24 hours

      return recentAlerts.some(alert =>
        alert.alertType.equals(alertType) &&
        alert.metadata?.billId === alertData.billId &&
        alert.status !== 'failed'
      );
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  }

  /**
   * Checks for spam patterns (too many alerts of same type)
   */
  private async checkForSpam(userId: string, alertType: AlertType): Promise<boolean> {
    try {
      const recentAlerts = await this.getRecentAlerts(userId, 1); // Last hour

      // Simple spam detection: more than 10 alerts of same type per hour
      const sameTypeCount = recentAlerts.filter(alert =>
        alert.alertType.equals(alertType)
      ).length;

      return sameTypeCount > 10;
    } catch (error) {
      console.error('Error checking for spam:', error);
      return false;
    }
  }

  // Placeholder methods - these would be implemented with actual service integrations
  private async getUserInterests(userId: string): Promise<string[]> {
    // TODO: Integrate with user profile service
    return [];
  }

  private async getUserEngagementHistory(userId: string): Promise<any> {
    // TODO: Integrate with engagement tracking service
    return { totalBillsTracked: 0, topCategories: [] };
  }

  private async getRecentAlerts(userId: string, hours: number): Promise<any[]> {
    // TODO: Integrate with delivery log repository
    return [];
  }
}

/**
 * Smart Filtering Result Interface
 */
export interface SmartFilteringResult {
  shouldSend: boolean;
  filteredReason?: string;
  adjustedPriority?: Priority;
  confidence: number;
}





































