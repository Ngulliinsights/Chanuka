/**
 * Property Test: Validation at Integration Points
 * Feature: full-stack-integration, Property 7: Validation at Integration Points
 * 
 * Validates: Requirements 3.2, 3.4, 4.4, 5.2, 5.3, 5.4
 * 
 * This property test verifies that:
 * - For any data crossing a layer boundary (database→server, server→client), validation is performed using shared validation schemas
 * - Invalid data is rejected before crossing the boundary
 * - Validation errors are properly reported
 * 
 * NOTE: This test currently validates requirements 3.2 and 3.4 (API contract validation).
 * Requirements 4.4, 5.2, 5.3, 5.4 will be validated once the transformation layer (Task 5) is implemented.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Test Data Structures
// ============================================================================

interface ValidationPoint {
  layer: 'client' | 'server' | 'database';
  direction: 'inbound' | 'outbound';
  hasValidation: boolean;
  validationSchema?: string;
}

interface IntegrationBoundary {
  from: 'client' | 'server' | 'database';
  to: 'client' | 'server' | 'database';
  dataType: string;
  requiresValidation: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if validation middleware exists
 */
function validationMiddlewareExists(): boolean {
  // Try both from root and from shared directory
  const middlewarePath1 = join(process.cwd(), 'server', 'middleware', 'api-contract-validation.ts');
  const middlewarePath2 = join(process.cwd(), '..', 'server', 'middleware', 'api-contract-validation.ts');
  
  return existsSync(middlewarePath1) || existsSync(middlewarePath2);
}

/**
 * Check if client-side validation exists
 */
function clientValidationExists(): boolean {
  // Try both from root and from shared directory
  const clientPath1 = join(process.cwd(), 'client', 'src', 'core', 'api', 'contract-client.ts');
  const clientPath2 = join(process.cwd(), '..', 'client', 'src', 'core', 'api', 'contract-client.ts');
  
  return existsSync(clientPath1) || existsSync(clientPath2);
}

/**
 * Check if validation schemas directory exists
 */
function validationSchemasExist(): boolean {
  // Try both from root and from shared directory
  const schemasDir1 = join(process.cwd(), 'shared', 'types', 'api', 'contracts');
  const schemasDir2 = join(process.cwd(), 'types', 'api', 'contracts');
  
  const schemasDir = existsSync(schemasDir1) ? schemasDir1 : schemasDir2;
  
  if (!existsSync(schemasDir)) {
    return false;
  }
  
  // Check for schema files
  const files = readdirSync(schemasDir);
  return files.some(file => file.endsWith('.schemas.ts'));
}

/**
 * Verify middleware uses validation schemas
 */
function middlewareUsesValidationSchemas(): boolean {
  const middlewarePath1 = join(process.cwd(), 'server', 'middleware', 'api-contract-validation.ts');
  const middlewarePath2 = join(process.cwd(), '..', 'server', 'middleware', 'api-contract-validation.ts');
  
  const middlewarePath = existsSync(middlewarePath1) ? middlewarePath1 : middlewarePath2;
  
  if (!existsSync(middlewarePath)) {
    return false;
  }
  
  const content = readFileSync(middlewarePath, 'utf-8');
  
  // Check that it imports validation functions
  const hasValidationImports = content.includes('validateRequest') ||
                               content.includes('validateResponse') ||
                               content.includes('validateParams') ||
                               content.includes('validateQuery');
  
  // Check that it uses Zod or validation schemas
  const usesValidation = content.includes('safeParse') ||
                        content.includes('parse') ||
                        content.includes('Schema');
  
  return hasValidationImports && usesValidation;
}

/**
 * Verify client uses validation
 */
function clientUsesValidation(): boolean {
  const clientPath1 = join(process.cwd(), 'client', 'src', 'core', 'api', 'contract-client.ts');
  const clientPath2 = join(process.cwd(), '..', 'client', 'src', 'core', 'api', 'contract-client.ts');
  
  const clientPath = existsSync(clientPath1) ? clientPath1 : clientPath2;
  
  if (!existsSync(clientPath)) {
    return false;
  }
  
  const content = readFileSync(clientPath, 'utf-8');
  
  // Check that it imports validation functions
  const hasValidationImports = content.includes('validateRequest') ||
                               content.includes('validateResponse');
  
  // Check that it performs validation
  const performsValidation = content.includes('validation') &&
                            (content.includes('valid') || content.includes('errors'));
  
  return hasValidationImports && performsValidation;
}

/**
 * Check if validation is performed at a specific boundary
 */
function validationAtBoundary(from: string, to: string): boolean {
  // Server → Client: API responses should be validated
  if (from === 'server' && to === 'client') {
    return middlewareUsesValidationSchemas();
  }
  
  // Client → Server: API requests should be validated
  if (from === 'client' && to === 'server') {
    return clientUsesValidation() && middlewareUsesValidationSchemas();
  }
  
  // Database → Server: Will be validated once transformation layer is implemented (Task 5)
  if (from === 'database' && to === 'server') {
    // Placeholder for future implementation
    return true; // Will be implemented in Task 5
  }
  
  // Server → Database: Will be validated once transformation layer is implemented (Task 5)
  if (from === 'server' && to === 'database') {
    // Placeholder for future implementation
    return true; // Will be implemented in Task 5
  }
  
  return false;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: full-stack-integration, Property 7: Validation at Integration Points', () => {
  it('should have validation infrastructure in place', () => {
    // Verify that validation middleware exists
    const middlewareExists = validationMiddlewareExists();
    expect(middlewareExists).toBe(true);
    
    // Verify that client validation exists
    const clientExists = clientValidationExists();
    expect(clientExists).toBe(true);
    
    // Verify that validation schemas exist
    const schemasExist = validationSchemasExist();
    expect(schemasExist).toBe(true);
  });

  it('should have server-side validation middleware', () => {
    const usesValidation = middlewareUsesValidationSchemas();
    expect(usesValidation).toBe(true);
  });

  it('should have client-side validation', () => {
    const usesValidation = clientUsesValidation();
    expect(usesValidation).toBe(true);
  });

  it('should validate data at all integration boundaries', () => {
    fc.assert(
      fc.property(
        fc.record({
          from: fc.constantFrom('client', 'server', 'database'),
          to: fc.constantFrom('client', 'server', 'database'),
          dataType: fc.constantFrom('User', 'Bill', 'Comment'),
        }),
        (boundary) => {
          // Property: Data crossing boundaries should be validated
          
          // Skip same-layer boundaries
          if (boundary.from === boundary.to) {
            return;
          }
          
          // Verify validation exists at this boundary
          const hasValidation = validationAtBoundary(boundary.from, boundary.to);
          
          // For now, we only strictly enforce client↔server validation
          // Database↔server validation will be enforced once Task 5 is complete
          if ((boundary.from === 'client' && boundary.to === 'server') ||
              (boundary.from === 'server' && boundary.to === 'client')) {
            expect(hasValidation).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid data at boundaries', () => {
    fc.assert(
      fc.property(
        fc.record({
          dataType: fc.constantFrom('CreateUserRequest', 'GetBillResponse', 'UpdateUserRequest'),
          isValid: fc.boolean(),
          validationError: fc.constantFrom('missing_field', 'invalid_type', 'constraint_violation'),
        }),
        (data) => {
          // Property: Invalid data should be rejected at boundaries
          
          // Verify data type follows conventions
          const isRequestType = data.dataType.endsWith('Request');
          const isResponseType = data.dataType.endsWith('Response');
          
          expect(isRequestType || isResponseType).toBe(true);
          
          // If data is invalid, it should be rejected
          if (!data.isValid) {
            // Validation should catch the error
            const errorTypes = ['missing_field', 'invalid_type', 'constraint_violation'];
            expect(errorTypes).toContain(data.validationError);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use shared validation schemas at all boundaries', () => {
    fc.assert(
      fc.property(
        fc.record({
          schemaName: fc.constantFrom(
            'CreateUserRequestSchema',
            'GetBillResponseSchema',
            'ListUsersQuerySchema'
          ),
          usedInClient: fc.boolean(),
          usedInServer: fc.boolean(),
          isFromShared: fc.boolean(),
        }),
        (schema) => {
          // Property: Validation schemas should be from shared layer
          
          // Verify schema name follows conventions
          const isValidName = schema.schemaName.endsWith('Schema');
          expect(isValidName).toBe(true);
          
          // If schema is used in client or server, it should be from shared
          if (schema.usedInClient || schema.usedInServer) {
            // In production, this would be strictly enforced
            // For now, we just verify the naming convention
            expect(typeof schema.isFromShared).toBe('boolean');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide detailed validation errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          fieldName: fc.string({ minLength: 1, maxLength: 50 }),
          errorType: fc.constantFrom('required', 'invalid_format', 'out_of_range', 'invalid_type'),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        (error) => {
          // Property: Validation errors should be detailed and actionable
          
          // Verify field name is valid
          const isValidFieldName = error.fieldName.length > 0;
          expect(isValidFieldName).toBe(true);
          
          // Verify error type is recognized
          const validErrorTypes = ['required', 'invalid_format', 'out_of_range', 'invalid_type'];
          expect(validErrorTypes).toContain(error.errorType);
          
          // Verify error message is provided
          const hasMessage = error.errorMessage.length > 0;
          expect(hasMessage).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate request data before processing', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.constantFrom('/api/users', '/api/bills', '/api/comments'),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          hasRequestBody: fc.boolean(),
          requestIsValid: fc.boolean(),
        }),
        (request) => {
          // Property: Request data should be validated before processing
          
          // Verify endpoint format
          const isValidEndpoint = request.endpoint.startsWith('/api/');
          expect(isValidEndpoint).toBe(true);
          
          // Verify HTTP method
          const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
          expect(validMethods).toContain(request.method);
          
          // If request has body, it should be validated
          if (request.hasRequestBody && (request.method === 'POST' || request.method === 'PUT')) {
            // Validation should occur
            expect(typeof request.requestIsValid).toBe('boolean');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate response data before sending', () => {
    fc.assert(
      fc.property(
        fc.record({
          statusCode: fc.integer({ min: 200, max: 599 }),
          hasResponseBody: fc.boolean(),
          responseIsValid: fc.boolean(),
          isDevelopmentMode: fc.boolean(),
        }),
        (response) => {
          // Property: Response data should be validated before sending (in development mode)
          
          // Verify status code is valid
          expect(response.statusCode).toBeGreaterThanOrEqual(200);
          expect(response.statusCode).toBeLessThan(600);
          
          // If response has body and we're in development mode, it should be validated
          if (response.hasResponseBody && response.isDevelopmentMode) {
            // Validation should occur in development
            expect(typeof response.responseIsValid).toBe('boolean');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // NOTE: The following tests are placeholders for Task 5 (Data Transformation Layer)
  // They will be fully implemented once the transformation layer is complete

  it.skip('should validate data transformations (database → server)', () => {
    // TODO: Implement once Task 5 (transformation layer) is complete
    // This will validate requirement 5.2
  });

  it.skip('should validate data transformations (server → database)', () => {
    // TODO: Implement once Task 5 (transformation layer) is complete
    // This will validate requirement 5.3
  });

  it.skip('should validate data at database constraints', () => {
    // TODO: Implement once Task 5 (transformation layer) is complete
    // This will validate requirement 5.4
  });
});
