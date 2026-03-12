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
 * SAFETY: All integrations are optional and fail gracefully.
 * Dynamic imports are cast to `any` intentionally — each feature module's
 * export shape is owned by that feature, and the orchestrator must not
 * create hard compile-time dependencies on optional sibling features.
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import type { Bill } from '@server/infrastructure/schema';
import { bills } from '@server/infrastructure/schema';
import { users } from '@server/infrastructure/schema';

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
   * Process a bill through all available intelligence features.
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
   * Run pretext detection if feature is available.
   *
   * The pretext-detection index.ts is owned by that feature and may export
   * its service under any name — we import the whole namespace as `any` to
   * avoid a hard structural dependency from this optional integration.
   */
  private async runPretextDetection(bill: Bill): Promise<{
    hasTrojan: boolean;
    concerns: string[];
  } | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@server/features/pretext-detection') as any;
      // Service may be exported as pretextDetectionService, PretextDetectionService, default, etc.
      const svc = mod.pretextDetectionService ?? mod.PretextDetectionService ?? mod.default;
      if (!svc) return null;

      const result = await svc.analyzeBill(bill.id);
      if (!result) return null;

      return {
        hasTrojan: result.hasTrojan ?? false,
        concerns: result.concerns ?? [],
      };
    } catch (error) {
      logger.debug({ error }, 'Pretext detection not available');
    }
    return null;
  }

  /**
   * Run constitutional analysis if feature is available.
   *
   * `ConstitutionalAnalyzer` requires injected dependencies; the feature's
   * own factory (`constitutional-analysis-factory.ts`) owns that wiring.
   * We import the factory or a pre-built service singleton from the barrel.
   */
  private async runConstitutionalAnalysis(bill: Bill): Promise<{
    concerns: string[];
    riskLevel: string;
  } | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@server/features/constitutional-analysis') as any;

      // Prefer a ready-made service/factory singleton over the raw class
      const svc =
        mod.constitutionalAnalysisService ??
        mod.ConstitutionalAnalysisService ??
        mod.createConstitutionalAnalyzer?.() ??
        mod.default;

      if (!svc) return null;

      // AnalysisResult is a plain domain object, not a neverthrow Result
      const result = await svc.analyzeBill(bill.id);
      if (!result) return null;

      return {
        concerns: result.concerns ?? [],
        riskLevel: result.riskLevel ?? 'low',
      };
    } catch (error) {
      logger.debug({ error }, 'Constitutional analysis not available');
    }
    return null;
  }

  /**
   * Run market intelligence if feature is available.
   *
   * `@server/features/market` has no barrel index — we import directly from
   * the service module. The try/catch handles module-not-found at runtime.
   */
  private async runMarketIntelligence(bill: Bill): Promise<{
    economicImpact: string;
    affectedSectors: string[];
  } | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@server/features/market/market.service') as any;
      const svc = mod.marketIntelligenceService ?? mod.MarketService ?? mod.default;
      if (!svc) return null;

      const result = await svc.analyzeBill(bill.id);
      if (!result) return null;

      return {
        economicImpact: result.economicImpact ?? 'unknown',
        affectedSectors: result.affectedSectors ?? [],
      };
    } catch (error) {
      logger.debug({ error }, 'Market intelligence not available');
    }
    return null;
  }

  /**
   * Notify users interested in this bill.
   */
  private async notifyInterestedUsers(
    bill: Bill,
    analysis: Partial<BillAnalysisResult>,
  ): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@server/features/notifications') as any;
      // Exported as NotificationsService (class instance) or notificationsService
      const svc =
        mod.notificationsService ??
        mod.NotificationsService ??
        mod.default;

      if (!svc) return 0;

      const interestedUsers = await this.findInterestedUsers(bill);

      let count = 0;
      for (const userId of interestedUsers) {
        const message = this.buildNotificationMessage(bill, analysis);
        const result = await svc.sendNotification(userId, message, 'bill_update');
        // sendNotification may return a plain boolean, a count, or a Result — handle all
        if (result) count++;
      }

      return count;
    } catch (error) {
      logger.debug({ error }, 'Notifications not available');
      return 0;
    }
  }

  /**
   * Update recommendation engine with new bill.
   */
  private async updateRecommendations(bill: Bill): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@server/features/recommendation') as any;
      // Exported as RecommendationService (class instance) or recommendationService
      const svc =
        mod.recommendationService ??
        mod.RecommendationService ??
        mod.default;

      if (!svc) return false;

      logger.debug({ billId: bill.id }, 'Recommendation update triggered');

      // Call whatever update/recalculate method the service exposes, if any
      if (typeof svc.updateForBill === 'function') {
        await svc.updateForBill(bill.id);
      } else if (typeof svc.recalculate === 'function') {
        await svc.recalculate(bill.id);
      }

      return true;
    } catch (error) {
      logger.debug({ error }, 'Recommendations not available');
      return false;
    }
  }

  /**
   * Find users interested in this bill based on preferences.
   * Placeholder — production implementation queries user alert settings.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async findInterestedUsers(_bill: Bill): Promise<string[]> {
    return [];
  }

  /**
   * Build notification message from analysis results.
   */
  private buildNotificationMessage(
    bill: Bill,
    analysis: Partial<BillAnalysisResult>,
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