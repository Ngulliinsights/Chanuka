import type { PlainBill } from './recommendation.dto';

export interface RecommendationContext {
  userId: string;
  userInterests: string[];
  engagedBillIds: number[];
  recentActivity: Array<{
    billId: number;
    engagementType: 'view' | 'comment' | 'share';
    timestamp: Date;
  }>;
}

export interface RecommendationCandidate {
  bill: PlainBill;
  score: number;
  reasons: string[];
  confidence: number;
}

export class RecommendationEngine {
  private static readonly SCORING_WEIGHTS = {
    INTEREST_MATCH: 0.4,
    COLLABORATIVE_SIMILARITY: 0.3,
    TRENDING_POPULARITY: 0.2,
    RECENCY_BONUS: 0.1,
  } as const;

  private static readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
  } as const;

  /**
   * Generate personalized recommendations using multiple algorithms
   */
  static generateRecommendations(
    context: RecommendationContext,
    availableBills: PlainBill[],
    options: {
      limit?: number;
      diversityFactor?: number;
      recencyWeight?: number;
    } = {}
  ): RecommendationCandidate[] {
    const { limit = 10, diversityFactor = 0.3, recencyWeight = 0.2 } = options;

    // Filter out already engaged bills
    const candidateBills = availableBills.filter(
      bill => !context.engagedBillIds.includes(bill.id)
    );

    // Score each candidate bill
    const candidates: RecommendationCandidate[] = candidateBills.map(bill =>
      this.scoreBill(bill, context, { recencyWeight })
    );

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Apply diversity filtering to avoid similar recommendations
    const diverseCandidates = this.applyDiversityFilter(candidates, diversityFactor);

    // Limit results and calculate confidence
    return diverseCandidates
      .slice(0, limit)
      .map(candidate => ({
        ...candidate,
        confidence: this.calculateConfidence(candidate.score),
      }));
  }

  /**
   * Find similar bills based on content and engagement patterns
   */
  static findSimilarBills(
    targetBill: PlainBill,
    allBills: PlainBill[],
    options: {
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Array<{ bill: PlainBill; similarityScore: number; reasons: string[] }> {
    const { limit = 5, minSimilarity = 0.3 } = options;

    const similarities = allBills
      .filter(bill => bill.id !== targetBill.id)
      .map(bill => ({
        bill,
        similarityScore: this.calculateBillSimilarity(targetBill, bill),
        reasons: this.getSimilarityReasons(targetBill, bill),
      }))
      .filter(item => item.similarityScore >= minSimilarity)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return similarities.slice(0, limit);
  }

  /**
   * Identify trending bills based on recent engagement
   */
  static identifyTrendingBills(
    bills: PlainBill[],
    engagementData: Array<{
      billId: number;
      engagementType: 'view' | 'comment' | 'share';
      timestamp: Date;
    }>,
    options: {
      days?: number;
      limit?: number;
      decayFactor?: number;
    } = {}
  ): Array<{ bill: PlainBill; trendScore: number; velocity: number }> {
    const { days = 7, limit = 10, decayFactor = 0.9 } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Calculate trend scores for each bill
    const billTrends = new Map<number, {
      bill: PlainBill;
      engagements: typeof engagementData;
      score: number;
    }>();

    // Group engagements by bill
    engagementData
      .filter(engagement => engagement.timestamp >= cutoffDate)
      .forEach(engagement => {
        const bill = bills.find(b => b.id === engagement.billId);
        if (!bill) return;

        if (!billTrends.has(bill.id)) {
          billTrends.set(bill.id, {
            bill,
            engagements: [],
            score: 0,
          });
        }

        billTrends.get(bill.id)!.engagements.push(engagement);
      });

    // Calculate trend scores
    const trendingBills = Array.from(billTrends.values())
      .map(({ bill, engagements, score }) => {
        const trendScore = this.calculateTrendScore(engagements, decayFactor);
        return {
          bill,
          trendScore,
          velocity: this.calculateEngagementVelocity(engagements, days),
        };
      })
      .filter(item => item.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore);

    return trendingBills.slice(0, limit);
  }

  /**
   * Generate collaborative recommendations based on similar users
   */
  static generateCollaborativeRecommendations(
    userId: string,
    userEngagementHistory: Array<{
      billId: number;
      engagementType: 'view' | 'comment' | 'share';
      timestamp: Date;
    }>,
    similarUsersEngagements: Array<{
      userId: string;
      billId: number;
      engagementType: 'view' | 'comment' | 'share';
      timestamp: Date;
      similarityScore: number;
    }>,
    availableBills: PlainBill[],
    options: {
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Array<{ bill: PlainBill; score: number; reasons: string[] }> {
    const { limit = 10, minSimilarity = 0.3 } = options;

    // Filter out user's own engaged bills
    const userEngagedBillIds = new Set(
      userEngagementHistory.map(e => e.billId)
    );

    // Group similar users' engagements by bill
    const billRecommendations = new Map<number, {
      bill: PlainBill;
      totalScore: number;
      userCount: number;
      reasons: string[];
    }>();

    similarUsersEngagements
      .filter(e => e.similarityScore >= minSimilarity && !userEngagedBillIds.has(e.billId))
      .forEach(engagement => {
        const bill = availableBills.find(b => b.id === engagement.billId);
        if (!bill) return;

        const existing = billRecommendations.get(bill.id) || {
          bill,
          totalScore: 0,
          userCount: 0,
          reasons: [],
        };

        const engagementWeight = this.getEngagementWeight(engagement.engagementType);
        existing.totalScore += engagementWeight * engagement.similarityScore;
        existing.userCount += 1;

        if (!existing.reasons.includes(`Liked by ${existing.userCount} similar user(s)`)) {
          existing.reasons = [`Liked by ${existing.userCount} similar user(s)`];
        }

        billRecommendations.set(bill.id, existing);
      });

    // Convert to final format
    return Array.from(billRecommendations.values())
      .map(({ bill, totalScore, reasons }) => ({
        bill,
        score: totalScore,
        reasons,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Private scoring methods

  private static scoreBill(
    bill: PlainBill,
    context: RecommendationContext,
    options: { recencyWeight?: number }
  ): RecommendationCandidate {
    let score = 0;
    const reasons: string[] = [];

    // Interest-based scoring
    const interestScore = this.calculateInterestScore(bill, context.userInterests);
    if (interestScore > 0) {
      score += interestScore * this.SCORING_WEIGHTS.INTEREST_MATCH;
      reasons.push('Matches your interests');
    }

    // Recency bonus
    const recencyScore = this.calculateRecencyScore(bill, options.recencyWeight || 0.1);
    if (recencyScore > 0) {
      score += recencyScore * this.SCORING_WEIGHTS.RECENCY_BONUS;
      reasons.push('Recently introduced');
    }

    // Popularity bonus (simulated collaborative filtering)
    const popularityScore = this.calculatePopularityScore(bill);
    if (popularityScore > 0) {
      score += popularityScore * this.SCORING_WEIGHTS.TRENDING_POPULARITY;
      reasons.push('Popular bill');
    }

    return {
      bill,
      score: Math.round(score * 100) / 100,
      reasons,
      confidence: 0, // Will be set later
    };
  }

  private static calculateInterestScore(bill: PlainBill, userInterests: string[]): number {
    if (!userInterests.length) return 0;

    const billTags = bill.tags || [];
    const billContent = `${bill.title} ${bill.description || ''} ${bill.category || ''}`.toLowerCase();

    let score = 0;

    // Direct tag matches
    const tagMatches = userInterests.filter(interest =>
      billTags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
    ).length;
    score += tagMatches * 0.5;

    // Content matches
    const contentMatches = userInterests.filter(interest =>
      billContent.includes(interest.toLowerCase())
    ).length;
    score += contentMatches * 0.3;

    return Math.min(score, 1); // Normalize to 0-1
  }

  private static calculateRecencyScore(bill: PlainBill, weight: number): number {
    if (!bill.createdAt) return 0;

    const daysSinceCreation = (Date.now() - new Date(bill.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-daysSinceCreation / 30); // Exponential decay over 30 days

    return recencyFactor * weight;
  }

  private static calculatePopularityScore(bill: PlainBill): number {
    const viewScore = (bill.viewCount || 0) / 1000; // Normalize by expected max
    const commentScore = (bill.commentCount || 0) / 100;
    const shareScore = (bill.shareCount || 0) / 50;

    return Math.min(viewScore + commentScore + shareScore, 1);
  }

  private static calculateBillSimilarity(bill1: PlainBill, bill2: PlainBill): number {
    let similarity = 0;
    const reasons: string[] = [];

    // Tag overlap
    const tags1 = bill1.tags || [];
    const tags2 = bill2.tags || [];
    if (tags1.length > 0 && tags2.length > 0) {
      const overlap = tags1.filter(tag => tags2.includes(tag)).length;
      const maxTags = Math.max(tags1.length, tags2.length);
      similarity += (overlap / maxTags) * 0.5;
      if (overlap > 0) reasons.push('Similar tags');
    }

    // Category match
    if (bill1.category && bill2.category && bill1.category === bill2.category) {
      similarity += 0.3;
      reasons.push('Same category');
    }

    // Sponsor match
    if (bill1.sponsorId && bill2.sponsorId && bill1.sponsorId === bill2.sponsorId) {
      similarity += 0.2;
      reasons.push('Same sponsor');
    }

    return Math.min(similarity, 1);
  }

  private static getSimilarityReasons(bill1: PlainBill, bill2: PlainBill): string[] {
    const reasons: string[] = [];

    // Tag overlap
    const tags1 = bill1.tags || [];
    const tags2 = bill2.tags || [];
    const tagOverlap = tags1.filter(tag => tags2.includes(tag)).length;
    if (tagOverlap > 0) {
      reasons.push(`${tagOverlap} shared tag(s)`);
    }

    // Category match
    if (bill1.category && bill2.category && bill1.category === bill2.category) {
      reasons.push('Same category');
    }

    // Status similarity
    if (bill1.status && bill2.status && bill1.status === bill2.status) {
      reasons.push('Similar status');
    }

    return reasons;
  }

  private static calculateTrendScore(
    engagements: Array<{ engagementType: 'view' | 'comment' | 'share'; timestamp: Date }>,
    decayFactor: number
  ): number {
    const now = Date.now();
    let score = 0;

    engagements.forEach(engagement => {
      const ageInHours = (now - engagement.timestamp.getTime()) / (1000 * 60 * 60);
      const weight = this.getEngagementWeight(engagement.engagementType);
      const decayedWeight = weight * Math.pow(decayFactor, ageInHours / 24); // Daily decay
      score += decayedWeight;
    });

    return score;
  }

  private static calculateEngagementVelocity(
    engagements: Array<{ timestamp: Date }>,
    days: number
  ): number {
    if (engagements.length === 0) return 0;

    const sortedEngagements = engagements.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const timeSpan = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const recentEngagements = sortedEngagements.filter(
      e => Date.now() - e.timestamp.getTime() <= timeSpan
    );

    return recentEngagements.length / days; // Engagements per day
  }

  private static getEngagementWeight(type: 'view' | 'comment' | 'share'): number {
    switch (type) {
      case 'view': return 0.1;
      case 'comment': return 0.5;
      case 'share': return 0.3;
      default: return 0.1;
    }
  }

  private static applyDiversityFilter(
    candidates: RecommendationCandidate[],
    diversityFactor: number
  ): RecommendationCandidate[] {
    if (diversityFactor <= 0 || candidates.length <= 1) return candidates;

    const diverse: RecommendationCandidate[] = [];
    const usedCategories = new Set<string>();
    const usedSponsors = new Set<number>();

    for (const candidate of candidates) {
      const category = candidate.bill.category || 'unknown';
      const sponsorId = candidate.bill.sponsorId;

      // Check diversity constraints
      const categoryUsed = usedCategories.has(category);
      const sponsorUsed = sponsorId && usedSponsors.has(sponsorId);

      if (categoryUsed || sponsorUsed) {
        // Apply diversity penalty
        candidate.score *= (1 - diversityFactor);
      }

      diverse.push(candidate);

      // Track used categories and sponsors
      usedCategories.add(category);
      if (sponsorId) {
        usedSponsors.add(sponsorId);
      }
    }

    // Re-sort after diversity adjustments
    return diverse.sort((a, b) => b.score - a.score);
  }

  private static calculateConfidence(score: number): number {
    if (score >= this.CONFIDENCE_THRESHOLDS.HIGH) return 0.9;
    if (score >= this.CONFIDENCE_THRESHOLDS.MEDIUM) return 0.7;
    if (score >= this.CONFIDENCE_THRESHOLDS.LOW) return 0.5;
    return 0.3;
  }
}