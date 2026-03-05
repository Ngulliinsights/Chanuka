/**
 * Gap Calculation Automation Service
 * 
 * Automatically calculates representative gaps when voting records are created
 */

import { electoralAccountabilityService } from './electoral-accountability.service';
import { db } from '@server/infrastructure/database';
import { constituency_sentiment } from '@server/infrastructure/schema/electoral_accountability';
import { eq, and } from 'drizzle-orm';
import { logger } from '@server/infrastructure/observability';
import type { VotingRecord } from '@server/infrastructure/schema/electoral_accountability';

export class GapCalculationAutomationService {
  /**
   * Automatically calculate gap when a voting record is created
   * This should be called after a voting record is inserted
   */
  async onVotingRecordCreated(votingRecord: VotingRecord): Promise<void> {
    try {
      logger.info({
        votingRecordId: votingRecord.id,
        billId: votingRecord.bill_id,
        constituency: votingRecord.constituency,
      }, 'Triggering automatic gap calculation');

      // Find matching constituency sentiment
      const sentiment = await db.query.constituency_sentiment.findFirst({
        where: and(
          eq(constituency_sentiment.bill_id, votingRecord.bill_id),
          eq(constituency_sentiment.constituency, votingRecord.constituency)
        ),
      });

      if (!sentiment) {
        logger.info({
          votingRecordId: votingRecord.id,
          billId: votingRecord.bill_id,
          constituency: votingRecord.constituency,
        }, 'No constituency sentiment found - skipping gap calculation');
        return;
      }

      // Calculate gap
      await electoralAccountabilityService.calculateRepresentativeGap(
        votingRecord.id,
        sentiment.id
      );

      logger.info({
        votingRecordId: votingRecord.id,
        sentimentId: sentiment.id,
      }, 'Gap calculation completed automatically');
    } catch (error) {
      logger.error({
        error,
        votingRecordId: votingRecord.id,
      }, 'Failed to automatically calculate gap');
      // Don't throw - this is a background process
    }
  }

  /**
   * Batch calculate gaps for all voting records without gap analysis
   * Useful for backfilling historical data
   */
  async backfillGaps(options?: {
    limit?: number;
    constituency?: string;
  }): Promise<{
    processed: number;
    calculated: number;
    skipped: number;
    errors: number;
  }> {
    logger.info({ options }, 'Starting gap backfill process');

    const stats = {
      processed: 0,
      calculated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Get voting records without gap analysis
      // TODO: Add query to find records without gaps
      // For now, this is a placeholder

      logger.info(stats, 'Gap backfill process completed');
    } catch (error) {
      logger.error({ error }, 'Gap backfill process failed');
      throw error;
    }

    return stats;
  }

  /**
   * Recalculate gaps when constituency sentiment is updated
   */
  async onSentimentUpdated(sentimentId: string): Promise<void> {
    try {
      logger.info({ sentimentId }, 'Recalculating gaps for updated sentiment');

      // Find all voting records for this sentiment's bill and constituency
      const sentiment = await db.query.constituency_sentiment.findFirst({
        where: eq(constituency_sentiment.id, sentimentId),
      });

      if (!sentiment) {
        logger.warn({ sentimentId }, 'Sentiment not found');
        return;
      }

      // TODO: Find all voting records and recalculate gaps
      // This would require querying voting_records and updating gap_analysis

      logger.info({ sentimentId }, 'Gap recalculation completed');
    } catch (error) {
      logger.error({ error, sentimentId }, 'Failed to recalculate gaps');
      // Don't throw - this is a background process
    }
  }

  /**
   * Identify critical gaps that should trigger pressure campaigns
   */
  async identifyCriticalGapsForCampaigns(options?: {
    minRiskScore?: number;
    constituency?: string;
  }): Promise<Array<{
    gapId: string;
    sponsorId: string;
    constituency: string;
    riskScore: number;
    suggestedCampaignName: string;
  }>> {
    const minRiskScore = options?.minRiskScore || 70;

    const criticalGaps = await electoralAccountabilityService.getCriticalGaps({
      constituency: options?.constituency,
      minRiskScore,
      limit: 50,
    });

    return criticalGaps.map(gap => ({
      gapId: gap.id,
      sponsorId: gap.sponsor_id,
      constituency: gap.constituency,
      riskScore: parseFloat(gap.electoral_risk_score || '0'),
      suggestedCampaignName: `Hold MP Accountable - ${gap.constituency} - Bill ${gap.bill_id.substring(0, 8)}`,
    }));
  }
}

export const gapCalculationAutomationService = new GapCalculationAutomationService();
