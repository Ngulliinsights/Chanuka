/**
 * Server Setup Guide - Error Management Integration
 *
 * This file documents how to integrate the new error management system
 * into the Express application.
 *
 * BEFORE (old way with boom):
 * ```typescript
 * import { boomErrorMiddleware } from './middleware/boom-error-middleware';
 * app.use(boomErrorMiddleware);
 * ```
 *
 * AFTER (new way with @shared/core):
 * ```typescript
 * import { createUnifiedErrorMiddleware } from './middleware/error-management';
 * app.use(createUnifiedErrorMiddleware());
 * ```
 */

/**
 * STEP 1: Update your main server file (server/index.ts or app.ts)
 *
 * Replace boom middleware with unified error middleware:
 */
export const STEP_1_SERVER_SETUP = `
import express from 'express';
import { createUnifiedErrorMiddleware, asyncHandler } from '@server/middleware/error-management';

const app = express();

// ... other middleware setup ...

// Routes
app.get('/api/bills', asyncHandler(async (req, res) => {
  // Your route handler
}));

// ERROR MIDDLEWARE MUST BE LAST!
app.use(createUnifiedErrorMiddleware());

export default app;
`;

/**
 * STEP 2: Throw errors using @shared/core error types
 *
 * Instead of using Boom or generic errors:
 */
export const STEP_2_THROWING_ERRORS = `
import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from '@shared/types/core/errors';
import { ERROR_CODES } from '@shared/constants';
import { createErrorContext } from '@server/infrastructure/error-handling';

// In your route or service:
export async function createBill(req: Request, res: Response, next: NextFunction) {
  try {
    const context = createErrorContext(req, 'POST /bills');

    // Validation error
    if (!req.body.title) {
      throw new ValidationError('Bill title is required', {
        field: 'title',
        context,
      });
    }

    // Authentication error
    if (!req.user) {
      throw new AuthenticationError('User must be authenticated', { context });
    }

    // Authorization error
    if (!hasPermission(req.user, 'CREATE_BILL')) {
      throw new AuthorizationError('User does not have permission to create bills', { context });
    }

    // Generic error with context
    throw new BaseError('Failed to create bill', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: 'BUSINESS',
      severity: 'HIGH',
      context,
      cause: underlyingError,
    });

  } catch (error) {
    next(error); // Passes to error middleware
  }
}
`;

/**
 * STEP 3: Use recovery patterns for external service calls
 */
export const STEP_3_RECOVERY_PATTERNS = `
import {
  withRetry,
  withFallback,
  ServiceCircuitBreaker,
} from '@server/infrastructure/error-handling';

// Retry external API call with exponential backoff
const bills = await withRetry(
  () => externalLegislativeApi.getBills(),
  'fetch-external-bills',
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    backoffMultiplier: 2,
  }
);

// Use fallback for degraded service
const cachedBills = await withFallback(
  () => api.getBills(),
  previousBills || [],
  'get-bills'
);

// Protect with circuit breaker
const breaker = new ServiceCircuitBreaker('external-api', 5, 60000);
const data = await breaker.executeWithFallback(
  () => slowService.call(),
  () => cache.get('last-known-data')
);
`;

/**
 * STEP 4: Testing error responses
 */
export const STEP_4_TESTING_ERRORS = `
import { expect } from 'chai';
import request from 'supertest';
import app from '../app';

describe('Error Handling', () => {
  it('should return validation error for missing fields', async () => {
    const response = await request(app)
      .post('/api/bills')
      .send({ /* missing required field */ });

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    expect(response.body.error.correlationId).to.exist;
  });

  it('should return authentication error when not logged in', async () => {
    const response = await request(app)
      .post('/api/bills')
      .send({ title: 'Test' });

    expect(response.status).to.equal(401);
    expect(response.body.error.code).to.equal('NOT_AUTHENTICATED');
  });

  it('should include correlation ID for tracking', async () => {
    const response = await request(app)
      .post('/api/bills')
      .set('x-correlation-id', 'test-123')
      .send({ title: 'Test' });

    expect(response.body.error.correlationId).to.equal('test-123');
  });
});
`;

/**
 * STEP 5: Configuring for production
 */
export const STEP_5_PRODUCTION_CONFIG = `
// .env.production
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NODE_ENV=production

// In error-configuration.ts, the ServerErrorReporter will:
// 1. Log errors to console/file
// 2. Send to Sentry (if SENTRY_DSN is set)
// 3. Send to your own API if configured

// All errors include:
// - Unique error ID for tracking
// - Correlation ID for tracing requests
// - User ID and operation context
// - Error domain and severity for filtering
// - Stack traces in development
`;

/**
 * Migration Checklist
 */
export const MIGRATION_CHECKLIST = `
MIGRATION CHECKLIST
===================

Phase 2B: Server Error Migration
================================

Core Setup:
  [ ] Create new unified error middleware (error-management.ts)
  [ ] Update server/index.ts to use new middleware
  [ ] Remove or deprecate boom-error-middleware.ts
  [ ] Update package.json to remove @hapi/boom dependency

Feature Migration:
  [ ] server/features/bills/ - Use BaseError for bill operations
  [ ] server/features/auth/ - Use AuthenticationError/AuthorizationError
  [ ] server/features/community/ - Use ValidationError for comments
  [ ] server/features/users/ - Use BaseError with proper domain
  [ ] server/features/search/ - Use BaseError with proper context

Error Reporters:
  [ ] Configure console logging
  [ ] Add Sentry integration (optional)
  [ ] Add API reporter (optional)
  [ ] Test error reporting end-to-end

Recovery Patterns:
  [ ] Add circuit breaker to external API calls
  [ ] Add retry logic to database calls
  [ ] Add timeout wrappers to long-running operations
  [ ] Test recovery patterns with failure scenarios

Testing:
  [ ] Update error handling tests
  [ ] Test validation errors return 400
  [ ] Test auth errors return 401
  [ ] Test authz errors return 403
  [ ] Test correlation ID tracking
  [ ] Test error details in development mode

Deployment:
  [ ] Deploy new error middleware
  [ ] Verify error tracking in production
  [ ] Monitor error rates
  [ ] Verify recovery patterns work
  [ ] Update monitoring/alerting rules
`;

export default {
  STEP_1_SERVER_SETUP,
  STEP_2_THROWING_ERRORS,
  STEP_3_RECOVERY_PATTERNS,
  STEP_4_TESTING_ERRORS,
  STEP_5_PRODUCTION_CONFIG,
  MIGRATION_CHECKLIST,
};
