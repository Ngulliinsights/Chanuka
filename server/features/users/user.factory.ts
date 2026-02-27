// ============================================================================
// USER FACTORY - Dependency Injection
// ============================================================================
// Creates user services with proper dependency injection.
// Single source of truth for dependency wiring.

import { UserRepository } from './domain/repositories/user.repository';
import { UserDomainService } from './domain/services/user.domain.service';

/**
 * User services container
 */
export interface UserServices {
  userRepository: UserRepository;
  userDomainService: UserDomainService;
}

/**
 * Create user services with dependency injection
 * 
 * @returns User services container
 */
export function createUserServices(): UserServices {
  // Create repository
  const userRepository = new UserRepository();

  // Create domain service with injected repository
  const userDomainService = new UserDomainService(userRepository);

  return {
    userRepository,
    userDomainService,
  };
}

/**
 * Singleton instance of user services
 */
let userServicesInstance: UserServices | null = null;

/**
 * Get user services singleton instance
 * 
 * @returns User services container
 */
export function getUserServices(): UserServices {
  if (!userServicesInstance) {
    userServicesInstance = createUserServices();
  }
  return userServicesInstance;
}

/**
 * Reset user services (for testing)
 */
export function resetUserServices(): void {
  userServicesInstance = null;
}

/**
 * Set user services (for testing with mocks)
 * 
 * @param services - Mock services
 */
export function setUserServices(services: UserServices): void {
  userServicesInstance = services;
}
