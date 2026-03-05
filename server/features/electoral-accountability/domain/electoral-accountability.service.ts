/**
 * Electoral Accountability Service - Domain Logic
 * 
 * The core business logic for converting legislative transparency into electoral consequence.
 * This is the "primary feature" that distinguishes Chanuka from other civic platforms.
 */

import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from '@server/infrastructure/database';
import {
  voting_records,
  constituency_sentiment,
  representative_gap_analysis,
  electoral_pressure_campaigns,
  type VotingRecord,
  type ConstituencySentiment,
  type RepresentativeGapAnalysis,
  type ElectoralPressureCampaign,
} from '@server/infrastructure/schema/electoral_accountability';
import { logger } from '@server/infrastructure/observability';
import {
  GAP_SEVERITY_THRESHOLDS,
  GAP_SEVERITY_LABELS,
  ELECTORAL_RISK_MULTIPLIERS,
  ELECTORAL_RISK_THRESHOLDS,
  VOTE_SCORES,
  SENTIMENT_THRESHOLDS,
  SENTIMENT_POSITIONS,
  MISALIGNMENT_THRESHOLD,
} from './electoral-accountability.constants';
import {
  VotingRecordNotFoundError,
  SentimentNotFoundError,
  NoSentimentDataError,
} from './electoral-accountability.errors';
import {
  validateVote,
  validateSentimentScore,
  validateAlignmentGap,
  validateElectoralRisk,
  validateDateRange,
  sanitizeConstituency,
} from './electoral-accountability.validation';

export class ElectoralAccountabilityService {
  /**
   * Calculate the alignment gap between representative vote and constituency sentiment
   * This is the core metric that quantifies political cost
   */
  async calculateRepresentativeGap(
    votingRecordId: string,
    sentimentId: string
  ): Promise<RepresentativeGapAnalysis> {
    const votingRecord = await db.query.voting_records.findFirst({
      where: eq(voting_records.id, votingRecordId),
    });

    if (!votingRecord) {
      throw new VotingRecordNotFoundError(votingRecordId);
    }

    const sentiment = await db.query.constituency_sentiment.findFirst({
      where: eq(constituency_sentiment.id, sentimentId),
    });

    if (!sentiment) {
      throw new SentimentNotFoundError(votingRecord.bill_id, votingRecord.constituency);
    }

    // Validate inputs
    validateVote(votingRecord.vote);
    if (sentiment.sentiment_score !== null) {
      validateSentimentScore(parseFloat(sentiment.sentiment_score));
    }

    // Calculate alignment gap
    const alignmentGap = this.calculateAlignmentGap(
      votingRecord.vote,
      sentiment.sentiment_score
    );

    // Determine gap severity
    const gapSeverity = this.determineGapSeverity(alignmentGap);

    // Calculate electoral risk
    const electoralRiskScore = this.calculateElectoralRisk(
      alignmentGap,
      votingRecord.days_until_next_election,
      sentiment.total_responses
    );

    // Determine if misaligned
    const isMisaligned = this.isMisaligned(
      votingRecord.vote,
      sentiment.sentiment_score
    );

    const gapAnalysis = await db.insert(representative_gap_analysis).values({
      voting_record_id: votingRecordId,
      sentiment_id: sentimentId,
      alignment_gap: alignmentGap.toString(),
      gap_severity: gapSeverity,
      bill_id: votingRecord.bill_id,
      sponsor_id: votingRecord.sponsor_id,
      constituency: votingRecord.constituency,
      electoral_risk_score: electoralRiskScore.toString(),
      days_until_election: votingRecord.days_until_next_election,
      constituent_position: this.getConstituentPosition(sentiment.sentiment_score),
      representative_vote: votingRecord.vote,
      is_misaligned: isMisaligned,
    }).returning();

    logger.info({
      votingRecordId,
      sentimentId,
      alignmentGap,
      gapSeverity,
      electoralRiskScore,
    }, 'Representative gap calculated');

    return gapAnalysis[0];
  }

  /**
   * Get MP voting record mapped to their constituency
   * This is the foundation of electoral accountability
   */
  async getMPVotingRecord(
    sponsorId: string,
    options?: {
      constituency?: string;
      startDate?: Date;
      endDate?: Date;
      includeGapAnalysis?: boolean;
    }
  ): Promise<VotingRecord[]> {
    // Validate date range if both provided
    if (options?.startDate && options?.endDate) {
      validateDateRange(options.startDate, options.endDate);
    }

    // Sanitize constituency if provided
    const constituency = options?.constituency 
      ? sanitizeConstituency(options.constituency)
      : undefined;

    const conditions = [eq(voting_records.sponsor_id, sponsorId)];

    if (constituency) {
      conditions.push(eq(voting_records.constituency, constituency));
    }

    if (options?.startDate) {
      conditions.push(gte(voting_records.vote_date, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(voting_records.vote_date, options.endDate));
    }

    const records = await db.query.voting_records.findMany({
      where: and(...conditions),
      orderBy: [desc(voting_records.vote_date)],
      with: options?.includeGapAnalysis ? {
        gapAnalyses: true,
      } : undefined,
    });

    return records;
  }

  /**
   * Get constituency sentiment for a bill
   * Aggregated ward-level data showing what constituents actually want
   */
  async getConstituencySentiment(
    billId: string,
    constituency: string
  ): Promise<ConstituencySentiment | null> {
    const sanitizedConstituency = sanitizeConstituency(constituency);

    const sentiment = await db.query.constituency_sentiment.findFirst({
      where: and(
        eq(constituency_sentiment.bill_id, billId),
        eq(constituency_sentiment.constituency, sanitizedConstituency)
      ),
    });

    return sentiment || null;
  }

  /**
   * Get critical gaps - high electoral risk misalignments
   * These are the votes that should become campaign material
   */
  async getCriticalGaps(options?: {
    constituency?: string;
    sponsorId?: string;
    minRiskScore?: number;
    limit?: number;
  }): Promise<RepresentativeGapAnalysis[]> {
    const conditions = [
      inArray(representative_gap_analysis.gap_severity, ['high', 'critical']),
    ];

    if (options?.constituency) {
      conditions.push(eq(representative_gap_analysis.constituency, options.constituency));
    }

    if (options?.sponsorId) {
      conditions.push(eq(representative_gap_analysis.sponsor_id, options.sponsorId));
    }

    if (options?.minRiskScore) {
      conditions.push(
        gte(representative_gap_analysis.electoral_risk_score, options.minRiskScore.toString())
      );
    }

    const gaps = await db.query.representative_gap_analysis.findMany({
      where: and(...conditions),
      orderBy: [desc(representative_gap_analysis.electoral_risk_score)],
      limit: options?.limit || 50,
      with: {
        votingRecord: true,
        sentiment: true,
        bill: true,
        sponsor: true,
      },
    });

    return gaps;
  }

  /**
   * Create electoral pressure campaign
   * Organized accountability action targeting specific misalignments
   */
  async createPressureCampaign(data: {
    campaignName: string;
    description: string;
    targetSponsorId: string;
    targetConstituency: string;
    targetCounty: string;
    triggeredByBillId?: string;
    triggeredByGapId?: string;
    createdBy: string;
  }): Promise<ElectoralPressureCampaign> {
    const slug = this.generateCampaignSlug(data.campaignName);

    const campaign = await db.insert(electoral_pressure_campaigns).values({
      campaign_name: data.campaignName,
      campaign_slug: slug,
      description: data.description,
      target_sponsor_id: data.targetSponsorId,
      target_constituency: data.targetConstituency,
      target_county: data.targetCounty,
      triggered_by_bill_id: data.triggeredByBillId,
      triggered_by_gap_id: data.triggeredByGapId,
      created_by: data.createdBy,
    }).returning();

    logger.info({
      campaignId: campaign[0].id,
      targetSponsorId: data.targetSponsorId,
      constituency: data.targetConstituency,
    }, 'Electoral pressure campaign created');

    return campaign[0];
  }

  /**
   * Get MP accountability scorecard
   * Comprehensive view of alignment with constituency over time
   */
  async getMPAccountabilityScorecard(
    sponsorId: string,
    constituency: string
  ): Promise<{
    totalVotes: number;
    alignedVotes: number;
    misalignedVotes: number;
    alignmentPercentage: number;
    averageGap: number;
    criticalGaps: number;
    activeCampaigns: number;
    electoralRiskScore: number;
  }> {
    const votes = await this.getMPVotingRecord(sponsorId, {
      constituency,
      includeGapAnalysis: true,
    });

    const gaps = await db.query.representative_gap_analysis.findMany({
      where: and(
        eq(representative_gap_analysis.sponsor_id, sponsorId),
        eq(representative_gap_analysis.constituency, constituency)
      ),
    });

    const campaigns = await db.query.electoral_pressure_campaigns.findMany({
      where: and(
        eq(electoral_pressure_campaigns.target_sponsor_id, sponsorId),
        eq(electoral_pressure_campaigns.target_constituency, constituency),
        eq(electoral_pressure_campaigns.status, 'active')
      ),
    });

    const totalVotes = votes.length;
    const misalignedVotes = gaps.filter(g => g.is_misaligned).length;
    const alignedVotes = totalVotes - misalignedVotes;
    const alignmentPercentage = totalVotes > 0 ? (alignedVotes / totalVotes) * 100 : 0;

    const averageGap = gaps.length > 0
      ? gaps.reduce((sum, g) => sum + parseFloat(g.alignment_gap), 0) / gaps.length
      : 0;

    const criticalGaps = gaps.filter(g =>
      g.gap_severity === 'high' || g.gap_severity === 'critical'
    ).length;

    const electoralRiskScore = this.calculateOverallElectoralRisk(gaps);

    return {
      totalVotes,
      alignedVotes,
      misalignedVotes,
      alignmentPercentage,
      averageGap,
      criticalGaps,
      activeCampaigns: campaigns.length,
      electoralRiskScore,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateAlignmentGap(vote: string, sentimentScore: number): number {
    // Validate inputs
    validateVote(vote);
    validateSentimentScore(sentimentScore);

    // Convert vote to numeric scale
    const voteScore = this.voteToScore(vote);
    
    // Sentiment score is -100 to +100, normalize to 0-100
    const normalizedSentiment = (sentimentScore + 100) / 2;
    
    // Calculate absolute difference
    const gap = Math.abs(voteScore - normalizedSentiment);
    
    const result = Math.round(gap * 100) / 100;
    validateAlignmentGap(result);
    
    return result;
  }

  private voteToScore(vote: string): number {
    const normalizedVote = vote.toLowerCase();
    
    switch (normalizedVote) {
      case 'yes': return VOTE_SCORES.YES;
      case 'no': return VOTE_SCORES.NO;
      case 'abstain': return VOTE_SCORES.ABSTAIN;
      case 'absent': return VOTE_SCORES.ABSENT;
      default: return VOTE_SCORES.ABSTAIN; // Default to neutral
    }
  }

  private determineGapSeverity(gap: number): string {
    if (gap >= GAP_SEVERITY_THRESHOLDS.CRITICAL) return GAP_SEVERITY_LABELS.CRITICAL;
    if (gap >= GAP_SEVERITY_THRESHOLDS.HIGH) return GAP_SEVERITY_LABELS.HIGH;
    if (gap >= GAP_SEVERITY_THRESHOLDS.MEDIUM) return GAP_SEVERITY_LABELS.MEDIUM;
    return GAP_SEVERITY_LABELS.LOW;
  }

  private calculateElectoralRisk(
    alignmentGap: number,
    daysUntilElection: number | null,
    sampleSize: number
  ): number {
    let risk = alignmentGap;

    // Increase risk as election approaches
    if (daysUntilElection !== null) {
      if (daysUntilElection <= ELECTORAL_RISK_THRESHOLDS.FINAL_YEAR_DAYS) {
        risk *= ELECTORAL_RISK_MULTIPLIERS.FINAL_YEAR;
      } else if (daysUntilElection <= ELECTORAL_RISK_THRESHOLDS.SECOND_YEAR_DAYS) {
        risk *= ELECTORAL_RISK_MULTIPLIERS.SECOND_YEAR;
      }
    }

    // Adjust for sample size confidence
    if (sampleSize < ELECTORAL_RISK_THRESHOLDS.LOW_CONFIDENCE_SAMPLE) {
      risk *= ELECTORAL_RISK_MULTIPLIERS.LOW_CONFIDENCE;
    } else if (sampleSize > ELECTORAL_RISK_THRESHOLDS.HIGH_CONFIDENCE_SAMPLE) {
      risk *= ELECTORAL_RISK_MULTIPLIERS.HIGH_CONFIDENCE;
    }

    const result = Math.min(Math.round(risk * 100) / 100, 100);
    validateElectoralRisk(result);
    
    return result;
  }

  private isMisaligned(vote: string, sentimentScore: number): boolean {
    const voteScore = this.voteToScore(vote);
    const normalizedSentiment = (sentimentScore + 100) / 2;
    
    // Misaligned if vote and sentiment are on opposite sides of neutral
    return Math.abs(voteScore - normalizedSentiment) > MISALIGNMENT_THRESHOLD;
  }

  private getConstituentPosition(sentimentScore: number): string {
    if (sentimentScore > SENTIMENT_THRESHOLDS.SUPPORT) return SENTIMENT_POSITIONS.SUPPORT;
    if (sentimentScore < SENTIMENT_THRESHOLDS.OPPOSE) return SENTIMENT_POSITIONS.OPPOSE;
    return SENTIMENT_POSITIONS.NEUTRAL;
  }

  private calculateOverallElectoralRisk(gaps: RepresentativeGapAnalysis[]): number {
    if (gaps.length === 0) return 0;

    const totalRisk = gaps.reduce((sum, gap) => {
      return sum + parseFloat(gap.electoral_risk_score || '0');
    }, 0);

    return Math.round((totalRisk / gaps.length) * 100) / 100;
  }

  private generateCampaignSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now();
  }
}

export const electoralAccountabilityService = new ElectoralAccountabilityService();
