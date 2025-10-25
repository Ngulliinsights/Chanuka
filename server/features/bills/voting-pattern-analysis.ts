import { readDatabase } from '../../../shared/database/connection.js';
import * as schema from '../../../shared/schema';
import { sponsorService } from '../sponsors/infrastructure/repositories/sponsor.repository.js';
import { eq, and, sql, desc, asc, count, avg, inArray, or, notInArray } from 'drizzle-orm';
import { logger } from '@shared/core';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
// These interfaces define the shape of our data structures throughout the service.
// They provide type safety and serve as documentation for what data flows through
// each part of the system.

export interface VotingPatternAnalysis {
  sponsorId: number;
  sponsorName: string;
  totalVotes: number;
  votingConsistency: number; // Score 0-1 representing how consistently they vote within categories
  partyAlignment: number; // Score 0-1 representing alignment with party positions
  issueAlignment: Record<string, number>; // Category -> Alignment Score (0-1)
  predictedVotes: VotingPrediction[];
  behaviorMetrics: VotingBehaviorMetrics;
  anomalies: VotingAnomaly[];
}

export interface VotingPrediction {
  billId: number;
  billTitle: string;
  predictedVote: 'yes' | 'no' | 'abstain';
  confidence: number; // 0-1 score indicating prediction confidence
  reasoningFactors: string[]; // Human-readable explanations for the prediction
  similarBills: number[]; // Bill IDs used to inform this prediction
}

export interface VotingBehaviorMetrics {
  consistencyScore: number; // How consistent votes are within issue categories
  independenceScore: number; // How often votes differ from party position
  issueSpecializationScore: number; // Concentration of votes in specific categories (0-1)
  flipFlopRate: number; // Frequency of position changes on similar issues
  abstentionRate: number; // Proportion of abstentions vs yes/no votes
  crossPartyVotingRate: number; // Rate of voting against party position
}

export interface VotingAnomaly {
  billId: number;
  billTitle: string;
  expectedVote: 'yes' | 'no' | 'abstain';
  actualVote: 'yes' | 'no' | 'abstain';
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  contextFactors: string[];
}

export interface ComparativeAnalysis {
  sponsorId: number;
  comparedWith: number[]; // IDs of sponsors compared against
  alignmentScores: Record<number, number>; // SponsorId -> alignment score (0-1)
  commonVotingPatterns: VotingPattern[];
  divergentIssues: string[]; // Issue categories where voting significantly differs
  coalitionStrength: number; // Overall alignment with comparison group (0-1)
}

export interface VotingPattern {
  pattern: string; // Description of the pattern (e.g., "yes_vote_on_healthcare")
  frequency: number; // How often this pattern occurs
  sponsors: number[]; // Sponsor IDs exhibiting this pattern
  categories: string[]; // Issue categories involved
  strength: number; // How strongly this pattern holds (0-1)
}

export interface VotingConsistencyReport {
  sponsorId: number;
  timeframe: string; // Description of analysis period (e.g., "12 months")
  consistencyTrend: 'improving' | 'declining' | 'stable';
  consistencyScore: number; // Overall consistency score (0-1)
  keyFactors: ConsistencyFactor[];
  recommendations: string[]; // Actionable insights based on analysis
}

export interface ConsistencyFactor {
  factor: string; // Name of the factor (e.g., "Party Alignment")
  impact: number; // Magnitude of impact on consistency (0-1)
  description: string; // Human-readable explanation
  trend: 'positive' | 'negative' | 'neutral';
}

export type AnomalyType = 
  | 'party_deviation'
  | 'issue_inconsistency'
  | 'financial_conflict'
  | 'timing_suspicious'
  | 'coalition_break'
  | 'ideology_shift';

/**
 * CRITICAL NOTE: This interface represents data that SHOULD come from an external,
 * real-world source (e.g., parliamentary voting records API, legislative database).
 * 
 * Currently, the system generates synthetic data as a fallback, but the entire
 * architecture is designed to accept real data through the getVotingRecords method.
 */
export interface VotingRecord {
  sponsorId: number;
  billId: number;
  vote: 'yes' | 'no' | 'abstain';
  voteDate: Date;
  billCategory: string; // Must match bill.category
  partyPosition?: 'yes' | 'no' | 'abstain'; // Requires real data source for party positions
  confidence?: number; // Optional confidence score for synthetic records
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

/**
 * Service for comprehensive voting pattern analysis of legislative sponsors.
 * 
 * ARCHITECTURAL OVERVIEW:
 * This service is designed with a clean separation between data acquisition and
 * analysis logic. The getVotingRecords method serves as the single integration
 * point for real voting data. All analysis methods work with the VotingRecord
 * interface, making them agnostic to whether data is real or synthetic.
 * 
 * DATA INTEGRATION STRATEGY:
 * Currently relies on synthetic voting data generation when real data is unavailable.
 * To integrate real data:
 * 1. Implement getVotingRecords to fetch from your data source
 * 2. Optionally remove generateSyntheticVotingRecords method
 * 3. All analysis logic will automatically work with real data
 * 
 * The synthetic data generation uses statistical patterns to create realistic
 * voting behaviors, but should be replaced with actual voting records for
 * production use.
 */
export class VotingPatternAnalysisService {
  // Using a getter ensures we always have a fresh database connection
  // This prevents stale connection issues and makes the code more resilient
  private get db() {
  const d = readDatabase;
    if (!d) {
      throw new Error('Database not initialized for VotingPatternAnalysisService');
    }
    return d;
  }

  // Configuration thresholds for scoring and classification
  // These can be adjusted based on domain requirements
  private readonly consistencyThresholds = {
    high: 0.85,    // 85%+ consistency is considered high
    medium: 0.65,  // 65-85% is medium
    low: 0.45      // Below 45% is low consistency
  };

  private readonly anomalyThresholds = {
    severe: 0.9,   // 90%+ deviation is severe
    moderate: 0.7, // 70-90% is moderate
    minor: 0.5     // 50-70% is minor
  };

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Analyzes voting patterns for one or all active sponsors.
   * 
   * This is the primary entry point for pattern analysis. It performs a comprehensive
   * analysis including consistency scoring, party alignment, issue alignment, predictions,
   * behavioral metrics, and anomaly detection.
   * 
   * @param sponsorId - Optional specific sponsor to analyze; if omitted, analyzes all active sponsors
   * @returns Array of comprehensive voting pattern analyses, sorted by total votes
   */
  async analyzeVotingPatterns(sponsorId?: number): Promise<VotingPatternAnalysis[]> {
    logger.info(`📊 Analyzing voting patterns for ${sponsorId ? `sponsor ${sponsorId}` : 'all active sponsors'}.`);
    
    const sponsorsToAnalyze = await (sponsorId 
      ? this.getSponsorById(sponsorId) 
      : this.getAllActiveSponsors());

    if (!sponsorsToAnalyze || sponsorsToAnalyze.length === 0) {
      logger.warn(`No sponsors found for voting pattern analysis.`);
      return [];
    }

    const analyses: VotingPatternAnalysis[] = [];

    for (const sponsor of sponsorsToAnalyze) {
      try {
        // DATA INTEGRATION POINT: This is where real voting records would be fetched
        let votingRecords = await this.getVotingRecords(sponsor.id);
        const sponsorships = await this.getSponsorBills(sponsor.id);

        // Fallback to synthetic data if no real records exist
        // In production with real data, this branch would rarely execute
        if (votingRecords.length === 0) {
          logger.warn(`No real voting records found for sponsor ${sponsor.id}. Generating SYNTHETIC data.`);
          votingRecords = await this.generateSyntheticVotingRecords(sponsor.id, sponsorships);
          
          if (votingRecords.length === 0) {
            logger.warn(`Could not generate synthetic data for sponsor ${sponsor.id}. Skipping analysis.`);
            continue;
          }
        }

        // Build comprehensive analysis using all available methods
        const analysis: VotingPatternAnalysis = {
          sponsorId: sponsor.id,
          sponsorName: sponsor.name,
          totalVotes: votingRecords.length,
          votingConsistency: this.calculateVotingConsistency(votingRecords),
          partyAlignment: this.calculatePartyAlignment(sponsor, votingRecords),
          issueAlignment: this.calculateIssueAlignment(votingRecords),
          predictedVotes: await this.generateVotingPredictions(sponsor, votingRecords),
          behaviorMetrics: this.calculateBehaviorMetrics(votingRecords),
          anomalies: await this.detectVotingAnomalies(sponsor, votingRecords)
        };

        analyses.push(analysis);
      } catch (error) {
        logger.error(
          `Error analyzing voting patterns for sponsor ${sponsor.id}:`,
          { component: 'VotingPatternAnalysis' },
          error
        );
      }
    }

    logger.info(`✅ Completed voting pattern analysis for ${analyses.length} sponsors.`);
    return analyses.sort((a, b) => b.totalVotes - a.totalVotes);
  }

  /**
   * Creates voting predictions for upcoming bills for a specific sponsor.
   * 
   * This method can be used to predict how a sponsor will vote on specific bills
   * or on a set of upcoming bills. Predictions are based on historical voting patterns,
   * party alignment, and issue categorization.
   * 
   * @param sponsorId - The sponsor to generate predictions for
   * @param upcomingBillIds - Optional specific bills to predict; if omitted, predicts for upcoming bills
   * @returns Array of predictions sorted by confidence (highest first)
   */
  async createVotingPredictions(
    sponsorId: number,
    upcomingBillIds?: number[]
  ): Promise<VotingPrediction[]> {
    logger.info(`🔮 Creating voting predictions for sponsor ${sponsorId}.`);
    
    const sponsorArr = await this.getSponsorById(sponsorId);
    if (!sponsorArr || sponsorArr.length === 0) {
      throw new Error(`Sponsor ${sponsorId} not found.`);
    }
    const sponsor = sponsorArr[0];

    // Get historical voting records for pattern analysis
    let votingRecords = await this.getVotingRecords(sponsorId);
    
    // Use synthetic data if no real records available
    if (votingRecords.length === 0) {
      logger.warn(`No real voting records for prediction (Sponsor ${sponsorId}), using synthetic.`);
      const sponsorships = await this.getSponsorBills(sponsorId);
      votingRecords = await this.generateSyntheticVotingRecords(sponsorId, sponsorships);
    }

    // Determine which bills to predict
    const billIdsToPredict = upcomingBillIds ?? await this.getUpcomingBillIds();
    const predictions: VotingPrediction[] = [];

    for (const billId of billIdsToPredict) {
      try {
        const bill = await this.getBill(billId);
        if (!bill) {
          logger.warn(`Bill ${billId} not found for prediction.`);
          continue;
        }
        
        const prediction = await this.predictVoteForBill(sponsor, bill, votingRecords);
        predictions.push(prediction);
      } catch (error) {
        logger.error(
          `Error predicting vote for bill ${billId}, sponsor ${sponsorId}:`,
          { component: 'VotingPatternAnalysis' },
          error
        );
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Build comparative analysis tools for sponsor alignment.
   * 
   * This method performs deep comparative analysis between sponsors to identify
   * voting coalitions, common patterns, and divergent positions. It's particularly
   * useful for understanding political alliances and predicting coalition behavior.
   * 
   * @param sponsorId - The primary sponsor to analyze
   * @param comparisonSponsors - Optional specific sponsors to compare with; if omitted, finds similar sponsors
   * @returns Comprehensive comparative analysis including alignment scores and patterns
   */
  async buildComparativeAnalysis(
    sponsorId: number,
    comparisonSponsors?: number[]
  ): Promise<ComparativeAnalysis> {
    logger.info(`🔍 Building comparative analysis for sponsor ${sponsorId}.`);
    
    const targetSponsor = await this.getSponsorById(sponsorId);
    if (!targetSponsor || targetSponsor.length === 0) {
      throw new Error(`Sponsor with ID ${sponsorId} not found`);
    }

    const targetVotingRecords = await this.getVotingRecords(sponsorId);
    
    // If no real records, use synthetic for consistent analysis
    let finalTargetRecords = targetVotingRecords;
    if (targetVotingRecords.length === 0) {
      const sponsorships = await this.getSponsorBills(sponsorId);
      finalTargetRecords = await this.generateSyntheticVotingRecords(sponsorId, sponsorships);
    }
    
    // Find sponsors to compare with
    // If not specified, automatically find similar sponsors (same party, active status)
    const sponsorsToCompare = comparisonSponsors || 
      await this.findSimilarSponsors(sponsorId, 5);

    const alignmentScores: Record<number, number> = {};
    const allVotingRecords: Record<number, VotingRecord[]> = {
      [sponsorId]: finalTargetRecords
    };

    // Gather voting records for all comparison sponsors
    for (const compareSponsorId of sponsorsToCompare) {
      let records = await this.getVotingRecords(compareSponsorId);
      
      if (records.length === 0) {
        const sponsorships = await this.getSponsorBills(compareSponsorId);
        records = await this.generateSyntheticVotingRecords(compareSponsorId, sponsorships);
      }
      
      allVotingRecords[compareSponsorId] = records;
      
      // Calculate alignment score between target and this comparison sponsor
      alignmentScores[compareSponsorId] = await this.calculateAlignmentScore(
        finalTargetRecords,
        records
      );
    }

    // Identify common voting patterns across all sponsors
    const commonPatterns = await this.identifyCommonVotingPatterns(
      [sponsorId, ...sponsorsToCompare],
      allVotingRecords
    );

    // Find issues where the target sponsor diverges from the comparison group
    const divergentIssues = await this.identifyDivergentIssues(
      finalTargetRecords,
      Object.values(allVotingRecords).flat()
    );

    // Calculate overall coalition strength
    const coalitionStrength = this.calculateCoalitionStrength(alignmentScores);

    return {
      sponsorId,
      comparedWith: sponsorsToCompare,
      alignmentScores,
      commonVotingPatterns: commonPatterns,
      divergentIssues,
      coalitionStrength
    };
  }

  /**
   * Implement voting consistency scoring with temporal analysis.
   * 
   * This method tracks consistency over time to identify trends and patterns.
   * It breaks down consistency into quarterly segments to detect whether a sponsor's
   * voting behavior is becoming more or less consistent over time.
   * 
   * @param sponsorId - The sponsor to analyze
   * @param timeframeMonths - How many months back to analyze (default 12)
   * @returns Comprehensive consistency report with trend analysis and recommendations
   */
  async calculateVotingConsistencyScore(
    sponsorId: number,
    timeframeMonths: number = 12
  ): Promise<VotingConsistencyReport> {
    logger.info(`📈 Calculating voting consistency score for sponsor ${sponsorId} over ${timeframeMonths} months.`);
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - timeframeMonths);

    const votingRecords = await this.getVotingRecords(sponsorId, startDate);
    const sponsor = await this.getSponsorById(sponsorId);
    
    if (!sponsor || sponsor.length === 0) {
      throw new Error(`Sponsor with ID ${sponsorId} not found`);
    }

    // Use synthetic data if needed, but ensure date filtering is applied
    let finalRecords = votingRecords;
    if (votingRecords.length === 0) {
      const sponsorships = await this.getSponsorBills(sponsorId);
      const syntheticRecords = await this.generateSyntheticVotingRecords(sponsorId, sponsorships);
      // Filter synthetic records to match timeframe
      finalRecords = syntheticRecords.filter(r => r.voteDate >= startDate);
    }

    // Calculate consistency metrics over different time periods
    const quarterlyConsistency = await this.calculateQuarterlyConsistency(finalRecords);
    const overallConsistency = this.calculateVotingConsistency(finalRecords);
    
    // Determine if consistency is improving, declining, or stable
    const trend = this.determineTrend(quarterlyConsistency);
    
    // Identify what factors are influencing consistency
    const keyFactors = await this.identifyConsistencyFactors(sponsorId, finalRecords);
    
    // Generate actionable recommendations based on the analysis
    const recommendations = this.generateConsistencyRecommendations(
      overallConsistency,
      keyFactors,
      trend
    );

    return {
      sponsorId,
      timeframe: `${timeframeMonths} months`,
      consistencyTrend: trend,
      consistencyScore: overallConsistency,
      keyFactors,
      recommendations
    };
  }

  // ============================================================================
  // PRIVATE DATABASE ACCESS METHODS
  // ============================================================================
  // These methods handle all database queries and provide a clean abstraction
  // layer between the database and business logic.

  private async getSponsorById(sponsorId: number): Promise<schema.Sponsor[] | null> {
    try {
      return await this.db.select()
        .from(schema.sponsors)
        .where(eq(schema.sponsors.id, sponsorId));
    } catch (error) {
      logger.error(
        `Error fetching sponsor ${sponsorId}:`,
        { component: 'VotingPatternAnalysis' },
        error
      );
      return null;
    }
  }

  private async getAllActiveSponsors(): Promise<schema.Sponsor[]> {
    try {
      return await this.db.select()
        .from(schema.sponsors)
        .where(eq(schema.sponsors.isActive, true));
    } catch (error) {
      logger.error(
        `Error fetching active sponsors:`,
        { component: 'VotingPatternAnalysis' },
        error
      );
      return [];
    }
  }

  private async getSponsorBills(sponsorId: number): Promise<schema.BillSponsorship[]> {
    try {
      return await this.db.select()
        .from(schema.billSponsorships)
        .where(and(
          eq(schema.billSponsorships.sponsorId, sponsorId),
          eq(schema.billSponsorships.isActive, true)
        ));
    } catch (error) {
      logger.error(
        `Error fetching bills for sponsor ${sponsorId}:`,
        { component: 'VotingPatternAnalysis' },
        error
      );
      return [];
    }
  }

  private async getBill(billId: number): Promise<schema.Bill | null> {
    try {
      const result = await this.db.select()
        .from(schema.bills)
        .where(eq(schema.bills.id, billId));
      return result[0] || null;
    } catch (error) {
      logger.error(
        `Error fetching bill ${billId}:`,
        { component: 'VotingPatternAnalysis' },
        error
      );
      return null;
    }
  }

  private async getUpcomingBillIds(): Promise<number[]> {
    try {
      const upcoming = await this.db.select({ id: schema.bills.id })
        .from(schema.bills)
        .where(or(
          eq(schema.bills.status, 'introduced'),
          eq(schema.bills.status, 'committee')
        ))
        .orderBy(desc(schema.bills.lastActionDate), desc(schema.bills.introducedDate))
        .limit(20);
      
      return upcoming.map(b => b.id);
    } catch (error) {
      logger.error(
        "Error fetching upcoming bill IDs:",
        { component: 'VotingPatternAnalysis' },
        error
      );
      return [];
    }
  }

  // ============================================================================
  // DATA INTEGRATION POINT - VOTING RECORDS
  // ============================================================================

  /**
   * *** PRIMARY DATA INTEGRATION POINT ***
   * 
   * Fetches real voting records from an external source or internal table.
   * 
   * IMPLEMENTATION GUIDE:
   * To integrate real voting data, implement this method to:
   * 1. Query your voting records database/API
   * 2. Filter by sponsorId and optional startDate
   * 3. Transform the raw data into VotingRecord objects
   * 4. Handle errors gracefully (return empty array on failure)
   * 
   * EXAMPLE INTEGRATION:
   * ```typescript
   * try {
   *   const query = buildVotingRecordQuery(sponsorId, startDate);
   *   const rawRecords = await externalDb.query(query);
   *   return rawRecords.map(raw => ({
   *     sponsorId: raw.sponsor_id,
   *     billId: raw.bill_id,
   *     vote: raw.vote_choice,
   *     voteDate: new Date(raw.voted_at),
   *     billCategory: raw.category,
   *     partyPosition: raw.party_position
   *   }));
   * } catch (error) {
   *   logger.error(`Failed to fetch voting records:`, error);
   *   return [];
   * }
   * ```
   * 
   * Currently returns empty array to trigger synthetic data generation as fallback.
   */
  private async getVotingRecords(
    sponsorId: number,
    startDate?: Date
  ): Promise<VotingRecord[]> {
    logger.debug(`Fetching voting records for sponsor ${sponsorId}. Attempting to read real records and falling back to synthetic if unavailable.`);

    try {
      // If a voting records table exists in the shared schema, use it.
      // This keeps the implementation flexible: when such a table is added to the schema
      // the code will automatically start returning real records.
      const votingTable: any = (schema as any).votingRecord || (schema as any).voting_records || (schema as any).legislative_vote || (schema as any).voting_record;

      if (votingTable) {
        // Build base query
        let q: any = this.db.select()
          .from(votingTable)
          .where(eq(votingTable.sponsorId || votingTable.sponsor_id || votingTable.sponsor, sponsorId));

        if (startDate) {
          const col = votingTable.voteDate || votingTable.voted_at || votingTable.vote_date || votingTable.votedAt;
          if (col) q = q.where(col, (d: any) => d >= startDate); // best-effort; if driver supports this shape
        }

        const rawRecords: any[] = await q;
        if (rawRecords && rawRecords.length > 0) {
          return rawRecords.map(r => ({
            sponsorId: sponsorId,
            billId: r.billId || r.bill_id || r.bill || r.billId,
            vote: (r.vote || r.vote_choice || r.choice || r.voted || 'abstain') as 'yes' | 'no' | 'abstain',
            voteDate: new Date(r.voteDate || r.voted_at || r.vote_date || r.votedAt || Date.now()),
            billCategory: r.billCategory || r.category || r.issue || 'general',
            partyPosition: r.partyPosition || r.party_position || undefined,
            confidence: typeof r.confidence === 'number' ? r.confidence : undefined
          } as VotingRecord));
        }
      }
    } catch (err) {
      logger.debug(`Real voting records read failed or table not present for sponsor ${sponsorId}: ${String(err)}`);
      // Fall through to synthetic generation
    }

    // Fallback: generate synthetic records using existing helper so analysis can proceed
    try {
      const sponsorships = await this.getSponsorBills(sponsorId);
      return await this.generateSyntheticVotingRecords(sponsorId, sponsorships);
    } catch (genErr) {
      logger.error(`Failed to generate synthetic voting records for sponsor ${sponsorId}:`, genErr);
      return [];
    }
  }

  // ============================================================================
  // SYNTHETIC DATA GENERATION
  // ============================================================================

  /**
   * *** SYNTHETIC DATA GENERATION LOGIC ***
   * 
   * This method generates realistic voting records based on sponsorship patterns
   * and statistical modeling. It should be removed or disabled once real voting
   * data is available through getVotingRecords.
   * 
   * GENERATION STRATEGY:
   * 1. Sponsors always vote "yes" on their sponsored bills (100% support)
   * 2. For non-sponsored bills, voting is probabilistically determined by:
   *    - Party alignment score (higher = more likely to vote with party)
   *    - Random variation to simulate real-world complexity
   *    - Issue category patterns
   * 
   * The generated data is statistically realistic but should not be used for
   * actual legislative analysis in production.
   */
  private async generateSyntheticVotingRecords(
    sponsorId: number,
    sponsorships: schema.BillSponsorship[]
  ): Promise<VotingRecord[]> {
    logger.warn(`🏭 Generating SYNTHETIC voting records for sponsor ${sponsorId}`);
    
    const records: VotingRecord[] = [];
    const sponsorArr = await this.getSponsorById(sponsorId);
    
    if (!sponsorArr || sponsorArr.length === 0) {
      return records;
    }

    const sponsorData = sponsorArr[0];
    const partyAlignment = (parseFloat(sponsorData.votingAlignment || '50') || 50) / 100;

    // Generate "yes" votes for all sponsored bills
    // This simulates the real-world pattern where sponsors strongly support their own bills
    for (const sponsorship of sponsorships) {
      const bill = await this.getBill(sponsorship.billId);
      if (!bill) continue;

      records.push({
        sponsorId,
        billId: bill.id,
        vote: 'yes',
        voteDate: sponsorship.sponsorshipDate || bill.introducedDate || new Date(),
        billCategory: bill.category || 'general',
        partyPosition: Math.random() < 0.8 ? 'yes' : 'no',
        confidence: 0.95
      });
    }

    // Generate votes for non-sponsored bills
    try {
      const sponsoredBillIds = sponsorships.map(s => s.billId);
      const additionalBills = await this.db.select({
        id: schema.bills.id,
        category: schema.bills.category,
        introducedDate: schema.bills.introducedDate,
        lastActionDate: schema.bills.lastActionDate
      })
        .from(schema.bills)
        .where(sponsoredBillIds.length > 0 ? notInArray(schema.bills.id, sponsoredBillIds) : undefined)
        .orderBy(sql`RANDOM()`)
        .limit(Math.max(20, sponsorships.length * 3));

      for (const bill of additionalBills) {
        const voteProb = Math.random();
        let vote: 'yes' | 'no' | 'abstain';
        
        // Probabilistic voting based on party alignment
        // Higher alignment = more predictable voting patterns
        if (voteProb < partyAlignment * 0.7) {
          vote = Math.random() < 0.9 ? 'yes' : 'no';
        } else if (voteProb < 0.85) {
          vote = Math.random() < 0.9 ? 'no' : 'yes';
        } else {
          vote = 'abstain';
        }

        records.push({
          sponsorId,
          billId: bill.id,
          vote,
          voteDate: bill.lastActionDate || bill.introducedDate || new Date(),
          billCategory: bill.category || 'general',
          partyPosition: Math.random() < 0.6 ? 'yes' : (Math.random() < 0.9 ? 'no' : 'abstain'),
          confidence: 0.6 + Math.random() * 0.3
        });
      }
    } catch (dbError) {
      logger.error(
        `DB error generating synthetic non-sponsored votes (Sponsor ${sponsorId}):`,
        { component: 'VotingPatternAnalysis' },
        dbError
      );
    }

    logger.info(`Generated ${records.length} synthetic voting records for sponsor ${sponsorId}.`);
    return records;
  }

  // ============================================================================
  // CORE ANALYSIS METHODS
  // ============================================================================
  // These methods perform the actual analytical calculations on voting records.
  // They are designed to work with both real and synthetic data transparently.

  /**
   * Calculates how consistently a sponsor votes within issue categories.
   * 
   * METHODOLOGY:
   * Consistency is measured by grouping votes by category and calculating what
   * percentage of votes in each category align with the most common position.
   * Higher scores indicate more predictable voting patterns.
   * 
   * For example, if a sponsor votes "yes" on 9 out of 10 healthcare bills,
   * their healthcare consistency would be 0.9 (90%).
   */
  private calculateVotingConsistency(votingRecords: VotingRecord[]): number {
    if (votingRecords.length < 2) {
      return 0.5; // Neutral score for insufficient data
    }

    // Group votes by category to measure within-category consistency
    const votesByCategory: Record<string, { yes: number; no: number; abstain: number; total: number }> = {};

    votingRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      if (!votesByCategory[cat]) {
        votesByCategory[cat] = { yes: 0, no: 0, abstain: 0, total: 0 };
      }
      votesByCategory[cat][r.vote]++;
      votesByCategory[cat].total++;
    });

    let totalConsistencyScore = 0;
    let relevantCategories = 0;

    for (const category in votesByCategory) {
      const votes = votesByCategory[category];
      if (votes.total < 2) continue; // Need at least 2 votes to measure consistency

      // Consistency is the proportion of votes matching the most common position
      const maxVotes = Math.max(votes.yes, votes.no, votes.abstain);
      totalConsistencyScore += (maxVotes / votes.total);
      relevantCategories++;
    }

    return relevantCategories > 0 ? totalConsistencyScore / relevantCategories : 0.5;
  }

  /**
   * Calculates alignment with party positions.
   * 
   * METHODOLOGY:
   * Compares actual votes with party positions (when available). Falls back
   * to the sponsor's overall voting alignment score when per-vote party
   * positions aren't available.
   */
  private calculatePartyAlignment(sponsor: schema.Sponsor, votingRecords: VotingRecord[]): number {
    const recordsWithPartyPosition = votingRecords.filter(r => r.partyPosition);
    
    if (recordsWithPartyPosition.length === 0) {
      // Fallback: use sponsor's overall alignment score
      const alignmentScore = parseFloat(sponsor.votingAlignment || '50') || 50;
      return alignmentScore / 100;
    }
    
    const alignedVotes = recordsWithPartyPosition.filter(r => r.vote === r.partyPosition).length;
    return alignedVotes / recordsWithPartyPosition.length;
  }

  /**
   * Calculates alignment per issue category.
   * 
   * METHODOLOGY:
   * For each issue category, calculates the percentage of "yes" votes versus
   * total votes (excluding abstentions). This creates a profile of the sponsor's
   * stance on different types of issues.
   * 
   * Returns values between 0 and 1, where:
   * - 0.0 = Always votes "no" on this issue type
   * - 0.5 = Evenly split or primarily abstains
   * - 1.0 = Always votes "yes" on this issue type
   */
  private calculateIssueAlignment(votingRecords: VotingRecord[]): Record<string, number> {
    const issueAlignment: Record<string, number> = {};
    const votesByCategory: Record<string, { yes: number; total: number }> = {};

    votingRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      if (!votesByCategory[cat]) {
        votesByCategory[cat] = { yes: 0, total: 0 };
      }
      if (r.vote === 'yes') votesByCategory[cat].yes++;
      if (r.vote !== 'abstain') votesByCategory[cat].total++; // Only count yes/no votes
    });

    for (const category in votesByCategory) {
      const votes = votesByCategory[category];
      issueAlignment[category] = votes.total > 0 ? (votes.yes / votes.total) : 0.5;
    }
    
    return issueAlignment;
  }

  /**
   * Generates voting predictions for upcoming bills.
   * 
   * METHODOLOGY:
   * Uses historical voting patterns, party alignment, and issue categorization
   * to predict future votes. Predictions are more confident when there's a
   * clear historical pattern in the same issue category.
   */
  private async generateVotingPredictions(
    sponsor: schema.Sponsor,
    votingRecords: VotingRecord[]
  ): Promise<VotingPrediction[]> {
    logger.debug(`Generating predictions for sponsor ${sponsor.id} using ${votingRecords.length} records.`);
    
    const upcomingBillIds = await this.getUpcomingBillIds();
    const predictions: VotingPrediction[] = [];

    // Limit to top 5 predictions to keep response focused
    for (const billId of upcomingBillIds.slice(0, 5)) {
      try {
        const bill = await this.getBill(billId);
        if (!bill) continue;
        
        const prediction = await this.predictVoteForBill(sponsor, bill, votingRecords);
        predictions.push(prediction);
      } catch (error) {
        logger.error(
          `Error predicting vote for bill ${billId}, sponsor ${sponsor.id}:`,
          { component: 'VotingPatternAnalysis' },
          error
        );
      }
    }
    
    return predictions;
  }

  /**
   * Calculates various behavioral metrics.
   * 
   * METRICS EXPLAINED:
   * - Consistency Score: How predictable votes are within categories
   * - Independence Score: How often votes differ from party line
   * - Issue Specialization: Concentration of votes in specific categories (Herfindahl index)
   * - Flip-Flop Rate: Frequency of changing positions (complex, currently placeholder)
   * - Abstention Rate: Proportion of abstentions versus decisive votes
   * - Cross-Party Voting Rate: Same as independence score
   */
  private calculateBehaviorMetrics(votingRecords: VotingRecord[]): VotingBehaviorMetrics {
    if (votingRecords.length === 0) {
      return {
        consistencyScore: 0,
        independenceScore: 0,
        issueSpecializationScore: 0,
        flipFlopRate: 0,
        abstentionRate: 0,
        crossPartyVotingRate: 0
      };
    }

    const totalVotes = votingRecords.length;
    const abstentions = votingRecords.filter(r => r.vote === 'abstain').length;
    const votesWithPartyPosition = votingRecords.filter(r => r.partyPosition);
    const partyAlignedVotes = votesWithPartyPosition.filter(r => r.vote === r.partyPosition).length;
    const crossPartyVotes = votesWithPartyPosition.length - partyAlignedVotes;

    // Issue Specialization: Uses Herfindahl-Hirschman Index
    // Higher values indicate more concentration in specific issue areas
    const categoryCounts: Record<string, number> = {};
    votingRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const issueSpecializationScore = Object.values(categoryCounts)
      .reduce((sum, count) => sum + Math.pow(count / totalVotes, 2), 0);

    // Flip-Flop Rate would require temporal analysis of similar bills over time
    // This is complex and requires semantic bill similarity analysis
    // Placeholder 0 for now
    const flipFlopRate = 0;

    return {
      consistencyScore: this.calculateVotingConsistency(votingRecords),
      independenceScore: votesWithPartyPosition.length > 0 
        ? crossPartyVotes / votesWithPartyPosition.length 
        : 0.5,
      issueSpecializationScore,
      flipFlopRate,
      abstentionRate: abstentions / totalVotes,
      crossPartyVotingRate: votesWithPartyPosition.length > 0 
        ? crossPartyVotes / votesWithPartyPosition.length 
        : 0
    };
  }

  /**
   * Detects anomalous votes compared to party or issue patterns.
   * 
   * ANOMALY TYPES:
   * 1. Party Deviation: Voting against party position
   * 2. Issue Inconsistency: Voting against usual stance in an issue category
   * 
   * Additional anomaly types (financial conflicts, timing issues) would require
   * integration with affiliation and financial data.
   */
  private async detectVotingAnomalies(
    sponsor: schema.Sponsor,
    votingRecords: VotingRecord[]
  ): Promise<VotingAnomaly[]> {
    logger.debug(`Detecting anomalies for sponsor ${sponsor.id} using ${votingRecords.length} records.`);
    
    if (votingRecords.length < 5) {
      return []; // Need sufficient data to establish patterns
    }

    const anomalies: VotingAnomaly[] = [];
    const issueAlignment = this.calculateIssueAlignment(votingRecords);

    for (const record of votingRecords) {
      const bill = await this.getBill(record.billId);
      if (!bill) continue;

      // ANOMALY TYPE 1: Party Deviation
      if (record.partyPosition && 
          record.vote !== 'abstain' && 
          record.partyPosition !== 'abstain' && 
          record.vote !== record.partyPosition) {
        anomalies.push({
          billId: record.billId,
          billTitle: bill.title,
          expectedVote: record.partyPosition,
          actualVote: record.vote,
          anomalyType: 'party_deviation',
          severity: 'medium',
          explanation: `Voted '${record.vote}' against party position ('${record.partyPosition}')`,
          contextFactors: [`Category: ${record.billCategory}`]
        });
      }

      // ANOMALY TYPE 2: Issue Inconsistency
      const categoryAlignment = issueAlignment[record.billCategory || 'general'];
      if (categoryAlignment !== undefined && record.vote !== 'abstain') {
        // Determine expected vote based on historical pattern
        const expectedVoteBasedOnIssue = categoryAlignment > 0.6 ? 'yes' 
          : categoryAlignment < 0.4 ? 'no' 
          : undefined;
        
        if (expectedVoteBasedOnIssue && record.vote !== expectedVoteBasedOnIssue) {
          // Calculate magnitude of deviation
          const deviationMagnitude = Math.abs(categoryAlignment - (record.vote === 'yes' ? 1 : 0));
          
          // Only flag significant deviations (threshold: 0.5)
          if (deviationMagnitude > 0.5) {
            anomalies.push({
              billId: record.billId,
              billTitle: bill.title,
              expectedVote: expectedVoteBasedOnIssue,
              actualVote: record.vote,
              anomalyType: 'issue_inconsistency',
              severity: 'low',
              explanation: `Voted '${record.vote}', diverging from typical ${Math.round(categoryAlignment*100)}% '${expectedVoteBasedOnIssue}' stance on ${record.billCategory || 'general'} issues`,
              contextFactors: [`Category Alignment: ${Math.round(categoryAlignment*100)}%`]
            });
          }
        }
      }

      // TODO: ANOMALY TYPE 3: Financial Conflict
      // ANOMALY TYPE 3: Financial Conflict - check affiliations against bill content
      try {
        const affiliations = await sponsorService.getSponsorAffiliations(sponsor.id);
        if (affiliations && affiliations.length > 0) {
          const billText = `${bill.title} ${bill.content || ''} ${bill.description || ''}`.toLowerCase();
          for (const aff of affiliations) {
            if (!aff.organization) continue;
            const orgLower = aff.organization.toLowerCase();
            if (billText.includes(orgLower)) {
              anomalies.push({
                billId: record.billId,
                billTitle: bill.title,
                expectedVote: record.partyPosition || 'abstain',
                actualVote: record.vote,
                anomalyType: 'financial_conflict',
                severity: 'high',
                explanation: `Vote occurred on a bill mentioning affiliated organization (${aff.organization}). Potential financial interest.`,
                contextFactors: [`Affiliation: ${aff.organization}`, `Role: ${aff.role || 'unknown'}`]
              });
              break; // one match is sufficient
            }
          }
        }
      } catch (affErr) {
        // Non-fatal - log and continue
        logger.debug(`Failed to evaluate financial conflict anomaly for sponsor ${sponsor.id}: ${String(affErr)}`);
      }

      // ANOMALY TYPE 4: Timing Suspicious - compare vote date with affiliation start dates
      try {
        const affiliations2 = await sponsorService.getSponsorAffiliations(sponsor.id);
        for (const aff of affiliations2) {
          if (!aff.startDate) continue;
          const voteTime = new Date(record.voteDate).getTime();
          const startTime = new Date(aff.startDate).getTime();
          const daysDiff = Math.abs((voteTime - startTime) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 30) {
            anomalies.push({
              billId: record.billId,
              billTitle: bill.title,
              expectedVote: record.partyPosition || 'abstain',
              actualVote: record.vote,
              anomalyType: 'timing_suspicious',
              severity: daysDiff <= 7 ? 'high' : 'medium',
              explanation: `Vote occurred within ${Math.round(daysDiff)} days of joining ${aff.organization}.`,
              contextFactors: [`Affiliation start: ${aff.startDate}`, `Organization: ${aff.organization}`]
            });
            break; // one suspicious timing is enough to flag
          }
        }
      } catch (timeErr) {
        logger.debug(`Failed to evaluate timing anomaly for sponsor ${sponsor.id}: ${String(timeErr)}`);
      }
    }

    // Deduplicate anomalies (same bill + same anomaly type)
    const uniqueAnomalies = Array.from(
      new Map(anomalies.map(a => [`${a.billId}-${a.anomalyType}`, a])).values()
    );
    
    return uniqueAnomalies;
  }

  /**
   * Predicts vote for a single bill based on historical patterns.
   * 
   * PREDICTION ALGORITHM:
   * 1. Find similar bills in the same category
   * 2. Calculate vote distribution in those similar bills
   * 3. Use party alignment to adjust confidence
   * 4. Check for potential conflicts of interest (if affiliation data available)
   * 5. Return prediction with confidence score and reasoning
   */
  private async predictVoteForBill(
    sponsor: schema.Sponsor,
    bill: schema.Bill,
    votingRecords: VotingRecord[]
  ): Promise<VotingPrediction> {
    const billCategory = bill.category || 'general';
    const similarVotes = votingRecords.filter(r => r.billCategory === billCategory);
    
    let voteCounts = { yes: 0, no: 0, abstain: 0, total: 0 };
    similarVotes.forEach(r => {
      voteCounts[r.vote]++;
      voteCounts.total++;
    });

    let predictedVote: 'yes' | 'no' | 'abstain' = 'abstain';
    let confidence = 0.3; // Base confidence
    const reasoningFactors: string[] = [];

    // FACTOR 1: Historical voting in category
    if (voteCounts.total > 0) {
      const yesRatio = voteCounts.yes / voteCounts.total;
      const noRatio = voteCounts.no / voteCounts.total;
      
      if (yesRatio > 0.6 || (yesRatio > 0.4 && yesRatio >= noRatio)) {
        predictedVote = 'yes';
        confidence = Math.max(confidence, yesRatio * 0.8);
        reasoningFactors.push(
          `Historically votes 'yes' ${Math.round(yesRatio*100)}% on ${billCategory} bills (${voteCounts.total} votes)`
        );
      } else if (noRatio > 0.6 || (noRatio > 0.4 && noRatio > yesRatio)) {
        predictedVote = 'no';
        confidence = Math.max(confidence, noRatio * 0.8);
        reasoningFactors.push(
          `Historically votes 'no' ${Math.round(noRatio*100)}% on ${billCategory} bills (${voteCounts.total} votes)`
        );
      } else {
        reasoningFactors.push(
          `Mixed voting history on ${billCategory} bills (${voteCounts.total} votes)`
        );
        confidence = 0.4;
      }
    } else {
      reasoningFactors.push(`No voting history found for category: ${billCategory}`);
    }

    // FACTOR 2: Party Alignment
    const partyAlignment = (parseFloat(sponsor.votingAlignment || '50') || 50) / 100;
    
    // Simulate hypothetical party position (in real system, fetch from data source)
    const hypotheticalPartyPosition: 'yes' | 'no' = Math.random() < 0.7 ? 'yes' : 'no';
    
    if (predictedVote === hypotheticalPartyPosition) {
      confidence = Math.min(0.95, confidence + (0.15 * partyAlignment));
      reasoningFactors.push(
        `Prediction aligns with estimated party position ('${hypotheticalPartyPosition}') & sponsor alignment (${Math.round(partyAlignment*100)}%)`
      );
    } else if (predictedVote !== 'abstain') {
      confidence = Math.max(0.1, confidence - (0.1 * partyAlignment));
      reasoningFactors.push(
        `Prediction opposes estimated party position ('${hypotheticalPartyPosition}'), considering sponsor alignment (${Math.round(partyAlignment*100)}%)`
      );
    }

    // FACTOR 3: Sponsor Affiliations / Conflicts (requires additional data integration)
    // This would check if bill content relates to sponsor's affiliated organizations
    // Example placeholder:
    // const affiliations = await this.getSponsorAffiliations(sponsor.id);
    // const hasConflict = this.checkBillForConflicts(bill, affiliations);
    // if (hasConflict) {
    //   reasoningFactors.push("Potential conflict of interest identified.");
    //   confidence *= 0.8;
    // }

    return {
      billId: bill.id,
      billTitle: bill.title,
      predictedVote,
      confidence: parseFloat(confidence.toFixed(2)),
      reasoningFactors,
      similarBills: similarVotes.slice(0, 5).map(r => r.billId)
    };
  }

  // ============================================================================
  // COMPARATIVE ANALYSIS HELPER METHODS
  // ============================================================================

  /**
   * Finds sponsors similar to the target sponsor.
   * 
   * SIMILARITY CRITERIA:
   * Currently uses party affiliation as primary criterion. Could be enhanced
   * with voting pattern similarity, issue focus overlap, etc.
   */
  private async findSimilarSponsors(sponsorId: number, limit: number): Promise<number[]> {
    const targetSponsor = await this.getSponsorById(sponsorId);
    if (!targetSponsor || targetSponsor.length === 0) return [];

    const target = targetSponsor[0];
    
    try {
      const similarSponsors = await this.db.select()
        .from(schema.sponsors)
        .where(and(
          eq(schema.sponsors.party, target.party || ''),
          eq(schema.sponsors.isActive, true)
        ))
        .limit(limit + 1); // +1 to exclude self

      return similarSponsors
        .filter(s => s.id !== sponsorId)
        .slice(0, limit)
        .map(s => s.id);
    } catch (error) {
      logger.error(
        `Error finding similar sponsors for ${sponsorId}:`,
        { component: 'VotingPatternAnalysis' },
        error
      );
      return [];
    }
  }

  /**
   * Calculates alignment score between two sets of voting records.
   * 
   * METHODOLOGY:
   * Finds bills both sponsors voted on and calculates the percentage of
   * votes where they agreed. Returns 0-1 score.
   */
  private async calculateAlignmentScore(
    records1: VotingRecord[],
    records2: VotingRecord[]
  ): Promise<number> {
    // Find common bills voted on by both sponsors
    const commonBills = records1
      .filter(r1 => records2.some(r2 => r2.billId === r1.billId))
      .map(r => r.billId);

    if (commonBills.length === 0) return 0;

    let alignedVotes = 0;
    for (const billId of commonBills) {
      const vote1 = records1.find(r => r.billId === billId)?.vote;
      const vote2 = records2.find(r => r.billId === billId)?.vote;
      
      if (vote1 === vote2) {
        alignedVotes++;
      }
    }

    return alignedVotes / commonBills.length;
  }

  /**
   * Identifies common voting patterns across multiple sponsors.
   * 
   * METHODOLOGY:
   * Finds bills where multiple sponsors voted the same way and clusters
   * these into patterns. Useful for identifying voting blocs and coalitions.
   */
  private async identifyCommonVotingPatterns(
    sponsorIds: number[],
    allRecords: Record<number, VotingRecord[]>
  ): Promise<VotingPattern[]> {
    const patterns: VotingPattern[] = [];
    
    // Build a map of billId -> sponsorId -> vote
    const billVotes: Record<number, Record<number, string>> = {};
    
    for (const [sponsorIdStr, records] of Object.entries(allRecords)) {
      const sponsorId = parseInt(sponsorIdStr);
      for (const record of records) {
        if (!billVotes[record.billId]) {
          billVotes[record.billId] = {};
        }
        billVotes[record.billId][sponsorId] = record.vote;
      }
    }

    // Identify patterns where multiple sponsors vote the same way
    for (const [billIdStr, votes] of Object.entries(billVotes)) {
      const billId = parseInt(billIdStr);
      const voteGroups: Record<string, number[]> = {};
      
      for (const [sponsorIdStr, vote] of Object.entries(votes)) {
        const sponsorId = parseInt(sponsorIdStr);
        if (!voteGroups[vote]) {
          voteGroups[vote] = [];
        }
        voteGroups[vote].push(sponsorId);
      }

      // Create pattern entries for vote groups with 2+ sponsors
      for (const [vote, sponsors] of Object.entries(voteGroups)) {
        if (sponsors.length >= 2) {
          const bill = await this.getBill(billId);
          patterns.push({
            pattern: `${vote}_vote_on_${bill?.category || 'unknown'}`,
            frequency: 1,
            sponsors,
            categories: [bill?.category || 'unknown'],
            strength: sponsors.length / sponsorIds.length
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Identifies issue categories where target sponsor diverges from comparison group.
   * 
   * METHODOLOGY:
   * Compares voting rates by category. If difference exceeds 30%, marks as divergent.
   */
  private async identifyDivergentIssues(
    targetRecords: VotingRecord[],
    comparisonRecords: VotingRecord[]
  ): Promise<string[]> {
    const targetCategories: Record<string, { yes: number; total: number }> = {};
    const comparisonCategories: Record<string, { yes: number; total: number }> = {};

    // Count yes votes by category for target sponsor
    targetRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      if (!targetCategories[cat]) {
        targetCategories[cat] = { yes: 0, total: 0 };
      }
      if (r.vote === 'yes') targetCategories[cat].yes++;
      if (r.vote !== 'abstain') targetCategories[cat].total++;
    });

    // Count yes votes by category for comparison sponsors
    comparisonRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      if (!comparisonCategories[cat]) {
        comparisonCategories[cat] = { yes: 0, total: 0 };
      }
      if (r.vote === 'yes') comparisonCategories[cat].yes++;
      if (r.vote !== 'abstain') comparisonCategories[cat].total++;
    });

    const divergentIssues: string[] = [];
    
    // Compare rates for each category
    for (const category of Object.keys(targetCategories)) {
      const targetRate = targetCategories[category].total > 0
        ? targetCategories[category].yes / targetCategories[category].total
        : 0;
      
      const comparisonTotal = comparisonCategories[category]?.total || 0;
      const comparisonRate = comparisonTotal > 0
        ? (comparisonCategories[category]?.yes || 0) / comparisonTotal
        : 0;

      // Flag if difference exceeds 30%
      if (Math.abs(targetRate - comparisonRate) > 0.3) {
        divergentIssues.push(category);
      }
    }

    return divergentIssues;
  }

  /**
   * Calculates overall coalition strength from individual alignment scores.
   * 
   * Simply averages all alignment scores to get overall cohesion metric.
   */
  private calculateCoalitionStrength(alignmentScores: Record<number, number>): number {
    const scores = Object.values(alignmentScores);
    if (scores.length === 0) return 0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  // ============================================================================
  // CONSISTENCY ANALYSIS HELPER METHODS
  // ============================================================================

  /**
   * Calculates consistency scores by quarter for trend analysis.
   * 
   * METHODOLOGY:
   * Groups records into quarterly buckets and calculates consistency score
   * for each quarter. Returns array of scores ordered chronologically.
   */
  private async calculateQuarterlyConsistency(
    votingRecords: VotingRecord[]
  ): Promise<number[]> {
    // Group records by quarter (YYYY-Q#)
    const quarters: Record<string, VotingRecord[]> = {};
    
    votingRecords.forEach(record => {
      const date = new Date(record.voteDate);
      const quarter = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
      
      if (!quarters[quarter]) {
        quarters[quarter] = [];
      }
      quarters[quarter].push(record);
    });

    const consistencyScores: number[] = [];
    
    // Calculate consistency for each quarter
    for (const quarterRecords of Object.values(quarters)) {
      if (quarterRecords.length === 0) continue;
      
      const quarterConsistency = this.calculateVotingConsistency(quarterRecords);
      consistencyScores.push(quarterConsistency);
    }

    return consistencyScores;
  }

  /**
   * Determines trend from quarterly consistency scores.
   * 
   * METHODOLOGY:
   * Compares average of recent quarters with average of older quarters.
   * Improvement threshold: +10% or more
   * Decline threshold: -10% or more
   */
  private determineTrend(quarterlyScores: number[]): 'improving' | 'declining' | 'stable' {
    if (quarterlyScores.length < 2) return 'stable';

    const recent = quarterlyScores.slice(-2); // Last 2 quarters
    const older = quarterlyScores.slice(0, -2); // All previous quarters

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;

    if (recentAvg > olderAvg + 0.1) return 'improving';
    if (recentAvg < olderAvg - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * Identifies key factors affecting voting consistency.
   * 
   * FACTORS ANALYZED:
   * 1. Party Alignment: How closely votes follow party positions
   * 2. Issue Specialization: How concentrated votes are in specific areas
   */
  private async identifyConsistencyFactors(
    sponsorId: number,
    votingRecords: VotingRecord[]
  ): Promise<ConsistencyFactor[]> {
    const factors: ConsistencyFactor[] = [];

    // FACTOR 1: Party Alignment
    const partyAlignedVotes = votingRecords.filter(
      r => r.partyPosition && r.vote === r.partyPosition
    ).length;
    const votesWithPartyPosition = votingRecords.filter(r => r.partyPosition).length;
    
    if (votesWithPartyPosition > 0) {
      const partyAlignment = partyAlignedVotes / votesWithPartyPosition;
      factors.push({
        factor: 'Party Alignment',
        impact: partyAlignment,
        description: `${Math.round(partyAlignment * 100)}% alignment with party positions`,
        trend: partyAlignment > 0.7 ? 'positive' : 'negative'
      });
    }

    // FACTOR 2: Issue Specialization
    const categoryDistribution: Record<string, number> = {};
    votingRecords.forEach(r => {
      const cat = r.billCategory || 'general';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    const maxCategoryVotes = Math.max(...Object.values(categoryDistribution));
    const specialization = maxCategoryVotes / votingRecords.length;
    
    factors.push({
      factor: 'Issue Specialization',
      impact: specialization,
      description: `${Math.round(specialization * 100)}% of votes in primary issue area`,
      trend: specialization > 0.4 ? 'positive' : 'neutral'
    });

    return factors;
  }

  /**
   * Generates actionable recommendations based on consistency analysis.
   * 
   * RECOMMENDATION LOGIC:
   * - Low consistency: Suggest developing clearer positions
   * - Declining trend: Suggest reviewing recent deviations
   * - Low party alignment: Note independence (may be intentional)
   * - Good metrics: Encourage maintaining current approach
   */
  private generateConsistencyRecommendations(
    consistencyScore: number,
    factors: ConsistencyFactor[],
    trend: 'improving' | 'declining' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    // Low overall consistency
    if (consistencyScore < this.consistencyThresholds.medium) {
      recommendations.push('Consider developing clearer policy positions on key issues');
      recommendations.push('Review voting patterns for potential inconsistencies');
    }

    // Declining trend
    if (trend === 'declining') {
      recommendations.push('Analyze recent votes that may have deviated from established patterns');
      recommendations.push('Consider whether external factors are influencing voting decisions');
    }

    // Low party alignment (high independence)
    const partyAlignmentFactor = factors.find(f => f.factor === 'Party Alignment');
    if (partyAlignmentFactor && partyAlignmentFactor.impact < 0.5) {
      recommendations.push('High independence from party positions - ensure this aligns with constituent expectations');
    }

    // Default positive recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain current consistent voting patterns');
      recommendations.push('Continue transparent communication about voting rationale');
    }

    return recommendations;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Safely parses numeric values from various input types.
   * Handles strings, numbers, and invalid inputs gracefully.
   */
  private parseNumericValue(value: any, defaultValue = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
// Export a singleton instance for consistent use across the application
export const votingPatternAnalysisService = new VotingPatternAnalysisService();