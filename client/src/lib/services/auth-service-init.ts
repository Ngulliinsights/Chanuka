/**
 * Auth Service Initialization
 * Handles the initialization of auth service to avoid circular dependencies
 */

import { createAuthApiService } from '@client/infrastructure/api/auth';
import { globalApiClient } from '@client/infrastructure/api';

// Create the auth service instance
export {
  // Re-export the class for type compatibility
  AuthApiService as AuthService,
} from '@client/infrastructure/api/auth';
