/**
 * Gap Calculation Automation Service
 * 
 * Automatically calculates representative gaps when voting records are created
 */

import { electoralAccountabilityService } from './electoral-accountability.service';
import { db } from '@server/infrastructure/database';
import { 
  constituency_sentiment, 
  representative_gap_analysis, 
  voting_records 
} from '@server/infrastructure/schema/electoral_accountability';
import { eq, and, isNull } from 'drizzle-orm';
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
      const conditions: any[] = [isNull(representative_gap_analysis.id)];
      if (options?.constituency) {
        conditions.push(eq(voting_records.constituency, options.constituency));
      }

      const query = db
        .select({
          id: voting_records.id,
          bill_id: voting_records.bill_id,
          constituency: voting_records.constituency,
        })
        .from(voting_records)
        .leftJoin(
          representative_gap_analysis,
          eq(voting_records.id, representative_gap_analysis.voting_record_id)
        )
        .where(and(...conditions));

      if (options?.limit) {
        query.limit(options.limit);
      }

      const recordsToProcess = await query;
      stats.processed = recordsToProcess.length;

      for (const record of recordsToProcess) {
        try {
          // Find matching sentiment
          const sentiment = await db.query.constituency_sentiment.findFirst({
            where: and(
              eq(constituency_sentiment.bill_id, record.bill_id),
              eq(constituency_sentiment.constituency, record.constituency)
            ),
          });

          if (!sentiment) {
            stats.skipped++;
            continue;
          }

          // Calculate gap
          await electoralAccountabilityService.calculateRepresentativeGap(
            record.id,
            sentiment.id
          );
          stats.calculated++;
        } catch (err) {
          logger.error({ error: err, votingRecordId: record.id }, 'Error calculating gap during backfill');
          stats.errors++;
        }
      }

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

      const records = await db
        .select({ id: voting_records.id })
        .from(voting_records)
        .where(
          and(
            eq(voting_records.bill_id, sentiment.bill_id),
            eq(voting_records.constituency, sentiment.constituency)
          )
        );

      for (const record of records) {
        await electoralAccountabilityService.calculateRepresentativeGap(
          record.id,
          sentiment.id
        );
      }

      logger.info({ sentimentId, recordsRecalculated: records.length }, 'Gap recalculation completed');
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
