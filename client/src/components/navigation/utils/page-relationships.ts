import type { NavigationItem, UserRole, RelatedPage } from '@client/types';
import { findNavigationItemByPath } from './navigation-utils';
import { validateNavigationPath, validateUserRole, validateRelatedPage } from '../validation';
import { NavigationValidationError } from '../errors';

// Define page relationships based on the configuration
const PAGE_RELATIONSHIPS: Record<string, Record<string, { type: 'parent' | 'child' | 'sibling' | 'related'; weight: number; context: string }>> = {
  '/': {
    '/bills': { type: 'child', weight: 10, context: 'View all bills' },
    '/bill-sponsorship-analysis': { type: 'related', weight: 8, context: 'Analyze bill sponsorship patterns' },
    '/search': { type: 'related', weight: 6, context: 'Search legislative content' }
  },
  '/bills': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/bill-sponsorship-analysis': { type: 'sibling', weight: 9, context: 'Analyze bill data' },
    '/search': { type: 'related', weight: 7, context: 'Search bills' }
  },
  '/bill-sponsorship-analysis': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/bills': { type: 'sibling', weight: 9, context: 'View bill details' },
    '/search': { type: 'related', weight: 6, context: 'Search analysis data' }
  },
  '/community': {
    '/expert-verification': { type: 'sibling', weight: 8, context: 'Expert verification process' },
    '/': { type: 'parent', weight: 6, context: 'Return to home' }
  },
  '/expert-verification': {
    '/community': { type: 'sibling', weight: 9, context: 'Community input' },
    '/': { type: 'parent', weight: 7, context: 'Return to home' }
  },
  '/dashboard': {
    '/account': { type: 'sibling', weight: 9, context: 'Manage profile settings' },
    '/': { type: 'parent', weight: 8, context: 'Return to home' }
  },
  '/account': {
    '/dashboard': { type: 'sibling', weight: 9, context: 'View dashboard' },
    '/': { type: 'parent', weight: 8, context: 'Return to home' }
  },
  '/admin': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/dashboard': { type: 'related', weight: 5, context: 'User dashboard' }
  }
};

/**
 * Calculates relevance score for a page relationship
 */
export const calculateRelevanceScore = (
  relationship: { type: string; weight: number; context: string },
  user_role: UserRole,
  preferences: any,
  user: any | null,
  allowedRoles?: UserRole[]
): number => {
  try {
    // Validate user role
    validateUserRole(user_role);

    let score = relationship.weight;

    // Role-based adjustments
    if (allowedRoles && !allowedRoles.includes(user_role)) {
      score *= 0.3; // Significantly reduce score for inaccessible pages
    }

    // User preference adjustments
    if (preferences?.favoritePages?.includes(relationship.context)) {
      score *= 1.5; // Boost favorite pages
    }

    // Recency adjustments
    const lastVisited = preferences?.recentlyVisited?.find((p: any) => p.path === relationship.context);
    if (lastVisited) {
      const daysSinceVisited = (Date.now() - lastVisited.visitedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceVisited < 7) {
        score *= 1.2; // Boost recently visited pages
      }
    }

    // Visit frequency adjustments
    if (lastVisited && lastVisited.visitCount > 5) {
      score *= 1.1; // Slightly boost frequently visited pages
    }

    return Math.min(Math.max(score, 0), 10); // Clamp between 0 and 10
  } catch (error) {
    // If validation fails, return minimum score
    console.warn('Error calculating relevance score:', error);
    return 0;
  }
};

/**
 * Gets page relationships for a given path
 */
export const getPageRelationships = (
  currentPath: string,
  user_role: UserRole,
  user: any | null,
  preferences: any
): RelatedPage[] => {
  try {
    // Validate inputs
    validateNavigationPath(currentPath);
    validateUserRole(user_role);

    const relationships = PAGE_RELATIONSHIPS[currentPath] || [];

    const validPages: RelatedPage[] = [];

    for (const [path, rel] of Object.entries(relationships)) {
      try {
        const navItem = findNavigationItemByPath(path);
        const relatedPage: RelatedPage = {
          pageId: path,
          title: navItem?.label || path,
          path,
          description: navItem?.description || '',
          category: navItem?.section || 'tools',
          type: rel.type as 'parent' | 'child' | 'sibling' | 'related',
          weight: rel.weight,
          context: rel.context,
          relevanceScore: calculateRelevanceScore(rel, user_role, preferences, user, navItem?.allowedRoles)
        };

        // Validate the created related page
        validateRelatedPage(relatedPage);
        validPages.push(relatedPage);
      } catch (error) {
        // If validation fails for this page, skip it
        console.warn(`Skipping invalid related page ${path}:`, error);
      }
    }

    return validPages.sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (error) {
    // If main validation fails, return empty array
    console.warn('Error getting page relationships:', error);
    return [];
  }
};

/**
 * Generates breadcrumb relationships for a path
 */
export const generateBreadcrumbRelationships = (
  currentPath: string,
  user_role: UserRole,
  user: any | null
): RelatedPage[] => {
  try {
    // Validate inputs
    validateNavigationPath(currentPath);
    validateUserRole(user_role);

    const breadcrumbs: RelatedPage[] = [];
    const pathSegments = currentPath.split('/').filter(Boolean);

    // Always start with home
    const homePage: RelatedPage = {
      pageId: '/',
      title: 'Home',
      path: '/',
      description: 'Return to home page',
      category: 'legislative',
      type: 'parent',
      weight: 10,
      context: 'Return to home',
      relevanceScore: 10
    };

    try {
      validateRelatedPage(homePage);
      breadcrumbs.push(homePage);
    } catch (error) {
      console.warn('Home breadcrumb validation failed:', error);
    }

    // Build breadcrumb path
    let currentPathBuilder = '';
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      if (!segment) continue;
      
      currentPathBuilder += `/${segment}`;

      // Skip if this is a parameter
      if (segment.startsWith(':') || /^\d+$/.test(segment)) {
        continue;
      }

      try {
        const navItem = findNavigationItemByPath(currentPathBuilder);
        if (navItem && currentPathBuilder !== currentPath) {
          const breadcrumbPage: RelatedPage = {
            pageId: currentPathBuilder,
            title: navItem.label,
            path: currentPathBuilder,
            description: navItem.description || '',
            category: navItem.section,
            type: 'parent',
            weight: 8,
            context: `Return to ${navItem.label}`,
            relevanceScore: 8
          };

          validateRelatedPage(breadcrumbPage);
          breadcrumbs.push(breadcrumbPage);
        }
      } catch (error) {
        // Skip invalid breadcrumb pages
        console.warn(`Skipping invalid breadcrumb for ${currentPathBuilder}:`, error);
      }
    }

    return breadcrumbs;
  } catch (error) {
    // If main validation fails, return empty array
    console.warn('Error generating breadcrumb relationships:', error);
    return [];
  }
};

