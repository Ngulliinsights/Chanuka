/**
 * Bills Router Error Handling Adapter
 * 
 * This adapter shows how to progressively migrate bills-router.ts from:
 * - Generic errors and ApiResponse functions
 * To:
 * - BaseError and subclasses from @shared/core
 * - Native Express error middleware handling
 * 
 * Strategy: Update route handlers to throw proper error types
 * The unified error middleware (createUnifiedErrorMiddleware) will catch them
 */

import { Request, Response, Router } from 'express';
import { BaseError, ValidationError } from '@shared/types/core/errors';
import { ERROR_CODES } from '@shared/constants';
import { createErrorContext } from '@server/infrastructure/error-handling';
import { asyncHandler } from '@server/middleware/error-management';

/**
 * Helper: Convert old-style ApiResponse calls to throwing proper errors
 * 
 * BEFORE (old pattern):
 *   ApiNotFound(res, 'Bill not found')
 *   ApiValidationError(res, [{ field: 'title', message: 'Required' }])
 *   ApiError(res, 'Failed to create bill')
 * 
 * AFTER (new pattern - throws, middleware catches):
 *   throw new BaseError('Bill not found', { statusCode: 404, code: ERROR_CODES.BILL_NOT_FOUND, ... })
 *   throw new ValidationError('Invalid bill data', { fields: { title: 'Required' }, ... })
 *   throw new BaseError('Failed to create bill', { domain: 'BUSINESS', ... })
 */

export class BillsRouterErrorAdapter {
  /**
   * Convert ApiNotFound response to proper error throw
   */
  static notFound(res: Response, message: string, context: unknown): never {
    throw new BaseError(message, {
      statusCode: 404,
      code: ERROR_CODES.BILL_NOT_FOUND,
      domain: 'BUSINESS',
      severity: 'LOW',
      context,
    });
  }

  /**
   * Convert ApiValidationError response to proper error throw
   */
  static validationError(res: Response, message: string, fields: Record<string, string>, context: unknown): never {
    throw new ValidationError(message, {
      fields,
      context,
    });
  }

  /**
   * Convert ApiError response to proper error throw
   */
  static internalError(res: Response, message: string, context: unknown): never {
    throw new BaseError(message, {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: 'SYSTEM',
      severity: 'HIGH',
      context,
    });
  }

  /**
   * Convert unauthorized response
   */
  static unauthorized(res: Response, message: string, context: unknown): never {
    throw new BaseError(message, {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: 'AUTHENTICATION',
      severity: 'MEDIUM',
      context,
    });
  }

  /**
   * Convert forbidden response
   */
  static forbidden(res: Response, message: string, context: unknown): never {
    throw new BaseError(message, {
      statusCode: 403,
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      domain: 'AUTHORIZATION',
      severity: 'MEDIUM',
      context,
    });
  }
}

/**
 * EXAMPLE: Refactoring a single bills router handler
 * 
 * BEFORE:
 * ```typescript
 * router.get('/:id', asyncHandler(async (req, res) => {
 *   const billId = parseInt(req.params.id, 10);
 *   if (isNaN(billId)) {
 *     return ApiValidationError(res, [{ field: 'id', message: 'Invalid bill ID' }]);
 *   }
 *   
 *   const bill = await billService.getBillById(billId);
 *   if (!bill) {
 *     return ApiNotFound(res, 'Bill not found');
 *   }
 *   
 *   res.json(bill);
 * }));
 * ```
 * 
 * AFTER:
 * ```typescript
 * router.get('/:id', asyncHandler(async (req, res) => {
 *   const context = createErrorContext(req, 'GET /api/bills/:id');
 *   
 *   const billId = parseInt(req.params.id, 10);
 *   if (isNaN(billId)) {
 *     throw new ValidationError('Invalid bill ID', {
 *       fields: { id: 'Bill ID must be a valid number' },
 *       context,
 *     });
 *   }
 *   
 *   const bill = await billService.getBillById(billId);
 *   if (!bill) {
 *     throw new BaseError('Bill not found', {
 *       statusCode: 404,
 *       code: ERROR_CODES.BILL_NOT_FOUND,
 *       domain: 'BUSINESS',
 *       severity: 'LOW',
 *       context,
 *     });
 *   }
 *   
 *   res.json(bill);
 * }));
 * ```
 * 
 * Key differences:
 * 1. No need to guard with `return` statements
 * 2. Proper error context passed for tracing
 * 3. Middleware handles formatting response
 * 4. No ApiResponse dependency needed
 * 5. Type-safe error codes and domains
 */

/**
 * MIGRATION CHECKLIST for bills-router.ts:
 * 
 * [ ] Step 1: Remove imports of ApiNotFound, ApiError, ApiValidationError, ApiSuccess, ApiResponse
 * [ ] Step 2: Add imports from @shared/core and @shared/constants
 * [ ] Step 3: Replace handleRouteError() function with throwing proper errors
 * [ ] Step 4: Update parseIntParam() to throw ValidationError instead of returning error
 * [ ] Step 5: Find all `return ApiNotFound` and replace with `throw new BaseError` (404)
 * [ ] Step 6: Find all `return ApiValidationError` and replace with `throw new ValidationError`
 * [ ] Step 7: Find all `return ApiError` and replace with `throw new BaseError` (500)
 * [ ] Step 8: Find all `return ApiSuccess` and replace with `res.json(data)`
 * [ ] Step 9: Test compilation: `npx tsc --noEmit --skipLibCheck`
 * [ ] Step 10: Run feature tests to verify behavior unchanged
 * [ ] Step 11: Verify error middleware catches all thrown errors
 * 
 * Pattern summary:
 * - Remove all ApiResponse function calls
 * - Throw BaseError/ValidationError instead
 * - Let unified middleware handle HTTP response
 * - Keep business logic untouched
 */
