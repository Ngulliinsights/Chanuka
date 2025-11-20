// ============================================================================
// ERROR HANDLING MIGRATION EXAMPLE
// ============================================================================
// Demonstrates how to migrate from legacy error handling to Boom + Neverthrow

import { Result } from 'neverthrow';
import Boom from '@hapi/boom';
import { 
  errorAdapter, 
  createValidationError, 
  createAuthenticationError,
  createNotFoundError 
} from './error-adapter.js';
import { 
  errorHandler as legacyHandler,
  ErrorContext 
} from './error-standardization.js';

// Example service context
const serviceContext: Partial<ErrorContext> = {
  service: 'user-service',
  operation: 'create-user',
  requestId: 'req-123'
};

// ============================================================================
// BEFORE: Legacy Error Handling
// ============================================================================

export class LegacyUserService {
  async createUser(userData: { email: string; password: string }) {
    try {
      // Validation
      if (!userData.email || !userData.password) {
        const validationErrors = [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' }
        ];
        const error = legacyHandler.createValidationError(validationErrors, serviceContext);
        throw error;
      }

      // Business logic that might fail
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        const error = legacyHandler.createConflictError('User', 'Email already exists', serviceContext);
        throw error;
      }

      // Create user...
      return { id: 'user-123', email: userData.email };
    } catch (error: any) {
      // Convert to error response
      if (error.id) {
        // Already a standardized error
        return legacyHandler.toErrorResponse(error);
      }
      
      // Handle unexpected errors
      const standardizedError = legacyHandler.createError(
        error,
        'system' as any,
        serviceContext
      );
      return legacyHandler.toErrorResponse(standardizedError);
    }
  }

  private async findUserByEmail(email: string) {
    // Simulate database lookup
    return email === 'existing@example.com' ? { id: 'existing' } : null;
  }
}

// ============================================================================
// AFTER: Boom + Neverthrow Error Handling
// ============================================================================

export class ModernUserService {
  async createUser(userData: { email: string; password: string }): Promise<Result<{ id: string; email: string }, Boom.Boom>> {
    // Validation using Result types
    const validationResult = this.validateUserData(userData);
    if (validationResult.isErr()) {
      return validationResult;
    }

    // Business logic with Result types
    const existingUserResult = await this.checkUserExists(userData.email);
    if (existingUserResult.isErr()) {
      return existingUserResult;
    }

    if (existingUserResult.value) {
      return errorAdapter.createConflictError('User', 'Email already exists', serviceContext);
    }

    // Wrap potentially failing operations
    return errorAdapter.wrapFunction(async () => {
      // Create user...
      return { id: 'user-123', email: userData.email };
    });
  }

  private validateUserData(userData: { email: string; password: string }): Result<void, Boom.Boom> {
    const errors = [];
    
    if (!userData.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    }
    
    if (!userData.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length > 0) {
      return createValidationError(errors, serviceContext);
    }

    return { ok: true, value: undefined } as any;
  }

  private async checkUserExists(email: string): Promise<Result<boolean, Boom.Boom>> {
    return errorAdapter.wrapFunction(async () => {
      // Simulate database lookup that might fail
      if (email === 'error@example.com') {
        throw new Error('Database connection failed');
      }
      return email === 'existing@example.com';
    });
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

export async function demonstrateMigration() {
  const legacyService = new LegacyUserService();
  const modernService = new ModernUserService();

  console.log('=== Legacy Error Handling ===');
  
  try {
    const legacyResult = await legacyService.createUser({ email: '', password: '' });
    console.log('Legacy result:', legacyResult);
  } catch (error) {
    console.log('Legacy error:', error);
  }

  console.log('\n=== Modern Error Handling ===');
  
  const modernResult = await modernService.createUser({ email: '', password: '' });
  
  if (modernResult.isErr()) {
    const errorResponse = errorAdapter.toErrorResponse(modernResult.error);
    console.log('Modern error response:', errorResponse);
  } else {
    console.log('Modern success:', modernResult.value);
  }

  // Demonstrate successful case
  console.log('\n=== Successful Case ===');
  
  const successResult = await modernService.createUser({ 
    email: 'new@example.com', 
    password: 'password123' 
  });
  
  if (successResult.isOk()) {
    console.log('User created:', successResult.value);
  }
}

// ============================================================================
// MIDDLEWARE INTEGRATION EXAMPLE
// ============================================================================

export function errorHandlingMiddleware(req: any, res: any, next: any) {
  // Wrap the next function to catch and convert errors
  const wrappedNext = (error?: any) => {
    if (!error) {
      return next();
    }

    // Convert various error types to Boom
    let boomError: Boom.Boom;

    if (Boom.isBoom(error)) {
      boomError = error;
    } else if (error.name === 'ValidationError') {
      const validationErrors = error.details?.map((detail: any) => ({
        field: detail.path?.join('.') || 'unknown',
        message: detail.message
      })) || [];
      
      const result = createValidationError(validationErrors, {
        service: 'api',
        operation: req.route?.path || req.path,
        requestId: req.id
      });
      
      boomError = result.isErr() ? result.error : Boom.badRequest('Validation failed');
    } else {
      boomError = Boom.internal(error.message || 'Internal server error');
    }

    // Convert to standard error response format
    const errorResponse = errorAdapter.toErrorResponse(boomError);
    
    // Send response
    res.status(boomError.output.statusCode).json(errorResponse);
  };

  // Replace the original next function
  req.next = wrappedNext;
  next();
}

// ============================================================================
// FEATURE FLAG INTEGRATION
// ============================================================================

export class FeatureFlaggedErrorService {
  private useNewErrorHandling = process.env.USE_NEW_ERROR_HANDLING === 'true';

  async handleError(error: any, context: Partial<ErrorContext>) {
    if (this.useNewErrorHandling) {
      // Use new Boom + Neverthrow approach
      if (Boom.isBoom(error)) {
        return errorAdapter.toErrorResponse(error);
      }
      
      const boomError = Boom.internal(error.message || 'Internal error');
      return errorAdapter.toErrorResponse(boomError);
    } else {
      // Use legacy approach
      const standardizedError = legacyHandler.createError(error, 'system' as any, context);
      return legacyHandler.toErrorResponse(standardizedError);
    }
  }
}

// Export for testing and demonstration
export { errorAdapter, legacyHandler };
