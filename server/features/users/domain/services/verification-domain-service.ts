/**
 * Domain Service for Citizen Verification Operations
 *
 * This service handles the business logic for citizen verifications,
 * including validation, community consensus, and reputation management.
 */

import { UserAggregate } from '../aggregates/user-aggregate';
import { CitizenVerification, VerificationType } from '../entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../entities/value-objects';

export interface VerificationValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
}

export interface VerificationProcessingResult {
  success: boolean;
  verification?: CitizenVerification;
  errors: string[];
  warnings: string[];
}

export class VerificationDomainService {
  /**
   * Validates evidence for a verification
   */
  validateEvidence(evidence: Evidence[]): VerificationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
      return { isValid: false, confidence: 0, errors, warnings };
    }

    if (evidence.length > 10) {
      errors.push('Maximum 10 pieces of evidence allowed');
      return { isValid: false, confidence: 0, errors, warnings };
    }

    // Validate each piece of evidence
    let totalQuality = 0;
    evidence.forEach((e, index) => {
      if (!e.source || e.source.trim().length === 0) {
        errors.push(`Evidence ${index + 1}: Source is required`);
      }

      if (!e.description || e.description.trim().length < 10) {
        errors.push(`Evidence ${index + 1}: Description must be at least 10 characters`);
      }

      if (e.credibility < 0 || e.credibility > 1) {
        errors.push(`Evidence ${index + 1}: Credibility must be between 0 and 1`);
      }

      if (e.relevance < 0 || e.relevance > 1) {
        errors.push(`Evidence ${index + 1}: Relevance must be between 0 and 1`);
      }

      totalQuality += e.getQualityScore();
    });

    const averageQuality = totalQuality / evidence.length;
    const confidence = Math.min(100, averageQuality * 100);

    // Warnings for low quality evidence
    if (averageQuality < 0.5) {
      warnings.push('Evidence quality is below average - consider adding more reliable sources');
    }

    if (evidence.length < 3) {
      warnings.push('More evidence would strengthen the verification');
    }

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings
    };
  }

  /**
   * Validates expertise level for a verification type
   */
  validateExpertiseForVerificationType(
    expertise: ExpertiseLevel,
    verification_type: VerificationType
  ): VerificationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if expertise domain is relevant to verification type
    const relevantDomains = this.getRelevantDomainsForVerificationType(verification_type);
    if (!relevantDomains.includes(expertise.domain)) {
      warnings.push(`Expertise in ${expertise.domain} may not be directly relevant to ${verification_type}`);
    }

    // Check expertise level requirements
    const requiredLevel = this.getRequiredExpertiseLevel(verification_type);
    if (expertise.level === 'beginner' && requiredLevel !== 'beginner') {
      errors.push(`${verification_type} requires at least ${requiredLevel} level expertise`);
    }

    // Check verified credentials
    if (!expertise.verifiedCredentials && expertise.level !== 'beginner') {
      warnings.push('Consider verifying credentials for higher expertise claims');
    }

    const confidence = expertise.getWeight() * 25; // Convert to percentage

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings
    };
  }

  /**
   * Processes a citizen verification with full validation
   */
  async processVerification(
    citizenId: string,
    bill_id: number,
    verification_type: VerificationType,
    evidence: Evidence[],
    expertise: ExpertiseLevel,
    reasoning: string
  ): Promise<VerificationProcessingResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate evidence
    const evidenceValidation = this.validateEvidence(evidence);
    if (!evidenceValidation.isValid) {
      errors.push(...evidenceValidation.errors);
    }
    warnings.push(...evidenceValidation.warnings);

    // Validate expertise
    const expertiseValidation = this.validateExpertiseForVerificationType(expertise, verification_type);
    if (!expertiseValidation.isValid) {
      errors.push(...expertiseValidation.errors);
    }
    warnings.push(...expertiseValidation.warnings);

    // Validate reasoning
    if (!reasoning || reasoning.trim().length < 20) {
      errors.push('Reasoning must be at least 20 characters long');
    }

    if (reasoning.length > 2000) {
      errors.push('Reasoning must be less than 2000 characters');
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    try { // Calculate initial confidence
      const evidenceConfidence = evidenceValidation.confidence;
      const expertiseConfidence = expertiseValidation.confidence;
      const initialConfidence = Math.round((evidenceConfidence * 0.6) + (expertiseConfidence * 0.4));

      // Create verification
      const verification = CitizenVerification.create({
        id: crypto.randomUUID(),
        bill_id,
        citizenId,
        verification_type,
        evidence,
        expertise,
        reasoning: reasoning.trim()
       });

      return {
        success: true,
        verification,
        errors: [],
        warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to process verification: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Calculates community consensus score
   */
  calculateCommunityConsensus(
    endorsements: number,
    disputes: number,
    totalCommunitySize: number
  ): number {
    const totalInteractions = endorsements + disputes;
    if (totalInteractions === 0) return 50; // Neutral

    const endorsementRatio = endorsements / totalInteractions;
    const participationRatio = totalInteractions / Math.max(totalCommunitySize, 1);

    // Weight participation - more participation gives more confidence in the result
    const consensusScore = endorsementRatio * 100;
    const confidenceWeight = Math.min(participationRatio * 100, 50); // Max 50% weight for participation

    return Math.round((consensusScore * 0.7) + (confidenceWeight * 0.3));
  }

  /**
   * Determines if a verification should be escalated for expert review
   */
  shouldEscalateForExpertReview(
    verification: CitizenVerification,
    communityConsensus: number
  ): boolean {
    // Escalate if:
    // 1. High confidence but disputed by community
    // 2. Low expertise but high community disagreement
    // 3. Critical verification type with mixed consensus

    const highConfidence = verification.confidence > 80;
    const disputed = communityConsensus < 40;
    const lowExpertise = verification.expertise.level === 'beginner';
    const criticalType = ['constitutional', 'impact_assessment'].includes(verification.verification_type);

    return (highConfidence && disputed) ||
           (lowExpertise && communityConsensus < 50) ||
           (criticalType && Math.abs(communityConsensus - 50) < 20); // Close to 50% consensus
  }

  /**
   * Gets relevant expertise domains for a verification type
   */
  private getRelevantDomainsForVerificationType(type: VerificationType): string[] {
    const domainMap: Record<VerificationType, string[]> = {
      fact_check: ['law', 'journalism', 'research', 'politics', 'economics'],
      impact_assessment: ['economics', 'sociology', 'environmental science', 'public policy', 'statistics'],
      source_validation: ['journalism', 'research', 'library science', 'information technology'],
      claim_verification: ['law', 'journalism', 'research', 'fact-checking', 'politics']
    };

    return domainMap[type] || [];
  }

  /**
   * Gets required expertise level for a verification type
   */
  private getRequiredExpertiseLevel(type: VerificationType): string {
    const levelMap: Record<VerificationType, string> = {
      fact_check: 'intermediate',
      impact_assessment: 'advanced',
      source_validation: 'intermediate',
      claim_verification: 'intermediate'
    };

    return levelMap[type] || 'beginner';
  }

  /**
   * Validates verification content for quality and completeness
   */
  validateVerificationContent(
    verification_type: VerificationType,
    evidence: Evidence[],
    reasoning: string
  ): VerificationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type-specific validation
    switch (verification_type) {
      case 'fact_check':
        if (evidence.length < 2) {
          errors.push('Fact checking requires at least 2 sources');
        }
        if (reasoning.length < 50) {
          errors.push('Fact checking reasoning must be detailed (at least 50 characters)');
        }
        break;

      case 'impact_assessment':
        if (evidence.length < 3) {
          warnings.push('Impact assessment benefits from multiple data sources');
        }
        if (!reasoning.includes('impact') && !reasoning.includes('effect')) {
          warnings.push('Consider discussing specific impacts in reasoning');
        }
        break;

      case 'source_validation':
        const hasPrimarySource = evidence.some(e => e.credibility > 0.8);
        if (!hasPrimarySource) {
          warnings.push('Consider including primary source documents');
        }
        break;

      case 'claim_verification':
        if (!reasoning.includes('evidence') && !reasoning.includes('support')) {
          warnings.push('Explain how evidence supports or refutes the claim');
        }
        break;
    }

    // General validation
    const evidenceQuality = evidence.reduce((sum, e) => sum + e.getQualityScore(), 0) / evidence.length;
    const confidence = Math.round(evidenceQuality * 100);

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings
    };
  }

  /**
   * Determines verification priority based on bill impact and user expertise
   */
  calculateVerificationPriority(
    bill_id: number,
    userExpertise: ExpertiseLevel,
    billComplexity: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    let priorityScore = 0;

    // Bill complexity factor
    priorityScore += billComplexity * 0.4;

    // User expertise factor
    priorityScore += userExpertise.getWeight() * 0.3;

    // User reputation factor
    priorityScore += (userExpertise.reputation_score / 100) * 0.3;

    if (priorityScore >= 80) return 'critical';
    if (priorityScore >= 60) return 'high';
    if (priorityScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Validates if a user can participate in verification for a specific bill
   */
  canUserVerifyBill(
    userAggregate: UserAggregate,
    bill_id: number,
    verification_type: VerificationType
  ): { canVerify: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check user eligibility
    if (!userAggregate.users.isEligibleForVerification()) {
      reasons.push('User is not eligible for verification');
      return { canVerify: false, reasons };
    }

    // Check if user already verified this bill
    const existingVerification = userAggregate.verifications.find(v => v.bill_id === bill_id);
    if (existingVerification) {
      reasons.push('User has already verified this bill');
      return { canVerify: false, reasons };
    }

    // Check expertise relevance
    if (userAggregate.profile) {
      const relevantDomains = this.getRelevantDomainsForVerificationType(verification_type);
      const hasRelevantExpertise = userAggregate.profile.expertise.some(exp =>
        relevantDomains.includes(exp)
      );

      if (!hasRelevantExpertise && userAggregate.profile.expertise.length > 0) {
        reasons.push('User expertise may not be relevant to this verification type');
      }
    }

    return { canVerify: true, reasons };
  }

  /**
   * Generates quality metrics for verification assessment
   */
  generateVerificationQualityMetrics(verification: CitizenVerification): {
    evidenceStrength: number;
    reasoningQuality: number;
    expertiseRelevance: number;
    overallQuality: number;
  } {
    // Evidence strength (0-100)
    const evidenceStrength = verification.evidence.reduce((sum, e) =>
      sum + (e.credibility * e.relevance * 100), 0
    ) / verification.evidence.length;

    // Reasoning quality based on length and content analysis
    const reasoningWords = verification.reasoning.split(' ').length;
    const reasoningQuality = Math.min(100, (reasoningWords / 50) * 100);

    // Expertise relevance (simplified)
    const expertiseRelevance = verification.expertise.getWeight() * 25;

    // Overall quality as weighted average
    const overallQuality = Math.round(
      (evidenceStrength * 0.5) +
      (reasoningQuality * 0.3) +
      (expertiseRelevance * 0.2)
    );

    return {
      evidenceStrength: Math.round(evidenceStrength),
      reasoningQuality: Math.round(reasoningQuality),
      expertiseRelevance: Math.round(expertiseRelevance),
      overallQuality
    };
  }

  /**
   * Determines if a verification needs expert review based on various factors
   */
  needsExpertReview(
    verification: CitizenVerification,
    communityConsensus: number,
    billCriticality: 'low' | 'medium' | 'high' | 'critical'
  ): boolean {
    // Always review critical bills
    if (billCriticality === 'critical') return true;

    // Review if community consensus is very low
    if (communityConsensus < 30) return true;

    // Review high-confidence verifications with disputes
    if (verification.confidence > 80 && communityConsensus < 50) return true;

    // Review verifications from low-expertise users on high-criticality bills
    if (billCriticality === 'high' && verification.expertise.level === 'beginner') return true;

    return false;
  }

  /**
   * Calculates verification reliability score based on multiple factors
   */
  calculateReliabilityScore(verification: CitizenVerification): number {
    const evidenceScore = verification.evidence.reduce((sum, e) => sum + e.getQualityScore(), 0) / verification.evidence.length;
    const expertiseScore = verification.expertise.getWeight() / 4; // Normalize to 0-25
    const consensusScore = verification.getConsensusLevel() / 4; // Normalize to 0-25

    return Math.round(
      (evidenceScore * 50) + // 50% weight on evidence
      (expertiseScore * 25) + // 25% weight on expertise
      (consensusScore * 25)   // 25% weight on consensus
    );
  }

  /**
   * Validates verification against business rules
   */
  validateVerificationBusinessRules(
    verification: CitizenVerification,
    existingVerifications: CitizenVerification[]
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for duplicate verifications from same user on same bill
    const duplicate = existingVerifications.find(v =>
      v.citizenId === verification.citizenId &&
      v.bill_id === verification.bill_id &&
      v.verification_type === verification.verification_type
    );

    if (duplicate) {
      violations.push('User has already submitted this type of verification for this bill');
    }

    // Check verification frequency limits (max 3 per bill per user)
    const userVerificationsForBill = existingVerifications.filter(v =>
      v.citizenId === verification.citizenId && v.bill_id === verification.bill_id
    );

    if (userVerificationsForBill.length >= 3) {
      violations.push('User has reached maximum verification limit for this bill');
    }

    // Check minimum time between verifications (prevent spam)
    const recentVerification = userVerificationsForBill
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

    if (recentVerification) {
      const timeSinceLastVerification = Date.now() - recentVerification.created_at.getTime();
      const minimumInterval = 1000 * 60 * 5; // 5 minutes

      if (timeSinceLastVerification < minimumInterval) {
        violations.push('Please wait before submitting another verification');
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

}






































