// Users Feature Domain
// Centralized exports for user-related functionality

// Routes
export { default as usersRouter } from './users';
export { default as profileRouter } from './profile';
export { default as verificationRouter } from './verification';
export { default as alertPreferencesRouter } from './alert-preferences';

// Services
export { UserManagementService } from './user-management';
export { UserProfileService } from './user-profile';
export { UserPreferencesService } from './user-preferences';
export { CitizenVerificationService } from './citizen-verification';
export { ExpertVerificationService } from './ExpertVerificationService';
export { AlertPreferenceService } from './alert-preference';
export { AdvancedAlertPreferencesService } from './advanced-alert-preferences';

// Storage
export { UserStorage } from './user-storage';

// Tests
export * from './ExpertVerificationService.test';