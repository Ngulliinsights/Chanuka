/**
 * NavigationConsistency Component
 *
 * Ensures consistent navigation patterns across all pages
 * Requirements: 5.3, 5.4, 5.5
 */

import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { logger } from '@client/shared/utils/logger';

import { useNavigation } from './context';

interface NavigationConsistencyProps {
  children: React.ReactNode;
}

interface RouteMetadata {
  title: string;
  description?: string;
  section: string;
  requiresAuth: boolean;
  breadcrumbLabel: string;
}

/**
 * Route metadata configuration for consistent navigation
 */
const ROUTE_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Chanuka - Kenyan Legislative Intelligence',
    description: 'Track bills, analyze legislation, and engage with Kenyan democracy',
    section: 'home',
    requiresAuth: false,
    breadcrumbLabel: 'Home',
  },
  '/bills': {
    title: 'Bills Dashboard - Chanuka',
    description: 'Browse and track Kenyan legislative bills',
    section: 'bills',
    requiresAuth: false,
    breadcrumbLabel: 'Bills',
  },
  '/search': {
    title: 'Search - Chanuka',
    description: 'Search bills, sponsors, and legislative content',
    section: 'search',
    requiresAuth: false,
    breadcrumbLabel: 'Search',
  },
  '/results': {
    title: 'Search Results - Chanuka',
    description: 'Search results for legislative content',
    section: 'search',
    requiresAuth: false,
    breadcrumbLabel: 'Results',
  },
  '/community': {
    title: 'Community Hub - Chanuka',
    description: 'Engage with the civic community',
    section: 'community',
    requiresAuth: false,
    breadcrumbLabel: 'Community',
  },
  '/dashboard': {
    title: 'Dashboard - Chanuka',
    description: 'Your personalized legislative dashboard',
    section: 'dashboard',
    requiresAuth: true,
    breadcrumbLabel: 'Dashboard',
  },
  '/account': {
    title: 'Account - Chanuka',
    description: 'Manage your account settings',
    section: 'account',
    requiresAuth: true,
    breadcrumbLabel: 'Account',
  },
  '/account/settings': {
    title: 'Settings - Chanuka',
    description: 'Configure your preferences',
    section: 'account',
    requiresAuth: true,
    breadcrumbLabel: 'Settings',
  },
  '/admin': {
    title: 'Admin Dashboard - Chanuka',
    description: 'Administrative controls',
    section: 'admin',
    requiresAuth: true,
    breadcrumbLabel: 'Admin',
  },
  '/auth': {
    title: 'Sign In - Chanuka',
    description: 'Sign in to your account',
    section: 'auth',
    requiresAuth: false,
    breadcrumbLabel: 'Sign In',
  },
  '/terms': {
    title: 'Terms of Service - Chanuka',
    description: 'Terms and conditions',
    section: 'legal',
    requiresAuth: false,
    breadcrumbLabel: 'Terms',
  },
  '/privacy': {
    title: 'Privacy Policy - Chanuka',
    description: 'Privacy policy and data handling',
    section: 'legal',
    requiresAuth: false,
    breadcrumbLabel: 'Privacy',
  },
};

/**
 * Get route metadata with fallback for dynamic routes
 */
function getRouteMetadata(pathname: string): RouteMetadata {
  // Check exact match first
  if (ROUTE_METADATA[pathname]) {
    return ROUTE_METADATA[pathname];
  }

  // Handle dynamic routes
  if (pathname.startsWith('/bills/')) {
    if (pathname.includes('/analysis')) {
      return {
        title: 'Bill Analysis - Chanuka',
        description: 'Detailed bill analysis',
        section: 'bills',
        requiresAuth: false,
        breadcrumbLabel: 'Analysis',
      };
    } else {
      return {
        title: 'Bill Details - Chanuka',
        description: 'Legislative bill details',
        section: 'bills',
        requiresAuth: false,
        breadcrumbLabel: 'Bill Details',
      };
    }
  }

  // Default fallback
  return {
    title: 'Chanuka - Kenyan Legislative Intelligence',
    description: 'Track bills, analyze legislation, and engage with Kenyan democracy',
    section: 'unknown',
    requiresAuth: false,
    breadcrumbLabel: 'Page',
  };
}

/**
 * Update document title and meta tags
 */
function updateDocumentMeta(metadata: RouteMetadata) {
  // Update title
  document.title = metadata.title;

  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', metadata.description || '');

  // Update Open Graph tags
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', metadata.title);

  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogDescription) {
    ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    document.head.appendChild(ogDescription);
  }
  ogDescription.setAttribute('content', metadata.description || '');
}

/**
 * NavigationConsistency ensures all pages follow consistent navigation patterns
 */
export const NavigationConsistency: React.FC<NavigationConsistencyProps> = ({ children }) => {
  const location = useLocation();
  const navigation = useNavigation();

  /**
   * Handle route changes and ensure consistency
   */
  const handleRouteChange = useCallback(() => {
    const pathname = location.pathname;
    const metadata = getRouteMetadata(pathname);

    // Update document metadata
    updateDocumentMeta(metadata);

    // Update navigation state if needed
    if (navigation.currentSection !== metadata.section) {
      navigation.setCurrentSection?.(metadata.section);
    }

    // Log navigation for analytics
    logger.info('Navigation consistency applied', {
      component: 'NavigationConsistency',
      pathname,
      section: metadata.section,
      title: metadata.title,
    });

    // Track page view for analytics (if analytics service is available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: metadata.title,
        page_location: window.location.href,
      });
    }
  }, [location.pathname, navigation]);

  /**
   * Apply consistency on route changes
   */
  useEffect(() => {
    handleRouteChange();
  }, [handleRouteChange]);

  /**
   * Performance optimization: preload critical routes
   */
  useEffect(() => {
    const preloadCriticalRoutes = () => {
      const criticalRoutes = ['/bills', '/search', '/dashboard'];

      criticalRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    };

    // Preload after initial render
    const timeoutId = setTimeout(preloadCriticalRoutes, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  /**
   * Ensure consistent focus management for accessibility
   */
  useEffect(() => {
    // Skip to main content on route change for screen readers
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      // Remove focus outline for mouse users
      mainContent.style.outline = 'none';

      // Restore focus outline for keyboard users
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          mainContent.style.outline = '';
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [location.pathname]);

  return <>{children}</>;
};

export default NavigationConsistency;
