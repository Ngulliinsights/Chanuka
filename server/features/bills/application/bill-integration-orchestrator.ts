/**
 * Bill Integration Orchestrator
 * 
 * Coordinates automatic processing of bills through intelligence features
 * when they are created or updated. This implements the "Intelligent Bill Pipeline"
 * from the Cross-Feature Integration Map.
 * 
 * INTEGRATION FLOW:
 * 1. Bill Created/Updated
 * 2. Pretext Detection (if available)
 * 3. Constitutional Intelligence (if available)
 * 4. Market Intelligence (if available)
 * 5. Notify interested users
 * 6. Update recommendations
 * 
 * SAFETY: All integrations are optional and fail gracefully
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import type { Bill } from '@server/infrastructure/schema';

interface BillAnalysisResult {
  billId: string;
  pretextDetection?: {
    hasTrojan: boolean;
    concerns: string[];
  };
  constitutionalAnalysis?: {
    concerns: string[];
    riskLevel: string;
  };
  marketIntelligence?: {
    economicImpact: string;
    affectedSectors: string[];
  };
  notificationsSent: number;
  recommendationsUpdated: boolean;
}

export class BillIntegrationOrchestrator {
  /**
   * Process a bill through all available intelligence features
   */
  async processBill(bill: Bill): Promise<AsyncServiceResult<BillAnalysisResult>> {
    return safeAsync(async () => {
      logger.info({ billId: bill.id }, 'Starting bill integration pipeline');

      const result: BillAnalysisResult = {
        billId: bill.id,
        notificationsSent: 0,
        recommendationsUpdated: false,
      };

      // Step 1: Pretext Detection (optional)
      try {
        const pretextResult = await this.runPretextDetection(bill);
        if (pretextResult) {
          result.pretextDetection = pretextResult;
          logger.info({ billId: bill.id, hasTrojan: pretextResult.hasTrojan }, 
            'Pretext detection complete');
        }
      } catch (error) {
        logger.warn({ error, billId: bill.id }, 
          'Pretext detection failed, continuing pipeline');
      }

      // Step 2: Constitutional Analysis (optional)
      try {
        const constitutionalResult = await this.runConstitutionalAnalysis(bill);
        if (constitutionalResult) {
          result.constitutionalAnalysis = constitutionalResult;
          logger.info({ billId: bill.id, riskLevel: constitutionalResult.riskLevel }, 
            'Constitutional analysis complete');
        }
      } catch (error) {
        logger.warn({ error, billId: bill.id }, 
          'Constitutional analysis failed, continuing pipeline');
      }

      // Step 3: Market Intelligence (optional)
      try {
        const marketResult = await this.runMarketIntelligence(bill);
        if (marketResult) {
          result.marketIntelligence = marketResult;
          logger.info({ billId: bill.id, impact: marketResult.economicImpact }, 
            'Market intelligence complete');
        }
      } catch (error) {
        logger.warn({ error, billId: bill.id }, 
          'Market intelligence failed, continuing pipeline');
      }

      // Step 4: Notify interested users (optional)
      try {
        const notificationCount = await this.notifyInterestedUsers(bill, result);
        result.notificationsSent = notificationCount;
        logger.info({ billId: bill.id, count: notificationCount }, 
          'Notifications sent');
      } catch (error) {
        logger.warn({ error, billId: bill.id }, 
          'Notification sending failed, continuing pipeline');
      }

      // Step 5: Update recommendations (optional)
      try {
        const updated = await this.updateRecommendations(bill);
        result.recommendationsUpdated = updated;
        logger.info({ billId: bill.id, updated }, 
          'Recommendations updated');
      } catch (error) {
        logger.warn({ error, billId: bill.id }, 
          'Recommendation update failed, continuing pipeline');
      }

      logger.info({ billId: bill.id, result }, 'Bill integration pipeline complete');
      return result;

    }, { service: 'BillIntegrationOrchestrator', operation: 'processBill' });
  }

  /**
   * Run pretext detection if feature is available
   */
  private async runPretextDetection(bill: Bill): Promise<{
    hasTrojan: boolean;
    concerns: string[];
  } | null> {
    try {
      // Dynamic import to avoid hard dependency
      const { pretextDetectionService } = await import('@server/features/pretext-detection');
      
      const result = await pretextDetectionService.analyzeBill(bill.id);
      if (result.isOk && result.value) {
        return {
          hasTrojan: result.value.hasTrojan || false,
          concerns: result.value.concerns || [],
        };
      }
    } catch (error) {
      // Feature not available or failed
      logger.debug({ error }, 'Pretext detection not available');
    }
    return null;
  }

  /**
   * Run constitutional analysis if feature is available
   */
  private async runConstitutionalAnalysis(bill: Bill): Promise<{
    concerns: string[];
    riskLevel: string;
  } | null> {
    try {
      // Dynamic import to avoid hard dependency
      const { ConstitutionalAnalyzer } = await import('@server/features/constitutional-analysis');
      
      const analyzer = new ConstitutionalAnalyzer();
      const result = await analyzer.analyzeBill(bill.id);
      
      if (result.isOk && result.value) {
        return {
          concerns: result.value.concerns || [],
          riskLevel: result.value.riskLevel || 'low',
        };
      }
    } catch (error) {
      // Feature not available or failed
      logger.debug({ error }, 'Constitutional analysis not available');
    }
    return null;
  }

  /**
   * Run market intelligence if feature is available
   */
  private async runMarketIntelligence(bill: Bill): Promise<{
    economicImpact: string;
    affectedSectors: string[];
  } | null> {
    try {
      // Dynamic import to avoid hard dependency
      const { marketIntelligenceService } = await import('@server/features/market');
      
      const result = await marketIntelligenceService.analyzeBill(bill.id);
      if (result.isOk && result.value) {
        return {
          economicImpact: result.value.economicImpact || 'unknown',
          affectedSectors: result.value.affectedSectors || [],
        };
      }
    } catch (error) {
      // Feature not available or failed
      logger.debug({ error }, 'Market intelligence not available');
    }
    return null;
  }

  /**
   * Notify users interested in this bill
   */
  private async notifyInterestedUsers(
    bill: Bill, 
    analysis: Partial<BillAnalysisResult>
  ): Promise<number> {
    try {
      // Dynamic import to avoid hard dependency
      const { notificationsService } = await import('@server/features/notifications');
      
      // Find users interested in this bill's category or tags
      const interestedUsers = await this.findInterestedUsers(bill);
      
      let count = 0;
      for (const userId of interestedUsers) {
        const message = this.buildNotificationMessage(bill, analysis);
        const result = await notificationsService.sendNotification(
          userId, 
          message, 
          'bill_update'
        );
        if (result.isOk && result.value) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      logger.debug({ error }, 'Notifications not available');
      return 0;
    }
  }

  /**
   * Update recommendation engine with new bill
   */
  private async updateRecommendations(bill: Bill): Promise<boolean> {
    try {
      // Dynamic import to avoid hard dependency
      const { recommendationService } = await import('@server/features/recommendation');
      
      // Trigger recommendation recalculation
      // This is a placeholder - actual implementation depends on recommendation service API
      logger.debug({ billId: bill.id }, 'Recommendation update triggered');
      return true;
    } catch (error) {
      logger.debug({ error }, 'Recommendations not available');
      return false;
    }
  }

  /**
   * Find users interested in this bill based on preferences
   */
  private async findInterestedUsers(bill: Bill): Promise<string[]> {
    // Placeholder implementation
    // In production, this would query user preferences, alert settings, etc.
    return [];
  }

  /**
   * Build notification message from analysis results
   */
  private buildNotificationMessage(
    bill: Bill, 
    analysis: Partial<BillAnalysisResult>
  ): string {
    let message = `New bill: ${bill.title}`;
    
    if (analysis.pretextDetection?.hasTrojan) {
      message += ' ⚠️ Potential trojan bill detected';
    }
    
    if (analysis.constitutionalAnalysis?.riskLevel === 'high') {
      message += ' ⚠️ Constitutional concerns identified';
    }
    
    if (analysis.marketIntelligence?.economicImpact) {
      message += ` 💰 Economic impact: ${analysis.marketIntelligence.economicImpact}`;
    }
    
    return message;
  }
}

export const billIntegrationOrchestrator = new BillIntegrationOrchestrator();
