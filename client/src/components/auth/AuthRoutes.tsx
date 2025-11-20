/**
 * Authentication Routes
 * Defines all authentication-related routes and their protection levels
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthGuard, RequireAuth, RequireRole } from './AuthGuard';
import { OAuthCallback } from './OAuthCallback';

// Lazy load auth pages
const LoginPage = React.lazy(() => import('@client/pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('@client/pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('@client/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@client/pages/auth/ResetPasswordPage'));
const ProfilePage = React.lazy(() => import('@client/pages/auth/ProfilePage'));
const SecurityPage = React.lazy(() => import('@client/pages/auth/SecurityPage'));
const PrivacyPage = React.lazy(() => import('@client/pages/auth/PrivacyPage'));

export function AuthRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route 
        path="/auth/login" 
        element={
          <AuthGuard requireAuth={false}>
            <LoginPage />
          </AuthGuard>
        } 
      />
      <Route 
        path="/auth/register" 
        element={
          <AuthGuard requireAuth={false}>
            <RegisterPage />
          </AuthGuard>
        } 
      />
      <Route 
        path="/auth/forgot-password" 
        element={
          <AuthGuard requireAuth={false}>
            <ForgotPasswordPage />
          </AuthGuard>
        } 
      />
      <Route 
        path="/auth/reset-password" 
        element={
          <AuthGuard requireAuth={false}>
            <ResetPasswordPage />
          </AuthGuard>
        } 
      />

      {/* OAuth callback routes */}
      <Route path="/auth/callback/google" element={<OAuthCallback />} />
      <Route path="/auth/callback/github" element={<OAuthCallback />} />

      {/* Protected auth routes */}
      <Route 
        path="/auth/profile" 
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        } 
      />
      <Route 
        path="/auth/security" 
        element={
          <RequireAuth>
            <SecurityPage />
          </RequireAuth>
        } 
      />
      <Route 
        path="/auth/privacy" 
        element={
          <RequireAuth>
            <PrivacyPage />
          </RequireAuth>
        } 
      />
    </Routes>
  );
}

// Individual route components for use in main routing
export const authRouteConfig = [
  {
    path: '/auth/login',
    element: (
      <AuthGuard requireAuth={false}>
        <LoginPage />
      </AuthGuard>
    ),
    id: 'auth-login'
  },
  {
    path: '/auth/register',
    element: (
      <AuthGuard requireAuth={false}>
        <RegisterPage />
      </AuthGuard>
    ),
    id: 'auth-register'
  },
  {
    path: '/auth/forgot-password',
    element: (
      <AuthGuard requireAuth={false}>
        <ForgotPasswordPage />
      </AuthGuard>
    ),
    id: 'auth-forgot-password'
  },
  {
    path: '/auth/reset-password',
    element: (
      <AuthGuard requireAuth={false}>
        <ResetPasswordPage />
      </AuthGuard>
    ),
    id: 'auth-reset-password'
  },
  {
    path: '/auth/callback/google',
    element: <OAuthCallback />,
    id: 'auth-callback-google'
  },
  {
    path: '/auth/callback/github',
    element: <OAuthCallback />,
    id: 'auth-callback-github'
  },
  {
    path: '/auth/profile',
    element: (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    ),
    id: 'auth-profile'
  },
  {
    path: '/auth/security',
    element: (
      <RequireAuth>
        <SecurityPage />
      </RequireAuth>
    ),
    id: 'auth-security'
  },
  {
    path: '/auth/privacy',
    element: (
      <RequireAuth>
        <PrivacyPage />
      </RequireAuth>
    ),
    id: 'auth-privacy'
  }
];

// Protected route wrappers for existing routes
export function withAuthGuard<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    requireAuth?: boolean;
    requireRole?: string;
    requirePermission?: {
      resource: string;
      action: string;
      conditions?: Record<string, any>;
    };
  } = {}
) {
  return function AuthGuardedComponent(props: T) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Convenience wrappers
export const withAuth = <T extends Record<string, any>>(Component: React.ComponentType<T>) =>
  withAuthGuard(Component, { requireAuth: true });

export const withRole = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  role: string
) => withAuthGuard(Component, { requireAuth: true, requireRole: role });

export const withPermission = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  resource: string,
  action: string,
  conditions?: Record<string, any>
) => withAuthGuard(Component, { 
  requireAuth: true, 
  requirePermission: { resource, action, conditions } 
});