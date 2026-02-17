
import { database as db } from '@server/infrastructure/database';
import { user_verification,users } from '@server/infrastructure/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface CitizenVerification {
  id: string;
  bill_id: number;
  citizenId: string;
  verification_type: 'fact_check' | 'impact_assessment' | 'source_validation' | 'claim_verification';
  verification_status: 'pending' | 'verified' | 'disputed' | 'needs_review';
  confidence: number; // 0-100
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
  created_at: Date;
  updated_at: Date;
  endorsements: number;
  disputes: number;
}

export interface Evidence {
  type: 'document' | 'data' | 'expert_opinion' | 'media_report' | 'academic_study';
  source: string;
  url?: string;
  credibility: number; // 0-100
  relevance: number; // 0-100
  description: string;
  datePublished?: Date;
}

export interface ExpertiseLevel {
  domain: string;
  level: 'citizen' | 'informed' | 'professional' | 'expert';
  credentials: string[];
  verifiedCredentials: boolean;
  reputation_score: number; // 0-100
}

export interface VerificationSummary {
  bill_id: number;
  totalVerifications: number;
  verificationBreakdown: {
    verified: number;
    disputed: number;
    pending: number;
    needsReview: number;
  };
  averageConfidence: number;
  expertiseDistribution: Record<string, number>;
  consensusLevel: number; // 0-100
  reliabilityScore: number; // 0-100
}

export interface FactCheckResult {
  claim: string;
  status: 'true' | 'false' | 'partially_true' | 'misleading' | 'unverifiable';
  confidence: number;
  evidence: Evidence[];
  verifierCredentials: ExpertiseLevel;
  communityConsensus: number; // 0-100
}

export class CitizenVerificationService {
  async submitVerification(verification_data: {
    bill_id: number;
    citizenId: string;
    verification_type: string;
    claim: string;
    evidence: Evidence[];
    expertise: ExpertiseLevel;
    reasoning: string;
  }): Promise<CitizenVerification> {

    // Validate citizen eligibility
    await this.validateCitizenEligibility(verification_data.citizenId);

    // Assess evidence quality
    const evidenceScore = this.assessEvidenceQuality(verification_data.evidence);

    // Calculate initial confidence based on evidence and expertise
    const confidence = this.calculateInitialConfidence(
      verification_data.evidence,
      verification_data.expertise,
      evidenceScore
    );

    // Determine initial status
    const verification_status = confidence > 80 ? 'verified' :
      confidence > 60 ? 'pending' : 'needs_review';

    // Validate verification type
    const validTypes = ['fact_check', 'impact_assessment', 'source_validation', 'claim_verification'] as const;
    if (!validTypes.includes(verification_data.verification_type as any)) {
      throw new Error(`Invalid verification type: ${verification_data.verification_type}`);
    }

    const verification: CitizenVerification = {
      id: `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bill_id: verification_data.bill_id,
      citizenId: verification_data.citizenId,
      verification_type: verification_data.verification_type as CitizenVerification['verification_type'],
      verification_status,
      confidence,
      evidence: verification_data.evidence,
      expertise: verification_data.expertise,
      reasoning: verification_data.reasoning,
      created_at: new Date(),
      updated_at: new Date(),
      endorsements: 0,
      disputes: 0
    };

    // Store verification
    await this.storeVerification(verification);

    // Update citizen reputation
    await this.updateCitizenReputation(verification_data.citizenId, confidence);

    return verification;
  }

  async endorseVerification(verification_id: string, citizenId: string): Promise<void> {
    // Validate endorser eligibility
    await this.validateCitizenEligibility(citizenId);

    // Check if citizen already endorsed
    const existingEndorsement = await this.checkExistingEndorsement(verification_id, citizenId);
    if (existingEndorsement) {
      throw new Error('Citizen has already endorsed this verification');
    }

    // Record endorsement
    await this.recordEndorsement(verification_id, citizenId);

    // Update verification confidence
    await this.recalculateVerificationConfidence(verification_id);
  }

  async disputeVerification(
    verification_id: string,
    citizenId: string,
    reason: string,
    counterEvidence?: Evidence[]
  ): Promise<void> {
    await this.validateCitizenEligibility(citizenId);

    // Record dispute
    await this.recordDispute(verification_id, citizenId, reason, counterEvidence);

    // Update verification status
    await this.updateVerificationStatus(verification_id);
  }

  async getVerificationSummary(bill_id: number): Promise<VerificationSummary> {
    const verifications = await this.getBillVerifications(bill_id);

    const totalVerifications = verifications.length;

    const verificationBreakdown = {
      verified: verifications.filter(v => v.verification_status === 'verified').length,
      disputed: verifications.filter(v => v.verification_status === 'disputed').length,
      pending: verifications.filter(v => v.verification_status === 'pending').length,
      needsReview: verifications.filter(v => v.verification_status === 'needs_review').length
    };

    const averageConfidence = verifications.length > 0
      ? verifications.reduce((sum, v) => sum + v.confidence, 0) / verifications.length
      : 0;

    const expertiseDistribution = this.calculateExpertiseDistribution(verifications);
    const consensusLevel = this.calculateConsensusLevel(verifications);
    const reliabilityScore = this.calculateReliabilityScore(verifications);

    return {
      bill_id,
      totalVerifications,
      verificationBreakdown,
      averageConfidence,
      expertiseDistribution,
      consensusLevel,
      reliabilityScore
    };
  }

  async performFactCheck(
    bill_id: number,
    claim: string,
    _requesterId?: string
  ): Promise<FactCheckResult[]> { // Find relevant verifications for this claim
    const relevantVerifications = await this.findRelevantVerifications(bill_id, claim);

    // Analyze community consensus
    const factCheckResults: FactCheckResult[] = [];

    for (const verification of relevantVerifications) {
      const communityConsensus = await this.calculateClaimConsensus(verification.id);
      const status = this.determineFactCheckStatus(verification, communityConsensus);

      factCheckResults.push({
        claim,
        status,
        confidence: verification.confidence,
        evidence: verification.evidence,
        verifierCredentials: verification.expertise,
        communityConsensus
      });
    }

    return factCheckResults;
  }

  async getCitizenReputationScore(citizenId: string): Promise<{
    overallScore: number;
    verificationCount: number;
    averageConfidence: number;
    endorsementRate: number;
    disputeRate: number;
    expertiseAreas: string[];
  }> {
  const verifications = await this.getCitizenVerifications(citizenId);

    const verificationCount = verifications.length;
    const averageConfidence = verificationCount > 0
      ? verifications.reduce((sum, v) => sum + v.confidence, 0) / verificationCount
      : 0;

    const totalEndorsements = verifications.reduce((sum, v) => sum + v.endorsements, 0);
    const totalDisputes = verifications.reduce((sum, v) => sum + v.disputes, 0);
    const totalInteractions = totalEndorsements + totalDisputes;

    const endorsementRate = totalInteractions > 0 ? totalEndorsements / totalInteractions : 0;
    const disputeRate = totalInteractions > 0 ? totalDisputes / totalInteractions : 0;

    const expertiseAreas = [...new Set(verifications.map(v => v.expertise.domain))];

    // Calculate overall score
    const overallScore = this.calculateOverallReputationScore(
      averageConfidence,
      endorsementRate,
      disputeRate,
      verificationCount
    );

    return {
      overallScore,
      verificationCount,
      averageConfidence,
      endorsementRate,
      disputeRate,
      expertiseAreas
    };
  }

  private async validateCitizenEligibility(citizenId: string): Promise<void> {
    const citizen = await db
      .select()
      .from(users)
      .where(eq(users.id, citizenId));

    if (!citizen.length) {
      throw new Error('Citizen not found');
    }

    if (citizen[0].role === 'banned') {
      throw new Error('Citizen is not eligible to participate in verification');
    }
  }

  private assessEvidenceQuality(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const qualityWeights = {
      document: 0.8,
      academic_study: 1.0,
      expert_opinion: 0.9,
      data: 0.85,
      media_report: 0.6
    };

    const totalWeight = evidence.reduce((sum, e) => {
      const typeWeight = qualityWeights[e.type] || 0.5;
      const credibilityWeight = e.credibility / 100;
      const relevanceWeight = e.relevance / 100;

      return sum + (typeWeight * credibilityWeight * relevanceWeight);
    }, 0);

    return Math.min(100, (totalWeight / evidence.length) * 100);
  }

  private calculateInitialConfidence(
    _evidence: Evidence[],
    expertise: ExpertiseLevel,
    evidenceScore: number
  ): number {

    // Expertise multipliers
    const expertiseMultipliers = {
      citizen: 0.6,
      informed: 0.75,
      professional: 0.9,
      expert: 1.0
    };

    const expertiseWeight = expertiseMultipliers[expertise.level];
    const reputationWeight = expertise.reputation_score / 100;
    const evidenceWeight = evidenceScore / 100;

    // Weighted confidence calculation
    const baseConfidence = 50; // Starting point
    const expertiseBoost = expertiseWeight * 30;
    const reputationBoost = reputationWeight * 20;
    const evidenceBoost = evidenceWeight * 30;

    return Math.min(100, baseConfidence + expertiseBoost + reputationBoost + evidenceBoost);
  }

  private async storeVerification(verification: CitizenVerification): Promise<void> {
    // Map our domain model into the shared user_verification table.
    // We store bill-specific fields inside verification_data JSONB to avoid schema mismatch.
    await db.insert(user_verification).values({
      id: verification.id,
      user_id: verification.citizenId,
      verification_type: verification.verification_type,
      verification_status: verification.verification_status,
      // Store structured domain fields inside verification_data JSONB
      verification_data: {
        bill_id: verification.bill_id,
        confidence: verification.confidence,
        evidence: verification.evidence,
        expertise: verification.expertise,
        reasoning: verification.reasoning,
        endorsements: 0,
        disputes: 0,
      },
      verification_notes: verification.reasoning,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  private async updateCitizenReputation(citizenId: string, confidenceGain: number): Promise<void> {
    // Update user reputation based on verification quality
    const reputationIncrease = Math.round(confidenceGain / 10);

    await db
      .update(users)
      .set({
        reputation_score: sql`COALESCE(reputation_score, 0) + ${reputationIncrease}`,
        updated_at: new Date()
      })
      .where(eq(users.id, citizenId));
  }

  private async checkExistingEndorsement(_verificationId: string, _citizenId: string): Promise<boolean> {
    // This would check a separate endorsements table in a real implementation
    // For now, returning false as placeholder
    return false;
  }

  private async recordEndorsement(verification_id: string, _citizenId: string): Promise<void> {
    // Increment endorsements counter stored in verification_data JSONB
    const row = await db.select().from(user_verification).where(eq(user_verification.id, verification_id));
    const existing = row[0];
    if (!existing) return;
    
    const data = (existing.verification_data as Record<string, unknown>) || {};
    const endorsements = (data.endorsements || 0) + 1;
    data.endorsements = endorsements;

    await db
      .update(user_verification)
      .set({ verification_data: data, updated_at: new Date() })
      .where(eq(user_verification.id, verification_id));
  }

  private async recordDispute(
    verification_id: string,
    _citizenId: string,
    _reason: string,
    counterEvidence?: Evidence[]
  ): Promise<void> {
    // Record dispute and update count
    const row = await db.select().from(user_verification).where(eq(user_verification.id, verification_id));
    const existing = row[0];
    if (!existing) return;
    
    const data = (existing.verification_data as Record<string, unknown>) || {};
    const disputes = (data.disputes || 0) + 1;
    data.disputes = disputes;
    // Optionally append counterEvidence into verification_data
    if (counterEvidence && counterEvidence.length) {
      data.counterEvidence = (data.counterEvidence || []).concat(counterEvidence);
    }

    await db
      .update(user_verification)
      .set({ verification_data: data, updated_at: new Date() })
      .where(eq(user_verification.id, verification_id));
  }

  private async recalculateVerificationConfidence(verification_id: string): Promise<void> {
    const row = await db.select().from(user_verification).where(eq(user_verification.id, verification_id));
    const existing = row[0];
    if (!existing) return;
    
    const data = (existing.verification_data as Record<string, unknown>) || {};

    const endorsements = data.endorsements || 0;
    const disputes = data.disputes || 0;

    const communityWeight = Math.min(endorsements * 2, 20);
    const disputePenalty = Math.min(disputes * 5, 25);

    const prevConfidence = data.confidence ?? 50;
    const newConfidence = Math.max(0, Math.min(100, prevConfidence + communityWeight - disputePenalty));

    data.confidence = newConfidence;

    await db
      .update(user_verification)
      .set({ verification_data: data, updated_at: new Date() })
      .where(eq(user_verification.id, verification_id));
  }

  private async updateVerificationStatus(verification_id: string): Promise<void> {
    const row = await db.select().from(user_verification).where(eq(user_verification.id, verification_id));
    const existing = row[0];
    if (!existing) return;
    
    const data = (existing.verification_data as Record<string, unknown>) || {};

    if ((data.disputes || 0) > (data.endorsements || 0) && (data.disputes || 0) > 3) {
      await db
        .update(user_verification)
        .set({ verification_status: 'disputed', updated_at: new Date() })
        .where(eq(user_verification.id, verification_id));
    }
  }

  private async getBillVerifications(bill_id: number): Promise<CitizenVerification[]> {
    // The shared schema stores bill-specific data inside verification_data (jsonb).
    // Use a SQL predicate to extract bill_id from the jsonb field.
    const results = await db
      .select()
      .from(user_verification)
      .where(sql`(user_verification.verification_data->>'bill_id')::int = ${bill_id}`)
      .orderBy(desc(user_verification.created_at));

    // Map DB rows into domain shape by pulling data out of verification_data
    return results.map((r: unknown) => {
      const data = (r.verification_data as Record<string, unknown>) || {};
      return {
        id: r.id,
        bill_id: data.bill_id,
        citizenId: r.user_id,
        verification_type: r.verification_type,
        verification_status: r.verification_status,
        confidence: data.confidence ?? 0,
        evidence: data.evidence || [],
        expertise: data.expertise || { domain: '', level: 'citizen', credentials: [], verifiedCredentials: false, reputation_score: 0 },
        reasoning: data.reasoning || (r.verification_notes as string) || '',
        created_at: r.created_at,
        updated_at: r.updated_at,
        endorsements: data.endorsements || 0,
        disputes: data.disputes || 0,
      } as CitizenVerification;
    });
  }

  private calculateExpertiseDistribution(verifications: CitizenVerification[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    verifications.forEach(v => {
      const level = v.expertise.level;
      distribution[level] = (distribution[level] || 0) + 1;
    });

    return distribution;
  }

  private calculateConsensusLevel(verifications: CitizenVerification[]): number {
    if (verifications.length === 0) return 0;

    const verified = verifications.filter(v => v.verification_status === 'verified').length;
    const disputed = verifications.filter(v => v.verification_status === 'disputed').length;

    if (verified + disputed === 0) return 50; // Neutral if all pending

    return Math.round((verified / (verified + disputed)) * 100);
  }

  private calculateReliabilityScore(verifications: CitizenVerification[]): number {
    if (verifications.length === 0) return 0;

    // Weight by expertise level and evidence quality
    const weightedScores = verifications.map(v => {
      const expertiseWeight = this.getExpertiseWeight(v.expertise.level);
      const evidenceWeight = this.assessEvidenceQuality(v.evidence) / 100;

      return v.confidence * expertiseWeight * evidenceWeight;
    });

    const averageWeightedScore = weightedScores.reduce((sum, score) => sum + score, 0) / weightedScores.length;

    return Math.round(averageWeightedScore);
  }

  private getExpertiseWeight(level: string): number {
    const weights = {
      citizen: 0.6,
      informed: 0.75,
      professional: 0.9,
      expert: 1.0
    };

    return weights[level as keyof typeof weights] || 0.5;
  }

  private async findRelevantVerifications(bill_id: number, claim: string): Promise<CitizenVerification[]> {
    const allVerifications = await this.getBillVerifications(bill_id);

    // Simple text matching - can be enhanced with NLP
    return allVerifications.filter(v =>
      v.reasoning.toLowerCase().includes(claim.toLowerCase()) ||
      claim.toLowerCase().includes(v.reasoning.toLowerCase().substring(0, 50))
    );
  }

  private async calculateClaimConsensus(verification_id: string): Promise<number> {
    const verification = await this.getVerificationById(verification_id);
    if (!verification) return 0;

    const totalInteractions = verification.endorsements + verification.disputes;
    if (totalInteractions === 0) return 50;

    return Math.round((verification.endorsements / totalInteractions) * 100);
  }

  private determineFactCheckStatus(
    verification: CitizenVerification,
    communityConsensus: number
  ): 'true' | 'false' | 'partially_true' | 'misleading' | 'unverifiable' {

    if (verification.confidence > 80 && communityConsensus > 70) {
      return 'true';
    }

    if (verification.confidence < 30 || communityConsensus < 30) {
      return 'false';
    }

    if (verification.confidence > 50 && communityConsensus > 50) {
      return 'partially_true';
    }

    if (verification.disputes > verification.endorsements) {
      return 'misleading';
    }

    return 'unverifiable';
  }

  // getCitizenData removed: helper was unused. Use DB queries directly where needed.

  private async getCitizenVerifications(citizenId: string): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.user_id, citizenId))
      .orderBy(desc(user_verification.created_at));

    return results.map((r: unknown) => {
      const data = (r.verification_data as Record<string, unknown>) || {};
      return {
        id: r.id,
        bill_id: data.bill_id,
        citizenId: r.user_id,
        verification_type: r.verification_type,
        verification_status: r.verification_status,
        confidence: data.confidence ?? 0,
        evidence: data.evidence || [],
        expertise: data.expertise || { domain: '', level: 'citizen', credentials: [], verifiedCredentials: false, reputation_score: 0 },
        reasoning: data.reasoning || (r.verification_notes as string) || '',
        created_at: r.created_at,
        updated_at: r.updated_at,
        endorsements: data.endorsements || 0,
        disputes: data.disputes || 0,
      } as CitizenVerification;
    });
  }

  private async getVerificationById(verification_id: string): Promise<CitizenVerification | null> {
    const result = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.id, verification_id));

    return result[0] || null;
  }

  private calculateOverallReputationScore(
    averageConfidence: number,
    endorsementRate: number,
    disputeRate: number,
    verificationCount: number
  ): number {

    const confidenceWeight = 0.4;
    const endorsementWeight = 0.3;
    const volumeWeight = 0.2;
    const consistencyWeight = 0.1;

    const volumeScore = Math.min(100, verificationCount * 5); // Max at 20 verifications
    const consistencyScore = 100 - (disputeRate * 100); // Lower dispute rate = higher consistency

    return Math.round(
      averageConfidence * confidenceWeight +
      endorsementRate * 100 * endorsementWeight +
      volumeScore * volumeWeight +
      consistencyScore * consistencyWeight
    );
  }
}

export const citizenVerificationService = new CitizenVerificationService();


















































