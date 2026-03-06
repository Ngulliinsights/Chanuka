/**
 * User-Initiated Recovery Actions (Strategic)
 * 
 * Manual recovery actions that require user decision:
 * - Page reload
 * - Cache clear
 * - Redirect
 */

import { logger } from '@client/infrastructure/observability/logging';

/**
 * Page reload recovery strategy
 */
export function pageReloadStrategy(): boolean {
  setTimeout(() => window.location.reload(), 1000);
  return true;
}

/**
 * Cache clear and reload strategy
 */
export async function cacheClearStrategy(): Promise<boolean> {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear non-critical storage
    const criticalKeys = ['auth_token', 'refresh_token', 'user_preferences'];
    Object.keys(localStorage).forEach(key => {
      if (!criticalKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear session storage but preserve secure tokens
    Object.keys(sessionStorage).forEach(key => {
      if (!criticalKeys.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });

    // Reload after a short delay
    setTimeout(() => window.location.reload(), 500);

    return true;
  } catch (clearError) {
    logger.error('Cache clear failed', {
      component: 'UserActions',
      operation: 'cacheClearStrategy',
    }, clearError);
    return false;
  }
}

/**
 * Redirect recovery strategy
 */
export function redirectStrategy(path: string): boolean {
  setTimeout(() => (window.location.href = path), 1000);
  return true;
}
