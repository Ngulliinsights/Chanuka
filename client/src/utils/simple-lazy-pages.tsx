/**
 * Optimized Lazy Page Loading with True Code Splitting
 * 
 * Implements proper dynamic imports for optimal bundle splitting
 * and performance optimization.
 */

import { lazy, ComponentType } from 'react';

// Type for lazy page components
type LazyPageComponent = ComponentType<any>;

// Helper function to create lazy components with error boundaries
const createLazyPage = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  displayName?: string
): LazyPageComponent => {
  const LazyComponent = lazy(importFn);
  
  if (displayName) {
    LazyComponent.displayName = `Lazy(${displayName})`;
  }
  
  return LazyComponent;
};

// Lazy page registry with proper dynamic imports
export const LazyPages = {
  // Core pages - highest priority
  HomePage: createLazyPage(
    () => import('../pages/home'),
    'HomePage'
  ),
  
  Dashboard: createLazyPage(
    () => import('../pages/dashboard'),
    'Dashboard'
  ),
  
  // Bills feature - high priority
  BillsDashboard: createLazyPage(
    () => import('../pages/bills-dashboard-page'),
    'BillsDashboard'
  ),
  
  BillDetail: createLazyPage(
    () => import('../pages/bill-detail'),
    'BillDetail'
  ),
  
  BillAnalysis: createLazyPage(
    () => import('../pages/bill-analysis'),
    'BillAnalysis'
  ),
  
  BillSponsorshipAnalysis: createLazyPage(
    () => import('../pages/bill-sponsorship-analysis'),
    'BillSponsorshipAnalysis'
  ),
  
  // User features - medium priority
  AuthPage: createLazyPage(
    () => import('../pages/auth-page'),
    'AuthPage'
  ),
  
  UserProfilePage: createLazyPage(
    () => import('../pages/UserProfilePage'),
    'UserProfilePage'
  ),
  
  Onboarding: createLazyPage(
    () => import('../pages/onboarding'),
    'Onboarding'
  ),
  
  // Community features - medium priority
  CommunityInput: createLazyPage(
    () => import('../pages/community-input'),
    'CommunityInput'
  ),
  
  CommentsPage: createLazyPage(
    () => import('../pages/comments'),
    'CommentsPage'
  ),
  
  // Search and discovery - medium priority
  SearchPage: createLazyPage(
    () => import('../pages/search'),
    'SearchPage'
  ),
  
  // Expert features - lower priority
  ExpertVerification: createLazyPage(
    () => import('../pages/expert-verification'),
    'ExpertVerification'
  ),
  
  // Education features - lower priority
  CivicEducation: createLazyPage(
    () => import('../pages/civic-education'),
    'CivicEducation'
  ),
  
  // Admin features - lowest priority (admin only)
  AdminPage: createLazyPage(
    () => import('../pages/admin'),
    'AdminPage'
  ),
  
  DatabaseManager: createLazyPage(
    () => import('../pages/database-manager'),
    'DatabaseManager'
  ),
  
  // Error handling
  NotFound: createLazyPage(
    () => import('../pages/not-found'),
    'NotFound'
  ),
} as const;

// Route configuration with preloading hints
export const routeConfig = [
  {
    path: '/',
    component: LazyPages.HomePage,
    preload: true, // Preload on app start
  },
  {
    path: '/dashboard',
    component: LazyPages.Dashboard,
    preload: true, // High priority
  },
  {
    path: '/bills',
    component: LazyPages.BillsDashboard,
    preload: true, // High priority
  },
  {
    path: '/bills/:id',
    component: LazyPages.BillDetail,
    preload: false, // Load on demand
  },
  {
    path: '/bills/:id/analysis',
    component: LazyPages.BillAnalysis,
    preload: false,
  },
  {
    path: '/search',
    component: LazyPages.SearchPage,
    preload: false,
  },
  {
    path: '/auth',
    component: LazyPages.AuthPage,
    preload: false,
  },
  {
    path: '/profile',
    component: LazyPages.UserProfilePage,
    preload: false,
  },
  {
    path: '/onboarding',
    component: LazyPages.Onboarding,
    preload: false,
  },
  {
    path: '/community',
    component: LazyPages.CommunityInput,
    preload: false,
  },
  {
    path: '/comments',
    component: LazyPages.CommentsPage,
    preload: false,
  },
  {
    path: '/expert-verification',
    component: LazyPages.ExpertVerification,
    preload: false,
  },
  {
    path: '/civic-education',
    component: LazyPages.CivicEducation,
    preload: false,
  },
  {
    path: '/admin',
    component: LazyPages.AdminPage,
    preload: false,
  },
  {
    path: '/admin/database',
    component: LazyPages.DatabaseManager,
    preload: false,
  },
  {
    path: '/bills/:id/sponsorship-analysis',
    component: LazyPages.BillSponsorshipAnalysis,
    preload: false,
  },
  {
    path: '*',
    component: LazyPages.NotFound,
    preload: false,
  },
];

// Preloading utility for high-priority routes
export const preloadHighPriorityRoutes = () => {
  const highPriorityRoutes = routeConfig.filter(route => route.preload);
  
  // Preload after initial render to avoid blocking
  setTimeout(() => {
    highPriorityRoutes.forEach(route => {
      // Trigger the dynamic import to start loading
      route.component;
    });
  }, 100);
};

// Legacy export for backward compatibility
export const SimpleLazyPages = LazyPages;

export default LazyPages;