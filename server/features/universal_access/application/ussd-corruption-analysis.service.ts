import { logger } from '@server/infrastructure/observability';
import { conflictDetectionOrchestratorService } from '@server/features/analytics/domain/conflict-detection/conflict-detection-orchestrator.service';

export class USSDCorruptionAnalysisService {
  constructor() {
    logger.info({ component: 'server' }, 'USSDCorruptionAnalysisService initialized');
  }

  async analyzeCorruptionRisk(billId: string) {
    logger.info({ component: 'server' }, `Analyzing corruption risk for bill ${billId}`);
    try {
        // For this USSD adapter, we lookup the primary sponsor for the bill.
        // We mock sponsorId=1 here temporarily to connect the bounded contexts.
        const sponsorId = 1; 
        const numericBillId = parseInt(billId, 10);
        
        if (isNaN(numericBillId)) {
            return { status: 'error', riskLevel: 'unknown', message: 'Invalid Bill ID' };
        }

        // Call the powerful analytics orchestrator engine
        const result = await conflictDetectionOrchestratorService.performComprehensiveAnalysis(sponsorId, numericBillId);
        
        if (result.isErr) {
            return { status: 'error', riskLevel: 'unknown', message: 'Analysis failed' };
        }

        const risk = result.value.riskLevel;
        const confidence = (result.value.confidence * 100).toFixed(0);
        
        // USSD response formatting (max 160 characters)
        let message = `Bill ${billId} Risk: ${risk.toUpperCase()} (${confidence}% conf).`;
        if (result.value.financialConflicts.length > 0) {
            message += ` Found ${result.value.financialConflicts.length} financial flags.`;
        }

        if (message.length > 160) message = message.substring(0, 157) + '...';

        return { status: 'success', riskLevel: risk, message };
    } catch (error) {
        logger.error({ error, billId }, 'USSD Corruption Analysis failed');
        return { status: 'error', riskLevel: 'unknown', message: 'System error' };
    }
  }
}

export const ussdCorruptionAnalysisService = new USSDCorruptionAnalysisService();
