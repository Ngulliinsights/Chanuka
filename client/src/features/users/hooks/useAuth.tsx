/**
 * DEPRECATED: Legacy Auth Hook
 *
 * This file has been replaced by the consolidated authentication system.
 * Please update your imports to use the new system:
 *
 * Before: import { useAuth } from '@client/core/auth'
 * After:  import { useAuth } from '@/core/auth'
 *
 * @deprecated Use '@/core/auth' instead
 */

// Re-export from the new consolidated auth system for backward compatibility
export { useAuth, AuthProvider, useAuthStore, type AuthContextType } from '@client/core/auth';
