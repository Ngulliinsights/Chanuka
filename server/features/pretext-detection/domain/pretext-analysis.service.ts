/**
 * Pretext Analysis Service
 * 
 * Domain service for analyzing bills for pretext indicators
 */

import { logger } from '@server/infrastructure/observability';
import { TrojanBillDetector } from '@server/features/ml/models/trojan-bill-detector';
import type { PretextAnalysisInput, PretextAnalysisResult, PretextDetection } from './types';

export class PretextAnalysisService {
  private detector: TrojanBillDetector;

  constructor() {
    this.detector = new TrojanBillDetector();
  }

  /**
   * Analyze a bill for pretext indicators
   */
  async analyzeBill(input: PretextAnalysisInput): Promise<PretextAnalysisResult> {
    try {
      logger.info({
        component: 'PretextAnalysisService',
        billId: input.billId
      }, 'Starting pretext analysis');

      // Get bill data (mock for now - will integrate with bill service)
      const billData = await this.getBillData(input.billId);

      // Run ML detection
      const mlResult = await this.detector.analyze({
        billId: input.billId,
        text: billData.text,
        title: billData.title,
        metadata: {
          sponsor: billData.sponsor,
          committee: billData.committee,
          stage: billData.stage
        }
      });

      // Convert ML results to domain format
      const detections: PretextDetection[] = mlResult.detections.map(d => ({
        type: d.type,
        severity: this.mapSeverity(d.severity),
        description: d.description,
        evidence: d.evidence || [],
        confidence: d.confidence
      }));

      const result: PretextAnalysisResult = {
        billId: input.billId,
        detections,
        score: mlResult.riskScore,
        confidence: mlResult.confidence,
        analyzedAt: new Date()
      };

      logger.info({
        component: 'PretextAnalysisService',
        billId: input.billId,
        score: result.score,
        detectionsCount: detections.length
      }, 'Pretext analysis completed');

      return result;
    } catch (error) {
      logger.error({
        component: 'PretextAnalysisService',
        billId: input.billId,
        error
      }, 'Pretext analysis failed');
      throw error;
    }
  }

  /**
   * Get bill data (mock implementation - will integrate with bill service)
   */
  private async getBillData(billId: string): Promise<any> {
    // TODO: Integrate with actual bill service
    return {
      id: billId,
      title: 'Sample Bill Title',
      text: 'Sample bill text for analysis...',
      sponsor: 'Sample Sponsor',
      committee: 'Sample Committee',
      stage: 'First Reading'
    };
  }

  /**
   * Map ML severity to domain severity
   */
  private mapSeverity(mlSeverity: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    return severityMap[mlSeverity.toLowerCase()] || 'medium';
  }
}
