import { ApiError, ApiNotFound, ApiResponseWrapper,ApiSuccess, ApiValidationError } from '@shared/core/utils/api-utils';
import { database as db } from '@server/infrastructure/database';
import { user_verification, users } from '@server/infrastructure/schema';
import { desc, eq, sql } from "drizzle-orm";
import { Router } from "express";

import { errorTracker } from '@/core/errors/error-tracker.js';

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
  router.get("/verification/bills/:bill_id", async (req, res) => {
    const startTime = Date.now();
    
    try {
  const bill_id = parseInt(req.params.bill_id);

      // Validate that bill_id is a valid number
      if (isNaN(bill_id)) {
        return ApiValidationError(
          res, 
          { field: 'bill_id', message: 'Invalid bill ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
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

      return ApiSuccess(
        res, 
        verifications,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });

  /**
   * POST /verification
   * Creates a new verification for a bill
   * Requires bill_id, citizen_id, verification_type, and claim in request body
   */
  router.post("/verification", async (req, res) => {
    const startTime = Date.now();
    
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
        return ApiValidationError(
          res, 
          { 
            field: 'required_fields',
            message: `Missing required fields: ${missingFields.join(', ')}`
          },
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
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

      return ApiSuccess(
        res, 
        verification[0],
        ApiResponseWrapper.createMetadata(startTime, 'database'),
        201
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });

  /**
   * PUT /verification/:id
   * Updates an existing verification
   * Accepts verification_status, claim, and reasoning updates
   */
  router.put("/verification/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Verification IDs are UUIDs (strings), not integers
      const verification_id = req.params.id;
      const { verification_status, claim, reasoning } = req.body;

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (verification_status !== undefined) updateData.verification_status = verification_status;
      // If claim or reasoning provided, merge into verification_data JSONB
      if (claim !== undefined || reasoning !== undefined) {
        updateData.verification_data = {} as any;
        if (claim !== undefined) updateData.verification_data.claim = claim;
        if (reasoning !== undefined) updateData.verification_data.reasoning = reasoning;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return ApiValidationError(
          res, 
          { 
            field: 'update_data',
            message: 'No valid fields provided for update'
          },
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }

      // Perform update using string comparison for UUID
      // If verification_data needs merging, do a two-step read/merge to avoid overwriting other keys
      if (updateData.verification_data) {
        const [existing] = await db.select({ verification_data: user_verification.verification_data }).from(user_verification).where(eq(user_verification.id, verification_id)).limit(1);
        const merged = { ...(existing?.verification_data || {}), ...(updateData.verification_data || {}) };
        await db.update(user_verification).set({ verification_data: merged, ...(updateData.verification_status ? { verification_status: updateData.verification_status } : {}) }).where(eq(user_verification.id, verification_id));
        const updatedVerification = await db.select().from(user_verification).where(eq(user_verification.id, verification_id)).limit(1);
        // normalize to array shape like .returning()
        const ret = updatedVerification;
        if (!ret || ret.length === 0) {
          return ApiNotFound(res, 'Verification');
        }

        return ApiSuccess(
          res,
          ret[0],
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }

      const updatedVerification = await db
        .update(user_verification)
        .set(updateData)
        .where(eq(user_verification.id, verification_id))
        .returning();

      if (updatedVerification.length === 0) {
        return ApiNotFound(res, 'Verification');
      }

      return ApiSuccess(
        res, 
        updatedVerification[0],
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });

  /**
   * GET /verification/stats
   * Retrieves aggregated statistics about verifications
   * Returns total count and breakdown by verification status
   */
  router.get("/verification/stats", async (req, res) => {
    const startTime = Date.now();
    
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

      return ApiSuccess(
        res, 
        {
          total: totalVerifications,
          breakdown,
        },
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });

  /**
   * GET /verification/user/:citizen_id
   * Retrieves all verifications submitted by a specific user
   * Useful for displaying a user's verification history
   */
  router.get("/verification/user/:citizen_id", async (req, res) => {
    const startTime = Date.now();
    
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

      return ApiSuccess(
        res, 
        userVerifications,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });

  /**
   * DELETE /verification/:id
   * Deletes a verification (soft delete by updating status)
   * For audit purposes, we mark as deleted rather than removing the record
   */
  router.delete("/verification/:id", async (req, res) => {
    const startTime = Date.now();
    
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
        return ApiNotFound(res, 'Verification');
      }

      return ApiSuccess(
        res, 
        { 
          message: 'Verification deleted successfully',
          id: verification_id 
        },
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(
        res, 
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        500,
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
  });
}

// Initialize routes on the router instance
setupVerificationRoutes();

// Export the configured router for use in main application
export { router };


