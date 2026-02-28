/**
 * Verification Routes - Migrated to Modern Error Handling
 * 
 * Migration changes:
 * - Removed BaseError and ValidationError imports
 * - Removed all try-catch blocks
 * - Uses AsyncServiceResult from VerificationService
 * - Uses boomFromStandardized for error conversion
 * - Uses Zod validation with safeParse()
 * - Consistent error handling pattern across all routes
 */

import { Response, Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/error-management';
import { boomFromStandardized } from '@server/infrastructure/error-handling';
import { verificationService } from './VerificationService';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BillIdParamSchema = z.object({
  bill_id: z.string().regex(/^\d+$/, 'Bill ID must be a valid number').transform(Number),
});

const CreateVerificationSchema = z.object({
  bill_id: z.number().positive('Bill ID must be a positive number'),
  citizen_id: z.string().min(1, 'Citizen ID is required'),
  verification_type: z.string().min(1, 'Verification type is required'),
  claim: z.string().min(1, 'Claim is required'),
  evidence: z.array(z.any()).optional(),
  reasoning: z.string().optional(),
});

const UpdateVerificationSchema = z.object({
  verification_status: z.string().optional(),
  claim: z.string().optional(),
  reasoning: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

const VerificationIdParamSchema = z.object({
  id: z.string().min(1, 'Verification ID is required'),
});

const CitizenIdParamSchema = z.object({
  citizen_id: z.string().min(1, 'Citizen ID is required'),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /verification/bills/:bill_id
 * Retrieves all verifications associated with a specific bill
 */
router.get('/verification/bills/:bill_id', asyncHandler(async (req, res: Response) => {
  // Validate bill_id parameter
  const paramValidation = BillIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    const error = paramValidation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'getBillVerifications',
        field: error.path.join('.'),
      },
    });
  }

  const { bill_id } = paramValidation.data;
  const result = await verificationService.getBillVerifications(bill_id);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * POST /verification
 * Creates a new verification for a bill
 */
router.post('/verification', asyncHandler(async (req, res: Response) => {
  // Validate request body
  const validation = CreateVerificationSchema.safeParse(req.body);
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'createVerification',
        field: error.path.join('.'),
      },
    });
  }

  const data = validation.data;
  const result = await verificationService.createVerification(data);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.status(201).json(result.value);
}));

/**
 * PUT /verification/:id
 * Updates an existing verification
 */
router.put('/verification/:id', asyncHandler(async (req, res: Response) => {
  // Validate verification ID parameter
  const paramValidation = VerificationIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    const error = paramValidation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'updateVerification',
        field: error.path.join('.'),
      },
    });
  }

  // Validate request body
  const bodyValidation = UpdateVerificationSchema.safeParse(req.body);
  if (!bodyValidation.success) {
    const error = bodyValidation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'updateVerification',
        field: error.path.join('.'),
      },
    });
  }

  const { id } = paramValidation.data;
  const data = bodyValidation.data;
  
  const result = await verificationService.updateVerification(id, data);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /verification/stats
 * Retrieves aggregated statistics about verifications
 */
router.get('/verification/stats', asyncHandler(async (req, res: Response) => {
  const result = await verificationService.getVerificationStats();
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /verification/user/:citizen_id
 * Retrieves all verifications submitted by a specific user
 */
router.get('/verification/user/:citizen_id', asyncHandler(async (req, res: Response) => {
  // Validate citizen_id parameter
  const paramValidation = CitizenIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    const error = paramValidation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'getUserVerifications',
        field: error.path.join('.'),
      },
    });
  }

  const { citizen_id } = paramValidation.data;
  const result = await verificationService.getUserVerifications(citizen_id);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * DELETE /verification/:id
 * Deletes a verification (soft delete by updating status)
 */
router.delete('/verification/:id', asyncHandler(async (req, res: Response) => {
  // Validate verification ID parameter
  const paramValidation = VerificationIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    const error = paramValidation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'VerificationController',
        operation: 'deleteVerification',
        field: error.path.join('.'),
      },
    });
  }

  const { id } = paramValidation.data;
  const result = await verificationService.deleteVerification(id);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

// Export the configured router for use in main application
export { router };
