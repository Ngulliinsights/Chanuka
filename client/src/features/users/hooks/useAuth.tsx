/**
 * DEPRECATED: Legacy Auth Hook
 * 
 * This file has been replaced by the consolidated authentication system.
 * Please update your imports to use the new system:
 * 
 * Before: import { useAuth } from '@/features/users/hooks/useAuth'
 * After:  import { useAuth } from '@/core/auth'
 * 
 * @deprecated Use '@/core/auth' instead
 */

// Re-export from the new consolidated auth system for backward compatibility
export { 
  useAuth, 
  AuthProvider, 
  useAuthStore,
  type AuthContextType 
} from '../../../core/auth';

// Legacy default export for compatibility
export default {
  useAuth: () => {
    console.warn(
      'DEPRECATED: useAuth from @/features/users/hooks/useAuth is deprecated. ' +
      'Please import from @/core/auth instead.'
    );
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAuth } = require('../../../core/auth');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  }
};