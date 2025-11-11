/**
 * Simple, reliable lazy page loading
 * Fallback implementation to avoid complex dynamic imports
 */

import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';

// Simple loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Direct imports for reliability
export const SimpleLazyPages = {
  HomePage: lazy(() => import('../pages/home')),
  Dashboard: lazy(() => import('../pages/dashboard')),
  BillsDashboard: lazy(() => import('../pages/enhanced-bills-dashboard-page')),
  AuthPage: lazy(() => import('../pages/auth-page')),
  BillDetail: lazy(() => import('../pages/bill-detail')),
  BillAnalysis: lazy(() => import('../pages/bill-analysis')),
  CommunityInput: lazy(() => import('../pages/community-input')),
  ExpertVerification: lazy(() => import('../pages/expert-verification')),
  SearchPage: lazy(() => import('../pages/search')),
  Profile: lazy(() => import('../pages/profile')),
  UserProfilePage: lazy(() => import('../pages/user-profile')),
  Onboarding: lazy(() => import('../pages/onboarding')),
  AdminPage: lazy(() => import('../pages/admin')),
  DatabaseManager: lazy(() => import('../pages/database-manager')),
  BillSponsorshipAnalysis: lazy(() => import('../pages/bill-sponsorship-analysis')),
  CommentsPage: lazy(() => import('../pages/comments')),
  NotFound: lazy(() => import('../pages/not-found')),
};

// Wrapper component with error boundary
export const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);