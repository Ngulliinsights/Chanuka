/**
 * Authentication Recovery Strategies (Strategic)
 *
 * React Query doesn't handle auth-specific recovery:
 * - Token refresh
 * - Session management
 * - Logout on auth failure
 */

import { logger } from '@client/infrastructure/observability/logging';

/**
 * Authentication refresh recovery strategy
 */
export async function authRefreshStrategy(): Promise<boolean> {
  try {
    // Check for refresh token
    const refreshToken =
      localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

    if (!refreshToken) {
      // No refresh token available, redirect to login
      setTimeout(() => (window.location.href = '/auth/login'), 1000);
      return false;
    }

    // Attempt to refresh authentication tokens
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      // Store new tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
      }
    }

    return false;
  } catch (refreshError) {
    logger.error(
      'Auth refresh failed',
      {
        component: 'AuthRecovery',
        operation: 'authRefreshStrategy',
      },
      refreshError
    );
    setTimeout(() => (window.location.href = '/auth/login'), 1000);
    return false;
  }
}

/**
 * Authentication retry recovery strategy
 */
export async function authRetryStrategy(): Promise<boolean> {
  // Wait a bit for potential auth refresh to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if we now have valid tokens
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return !!accessToken;
}

/**
 * Authentication logout recovery strategy
 */
export async function authLogoutStrategy(): Promise<boolean> {
  try {
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');

    // Call logout API if available
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore logout API failures
    }

    // Redirect to login page
    window.location.href = '/auth/login';
    return true;
  } catch (logoutError) {
    logger.error(
      'Auth logout failed',
      {
        component: 'AuthRecovery',
        operation: 'authLogoutStrategy',
      },
      logoutError
    );
    return false;
  }
}
