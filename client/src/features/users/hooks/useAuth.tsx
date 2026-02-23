/**
 * DEPRECATED: Legacy Auth Hook
 *
 * This file has been replaced by the consolidated authentication system.
 * Please update your imports to use the new system:
 *
 * Before: import { useAuth } from '@client/infrastructure/auth'
 * After:  import { useAuth } from '@client/infrastructure/auth'
 *
 * @deprecated Use '@client/infrastructure/auth' instead
 */

// Re-export from the new consolidated auth system for backward compatibility
export { useAuth, AuthProvider, useAuthStore, type AuthContextType } from '@client/infrastructure/auth';
