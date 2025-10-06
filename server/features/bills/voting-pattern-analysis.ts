import { database as db } from '../../../shared/database/connection.js';
import { 
  sponsors, billSponsorships, bills, sponsorAffiliations,
  type Sponsor, type BillSponsorship 
} from '../../../shared/schema.js';
import { eq, and, sql, desc, gte, lte, count, avg, inArray } from 'drizzle-orm';

// Enhanced type definitions for voting pattern analysis
export interface VotingPatternAnalysis {
  sponsorId: number;
  sponsorName: string;
  totalVotes: number;
  votingConsistency: number;
  partyAlignment: number;
  issueAlignment: Record<string, number>;
  predictedVotes: VotingPrediction[];
  behaviorMetrics: VotingBehaviorMetrics;
  anomalies: VotingAnomaly[];
}

export interface VotingPrediction {
  billId: number;
  billTitle: string;
  predictedVote: 'yes' | 'no' | 'abstain';
  confidence: number;
  reasoningFactors: string[];
  similarBills: number[];
}

export interface VotingBehaviorMetrics {
  consistencyScore: number;
  independenceScore: number;
  issueSpecializationScore: number;
  flipFlopRate: number;
  abstentionRate: number;
  crossPartyVotingRate: number;
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
  comparedWith: number[];
  alignmentScores: Record<number, number>;
  commonVotingPatterns: VotingPattern[];
  divergentIssues: string[];
  coalitionStrength: number;
}

export interface VotingPattern {
  pattern: string;
  frequency: number;
  sponsors: number[];
  categories: string[];
  strength: number;
}

export interface VotingConsistencyReport {
  sponsorId: number;
  timeframe: string;
  consistencyTrend: 'improving' | 'declining' | 'stable';
  consistencyScore: number;
  keyFactors: ConsistencyFactor[];
  recommendations: string[];
}

export interface ConsistencyFactor {
  factor: string;
  impact: number;
  description: string;
  trend: 'positive' | 'negative' | 'neutral';
}

export type AnomalyType = 
  | 'party_deviation'
  | 'issue_inconsistency'
  | 'financial_conflict'
  | 'timing_suspicious'
  | 'coalition_break'
  | 'ideology_shift';

// Simulated voting record structure (in real implementation, this would come from actual voting data)
export interface VotingRecord {
  sponsorId: number;
  billId: number;
  vote: 'yes' | 'no' | 'abstain';
  voteDate: Date;
  billCategory: string;
  partyPosition?: 'yes' | 'no' | 'abstain';
  confidence?: number;
}

export class VotingPatternAnalysisService {
  private readonly consistencyThresholds = {
    high: 0.85,
    medium: 0.65,
    low: 0.45
  };

  private readonly anomalyThresholds = {
    severe: 0.9,
    moderate: 0.7,
    minor: 0.5
  };

  /**
   * Track and analyze sponsor voting patterns
   * Analyzes historical voting behavior and identifies patterns
   */
  async analyzeVotingPatterns(sponsorId?: number): Promise<VotingPatternAnalysis[]> {
    const sponsors = sponsorId 
      ? await this.getSponsor(sponsorId)
      : await this.getAllActiveSponsors();

    const analyses: VotingPatternAnalysis[] = [];

    for (const sponsor of sponsors) {
      const votingRecords = await this.getVotingRecords(sponsor.id);
      const sponsorships = await this.getSponsorBills(sponsor.id);
      
      if (votingRecords.length === 0) {
        // Generate synthetic voting records based on sponsorship patterns
        const syntheticRecords = await this.generateSyntheticVotingRecords(sponsor.id, sponsorships);
        votingRecords.push(...syntheticRecords);
      }

      const analysis: VotingPatternAnalysis = {
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        totalVotes: votingRecords.length,
        votingConsistency: await this.calculateVotingConsistency(sponsor.id, votingRecords),
        partyAlignment: await this.calculatePartyAlignment(sponsor, votingRecords),
        issueAlignment: await this.calculateIssueAlignment(votingRecords),
        predictedVotes: await this.generateVotingPredictions(sponsor.id, votingRecords),
        behaviorMetrics: await this.calculateBehaviorMetrics(sponsor.id, votingRecords),
        anomalies: await this.detectVotingAnomalies(sponsor, votingRecords)
      };

      analyses.push(analysis);
    }

    return analyses.sort((a, b) => b.totalVotes - a.totalVotes);
  }

  /**
   * Create predictive models for voting behavior
   * Uses historical patterns to predict future votes
   */
  async createVotingPredictions(
    sponsorId: number,
    upcomingBills?: number[]
  ): Promise<VotingPrediction[]> {
    const sponsor = await this.getSponsor(sponsorId);
    if (sponsor.length === 0) return [];

    const votingRecords = await this.getVotingRecords(sponsorId);
    const billsToPredict = upcomingBills || await this.getUpcomingBills();

    const predictions: VotingPrediction[] = [];

    for (const billId of billsToPredict) {
      const bill = await this.getBill(billId);
      if (!bill) continue;

      const prediction = await this.predictVoteForBill(
        sponsor[0],
        bill,
        votingRecords
      );

      predictions.push(prediction);
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Build comparative analysis tools for sponsor alignment
   * Compares voting patterns between sponsors
   */
  async buildComparativeAnalysis(
    sponsorId: number,
    comparisonSponsors?: number[]
  ): Promise<ComparativeAnalysis> {
    const targetSponsor = await this.getSponsor(sponsorId);
    if (targetSponsor.length === 0) {
      throw new Error(`Sponsor with ID ${sponsorId} not found`);
    }

    const targetVotingRecords = await this.getVotingRecords(sponsorId);
    
    // If no comparison sponsors provided, find similar sponsors
    const sponsorsToCompare = comparisonSponsors || 
      await this.findSimilarSponsors(sponsorId, 5);

    const alignmentScores: Record<number, number> = {};
    const allVotingRecords: Record<number, VotingRecord[]> = {};

    // Get voting records for all comparison sponsors
    for (const compareSponsorId of sponsorsToCompare) {
      const records = await this.getVotingRecords(compareSponsorId);
      allVotingRecords[compareSponsorId] = records;
      alignmentScores[compareSponsorId] = await this.calculateAlignmentScore(
        targetVotingRecords,
        records
      );
    }

    const commonPatterns = await this.identifyCommonVotingPatterns(
      [sponsorId, ...sponsorsToCompare],
      { [sponsorId]: targetVotingRecords, ...allVotingRecords }
    );

    const divergentIssues = await this.identifyDivergentIssues(
      targetVotingRecords,
      Object.values(allVotingRecords).flat()
    );

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
   * Implement voting consistency scoring
   * Measures how consistent a sponsor's voting behavior is over time
   */
  async calculateVotingConsistencyScore(
    sponsorId: number,
    timeframeMonths: number = 12
  ): Promise<VotingConsistencyReport> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - timeframeMonths);

    const votingRecords = await this.getVotingRecords(sponsorId, startDate);
    const sponsor = await this.getSponsor(sponsorId);
    
    if (sponsor.length === 0) {
      throw new Error(`Sponsor with ID ${sponsorId} not found`);
    }

    // Calculate consistency over different time periods
    const quarterlyConsistency = await this.calculateQuarterlyConsistency(votingRecords);
    const overallConsistency = await this.calculateVotingConsistency(sponsorId, votingRecords);
    
    // Determine trend
    const trend = this.determineTrend(quarterlyConsistency);
    
    // Identify key factors affecting consistency
    const keyFactors = await this.identifyConsistencyFactors(sponsorId, votingRecords);
    
    // Generate recommendations
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
// Private helper methods

  private async getSponsor(sponsorId: number): Promise<Sponsor[]> {
    return await db.select().from(sponsors).where(eq(sponsors.id, sponsorId));
  }

  private async getAllActiveSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors).where(eq(sponsors.isActive, true));
  }

  private async getSponsorBills(sponsorId: number) {
    return await db.select().from(billSponsorships)
      .where(and(
        eq(billSponsorships.sponsorId, sponsorId),
        eq(billSponsorships.isActive, true)
      ));
  }

  private async getBill(billId: number) {
    const result = await db.select().from(bills).where(eq(bills.id, billId));
    return result[0];
  }

  private async getUpcomingBills(): Promise<number[]> {
    const upcomingBills = await db.select({ id: bills.id })
      .from(bills)
      .where(eq(bills.status, 'introduced'))
      .limit(10);
    
    return upcomingBills.map(b => b.id);
  }

  /**
   * Get voting records for a sponsor
   * In a real implementation, this would query actual voting data
   * For now, we'll generate synthetic data based on sponsorship patterns
   */
  private async getVotingRecords(
    sponsorId: number, 
    startDate?: Date
  ): Promise<VotingRecord[]> {
    // In a real implementation, this would query actual voting records
    // For now, we'll return empty array and generate synthetic data elsewhere
    return [];
  }

  /**
   * Generate synthetic voting records based on sponsorship patterns
   * This simulates voting behavior for demonstration purposes
   */
  private async generateSyntheticVotingRecords(
    sponsorId: number,
    sponsorships: any[]
  ): Promise<VotingRecord[]> {
    const records: VotingRecord[] = [];
    const sponsor = await this.getSponsor(sponsorId);
    
    if (sponsor.length === 0) return records;

    const sponsorData = sponsor[0];
    const partyAlignment = this.parseNumericValue(sponsorData.votingAlignment) / 100;

    // Generate voting records for sponsored bills (always vote yes)
    for (const sponsorship of sponsorships) {
      const bill = await this.getBill(sponsorship.billId);
      if (!bill) continue;

      records.push({
        sponsorId,
        billId: bill.id,
        vote: 'yes',
        voteDate: sponsorship.sponsorshipDate || new Date(),
        billCategory: bill.category || 'general',
        partyPosition: 'yes',
        confidence: 0.95
      });
    }

    // Generate additional synthetic voting records for non-sponsored bills
    const additionalBills = await db.select()
      .from(bills)
      .where(sql`${bills.id} NOT IN (
        SELECT bill_id FROM bill_sponsorships 
        WHERE sponsor_id = ${sponsorId}
      )`)
      .limit(20);

    for (const bill of additionalBills) {
      // Simulate voting based on party alignment and bill category
      const voteProb = Math.random();
      let vote: 'yes' | 'no' | 'abstain';
      
      if (voteProb < partyAlignment * 0.7) {
        vote = 'yes';
      } else if (voteProb < partyAlignment * 0.9) {
        vote = 'no';
      } else {
        vote = 'abstain';
      }

      records.push({
        sponsorId,
        billId: bill.id,
        vote,
        voteDate: bill.introducedDate || new Date(),
        billCategory: bill.category || 'general',
        partyPosition: Math.random() > 0.5 ? 'yes' : 'no',
        confidence: 0.6 + Math.random() * 0.3
      });
    }

    return records;
  }

  private async calculateVotingConsistency(
    sponsorId: number,
    votingRecords: VotingRecord[]
  ): Promise<number> {
    if (votingRecords.length === 0) return 0;

    // Group votes by category
    const categoryVotes: Record<string, VotingRecord[]> = {};
    votingRecords.forEach(record => {
      if (!categoryVotes[record.billCategory]) {
        categoryVotes[record.billCategory] = [];
      }
      categoryVotes[record.billCategory].push(record);
    });

    let totalConsistency = 0;
    let categoryCount = 0;

    // Calculate consistency within each category
    for (const [category, votes] of Object.entries(categoryVotes)) {
      if (votes.length < 2) continue;

      const yesVotes = votes.filter(v => v.vote === 'yes').length;
      const noVotes = votes.filter(v => v.vote === 'no').length;
      const abstainVotes = votes.filter(v => v.vote === 'abstain').length;

      // Calculate consistency as the proportion of the most common vote
      const maxVotes = Math.max(yesVotes, noVotes, abstainVotes);
      const consistency = maxVotes / votes.length;

      totalConsistency += consistency;
      categoryCount++;
    }

    return categoryCount > 0 ? totalConsistency / categoryCount : 0;
  }

  private async calculatePartyAlignment(
    sponsor: Sponsor,
    votingRecords: VotingRecord[]
  ): Promise<number> {
    if (votingRecords.length === 0) return 0;

    const recordsWithPartyPosition = votingRecords.filter(r => r.partyPosition);
    if (recordsWithPartyPosition.length === 0) return 0;

    const alignedVotes = recordsWithPartyPosition.filter(
      r => r.vote === r.partyPosition
    ).length;

    return alignedVotes / recordsWithPartyPosition.length;
  }

  private async calculateIssueAlignment(
    votingRecords: VotingRecord[]
  ): Promise<Record<string, number>> {
    const issueAlignment: Record<string, number> = {};
    
    // Group by category and calculate alignment within each
    const categoryGroups: Record<string, VotingRecord[]> = {};
    votingRecords.forEach(record => {
      if (!categoryGroups[record.billCategory]) {
        categoryGroups[record.billCategory] = [];
      }
      categoryGroups[record.billCategory].push(record);
    });

    for (const [category, records] of Object.entries(categoryGroups)) {
      if (records.length === 0) continue;

      const yesVotes = records.filter(r => r.vote === 'yes').length;
      const totalVotes = records.length;
      
      // Alignment score based on consistency of voting in this category
      issueAlignment[category] = yesVotes / totalVotes;
    }

    return issueAlignment;
  }

  private async generateVotingPredictions(
    sponsorId: number,
    votingRecords: VotingRecord[]
  ): Promise<VotingPrediction[]> {
    const upcomingBills = await this.getUpcomingBills();
    const predictions: VotingPrediction[] = [];

    for (const billId of upcomingBills.slice(0, 5)) {
      const bill = await this.getBill(billId);
      if (!bill) continue;

      // Find similar bills in voting history
      const similarBills = votingRecords
        .filter(r => r.billCategory === bill.category)
        .slice(0, 3);

      let predictedVote: 'yes' | 'no' | 'abstain' = 'abstain';
      let confidence = 0.5;

      if (similarBills.length > 0) {
        // Predict based on most common vote in similar bills
        const yesCount = similarBills.filter(r => r.vote === 'yes').length;
        const noCount = similarBills.filter(r => r.vote === 'no').length;
        const abstainCount = similarBills.filter(r => r.vote === 'abstain').length;

        if (yesCount >= noCount && yesCount >= abstainCount) {
          predictedVote = 'yes';
          confidence = yesCount / similarBills.length;
        } else if (noCount >= abstainCount) {
          predictedVote = 'no';
          confidence = noCount / similarBills.length;
        } else {
          predictedVote = 'abstain';
          confidence = abstainCount / similarBills.length;
        }
      }

      predictions.push({
        billId: bill.id,
        billTitle: bill.title,
        predictedVote,
        confidence,
        reasoningFactors: [
          `Based on ${similarBills.length} similar bills in ${bill.category}`,
          `Historical pattern shows ${Math.round(confidence * 100)}% likelihood`
        ],
        similarBills: similarBills.map(r => r.billId)
      });
    }

    return predictions;
  }

  private async calculateBehaviorMetrics(
    sponsorId: number,
    votingRecords: VotingRecord[]
  ): Promise<VotingBehaviorMetrics> {
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
    const partyAlignedVotes = votingRecords.filter(
      r => r.partyPosition && r.vote === r.partyPosition
    ).length;
    const votesWithPartyPosition = votingRecords.filter(r => r.partyPosition).length;

    // Calculate issue specialization (concentration in specific categories)
    const categoryDistribution: Record<string, number> = {};
    votingRecords.forEach(r => {
      categoryDistribution[r.billCategory] = (categoryDistribution[r.billCategory] || 0) + 1;
    });

    const maxCategoryVotes = Math.max(...Object.values(categoryDistribution));
    const issueSpecializationScore = maxCategoryVotes / totalVotes;

    return {
      consistencyScore: await this.calculateVotingConsistency(sponsorId, votingRecords),
      independenceScore: votesWithPartyPosition > 0 ? 
        1 - (partyAlignedVotes / votesWithPartyPosition) : 0,
      issueSpecializationScore,
      flipFlopRate: 0, // Would require temporal analysis of vote changes
      abstentionRate: abstentions / totalVotes,
      crossPartyVotingRate: votesWithPartyPosition > 0 ? 
        (votesWithPartyPosition - partyAlignedVotes) / votesWithPartyPosition : 0
    };
  }

  private async detectVotingAnomalies(
    sponsor: Sponsor,
    votingRecords: VotingRecord[]
  ): Promise<VotingAnomaly[]> {
    const anomalies: VotingAnomaly[] = [];

    // Detect party deviation anomalies
    const partyDeviations = votingRecords.filter(
      r => r.partyPosition && r.vote !== r.partyPosition
    );

    for (const deviation of partyDeviations) {
      const bill = await this.getBill(deviation.billId);
      if (!bill) continue;

      anomalies.push({
        billId: deviation.billId,
        billTitle: bill.title,
        expectedVote: deviation.partyPosition!,
        actualVote: deviation.vote,
        anomalyType: 'party_deviation',
        severity: 'medium',
        explanation: `Voted ${deviation.vote} while party position was ${deviation.partyPosition}`,
        contextFactors: [`Bill category: ${deviation.billCategory}`]
      });
    }

    // Detect issue inconsistency anomalies
    const categoryGroups: Record<string, VotingRecord[]> = {};
    votingRecords.forEach(record => {
      if (!categoryGroups[record.billCategory]) {
        categoryGroups[record.billCategory] = [];
      }
      categoryGroups[record.billCategory].push(record);
    });

    for (const [category, records] of Object.entries(categoryGroups)) {
      if (records.length < 3) continue;

      const yesVotes = records.filter(r => r.vote === 'yes').length;
      const noVotes = records.filter(r => r.vote === 'no').length;
      const majorityVote = yesVotes > noVotes ? 'yes' : 'no';
      const minorityVotes = records.filter(r => r.vote !== majorityVote && r.vote !== 'abstain');

      for (const minorityVote of minorityVotes) {
        const bill = await this.getBill(minorityVote.billId);
        if (!bill) continue;

        anomalies.push({
          billId: minorityVote.billId,
          billTitle: bill.title,
          expectedVote: majorityVote,
          actualVote: minorityVote.vote,
          anomalyType: 'issue_inconsistency',
          severity: 'low',
          explanation: `Inconsistent with usual ${category} voting pattern`,
          contextFactors: [`Usually votes ${majorityVote} on ${category} issues`]
        });
      }
    }

    return anomalies;
  }

  private async predictVoteForBill(
    sponsor: Sponsor,
    bill: any,
    votingRecords: VotingRecord[]
  ): Promise<VotingPrediction> {
    // Find similar bills in voting history
    const similarBills = votingRecords.filter(r => r.billCategory === bill.category);
    
    let predictedVote: 'yes' | 'no' | 'abstain' = 'abstain';
    let confidence = 0.5;
    const reasoningFactors: string[] = [];

    if (similarBills.length > 0) {
      const yesCount = similarBills.filter(r => r.vote === 'yes').length;
      const noCount = similarBills.filter(r => r.vote === 'no').length;
      const abstainCount = similarBills.filter(r => r.vote === 'abstain').length;

      if (yesCount >= noCount && yesCount >= abstainCount) {
        predictedVote = 'yes';
        confidence = yesCount / similarBills.length;
      } else if (noCount >= abstainCount) {
        predictedVote = 'no';
        confidence = noCount / similarBills.length;
      }

      reasoningFactors.push(`${similarBills.length} similar ${bill.category} bills`);
      reasoningFactors.push(`${Math.round(confidence * 100)}% historical consistency`);
    }

    // Check for potential conflicts of interest
    const affiliations = await db.select().from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsorId, sponsor.id));

    const relevantAffiliations = affiliations.filter(a => 
      bill.content?.toLowerCase().includes(a.organization.toLowerCase()) ||
      bill.title.toLowerCase().includes(a.organization.toLowerCase())
    );

    if (relevantAffiliations.length > 0) {
      reasoningFactors.push(`Potential conflict with ${relevantAffiliations.length} affiliations`);
      confidence *= 0.8; // Reduce confidence due to potential conflicts
    }

    return {
      billId: bill.id,
      billTitle: bill.title,
      predictedVote,
      confidence,
      reasoningFactors,
      similarBills: similarBills.map(r => r.billId)
    };
  }

  private async findSimilarSponsors(sponsorId: number, limit: number): Promise<number[]> {
    const targetSponsor = await this.getSponsor(sponsorId);
    if (targetSponsor.length === 0) return [];

    const target = targetSponsor[0];
    
    // Find sponsors from same party first
    const similarSponsors = await db.select()
      .from(sponsors)
      .where(and(
        eq(sponsors.party, target.party || ''),
        eq(sponsors.isActive, true)
      ))
      .limit(limit + 1); // +1 to exclude self

    return similarSponsors
      .filter(s => s.id !== sponsorId)
      .slice(0, limit)
      .map(s => s.id);
  }

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

  private async identifyCommonVotingPatterns(
    sponsorIds: number[],
    allRecords: Record<number, VotingRecord[]>
  ): Promise<VotingPattern[]> {
    const patterns: VotingPattern[] = [];
    
    // Find bills voted on by multiple sponsors
    const billVotes: Record<number, Record<number, string>> = {};
    
    for (const [sponsorId, records] of Object.entries(allRecords)) {
      for (const record of records) {
        if (!billVotes[record.billId]) {
          billVotes[record.billId] = {};
        }
        billVotes[record.billId][parseInt(sponsorId)] = record.vote;
      }
    }

    // Identify patterns where multiple sponsors vote the same way
    for (const [billId, votes] of Object.entries(billVotes)) {
      const voteGroups: Record<string, number[]> = {};
      
      for (const [sponsorId, vote] of Object.entries(votes)) {
        if (!voteGroups[vote]) {
          voteGroups[vote] = [];
        }
        voteGroups[vote].push(parseInt(sponsorId));
      }

      for (const [vote, sponsors] of Object.entries(voteGroups)) {
        if (sponsors.length >= 2) {
          const bill = await this.getBill(parseInt(billId));
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

  private async identifyDivergentIssues(
    targetRecords: VotingRecord[],
    comparisonRecords: VotingRecord[]
  ): Promise<string[]> {
    const targetCategories: Record<string, number> = {};
    const comparisonCategories: Record<string, number> = {};

    // Count votes by category for target sponsor
    targetRecords.forEach(r => {
      if (!targetCategories[r.billCategory]) {
        targetCategories[r.billCategory] = 0;
      }
      if (r.vote === 'yes') targetCategories[r.billCategory]++;
    });

    // Count votes by category for comparison sponsors
    comparisonRecords.forEach(r => {
      if (!comparisonCategories[r.billCategory]) {
        comparisonCategories[r.billCategory] = 0;
      }
      if (r.vote === 'yes') comparisonCategories[r.billCategory]++;
    });

    const divergentIssues: string[] = [];
    
    for (const category of Object.keys(targetCategories)) {
      const targetRate = targetCategories[category] / 
        targetRecords.filter(r => r.billCategory === category).length;
      const comparisonRate = (comparisonCategories[category] || 0) / 
        Math.max(1, comparisonRecords.filter(r => r.billCategory === category).length);

      if (Math.abs(targetRate - comparisonRate) > 0.3) {
        divergentIssues.push(category);
      }
    }

    return divergentIssues;
  }

  private calculateCoalitionStrength(alignmentScores: Record<number, number>): number {
    const scores = Object.values(alignmentScores);
    if (scores.length === 0) return 0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private async calculateQuarterlyConsistency(
    votingRecords: VotingRecord[]
  ): Promise<number[]> {
    // Group records by quarter
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
    
    for (const quarterRecords of Object.values(quarters)) {
      if (quarterRecords.length === 0) continue;
      
      // Calculate consistency within the quarter
      const categoryGroups: Record<string, VotingRecord[]> = {};
      quarterRecords.forEach(record => {
        if (!categoryGroups[record.billCategory]) {
          categoryGroups[record.billCategory] = [];
        }
        categoryGroups[record.billCategory].push(record);
      });

      let quarterConsistency = 0;
      let categoryCount = 0;

      for (const categoryRecords of Object.values(categoryGroups)) {
        if (categoryRecords.length < 2) continue;

        const yesVotes = categoryRecords.filter(r => r.vote === 'yes').length;
        const noVotes = categoryRecords.filter(r => r.vote === 'no').length;
        const abstainVotes = categoryRecords.filter(r => r.vote === 'abstain').length;

        const maxVotes = Math.max(yesVotes, noVotes, abstainVotes);
        quarterConsistency += maxVotes / categoryRecords.length;
        categoryCount++;
      }

      if (categoryCount > 0) {
        consistencyScores.push(quarterConsistency / categoryCount);
      }
    }

    return consistencyScores;
  }

  private determineTrend(quarterlyScores: number[]): 'improving' | 'declining' | 'stable' {
    if (quarterlyScores.length < 2) return 'stable';

    const recent = quarterlyScores.slice(-2);
    const older = quarterlyScores.slice(0, -2);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;

    if (recentAvg > olderAvg + 0.1) return 'improving';
    if (recentAvg < olderAvg - 0.1) return 'declining';
    return 'stable';
  }

  private async identifyConsistencyFactors(
    sponsorId: number,
    votingRecords: VotingRecord[]
  ): Promise<ConsistencyFactor[]> {
    const factors: ConsistencyFactor[] = [];

    // Party alignment factor
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

    // Issue specialization factor
    const categoryDistribution: Record<string, number> = {};
    votingRecords.forEach(r => {
      categoryDistribution[r.billCategory] = (categoryDistribution[r.billCategory] || 0) + 1;
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

  private generateConsistencyRecommendations(
    consistencyScore: number,
    factors: ConsistencyFactor[],
    trend: 'improving' | 'declining' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    if (consistencyScore < this.consistencyThresholds.medium) {
      recommendations.push('Consider developing clearer policy positions on key issues');
      recommendations.push('Review voting patterns for potential inconsistencies');
    }

    if (trend === 'declining') {
      recommendations.push('Analyze recent votes that may have deviated from established patterns');
      recommendations.push('Consider whether external factors are influencing voting decisions');
    }

    const partyAlignmentFactor = factors.find(f => f.factor === 'Party Alignment');
    if (partyAlignmentFactor && partyAlignmentFactor.impact < 0.5) {
      recommendations.push('High independence from party positions - ensure this aligns with constituent expectations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current consistent voting patterns');
      recommendations.push('Continue transparent communication about voting rationale');
    }

    return recommendations;
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export const votingPatternAnalysisService = new VotingPatternAnalysisService();