
import { Router, Request, Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { database as db } from "../../../../shared/database/connection";
import { verification as expertVerifications, user as users } from "../../../../shared/schema";
import { VerificationRequest } from "../../../types/api.js";
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper } from "../../../utils/api-response.js";
import { errorTracker } from '../../../core/errors/error-tracker.js';
import { logger } from '@shared/core/src/observability/logging';

const router = Router();

export function setupVerificationRoutes(routerInstance: Router) {
  // Get all verifications for a bill
  router.get("/verification/bills/:billId", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const billId = parseInt(req.params.billId);

      if (isNaN(billId)) {
        return ApiValidationError(res, { field: 'billId', message: 'Invalid bill ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const verifications = await db
        .select({
          id: expertVerifications.id,
          expertId: expertVerifications.expertId,
          verificationStatus: expertVerifications.verificationStatus,
          confidence: expertVerifications.confidence,
          feedback: expertVerifications.feedback,
          createdAt: expertVerifications.createdAt,
          expert: {
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          },
        })
        .from(expertVerifications)
        .innerJoin(users, eq(expertVerifications.expertId, users.id))
        .where(eq(expertVerifications.billId, billId))
        .orderBy(desc(expertVerifications.createdAt));

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
  router.post("/verification", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const {
        billId,
        expertId,
        verificationStatus,
        confidence,
        feedback,
        metadata,
      } = req.body;

      if (!billId || !expertId || !verificationStatus) {
        return ApiValidationError(res, { 
          message: 'billId, expertId, and verificationStatus are required',
          missing: [!billId && 'billId', !expertId && 'expertId', !verificationStatus && 'verificationStatus'].filter(Boolean)
        }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const verification = await db
        .insert(expertVerifications)
        .values({
          billId: parseInt(billId),
          expertId: expertId, // expertId should be UUID string, not integer
          verificationStatus,
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
      const { verificationStatus, confidence, feedback, metadata } = req.body;

      if (isNaN(verificationId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid verification ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const updatedVerification = await db
        .update(expertVerifications)
        .set({
          verificationStatus,
          confidence: confidence ? confidence.toString() : undefined,
          feedback,
        })
        .where(eq(expertVerifications.id, verificationId))
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
          verificationStatus: expertVerifications.verificationStatus,
          count: sql<number>`count(*)`,
        })
        .from(expertVerifications)
        .groupBy(expertVerifications.verificationStatus);

      const totalVerifications = stats.reduce((sum, stat) => sum + stat.count, 0);

      return ApiSuccess(res, {
        total: totalVerifications,
        breakdown: stats.reduce((acc, stat) => {
          acc[stat.verificationStatus] = stat.count;
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














































