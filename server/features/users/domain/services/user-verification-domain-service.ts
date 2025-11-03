import { CitizenVerification, VerificationType } from '../entities/citizen-verification';
import { UserAggregate } from '../aggregates/user-aggregate';
import { UserRepository } from '../repositories/user-repository';
import { VerificationRepository } from '../repositories/verification-repository';
import { ProfileDomainService } from './profile-domain-service';

export interface VerificationCreationResult {
  success: boolean;
  verification?: CitizenVerification;
  errors: string[];
}

export interface VerificationUpdateResult {
  success: boolean;
  verification?: CitizenVerification;
  errors: string[];
}

export interface VerificationValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
}

export class UserVerificationDomainService {
  constructor(
    private userRepository: UserRepository,
    private verificationRepository: VerificationRepository,
    private profileService: ProfileDomainService
  ) {}

  /**
   * Creates a new citizen verification with validation
   */
  async createVerification(verification_data: { citizenId: string;
    bill_id: number;
    verification_type: VerificationType;
    evidence: any[];
    expertise: any;
    reasoning: string;
   }): Promise<VerificationCreationResult> {
    const errors: string[] = [];

    // Validate user exists and is eligible
    const userAggregate = await this.userRepository.findUserAggregateById(verification_data.citizenId);
    if (!userAggregate) {
      return { success: false, errors: ['User not found'] };
    }

    if (!userAggregate.users.isEligibleForVerification()) {
      errors.push('User is not eligible for verification (insufficient reputation or inactive status)');
    }

    // Validate expertise for the domain
    if (verification_data.expertise && verification_data.expertise.domain) {
      const hasDomainExpertise = this.profileService.isDomainExpert(userAggregate, verification_data.expertise.domain);
      if (!hasDomainExpertise) {
        errors.push('User does not have sufficient expertise in this domain');
      }
    }

    // Validate evidence
    if (!verification_data.evidence || verification_data.evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
    }

    // Validate reasoning
    if (!verification_data.reasoning || verification_data.reasoning.trim().length < 10) {
      errors.push('Reasoning must be at least 10 characters long');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try { const verification = CitizenVerification.create({
        id: crypto.randomUUID(),
        bill_id: verification_data.bill_id,
        citizenId: verification_data.citizenId,
        verification_type: verification_data.verification_type,
        evidence: verification_data.evidence,
        expertise: verification_data.expertise,
        reasoning: verification_data.reasoning.trim()
       });

      await this.verificationRepository.save(verification);

      // Update user reputation based on verification
      const newReputation = this.calculateReputationAfterVerification(userAggregate, verification);
      userAggregate.users.updateReputationScore(newReputation);
      await this.userRepository.update(userAggregate.user);

      return { success: true, verification, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to create verification: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Updates an existing verification
   */
  async updateVerification(
    verificationId: string,
    citizenId: string,
    updates: {
      evidence?: any[];
      reasoning?: string;
    }
  ): Promise<VerificationUpdateResult> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) {
      return { success: false, errors: ['Verification not found'] };
    }

    if (verification.citizenId !== citizenId) {
      return { success: false, errors: ['Unauthorized to update this verification'] };
    }

    if (verification.is_verified()) {
      return { success: false, errors: ['Cannot update a verified verification'] };
    }

    const errors: string[] = [];

    // Validate updates
    if (updates.evidence && updates.evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
    }

    if (updates.reasoning && updates.reasoning.trim().length < 10) {
      errors.push('Reasoning must be at least 10 characters long');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try { // Update verification (this would need to be implemented in the entity)
      // For now, we'll recreate it
      const updatedVerification = CitizenVerification.create({
        id: verification.id,
        bill_id: verification.bill_id,
        citizenId: verification.citizenId,
        verification_type: verification.verification_type,
        verification_status: verification.verification_status,
        confidence: verification.confidence,
        evidence: updates.evidence || verification.evidence,
        expertise: verification.expertise,
        reasoning: updates.reasoning || verification.reasoning,
        endorsements: verification.endorsements,
        disputes: verification.disputes,
        created_at: verification.created_at,
        updated_at: new Date()
       });

      await this.verificationRepository.update(updatedVerification);

      return { success: true, verification: updatedVerification, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update verification: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Adds an endorsement to a verification
   */
  async endorseVerification(verificationId: string, endorserId: string): Promise<{ success: boolean; errors: string[] }> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) {
      return { success: false, errors: ['Verification not found'] };
    }

    // Check if user already endorsed
    const endorsements = await this.verificationRepository.findEndorsements(verificationId);
    if (endorsements.includes(endorserId)) {
      return { success: false, errors: ['Already endorsed this verification'] };
    }

    // Check if user is trying to endorse their own verification
    if (verification.citizenId === endorserId) {
      return { success: false, errors: ['Cannot endorse your own verification'] };
    }

    try {
      await this.verificationRepository.addEndorsement(verificationId, endorserId);
      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to add endorsement: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Adds a dispute to a verification
   */
  async disputeVerification(
    verificationId: string,
    disputerId: string,
    reason: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) {
      return { success: false, errors: ['Verification not found'] };
    }

    // Check if user already disputed
    const disputes = await this.verificationRepository.findDisputes(verificationId);
    if (disputes.includes(disputerId)) {
      return { success: false, errors: ['Already disputed this verification'] };
    }

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return { success: false, errors: ['Dispute reason must be at least 10 characters long'] };
    }

    try {
      await this.verificationRepository.addDispute(verificationId, disputerId, reason);
      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to add dispute: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validates a verification for approval
   */
  async validateVerificationForApproval(verificationId: string): Promise<VerificationValidationResult> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) {
      return {
        isValid: false,
        confidence: 0,
        errors: ['Verification not found'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check evidence quality
    const evidenceQuality = verification.evidence.reduce((sum, e) => sum + (e.credibility || 0), 0) / verification.evidence.length;
    if (evidenceQuality < 0.5) {
      errors.push('Evidence quality is too low for approval');
    }

    // Check expertise level
    if (verification.expertise.level === 'beginner') {
      warnings.push('Expertise level is beginner - consider requiring higher expertise');
    }

    // Check community consensus
    const consensusLevel = await this.verificationRepository.getConsensusLevel(verificationId);
    if (consensusLevel < 60) {
      warnings.push('Community consensus is below 60%');
    }

    // Check for disputes
    const disputes = await this.verificationRepository.findDisputes(verificationId);
    if (disputes.length > verification.endorsements) {
      errors.push('More disputes than endorsements');
    }

    // Calculate final confidence
    const finalConfidence = this.calculateFinalConfidence(verification, consensusLevel, evidenceQuality);

    return {
      isValid: errors.length === 0,
      confidence: finalConfidence,
      errors,
      warnings
    };
  }

  /**
   * Gets verification statistics for a bill
   */
  async getBillVerificationStats(bill_id: number): Promise<{ totalVerifications: number;
    verifiedCount: number;
    disputedCount: number;
    pendingCount: number;
    averageConfidence: number;
    topContributors: Array<{ user_id: string; verificationCount: number; averageConfidence: number  }>;
  }> { const stats = await this.verificationRepository.getVerificationStats(bill_id);

    // Get top contributors (simplified - would need more complex query in real implementation)
    const verifications = await this.verificationRepository.findByBillId(bill_id);
    const contributorStats = new Map<string, { count: number; totalConfidence: number  }>();

    verifications.forEach(v => {
      const existing = contributorStats.get(v.citizenId) || { count: 0, totalConfidence: 0 };
      contributorStats.set(v.citizenId, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + v.confidence
      });
    });

    const topContributors = Array.from(contributorStats.entries())
      .map(([user_id, stats]) => ({ user_id,
        verificationCount: stats.count,
        averageConfidence: stats.totalConfidence / stats.count
       }))
      .sort((a, b) => b.verificationCount - a.verificationCount)
      .slice(0, 10);

    return {
      totalVerifications: stats.total,
      verifiedCount: stats.verified,
      disputedCount: stats.disputed,
      pendingCount: stats.pending,
      averageConfidence: stats.averageConfidence,
      topContributors
    };
  }

  /**
   * Gets user verification history and performance
   */
  async getUserVerificationProfile(user_id: string): Promise<{
    totalVerifications: number;
    verifiedCount: number;
    disputedCount: number;
    averageConfidence: number;
    expertiseDomains: string[];
    reputationFromVerifications: number;
  }> { const verifications = await this.verificationRepository.findByCitizenId(user_id);

    const verifiedCount = verifications.filter(v => v.is_verified()).length;
    const disputedCount = verifications.filter(v => v.isDisputed()).length;
    const averageConfidence = verifications.length > 0
      ? verifications.reduce((sum, v) => sum + v.confidence, 0) / verifications.length
      : 0;

    const expertiseDomains = [...new Set(
      verifications.map(v => v.expertise.domain).filter(Boolean)
    )];

    // Calculate reputation gained from verifications
    const reputationFromVerifications = verifications
      .filter(v => v.is_verified())
      .reduce((sum, v) => sum + Math.floor(v.confidence / 10), 0);

    return {
      totalVerifications: verifications.length,
      verifiedCount,
      disputedCount,
      averageConfidence,
      expertiseDomains,
      reputationFromVerifications
     };
  }

  /**
   * Calculates reputation score after verification creation/update
   */
  private calculateReputationAfterVerification(userAggregate: UserAggregate, verification: CitizenVerification): number {
    const baseReputation = userAggregate.users.reputation_score;
    const verificationBonus = verification.is_verified() ? Math.floor(verification.confidence / 10) : 0;
    const expertiseBonus = verification.expertise.reputation_score * 0.1;

    return Math.min(100, Math.max(0, baseReputation + verificationBonus + expertiseBonus));
  }

  /**
   * Calculates final confidence for verification validation
   */
  private calculateFinalConfidence(
    verification: CitizenVerification,
    consensusLevel: number,
    evidenceQuality: number
  ): number {
    const expertiseWeight = verification.expertise.getWeight();
    const consensusWeight = consensusLevel / 100;

    return Math.round(
      (verification.confidence * 0.4) +
      (evidenceQuality * 100 * 0.3) +
      (expertiseWeight * 0.2) +
      (consensusWeight * 0.1)
    );
  }
}





































