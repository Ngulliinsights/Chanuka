// Users Feature Domain
// Centralized exports for user-related functionality

// Routes
export { router as usersRouter } from './application/users';
export { router as profileRouter } from './application/profile';
export { router as verificationRouter } from './application/verification';

// Services
export { UserManagementService } from './domain/user-management';
export { UserProfileService } from './domain/user-profile';
export { UserPreferencesService } from './domain/user-preferences';
export { CitizenVerificationService } from './domain/citizen-verification';
export { ExpertVerificationService } from './domain/ExpertVerificationService';

// Storage
export { UserStorage } from './infrastructure/user-storage';

// Tests
export * from './__tests__/ExpertVerificationService.test';








