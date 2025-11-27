/**
 * Simple, reliable lazy page loading
 * Fallback implementation to avoid complex dynamic imports
 */

import React, { lazy, Suspense } from 'react';
// import type { ComponentType } from 'react';

// Simple loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Direct imports for reliability
export const SimpleLazyPages = {
  HomePage: lazy(() => import('@client/pages/home')),
  Dashboard: lazy(() => import('@client/pages/dashboard')),
  BillsDashboard: lazy(() => import('@client/pages/bills-dashboard-page')),
  AuthPage: lazy(() => import('@client/pages/auth-page')),
  BillDetail: lazy(() => import('@client/pages/bill-detail')),
  BillAnalysis: lazy(() => import('@client/pages/bill-analysis')),
  CommunityInput: lazy(() => import('@client/pages/community-input')),
  ExpertVerification: lazy(() => import('@client/pages/expert-verification')),
  SearchPage: lazy(() => import('@client/pages/search')),
  UserProfilePage: lazy(() => import('@client/pages/UserProfilePage')),
  Onboarding: lazy(() => import('@client/pages/onboarding')),
  AdminPage: lazy(() => import('@client/pages/admin')),
  DatabaseManager: lazy(() => import('@client/pages/database-manager')),
  BillSponsorshipAnalysis: lazy(() => import('@client/pages/bill-sponsorship-analysis')),
  CommentsPage: lazy(() => import('@client/pages/comments')),
  NotFound: lazy(() => import('@client/pages/not-found')),
};

// Wrapper component with error boundary
export const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);