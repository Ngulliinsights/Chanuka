import { logger } from '@server/infrastructure/observability';
import { MLAnalysisService } from '@server/features/analytics/application/services/ml.service';

export class USSDMarketIntelligenceService {
  constructor() {
    logger.info('USSDMarketIntelligenceService initialized');
  }

  async getMarketInsights(query: string) {
    logger.info(`Getting market insights for ${query}`);
    try {
        // Connect to the analytics domain via the ML Analysis Service
        const analysis = await MLAnalysisService.analyzeBeneficiaries(query);
        const direct = analysis.result.directBeneficiaries?.join(', ') || 'None';
        const impact = analysis.result.impactAssessment?.economicImpact?.netBenefit || 'Unknown';
        
        // USSD string formatting (max 160 chars)
        let message = `Market Impact: Net ${impact}. Top orgs: ${direct}`;
        if (message.length > 160) message = message.substring(0, 157) + '...';

        return { status: 'success', insights: message };
    } catch (error) {
        logger.error({ error }, 'USSD Market Intelligence failed');
        return { status: 'error', insights: 'Analysis unavailable' };
    }
  }
}

export const ussdMarketIntelligenceService = new USSDMarketIntelligenceService();
