/**
 * Simple, reliable lazy page loading
 * Fallback implementation to avoid complex dynamic imports
 */

import { lazy } from 'react';

// Direct imports for reliability
export const SimpleLazyPages = {
  HomePage: lazy(() => import('../pages/home')),
  Dashboard: lazy(() => import('../pages/dashboard')),
  BillsDashboard: lazy(() => import('../pages/bills-dashboard-page')),
  AuthPage: lazy(() => import('../pages/auth-page')),
  BillDetail: lazy(() => import('../pages/bill-detail')),
  BillAnalysis: lazy(() => import('../pages/bill-analysis')),
  CommunityInput: lazy(() => import('../pages/community-input')),
  ExpertVerification: lazy(() => import('../pages/expert-verification')),
  SearchPage: lazy(() => import('../pages/search')),
  UserProfilePage: lazy(() => import('../pages/UserProfilePage')),
  Onboarding: lazy(() => import('../pages/onboarding')),
  AdminPage: lazy(() => import('../pages/admin')),
  DatabaseManager: lazy(() => import('../pages/database-manager')),
  BillSponsorshipAnalysis: lazy(() => import('../pages/bill-sponsorship-analysis')),
  CommentsPage: lazy(() => import('../pages/comments')),
  CivicEducation: lazy(() => import('../pages/civic-education')),
  NotFound: lazy(() => import('../pages/not-found')),
};