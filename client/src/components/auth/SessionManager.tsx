/**
 * Session Manager Component
 * 
 * Handles session management, token refresh, and authentication state persistence.
 * Integrates with the authentication backend service for secure session handling.
 */

import React, { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/slices/authSlice';
import { authBackendService } from '../../services/authBackendService';
import { logger } from '../../utils/logger';

interface SessionManagerProps {
  children: React.ReactNode;
}

export function SessionManager({ children }: SessionManagerProps) {
  const { 
    user, 
    isAuthenticated, 
    sessionExpiry,
    refreshTokens,
    logout,
    setUser 
  } = useAuthStore();

  // Handle automatic token refresh
  const handleTokenRefresh = useCallback(async () => {
    try {
      await refreshTokens();
      
      // Get updated user info after token refresh
      const updatedUser = await authBackendService.getCurrentUser();
      setUser(updatedUser);
      
      logger.info('Session refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed, logging out', { error });
      await logout();
    }
  }, [refreshTokens, logout, setUser]);

  // Set up token refresh timer
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) return;

    const expiryTime = new Date(sessionExpiry).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Refresh token 5 minutes before expiry, but not less than 1 minute from now
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000);
    
    if (refreshTime > 0 && refreshTime < 24 * 60 * 60 * 1000) { // Don't set timer for more than 24 hours
      const timeoutId = setTimeout(handleTokenRefresh, refreshTime);
      
      logger.info('Token refresh scheduled', { 
        refreshInMs: refreshTime,
        refreshAt: new Date(Date.now() + refreshTime).toISOString()
      });
      
      return () => {
        clearTimeout(timeoutId);
        logger.debug('Token refresh timer cleared');
      };
    }
  }, [isAuthenticated, sessionExpiry, handleTokenRefresh]);

  // Handle session validation on app focus
  useEffect(() => {
    const handleFocus = async () => {
      if (!isAuthenticated) return;

      try {
        const isValid = await authBackendService.validateSession();
        if (!isValid) {
          logger.warn('Session invalid on focus, logging out');
          await logout();
        } else {
          // Update user info in case it changed
          const updatedUser = await authBackendService.getCurrentUser();
          setUser(updatedUser);
        }
      } catch (error) {
        logger.warn('Session validation failed on focus', { error });
        // Don't logout on validation errors, just log the warning
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    // Validate session when window gains focus
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, logout, setUser]);

  // Handle session extension for active users
  useEffect(() => {
    if (!isAuthenticated) return;

    let activityTimer: NodeJS.Timeout;
    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const checkActivity = async () => {
      const timeSinceActivity = Date.now() - lastActivity;
      
      // If user has been active in the last 30 minutes, extend session
      if (timeSinceActivity < 30 * 60 * 1000) {
        try {
          await authBackendService.extendSession();
          logger.debug('Session extended due to user activity');
        } catch (error) {
          logger.warn('Failed to extend session', { error });
        }
      }
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check activity every 15 minutes
    activityTimer = setInterval(checkActivity, 15 * 60 * 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(activityTimer);
    };
  }, [isAuthenticated]);

  // Handle beforeunload to clean up session if needed
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show warning if user has unsaved changes
      // For now, we'll just log the session end
      logger.info('User leaving application', { userId: user?.id });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // Periodic session health check
  useEffect(() => {
    if (!isAuthenticated) return;

    const healthCheckInterval = setInterval(async () => {
      try {
        // Simple health check - just verify we can make an authenticated request
        await authBackendService.getCurrentUser();
        logger.debug('Session health check passed');
      } catch (error) {
        logger.warn('Session health check failed', { error });
        
        // Try to refresh tokens first
        try {
          await handleTokenRefresh();
        } catch (refreshError) {
          logger.error('Session recovery failed, logging out', { refreshError });
          await logout();
        }
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(healthCheckInterval);
  }, [isAuthenticated, handleTokenRefresh, logout]);

  return <>{children}</>;
}

export default SessionManager;