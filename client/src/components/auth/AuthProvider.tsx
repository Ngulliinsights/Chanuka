/**
 * Authentication Provider Component
 * 
 * Provides authentication context and handles session management,
 * token refresh, and authentication state initialization.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { authBackendService } from '../../services/auth-backend-service';
import { logger } from '../../utils/logger';
import { LoadingSpinner } from '../ui/loading-spinner';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { loading, logout } = useAuth();

  // Set up session validation interval
  useEffect(() => {
    // Validate session every 5 minutes
    const interval = setInterval(async () => {
      try {
        const isValid = await authBackendService.validateSession();
        if (!isValid) {
          logger.warn('Session validation failed, logging out');
          await logout();
        }
      } catch (error) {
        logger.warn('Session validation error (non-critical)', { error });
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [logout]);

  // Handle page visibility changes for session management
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Validate session when user returns to the page
        try {
          const isValid = await authBackendService.validateSession();
          if (!isValid) {
            logger.warn('Session expired while away, logging out');
            await logout();
          }
        } catch (error) {
          logger.warn('Session validation error on focus (non-critical)', { error });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logout]);

  // Show loading spinner during authentication operations
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;