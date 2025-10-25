
import { database as db } from '../shared/database/connection';
import { users, citizenVerifications, bills } from '../../../shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { logger } from '@shared/core';

export interface CitizenVerification {
  id: string;
  billId: number;
  citizenId: string;
  verificationType: 'fact_check' | 'impact_assessment' | 'source_validation' | 'claim_verification';
  verificationStatus: 'pending' | 'verified' | 'disputed' | 'needs_review';
  confidence: number; // 0-100
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
  createdAt: Date;
  updatedAt: Date;
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
  reputationScore: number; // 0-100
}

export interface VerificationSummary {
  billId: number;
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
  
  async submitVerification(verificationData: {
    billId: number;
    citizenId: string;
    verificationType: string;
    claim: string;
    evidence: Evidence[];
    expertise: ExpertiseLevel;
    reasoning: string;
  }): Promise<CitizenVerification> {
    
    // Validate citizen eligibility
    await this.validateCitizenEligibility(verificationData.citizenId);
    
    // Assess evidence quality
    const evidenceScore = this.assessEvidenceQuality(verificationData.evidence);
    
    // Calculate initial confidence based on evidence and expertise
    const confidence = this.calculateInitialConfidence(
      verificationData.evidence,
      verificationData.expertise,
      evidenceScore
    );
    
    // Determine initial status
    const verificationStatus = confidence > 80 ? 'verified' : 
                              confidence > 60 ? 'pending' : 'needs_review';
    
    const verification: CitizenVerification = {
      id: `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      billId: verificationData.billId,
      citizenId: verificationData.citizenId,
      verificationType: verificationData.verificationType as any,
      verificationStatus,
      confidence,
      evidence: verificationData.evidence,
      expertise: verificationData.expertise,
      reasoning: verificationData.reasoning,
      createdAt: new Date(),
      updatedAt: new Date(),
      endorsements: 0,
      disputes: 0
    };
    
    // Store verification
    await this.storeVerification(verification);
    
    // Update citizen reputation
    await this.updateCitizenReputation(verificationData.citizenId, confidence);
    
    return verification;
  }

  async endorseVerification(verificationId: string, citizenId: string): Promise<void> {
    // Validate endorser eligibility
    await this.validateCitizenEligibility(citizenId);
    
    // Check if citizen already endorsed
    const existingEndorsement = await this.checkExistingEndorsement(verificationId, citizenId);
    if (existingEndorsement) {
      throw new Error('Citizen has already endorsed this verification');
    }
    
    // Record endorsement
    await this.recordEndorsement(verificationId, citizenId);
    
    // Update verification confidence
    await this.recalculateVerificationConfidence(verificationId);
  }

  async disputeVerification(
    verificationId: string,
    citizenId: string,
    reason: string,
    counterEvidence?: Evidence[]
  ): Promise<void> {
    await this.validateCitizenEligibility(citizenId);
    
    // Record dispute
    await this.recordDispute(verificationId, citizenId, reason, counterEvidence);
    
    // Update verification status
    await this.updateVerificationStatus(verificationId);
  }

  async getVerificationSummary(billId: number): Promise<VerificationSummary> {
    const verifications = await this.getBillVerifications(billId);
    
    const totalVerifications = verifications.length;
    
    const verificationBreakdown = {
      verified: verifications.filter(v => v.verificationStatus === 'verified').length,
      disputed: verifications.filter(v => v.verificationStatus === 'disputed').length,
      pending: verifications.filter(v => v.verificationStatus === 'pending').length,
      needsReview: verifications.filter(v => v.verificationStatus === 'needs_review').length
    };
    
    const averageConfidence = verifications.length > 0 
      ? verifications.reduce((sum, v) => sum + v.confidence, 0) / verifications.length
      : 0;
    
    const expertiseDistribution = this.calculateExpertiseDistribution(verifications);
    const consensusLevel = this.calculateConsensusLevel(verifications);
    const reliabilityScore = this.calculateReliabilityScore(verifications);
    
    return {
      billId,
      totalVerifications,
      verificationBreakdown,
      averageConfidence,
      expertiseDistribution,
      consensusLevel,
      reliabilityScore
    };
  }

  async performFactCheck(
    billId: number,
    claim: string,
    requesterId?: string
  ): Promise<FactCheckResult[]> {
    
    // Find relevant verifications for this claim
    const relevantVerifications = await this.findRelevantVerifications(billId, claim);
    
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
    const citizen = await this.getCitizenData(citizenId);
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
    evidence: Evidence[],
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
    const reputationWeight = expertise.reputationScore / 100;
    const evidenceWeight = evidenceScore / 100;
    
    // Weighted confidence calculation
    const baseConfidence = 50; // Starting point
    const expertiseBoost = expertiseWeight * 30;
    const reputationBoost = reputationWeight * 20;
    const evidenceBoost = evidenceWeight * 30;
    
    return Math.min(100, baseConfidence + expertiseBoost + reputationBoost + evidenceBoost);
  }

  private async storeVerification(verification: CitizenVerification): Promise<void> {
    await db.insert(citizenVerifications).values({
      id: verification.id,
      billId: verification.billId,
      citizenId: verification.citizenId,
      verificationType: verification.verificationType,
      verificationStatus: verification.verificationStatus,
      confidence: verification.confidence,
      evidence: verification.evidence,
      expertise: verification.expertise,
      reasoning: verification.reasoning,
      endorsements: 0,
      disputes: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private async updateCitizenReputation(citizenId: string, confidenceGain: number): Promise<void> {
    // Update user reputation based on verification quality
    const reputationIncrease = Math.round(confidenceGain / 10);
    
    await db
      .update(users)
      .set({
        reputationScore: sql`COALESCE(reputation_score, 0) + ${reputationIncrease}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, citizenId));
  }

  private async checkExistingEndorsement(verificationId: string, citizenId: string): Promise<boolean> {
    // This would check a separate endorsements table in a real implementation
    // For now, returning false as placeholder
    return false;
  }

  private async recordEndorsement(verificationId: string, citizenId: string): Promise<void> {
    // Record endorsement and update count
    await db
      .update(citizenVerifications)
      .set({
        endorsements: sql`endorsements + 1`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  private async recordDispute(
    verificationId: string,
    citizenId: string,
    reason: string,
    counterEvidence?: Evidence[]
  ): Promise<void> {
    // Record dispute and update count
    await db
      .update(citizenVerifications)
      .set({
        disputes: sql`disputes + 1`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  private async recalculateVerificationConfidence(verificationId: string): Promise<void> {
    // Get current verification data
    const verification = await this.getVerificationById(verificationId);
    if (!verification) return;
    
    // Factor in community endorsements
    const communityWeight = Math.min(verification.endorsements * 2, 20);
    const disputePenalty = Math.min(verification.disputes * 5, 25);
    
    const newConfidence = Math.max(0, Math.min(100, 
      verification.confidence + communityWeight - disputePenalty
    ));
    
    await db
      .update(citizenVerifications)
      .set({
        confidence: newConfidence,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  private async updateVerificationStatus(verificationId: string): Promise<void> {
    const verification = await this.getVerificationById(verificationId);
    if (!verification) return;
    
    // Update status based on dispute threshold
    if (verification.disputes > verification.endorsements && verification.disputes > 3) {
      await db
        .update(citizenVerifications)
        .set({
          verificationStatus: 'disputed',
          updatedAt: new Date()
        })
        .where(eq(citizenVerifications.id, verificationId));
    }
  }

  private async getBillVerifications(billId: number): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId))
      .orderBy(desc(citizenVerifications.createdAt));
    
    return results;
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
    
    const verified = verifications.filter(v => v.verificationStatus === 'verified').length;
    const disputed = verifications.filter(v => v.verificationStatus === 'disputed').length;
    
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

  private async findRelevantVerifications(billId: number, claim: string): Promise<CitizenVerification[]> {
    const allVerifications = await this.getBillVerifications(billId);
    
    // Simple text matching - can be enhanced with NLP
    return allVerifications.filter(v => 
      v.reasoning.toLowerCase().includes(claim.toLowerCase()) ||
      claim.toLowerCase().includes(v.reasoning.toLowerCase().substring(0, 50))
    );
  }

  private async calculateClaimConsensus(verificationId: string): Promise<number> {
    const verification = await this.getVerificationById(verificationId);
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

  private async getCitizenData(citizenId: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, citizenId));
    
    return result[0];
  }

  private async getCitizenVerifications(citizenId: string): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.citizenId, citizenId))
      .orderBy(desc(citizenVerifications.createdAt));
    
    return results;
  }

  private async getVerificationById(verificationId: string): Promise<CitizenVerification | null> {
    const result = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.id, verificationId));
    
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














































