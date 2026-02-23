import { Response, Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';

import { database as db } from '@server/infrastructure/database';
import { user_verification, users } from '@server/infrastructure/schema';
import { asyncHandler } from '@/middleware/error-management';
import { BaseError, ValidationError } from '@shared/types/core/errors';
import { ERROR_CODES, ErrorDomain, ErrorSeverity  } from '@shared/core';
import { createErrorContext } from '@server/infrastructure/observability';
import { logger } from '@server/infrastructure/observability';

const router = Router();

/**
 * Sets up all verification-related routes
 * This function configures endpoints for managing bill verifications
 */
export function setupVerificationRoutes() {

  /**
   * GET /verification/bills/:bill_id
   * Retrieves all verifications associated with a specific bill
   * Returns verification details along with the verifying user's information
   */
  router.get('/verification/bills/:bill_id', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'GET /api/users/verification/bills/:bill_id');

    try {
      const bill_id = parseInt(req.params.bill_id);

      // Validate that bill_id is a valid number
      if (isNaN(bill_id)) {
        throw new ValidationError('Invalid bill ID', [
          { field: 'bill_id', message: 'Bill ID must be a valid number', code: 'INVALID_FORMAT' }
        ]);
      }

      // Query verifications with joined user data
      // Note: Adjusted column names to match actual schema
      const verifications = await db
        .select({
          id: user_verification.id,
          verification_type: user_verification.verification_type,
          verification_status: user_verification.verification_status,
          // extract claim/bill_id from verification_data JSONB
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
        .where(sql`(user_verification.verification_data->>'bill_id')::int = ${bill_id}`)
        .orderBy(desc(user_verification.created_at));

      res.json(verifications);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error(
        'Error fetching verifications for bill',
        { component: 'verification-routes', context, billId: req.params.bill_id },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to fetch bill verifications', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes', billId: req.params.bill_id }
      });
    }
  }));

  /**
   * POST /verification
   * Creates a new verification for a bill
   * Requires bill_id, citizen_id, verification_type, and claim in request body
   */
  router.post('/verification', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'POST /api/users/verification');

    try {
      const {
        bill_id,
        citizen_id,
        verification_type,
        claim,
        evidence,
        reasoning
      } = req.body;

      // Validate required fields
      const missingFields: string[] = [];
      if (!bill_id) missingFields.push('bill_id');
      if (!citizen_id) missingFields.push('citizen_id');
      if (!verification_type) missingFields.push('verification_type');
      if (!claim) missingFields.push('claim');

      if (missingFields.length > 0) {
        throw new ValidationError('Missing required fields', [
          {
            field: 'required_fields',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            code: 'MISSING_REQUIRED_FIELDS'
          }
        ]);
      }

      // Insert new verification into database
      const verification = await db
        .insert(user_verification)
        .values({
          user_id: citizen_id,
          verification_type,
          verification_documents: Array.isArray(evidence) ? evidence : [],
          verification_data: {
            bill_id: Number(bill_id),
            claim,
            evidence: evidence || [],
            reasoning: reasoning || ''
          },
          verification_status: 'pending',
          created_at: new Date()
        })
        .returning();

      if (!verification || verification.length === 0) {
        throw new BaseError('Failed to create verification', {
          statusCode: 500,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.HIGH,
          details: { component: 'verification-routes' }
        });
      }

      res.status(201).json(verification[0]);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BaseError) {
        throw error;
      }

      logger.error(
        'Error creating verification',
        { component: 'verification-routes', context },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to create verification', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes' }
      });
    }
  }));

  /**
   * PUT /verification/:id
   * Updates an existing verification
   * Accepts verification_status, claim, and reasoning updates
   */
  router.put('/verification/:id', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'PUT /api/users/verification/:id');

    try {
      // Verification IDs are UUIDs (strings), not integers
      const verification_id = req.params.id;
      const { verification_status, claim, reasoning } = req.body;

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};
      if (verification_status !== undefined) updateData.verification_status = verification_status;
      // If claim or reasoning provided, merge into verification_data JSONB
      if (claim !== undefined || reasoning !== undefined) {
        updateData.verification_data = {} as Record<string, unknown>;
        if (claim !== undefined) updateData.verification_data.claim = claim;
        if (reasoning !== undefined) updateData.verification_data.reasoning = reasoning;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No valid fields provided', [
          {
            field: 'update_data',
            message: 'No valid fields provided for update',
            code: 'NO_UPDATE_FIELDS'
          }
        ]);
      }

      // Perform update using string comparison for UUID
      // If verification_data needs merging, do a two-step read/merge to avoid overwriting other keys
      if (updateData.verification_data) {
        const [existing] = await db
          .select({ verification_data: user_verification.verification_data })
          .from(user_verification)
          .where(eq(user_verification.id, verification_id))
          .limit(1);

        const merged = { ...(existing?.verification_data || {}), ...(updateData.verification_data || {}) };
        await db
          .update(user_verification)
          .set({
            verification_data: merged,
            ...(updateData.verification_status ? { verification_status: updateData.verification_status } : {})
          })
          .where(eq(user_verification.id, verification_id));

        const updatedVerification = await db
          .select()
          .from(user_verification)
          .where(eq(user_verification.id, verification_id))
          .limit(1);

        if (!updatedVerification || updatedVerification.length === 0) {
          throw new BaseError('Verification not found', {
            statusCode: 404,
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            domain: ErrorDomain.SYSTEM,
            severity: ErrorSeverity.LOW,
            details: { component: 'verification-routes', verificationId: verification_id }
          });
        }

        res.json(updatedVerification[0]);
        return;
      }

      const updatedVerification = await db
        .update(user_verification)
        .set(updateData)
        .where(eq(user_verification.id, verification_id))
        .returning();

      if (updatedVerification.length === 0) {
        throw new BaseError('Verification not found', {
          statusCode: 404,
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.LOW,
          details: { component: 'verification-routes', verificationId: verification_id }
        });
      }

      res.json(updatedVerification[0]);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BaseError) {
        throw error;
      }

      logger.error(
        'Error updating verification',
        { component: 'verification-routes', context, verificationId: req.params.id },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to update verification', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes', verificationId: req.params.id }
      });
    }
  }));

  /**
   * GET /verification/stats
   * Retrieves aggregated statistics about verifications
   * Returns total count and breakdown by verification status
   */
  router.get('/verification/stats', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'GET /api/users/verification/stats');

    try {
      // Aggregate verifications by status
      const stats = await db
        .select({
          verification_status: user_verification.verification_status,
          count: sql<number>`count(*)::int`,
        })
        .from(user_verification)
        .groupBy(user_verification.verification_status);

      // Calculate total with proper typing
      const totalVerifications = stats.reduce(
        (sum: number, stat: { verification_status: string; count: number }) => sum + stat.count,
        0
      );

      // Create breakdown object with proper typing
      const breakdown = stats.reduce(
        (acc: Record<string, number>, stat: { verification_status: string; count: number }) => {
          acc[stat.verification_status] = stat.count;
          return acc;
        },
        {} as Record<string, number>
      );

      res.json({
        total: totalVerifications,
        breakdown,
      });
    } catch (error) {
      logger.error(
        'Error fetching verification stats',
        { component: 'verification-routes', context },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to fetch verification statistics', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes' }
      });
    }
  }));

  /**
   * GET /verification/user/:citizen_id
   * Retrieves all verifications submitted by a specific user
   * Useful for displaying a user's verification history
   */
  router.get('/verification/user/:citizen_id', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'GET /api/users/verification/user/:citizen_id');

    try {
      const { citizen_id } = req.params;

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
        .where(eq(user_verification.user_id, citizen_id))
        .orderBy(desc(user_verification.created_at));

      res.json(userVerifications);
    } catch (error) {
      logger.error(
        'Error fetching user verifications',
        { component: 'verification-routes', context, citizenId: req.params.citizen_id },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to fetch user verifications', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes', citizenId: req.params.citizen_id }
      });
    }
  }));

  /**
   * DELETE /verification/:id
   * Deletes a verification (soft delete by updating status)
   * For audit purposes, we mark as deleted rather than removing the record
   */
  router.delete('/verification/:id', asyncHandler(async (req, res: Response) => {
    const context = createErrorContext(req, 'DELETE /api/users/verification/:id');

    try {
      const verification_id = req.params.id;

      // Soft delete by updating status to 'deleted'
      const deletedVerification = await db
        .update(user_verification)
        .set({
          verification_status: 'deleted',
          updated_at: new Date()
        })
        .where(eq(user_verification.id, verification_id))
        .returning();

      if (deletedVerification.length === 0) {
        throw new BaseError('Verification not found', {
          statusCode: 404,
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.LOW,
          details: { component: 'verification-routes', verificationId: verification_id }
        });
      }

      res.json({
        message: 'Verification deleted successfully',
        id: verification_id
      });
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }

      logger.error(
        'Error deleting verification',
        { component: 'verification-routes', context, verificationId: req.params.id },
        error as Record<string, unknown> | undefined
      );

      throw new BaseError('Failed to delete verification', {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        details: { component: 'verification-routes', verificationId: req.params.id }
      });
    }
  }));
}

// Initialize routes on the router instance
setupVerificationRoutes();

// Export the configured router for use in main application
export { router };
