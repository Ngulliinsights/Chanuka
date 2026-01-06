/**
 * Users Feature - Authentication, Profiles, Verification
 * Feature-Sliced Design barrel exports
 */

// Types
export * from './types';

// Authentication (re-exported from core for convenience)
export { useAuth, AuthProvider } from '@client/core/auth';

// User API and hooks
export * from './services/user-api';
export * from './services/onboarding-service';
export * from './hooks/useUsers';
export * from './hooks/useUserAPI';
export * from './hooks/useOnboarding';

// UI Components - Verification
export * from './ui/verification/ExpertBadge';
export * from './ui/verification/ExpertProfileCard';
export * from './ui/verification/ExpertConsensus';
export * from './ui/verification/CredibilityScoring';
export * from './ui/verification/CommunityValidation';
export * from './ui/verification/VerificationWorkflow';

// UI Components - Onboarding
export * from './ui/onboarding/UserJourneyOptimizer';
