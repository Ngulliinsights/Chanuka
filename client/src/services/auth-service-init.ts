/**
 * Auth Service Initialization
 * Handles the initialization of auth service to avoid circular dependencies
 */

import { createAuthApiService } from '../core/api/auth';
import { globalApiClient } from '../core/api/client';

// Create the auth service instance
export const authService = createAuthApiService(globalApiClient);

// Re-export the class for type compatibility
export { AuthApiService as AuthService } from '../core/api/auth';