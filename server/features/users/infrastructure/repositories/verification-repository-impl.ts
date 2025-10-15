import { database as db } from '../../../../../shared/database/connection';
import { citizenVerifications } from '../../../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { VerificationRepository } from '../../domain/repositories/verification-repository';
import { CitizenVerification, VerificationType } from '../../domain/entities/citizen-verification';

export class VerificationRepositoryImpl implements VerificationRepository {
  // Basic CRUD operations
  async findById(id: string): Promise<CitizenVerification | null> {
    const result = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.id, id))
      .limit(1);

    if (!result[0]) return null;

    return this.mapToDomain(result[0]);
  }

  async findByBillId(billId: number): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId));

    return results.map(result => this.mapToDomain(result));
  }

  async findByCitizenId(citizenId: string): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(eq(citizenVerifications.citizenId, citizenId));

    return results.map(result => this.mapToDomain(result));
  }

  async save(verification: CitizenVerification): Promise<void> {
    const verificationData = verification.toJSON();
    await db.insert(citizenVerifications).values({
      id: verificationData.id,
      billId: verificationData.billId,
      citizenId: verificationData.citizenId,
      verificationType: verificationData.verificationType,
      verificationStatus: verificationData.verificationStatus,
      confidence: verificationData.confidence.toString(),
      evidence: verificationData.evidence,
      expertise: verificationData.expertise,
      reasoning: verificationData.reasoning,
      endorsements: verificationData.endorsements,
      disputes: verificationData.disputes,
      createdAt: verificationData.createdAt,
      updatedAt: verificationData.updatedAt
    });
  }

  async update(verification: CitizenVerification): Promise<void> {
    const verificationData = verification.toJSON();
    await db
      .update(citizenVerifications)
      .set({
        verificationStatus: verificationData.verificationStatus,
        confidence: verificationData.confidence.toString(),
        evidence: verificationData.evidence,
        expertise: verificationData.expertise,
        reasoning: verificationData.reasoning,
        endorsements: verificationData.endorsements,
        disputes: verificationData.disputes,
        updatedAt: verificationData.updatedAt
      })
      .where(eq(citizenVerifications.id, verificationData.id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(citizenVerifications).where(eq(citizenVerifications.id, id));
  }

  // Query operations
  async findByType(billId: number, type: VerificationType): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(and(
        eq(citizenVerifications.billId, billId),
        eq(citizenVerifications.verificationType, type)
      ));

    return results.map(result => this.mapToDomain(result));
  }

  async findByStatus(billId: number, status: string): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(and(
        eq(citizenVerifications.billId, billId),
        eq(citizenVerifications.verificationStatus, status)
      ));

    return results.map(result => this.mapToDomain(result));
  }

  async findByConfidenceRange(billId: number, min: number, max: number): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(and(
        eq(citizenVerifications.billId, billId),
        sql`${citizenVerifications.confidence}::numeric >= ${min}`,
        sql`${citizenVerifications.confidence}::numeric <= ${max}`
      ));

    return results.map(result => this.mapToDomain(result));
  }

  async findRecentVerifications(limit: number): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(citizenVerifications)
      .orderBy(sql`${citizenVerifications.createdAt} DESC`)
      .limit(limit);

    return results.map(result => this.mapToDomain(result));
  }

  // Aggregation operations
  async countByBillId(billId: number): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId));

    return Number(result[0]?.value ?? 0);
  }

  async countByStatus(billId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: citizenVerifications.verificationStatus,
        count: sql<number>`count(*)`
      })
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId))
      .groupBy(citizenVerifications.verificationStatus);

    const statusCounts: Record<string, number> = {};
    results.forEach(result => {
      statusCounts[result.status] = Number(result.count);
    });

    return statusCounts;
  }

  async getAverageConfidence(billId: number): Promise<number> {
    const result = await db
      .select({ value: sql<number>`avg(${citizenVerifications.confidence}::numeric)` })
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId));

    return Number(result[0]?.value ?? 0);
  }

  async getExpertiseDistribution(billId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        domain: sql<string>`${citizenVerifications.expertise}->>'domain'`,
        count: sql<number>`count(*)`
      })
      .from(citizenVerifications)
      .where(eq(citizenVerifications.billId, billId))
      .groupBy(sql`${citizenVerifications.expertise}->>'domain'`);

    const distribution: Record<string, number> = {};
    results.forEach(result => {
      distribution[result.domain] = Number(result.count);
    });

    return distribution;
  }

  // Community operations
  async findEndorsements(verificationId: string): Promise<string[]> {
    // This would require a separate endorsements table
    // For now, return empty array
    return [];
  }

  async findDisputes(verificationId: string): Promise<string[]> {
    // This would require a separate disputes table
    // For now, return empty array
    return [];
  }

  async addEndorsement(verificationId: string, citizenId: string): Promise<void> {
    // This would require a separate endorsements table
    // For now, increment the endorsements count
    await db
      .update(citizenVerifications)
      .set({
        endorsements: sql`${citizenVerifications.endorsements} + 1`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  async addDispute(verificationId: string, citizenId: string, reason: string): Promise<void> {
    // This would require a separate disputes table
    // For now, increment the disputes count
    await db
      .update(citizenVerifications)
      .set({
        disputes: sql`${citizenVerifications.disputes} + 1`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  async removeEndorsement(verificationId: string, citizenId: string): Promise<void> {
    // This would require a separate endorsements table
    // For now, decrement the endorsements count
    await db
      .update(citizenVerifications)
      .set({
        endorsements: sql`GREATEST(${citizenVerifications.endorsements} - 1, 0)`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  async removeDispute(verificationId: string, citizenId: string): Promise<void> {
    // This would require a separate disputes table
    // For now, decrement the disputes count
    await db
      .update(citizenVerifications)
      .set({
        disputes: sql`GREATEST(${citizenVerifications.disputes} - 1, 0)`,
        updatedAt: new Date()
      })
      .where(eq(citizenVerifications.id, verificationId));
  }

  // Fact-checking operations
  async findRelevantVerifications(billId: number, claim: string): Promise<CitizenVerification[]> {
    // Simple text search in reasoning field
    const searchTerm = `%${claim.toLowerCase()}%`;
    const results = await db
      .select()
      .from(citizenVerifications)
      .where(and(
        eq(citizenVerifications.billId, billId),
        sql`LOWER(${citizenVerifications.reasoning}) LIKE ${searchTerm}`
      ));

    return results.map(result => this.mapToDomain(result));
  }

  async getConsensusLevel(verificationId: string): Promise<number> {
    const result = await db
      .select({
        endorsements: citizenVerifications.endorsements,
        disputes: citizenVerifications.disputes
      })
      .from(citizenVerifications)
      .where(eq(citizenVerifications.id, verificationId))
      .limit(1);

    if (!result[0]) return 50;

    const total = result[0].endorsements + result[0].disputes;
    if (total === 0) return 50;

    return Math.round((result[0].endorsements / total) * 100);
  }

  async getCommunityConsensus(verificationId: string): Promise<number> {
    // For now, same as consensus level
    return this.getConsensusLevel(verificationId);
  }

  // Bulk operations
  async updateStatusBulk(verificationIds: string[], status: string): Promise<void> {
    await db
      .update(citizenVerifications)
      .set({
        verificationStatus: status,
        updatedAt: new Date()
      })
      .where(sql`${citizenVerifications.id} IN (${verificationIds.map(id => `'${id}'`).join(',')})`);
  }

  async deleteByBillId(billId: number): Promise<void> {
    await db.delete(citizenVerifications).where(eq(citizenVerifications.billId, billId));
  }

  // Statistics
  async getVerificationStats(billId: number): Promise<{
    total: number;
    verified: number;
    disputed: number;
    pending: number;
    needsReview: number;
    averageConfidence: number;
    reliabilityScore: number;
  }> {
    const [totalResult, statusCounts, avgConfidenceResult] = await Promise.all([
      this.countByBillId(billId),
      this.countByStatus(billId),
      this.getAverageConfidence(billId)
    ]);

    const stats = {
      total: totalResult,
      verified: statusCounts.verified || 0,
      disputed: statusCounts.disputed || 0,
      pending: statusCounts.pending || 0,
      needsReview: statusCounts.needs_review || 0,
      averageConfidence: avgConfidenceResult,
      reliabilityScore: Math.round((avgConfidenceResult + (statusCounts.verified / Math.max(totalResult, 1)) * 100) / 2)
    };

    return stats;
  }

  // Helper method to map database result to domain entity
  private mapToDomain(result: any): CitizenVerification {
    const evidence = Array.isArray(result.evidence) ? result.evidence.map((e: any) => ({
      type: e.type,
      source: e.source,
      url: e.url,
      credibility: e.credibility,
      relevance: e.relevance,
      description: e.description,
      datePublished: e.datePublished
    })) : [];

    const expertise = {
      domain: result.expertise.domain,
      level: result.expertise.level,
      credentials: result.expertise.credentials,
      verifiedCredentials: result.expertise.verifiedCredentials,
      reputationScore: result.expertise.reputationScore
    };

    return CitizenVerification.create({
      id: result.id,
      billId: result.billId,
      citizenId: result.citizenId,
      verificationType: result.verificationType as VerificationType,
      verificationStatus: result.verificationStatus as any,
      confidence: Number(result.confidence),
      evidence: evidence as any,
      expertise: expertise as any,
      reasoning: result.reasoning,
      endorsements: result.endorsements,
      disputes: result.disputes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    });
  }
}