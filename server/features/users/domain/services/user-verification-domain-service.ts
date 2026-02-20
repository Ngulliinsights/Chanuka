// Using repository pattern with Drizzle-based implementation for decoupling
import { UserAggregate } from '@shared/aggregates/user-aggregate';
import { database as db } from '@server/infrastructure/database';
import { CitizenVerification, VerificationType } from '@shared/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '@shared/entities/value-objects';
import { user_verification } from '@server/infrastructure/schema';
import { desc,eq, sql } from 'drizzle-orm';

import { UserService } from '../../application/user-service-direct';
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

// Define proper types for evidence to ensure type safety
interface EvidenceData {
  type: string;
  source: string;
  url?: string;
  credibility: number;
  relevance: number;
  description: string;
  datePublished?: Date;
}

// Define contributor statistics type
interface ContributorStats {
  count: number;
  totalConfidence: number;
}

// Define verification data structure for JSONB field
interface VerificationData {
  citizenId: string;
  verification_status?: string;
  endorsements?: Array<{
    endorserId: string;
    endorserName: string;
    timestamp: Date;
    comment?: string;
  }>;
  disputes?: Array<{
    disputerId: string;
    disputerName: string;
    timestamp: Date;
    reason: string;
  }>;
  verificationType?: string;
  claim?: string;
  evidence?: EvidenceData[];
  expertiseLevel?: string;
  submittedAt?: Date;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Type guard to validate verification data structure
 */
function isVerificationData(data: unknown): data is VerificationData {
  if (typeof data !== 'object' || data === null) return false;
  const vData = data as Record<string, unknown>;
  return typeof vData.citizenId === 'string';
}

export class UserVerificationDomainService {
  constructor(
    private profileService: ProfileDomainService,
    private userService: UserService
  ) { }

  /**
   * Creates a new citizen verification with validation.
   * This method performs comprehensive checks including user eligibility,
   * domain expertise, evidence quality, and reasoning adequacy.
   */
  async createVerification(verification_data: {
    citizenId: string;
    bill_id: number;
    verification_type: VerificationType;
    evidence: EvidenceData[];
    expertise: {
      domain: string;
      level: string;
      credentials: string[];
      verifiedCredentials: boolean;
      reputation_score: number;
    };
    reasoning: string;
  }): Promise<VerificationCreationResult> {
    const errors: string[] = [];

    // Validate user exists and is eligible
    const userAggregate = await this.userService.findUserAggregateById(verification_data.citizenId);
    if (!userAggregate) {
      return { success: false, errors: ['User not found'] };
    }

    if (!userAggregate.user.isEligibleForVerification()) {
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

    try {
      // Convert evidence data to Evidence value objects
      const evidenceObjects = verification_data.evidence.map(e => {
        const evidenceData: {
          type: string;
          source: string;
          credibility: number;
          relevance: number;
          description: string;
          url?: string;
          datePublished?: Date;
        } = {
          type: e.type,
          source: e.source,
          credibility: e.credibility,
          relevance: e.relevance,
          description: e.description,
        };
        if (e.url !== undefined) {
          evidenceData.url = e.url;
        }
        if (e.datePublished !== undefined) {
          evidenceData.datePublished = e.datePublished;
        }
        return Evidence.create(evidenceData);
      });

      // Create ExpertiseLevel value object
      const expertiseLevel = ExpertiseLevel.create(verification_data.expertise);

      const verification = CitizenVerification.create({
        id: crypto.randomUUID(),
        bill_id: verification_data.bill_id,
        citizenId: verification_data.citizenId,
        verification_type: verification_data.verification_type,
        evidence: evidenceObjects,
        expertise: expertiseLevel,
        reasoning: verification_data.reasoning.trim()
      });

      // Store verification directly in user_verification table
      await db.insert(user_verification).values({
        id: verification.id,
        user_id: verification.citizenId,
        verification_type: verification.verification_type,
        verification_data: {
          bill_id: verification.bill_id,
          claim: '',
          evidence: verification.evidence.map(e => ({
            type: e.type,
            source: e.source,
            url: e.url || '',
            credibility: e.credibility,
            relevance: e.relevance,
            description: e.description,
            datePublished: e.datePublished || new Date()
          })),
          expertise: {
            domain: verification.expertise.domain,
            level: verification.expertise.level,
            credentials: verification.expertise.credentials,
            verifiedCredentials: verification.expertise.verifiedCredentials,
            reputation_score: verification.expertise.reputation_score
          },
          reasoning: verification.reasoning,
          endorsements: [],
          disputes: [],
          confidence: verification.confidence,
          verification_status: verification.verification_status
        },
        verification_status: 'pending'
      });

      // Update user reputation based on verification
      const newReputation = this.calculateReputationAfterVerification(userAggregate, verification);
      userAggregate.user.updateReputationScore(newReputation);
      await this.userService.update(userAggregate.user);

      return { success: true, verification, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to create verification: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Updates an existing verification.
   * Note: This method currently uses the verificationService to fetch and update.
   * You may need to add these methods to CitizenVerificationService.
   */
  async updateVerification(
    verification_id: string,
    citizenId: string,
    updates: {
      evidence?: EvidenceData[];
      reasoning?: string;
    }
  ): Promise<VerificationUpdateResult> {
    // Get verification from database
    const verificationRow = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.id, verification_id))
      .limit(1);

    if (!verificationRow.length) {
      return { success: false, errors: ['Verification not found'] };
    }

    const verificationDataRaw = verificationRow[0].verification_data;
    if (!isVerificationData(verificationDataRaw)) {
      return { success: false, errors: ['Invalid verification data structure'] };
    }
    
    const verificationData: VerificationData = verificationDataRaw;
    if (verificationData.citizenId !== citizenId) {
      return { success: false, errors: ['Unauthorized to update this verification'] };
    }

    if (verificationData.verification_status === 'verified') {
      return { success: false, errors: ['Cannot update a verified verification'] };
    }

    const errors: string[] = [];

    if (updates.evidence && updates.evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
    }

    if (updates.reasoning && updates.reasoning.trim().length < 10) {
      errors.push('Reasoning must be at least 10 characters long');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      // Convert evidence data if provided
      const updatedEvidence = updates.evidence
        ? updates.evidence.map(e => {
          const evidenceData: {
            type: string;
            source: string;
            credibility: number;
            relevance: number;
            description: string;
            url?: string;
            datePublished?: Date;
          } = {
            type: e.type,
            source: e.source,
            credibility: e.credibility,
            relevance: e.relevance,
            description: e.description,
          };
          if (e.url !== undefined) {
            evidenceData.url = e.url;
          }
          if (e.datePublished !== undefined) {
            evidenceData.datePublished = e.datePublished;
          }
          return evidenceData;
        })
        : verificationData.evidence;

      const updatedData = {
        ...verificationData,
        evidence: updatedEvidence,
        reasoning: updates.reasoning || verificationData.reasoning,
        updated_at: new Date()
      };

      await db
        .update(user_verification)
        .set({ verification_data: updatedData, updated_at: new Date() })
        .where(eq(user_verification.id, verification_id));

      const updatedVerification = CitizenVerification.create({
        id: verificationRow[0].id,
        bill_id: verificationData.bill_id,
        citizenId: verificationData.citizenId,
        verification_type: verificationRow[0].verification_type,
        verification_status: verificationData.verification_status,
        confidence: verificationData.confidence,
        evidence: updatedData.evidence,
        expertise: verificationData.expertise,
        reasoning: updatedData.reasoning,
        endorsements: verificationData.endorsements || [],
        disputes: verificationData.disputes || [],
        created_at: verificationRow[0].created_at,
        updated_at: new Date()
      });

      return { success: true, verification: updatedVerification, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update verification: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Adds an endorsement to a verification.
   * Implements business rules: users cannot endorse their own verifications
   * or endorse the same verification multiple times.
   */
  async endorseVerification(verification_id: string, endorserId: string): Promise<{ success: boolean; errors: string[] }> {
    const verificationRow = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.id, verification_id))
      .limit(1);

    if (!verificationRow.length) {
      return { success: false, errors: ['Verification not found'] };
    }

    const verificationDataRaw = verificationRow[0].verification_data;
    if (!isVerificationData(verificationDataRaw)) {
      return { success: false, errors: ['Invalid verification data structure'] };
    }
    
    const verificationData: VerificationData = verificationDataRaw;
    const endorsements = verificationData.endorsements || [];

    // Check if user already endorsed
    if (endorsements.includes(endorserId)) {
      return { success: false, errors: ['Already endorsed this verification'] };
    }

    if (verificationData.citizenId === endorserId) {
      return { success: false, errors: ['Cannot endorse your own verification'] };
    }

    try {
      const updatedEndorsements = [...endorsements, endorserId];
      await db
        .update(user_verification)
        .set({
          verification_data: { ...verificationData, endorsements: updatedEndorsements },
          updated_at: new Date()
        })
        .where(eq(user_verification.id, verification_id));

      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to add endorsement: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Adds a dispute to a verification with a required reason.
   * Disputes help maintain verification quality through community oversight.
   */
  async disputeVerification(
    verification_id: string,
    disputerId: string,
    reason: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const verificationRow = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.id, verification_id))
      .limit(1);

    if (!verificationRow.length) {
      return { success: false, errors: ['Verification not found'] };
    }

    const verificationDataRaw = verificationRow[0].verification_data;
    if (!isVerificationData(verificationDataRaw)) {
      return { success: false, errors: ['Invalid verification data structure'] };
    }
    
    const verificationData: VerificationData = verificationDataRaw;
    const disputes = verificationData.disputes || [];

    if (disputes.some((d: unknown) => d.user_id === disputerId)) {
      return { success: false, errors: ['Already disputed this verification'] };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, errors: ['Dispute reason must be at least 10 characters long'] };
    }

    try {
      const newDispute = { user_id: disputerId, reason: reason.trim(), timestamp: new Date() };
      const updatedDisputes = [...disputes, newDispute];

      await db
        .update(user_verification)
        .set({
          verification_data: { ...verificationData, disputes: updatedDisputes },
          updated_at: new Date()
        })
        .where(eq(user_verification.id, verification_id));

      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to add dispute: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validates a verification for approval based on multiple criteria:
   * evidence quality, expertise level, community consensus, and dispute ratio.
   */
  async validateVerificationForApproval(verification_id: string): Promise<VerificationValidationResult> {
    const verificationRow = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.id, verification_id))
      .limit(1);

    if (!verificationRow.length) {
      return {
        isValid: false,
        confidence: 0,
        errors: ['Verification not found'],
        warnings: []
      };
    }

    const verificationDataRaw = verificationRow[0].verification_data;
    if (!isVerificationData(verificationDataRaw)) {
      return {
        isValid: false,
        confidence: 0,
        errors: ['Invalid verification data structure'],
        warnings: []
      };
    }
    
    const verificationData: VerificationData = verificationDataRaw;
    const verification = CitizenVerification.create({
      id: verificationRow[0].id,
      bill_id: verificationData.bill_id,
      citizenId: verificationData.citizenId,
      verification_type: verificationRow[0].verification_type,
      verification_status: verificationData.verification_status,
      confidence: verificationData.confidence,
      evidence: verificationData.evidence,
      expertise: verificationData.expertise,
      reasoning: verificationData.reasoning,
      endorsements: verificationData.endorsements || [],
      disputes: verificationData.disputes || [],
      created_at: verificationRow[0].created_at,
      updated_at: verificationRow[0].updated_at
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check evidence quality - type the parameters explicitly
    const evidenceQuality = verification.evidence.reduce(
      (sum: number, e: Evidence) => sum + (e.credibility || 0),
      0
    ) / verification.evidence.length;

    if (evidenceQuality < 0.5) {
      errors.push('Evidence quality is too low for approval');
    }

    if (verification.expertise.level === 'beginner') {
      warnings.push('Expertise level is beginner - consider requiring higher expertise');
    }

    // Check community consensus
    const endorsements = verificationData.endorsements || [];
    const disputes = verificationData.disputes || [];
    const consensusLevel = endorsements.length > 0 ? (endorsements.length / (endorsements.length + disputes.length)) * 100 : 0;

    if (consensusLevel < 60) {
      warnings.push('Community consensus is below 60%');
    }

    // Check for disputes
    if (disputes.length > endorsements.length) {
      errors.push('More disputes than endorsements');
    }

    const finalConfidence = this.calculateFinalConfidence(verification, consensusLevel, evidenceQuality);

    return {
      isValid: errors.length === 0,
      confidence: finalConfidence,
      errors,
      warnings
    };
  }

  /**
   * Gets comprehensive verification statistics for a bill,
   * including top contributors ranked by verification count.
   */
  async getBillVerificationStats(bill_id: number): Promise<{
    totalVerifications: number;
    verifiedCount: number;
    disputedCount: number;
    pendingCount: number;
    averageConfidence: number;
    topContributors: Array<{
      user_id: string;
      verificationCount: number;
      averageConfidence: number;
    }>;
  }> {
    const verificationRows = await db
      .select()
      .from(user_verification)
      .where(sql`(user_verification.verification_data->>'bill_id')::int = ${bill_id}`)
      .orderBy(desc(user_verification.created_at));

    const verifications = verificationRows.map((row: unknown) => {
      const dataRaw = row.verification_data;
      if (!isVerificationData(dataRaw)) {
        throw new Error(`Invalid verification data structure for verification ${row.id}`);
      }
      const data: VerificationData = dataRaw;
      return CitizenVerification.create({
        id: row.id,
        bill_id: data.bill_id,
        citizenId: data.citizenId,
        verification_type: row.verification_type,
        verification_status: data.verification_status,
        confidence: data.confidence,
        evidence: data.evidence,
        expertise: data.expertise,
        reasoning: data.reasoning,
        endorsements: data.endorsements || [],
        disputes: data.disputes || [],
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });

    // Calculate statistics from the verifications array
    const verifiedCount = verifications.filter((v: CitizenVerification) => v.is_verified()).length;
    const disputedCount = verifications.filter((v: CitizenVerification) => v.isDisputed()).length;
    const pendingCount = verifications.length - verifiedCount - disputedCount;
    const averageConfidence = verifications.length > 0
      ? verifications.reduce((sum: number, v: CitizenVerification) => sum + v.confidence, 0) / verifications.length
      : 0;

    // Build contributor statistics
    const contributorStats = new Map<string, ContributorStats>();

    verifications.forEach((v: CitizenVerification) => {
      const existing = contributorStats.get(v.citizenId) || { count: 0, totalConfidence: 0 };
      contributorStats.set(v.citizenId, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + v.confidence
      });
    });

    const topContributors = Array.from(contributorStats.entries())
      .map(([user_id, stats]) => ({
        user_id,
        verificationCount: stats.count,
        averageConfidence: stats.totalConfidence / stats.count
      }))
      .sort((a, b) => b.verificationCount - a.verificationCount)
      .slice(0, 10);

    return {
      totalVerifications: verifications.length,
      verifiedCount,
      disputedCount,
      pendingCount,
      averageConfidence,
      topContributors
    };
  }

  /**
   * Gets a comprehensive profile of a user's verification activity,
   * including their expertise domains and reputation earned.
   */
  async getUserVerificationProfile(user_id: string): Promise<{
    totalVerifications: number;
    verifiedCount: number;
    disputedCount: number;
    averageConfidence: number;
    expertiseDomains: string[];
    reputationFromVerifications: number;
  }> {
    const verificationRows = await db
      .select()
      .from(user_verification)
      .where(eq(user_verification.user_id, user_id))
      .orderBy(desc(user_verification.created_at));

    const verifications = verificationRows.map((row: unknown) => {
      const dataRaw = row.verification_data;
      if (!isVerificationData(dataRaw)) {
        throw new Error(`Invalid verification data structure for verification ${row.id}`);
      }
      const data: VerificationData = dataRaw;
      return CitizenVerification.create({
        id: row.id,
        bill_id: data.bill_id,
        citizenId: data.citizenId,
        verification_type: row.verification_type,
        verification_status: data.verification_status,
        confidence: data.confidence,
        evidence: data.evidence,
        expertise: data.expertise,
        reasoning: data.reasoning,
        endorsements: data.endorsements || [],
        disputes: data.disputes || [],
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });

    const verifiedCount = verifications.filter((v: CitizenVerification) => v.is_verified()).length;
    const disputedCount = verifications.filter((v: CitizenVerification) => v.isDisputed()).length;
    const averageConfidence = verifications.length > 0
      ? verifications.reduce((sum: number, v: CitizenVerification) => sum + v.confidence, 0) / verifications.length
      : 0;

    // Extract unique expertise domains and ensure proper typing
    const expertiseDomains: string[] = [...new Set(
      verifications
        .map((v: CitizenVerification) => v.expertise.domain)
        .filter((domain: string | undefined): domain is string => Boolean(domain))
    )] as string[];

    // Calculate reputation gained from verified contributions
    const reputationFromVerifications = verifications
      .filter((v: CitizenVerification) => v.is_verified())
      .reduce((sum: number, v: CitizenVerification) => sum + Math.floor(v.confidence / 10), 0);

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
   * Calculates the new reputation score after a verification is created.
   * Combines base reputation with verification quality and expertise bonuses.
   */
  private calculateReputationAfterVerification(
    userAggregate: UserAggregate,
    verification: CitizenVerification
  ): number {
    // Fixed: Changed 'users' to 'user' to match the UserAggregate structure
    const baseReputation = userAggregate.user.reputation_score;
    const verificationBonus = verification.is_verified() ? Math.floor(verification.confidence / 10) : 0;
    const expertiseBonus = verification.expertise.reputation_score * 0.1;

    // Ensure reputation stays within valid bounds (0-100)
    return Math.min(100, Math.max(0, baseReputation + verificationBonus + expertiseBonus));
  }

  /**
   * Calculates a weighted final confidence score considering multiple factors:
   * verification confidence (40%), evidence quality (30%), expertise (20%), and consensus (10%).
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


