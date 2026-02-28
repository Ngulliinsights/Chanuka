/**
 * Verification Service
 * 
 * Service layer for user verification operations using modern error handling.
 * Migrated from direct controller logic to service layer with AsyncServiceResult.
 */

import { safeAsync, type AsyncServiceResult, createValidationError, createNotFoundError, createSystemError } from '@server/infrastructure/error-handling';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { user_verification, users } from '@server/infrastructure/schema';
import { logger } from '@server/infrastructure/observability';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Verification data types
 */
export interface VerificationData {
  bill_id: number;
  claim: string;
  evidence?: any[];
  reasoning?: string;
}

export interface CreateVerificationData {
  bill_id: number;
  citizen_id: string;
  verification_type: string;
  claim: string;
  evidence?: any[];
  reasoning?: string;
}

export interface UpdateVerificationData {
  verification_status?: string;
  claim?: string;
  reasoning?: string;
}

export interface VerificationStats {
  total: number;
  breakdown: Record<string, number>;
}

/**
 * Verification Service
 * 
 * Provides business logic for verification operations with type-safe error handling.
 */
export class VerificationService {
  /**
   * Get all verifications for a specific bill
   */
  async getBillVerifications(billId: number): AsyncServiceResult<any[]> {
    return safeAsync(async () => {
      logger.info({ billId }, 'Fetching verifications for bill');
      
      const db = readDatabase();
      
      const verifications = await db
        .select({
          id: user_verification.id,
          verification_type: user_verification.verification_type,
          verification_status: user_verification.verification_status,
          bill_id: sql<number>`(user_verification.verification_data->>'bill_id')::int`,
          claim: sql`user_verification.verification_data->>'claim'`,
          created_at: user_verification.created_at,
          citizen: {
            id: users.id,
            email: users.email,
            role: users.role
          }
        })
        .from(user_verification)
        .innerJoin(users, eq(user_verification.user_id, users.id))
        .where(sql`(user_verification.verification_data->>'bill_id')::int = ${billId}`)
        .orderBy(desc(user_verification.created_at));

      return verifications;
    }, {
      service: 'VerificationService',
      operation: 'getBillVerifications',
      metadata: { billId }
    });
  }

  /**
   * Create a new verification
   */
  async createVerification(data: CreateVerificationData): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ billId: data.bill_id, citizenId: data.citizen_id }, 'Creating verification');
      
      const db = writeDatabase();
      
      const verification = await db
        .insert(user_verification)
        .values({
          user_id: data.citizen_id,
          verification_type: data.verification_type,
          verification_documents: Array.isArray(data.evidence) ? data.evidence : [],
          verification_data: {
            bill_id: Number(data.bill_id),
            claim: data.claim,
            evidence: data.evidence || [],
            reasoning: data.reasoning || ''
          },
          verification_status: 'pending',
          created_at: new Date()
        })
        .returning();

      if (!verification || verification.length === 0) {
        throw createSystemError(
          'Failed to create verification',
          {
            service: 'VerificationService',
            operation: 'createVerification',
            metadata: { billId: data.bill_id }
          }
        );
      }

      return verification[0];
    }, {
      service: 'VerificationService',
      operation: 'createVerification',
      metadata: { billId: data.bill_id, citizenId: data.citizen_id }
    });
  }

  /**
   * Update an existing verification
   */
  async updateVerification(verificationId: string, data: UpdateVerificationData): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ verificationId, fields: Object.keys(data) }, 'Updating verification');
      
      const db = writeDatabase();
      
      // If claim or reasoning provided, merge into verification_data JSONB
      if (data.claim !== undefined || data.reasoning !== undefined) {
        const [existing] = await db
          .select({ verification_data: user_verification.verification_data })
          .from(user_verification)
          .where(eq(user_verification.id, verificationId))
          .limit(1);

        const merged = {
          ...(existing?.verification_data || {}),
          ...(data.claim !== undefined ? { claim: data.claim } : {}),
          ...(data.reasoning !== undefined ? { reasoning: data.reasoning } : {})
        };

        await db
          .update(user_verification)
          .set({
            verification_data: merged,
            ...(data.verification_status ? { verification_status: data.verification_status } : {})
          })
          .where(eq(user_verification.id, verificationId));

        const updatedVerification = await db
          .select()
          .from(user_verification)
          .where(eq(user_verification.id, verificationId))
          .limit(1);

        if (!updatedVerification || updatedVerification.length === 0) {
          throw createNotFoundError('Verification', verificationId, {
            service: 'VerificationService',
            operation: 'updateVerification'
          });
        }

        return updatedVerification[0];
      }

      // Simple update without JSONB merge
      const updateData: Record<string, unknown> = {};
      if (data.verification_status !== undefined) {
        updateData.verification_status = data.verification_status;
      }

      const updatedVerification = await db
        .update(user_verification)
        .set(updateData)
        .where(eq(user_verification.id, verificationId))
        .returning();

      if (updatedVerification.length === 0) {
        throw createNotFoundError('Verification', verificationId, {
          service: 'VerificationService',
          operation: 'updateVerification'
        });
      }

      return updatedVerification[0];
    }, {
      service: 'VerificationService',
      operation: 'updateVerification',
      metadata: { verificationId, fields: Object.keys(data) }
    });
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): AsyncServiceResult<VerificationStats> {
    return safeAsync(async () => {
      logger.info('Fetching verification statistics');
      
      const db = readDatabase();
      
      const stats = await db
        .select({
          verification_status: user_verification.verification_status,
          count: sql<number>`count(*)::int`,
        })
        .from(user_verification)
        .groupBy(user_verification.verification_status);

      const totalVerifications = stats.reduce(
        (sum: number, stat: { verification_status: string; count: number }) => sum + stat.count,
        0
      );

      const breakdown = stats.reduce(
        (acc: Record<string, number>, stat: { verification_status: string; count: number }) => {
          acc[stat.verification_status] = stat.count;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        total: totalVerifications,
        breakdown,
      };
    }, {
      service: 'VerificationService',
      operation: 'getVerificationStats'
    });
  }

  /**
   * Get all verifications for a specific user
   */
  async getUserVerifications(citizenId: string): AsyncServiceResult<any[]> {
    return safeAsync(async () => {
      logger.info({ citizenId }, 'Fetching user verifications');
      
      const db = readDatabase();
      
      const userVerifications = await db
        .select({
          id: user_verification.id,
          bill_id: sql<number>`(user_verification.verification_data->>'bill_id')::int`,
          verification_type: user_verification.verification_type,
          verification_status: user_verification.verification_status,
          claim: sql`user_verification.verification_data->>'claim'`,
          created_at: user_verification.created_at,
          updated_at: user_verification.updated_at,
        })
        .from(user_verification)
        .where(eq(user_verification.user_id, citizenId))
        .orderBy(desc(user_verification.created_at));

      return userVerifications;
    }, {
      service: 'VerificationService',
      operation: 'getUserVerifications',
      metadata: { citizenId }
    });
  }

  /**
   * Delete a verification (soft delete)
   */
  async deleteVerification(verificationId: string): AsyncServiceResult<{ message: string; id: string }> {
    return safeAsync(async () => {
      logger.info({ verificationId }, 'Deleting verification');
      
      const db = writeDatabase();
      
      const deletedVerification = await db
        .update(user_verification)
        .set({
          verification_status: 'deleted',
          updated_at: new Date()
        })
        .where(eq(user_verification.id, verificationId))
        .returning();

      if (deletedVerification.length === 0) {
        throw createNotFoundError('Verification', verificationId, {
          service: 'VerificationService',
          operation: 'deleteVerification'
        });
      }

      return {
        message: 'Verification deleted successfully',
        id: verificationId
      };
    }, {
      service: 'VerificationService',
      operation: 'deleteVerification',
      metadata: { verificationId }
    });
  }
}

// Export singleton instance
export const verificationService = new VerificationService();
