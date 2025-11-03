
import { Router, Request, Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { database as db } from "../../../../shared/database/connection";
import { user_verification, users } from '@shared/schema';
import { VerificationRequest } from "../../../types/api.js";
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper  } from '../../../../shared/core/src/utils/api';
import { errorTracker } from '../../../core/errors/error-tracker.js';
import { logger  } from '../../../../shared/core/src/index.js';

const router = Router();

export function setupVerificationRoutes(routerInstance: Router) { // Get all verifications for a bill
  router.get("/verification/bills/:bill_id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const bill_id = parseInt(req.params.bill_id);

      if (isNaN(bill_id)) {
        return ApiValidationError(res, { field: 'bill_id', message: 'Invalid bill ID'  }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const verifications = await db
        .select({
          id: user_verification.id,
          expertId: user_verification.expertId,
          verification_status: user_verification.verification_status,
          confidence: user_verification.confidence,
          feedback: user_verification.feedback,
          created_at: user_verification.created_at,
          expert: {
            first_name: users.first_name,
            last_name: users.last_name,
            role: users.role,
          },
        })
        .from(user_verification)
        .innerJoin(users, eq(user_verification.expertId, users.id))
        .where(eq(user_verification.bill_id, bill_id))
        .orderBy(desc(user_verification.created_at));

      return ApiSuccess(res, verifications,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Internal server error', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Submit a verification
  router.post("/verification", async (req, res) => { const startTime = Date.now();
    
    try {
      const {
        bill_id,
        expertId,
        verification_status,
        confidence,
        feedback,
        metadata,
       } = req.body;

      if (!bill_id || !expertId || !verification_status) { return ApiValidationError(res, { 
          message: 'bill_id, expertId, and verification_status are required',
          missing: [!bill_id && 'bill_id', !expertId && 'expertId', !verification_status && 'verification_status'].filter(Boolean)
         }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const verification = await db
        .insert(user_verification)
        .values({ bill_id: parseInt(bill_id),
          expertId: expertId, // expertId should be UUID string, not integer
          verification_status,
          confidence: confidence ? confidence.toString() : "0",
          feedback: feedback || "",
         })
        .returning();

      return ApiSuccess(res, verification[0],
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Internal server error', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update a verification
  router.put("/verification/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const verificationId = parseInt(req.params.id);
      const { verification_status, confidence, feedback, metadata } = req.body;

      if (isNaN(verificationId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid verification ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const updatedVerification = await db
        .update(user_verification)
        .set({
          verification_status,
          confidence: confidence ? confidence.toString() : undefined,
          feedback,
        })
        .where(eq(user_verification.id, verificationId))
        .returning();

      if (updatedVerification.length === 0) {
        return ApiNotFound(res, 'Verification', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, updatedVerification[0],
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Internal server error', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get verification statistics
  router.get("/verification/stats", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const stats = await db
        .select({
          verification_status: user_verification.verification_status,
          count: sql<number>`count(*)`,
        })
        .from(user_verification)
        .groupBy(user_verification.verification_status);

      const totalVerifications = stats.reduce((sum, stat) => sum + stat.count, 0);

      return ApiSuccess(res, {
        total: totalVerifications,
        breakdown: stats.reduce((acc, stat) => {
          acc[stat.verification_status] = stat.count;
          return acc;
        }, {} as Record<string, number>),
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Internal server error', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });
}

// Set up the routes on the router
setupVerificationRoutes(router);

// Export both the router and setup function for flexibility
export { router };





















































