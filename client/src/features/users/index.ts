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
export * from './hooks/useUsers';
export * from './hooks/useUserAPI';

// UI Components
export * from './components/UserProfile';





































