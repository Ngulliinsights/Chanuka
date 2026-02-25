import { useAuth } from '@client/infrastructure/auth';
import { NavigationValidationError } from '@client/infrastructure/error';
import { useUnifiedNavigation } from '@client/infrastructure/navigation/hooks/use-unified-navigation';
import { getRecoverySuggestions } from '../recovery';
import {
  validateNavigationPath,
  validateUserRole,
  validateUseRelatedPagesOptions,
} from '../validation';
import type { RelatedPage, UserRole } from '@client/lib/types';

import { getPageRelationships, generateBreadcrumbRelationships } from '../utils/page-relationships';

export interface UseRelatedPagesResult {
  relatedPages: RelatedPage[];
  totalCount: number;
  hasMore: boolean;
  error?: NavigationValidationError;
  recoverySuggestions?: string[];
}

export interface UseRelatedPagesOptions {
  maxResults?: number;
  includeBreadcrumbs?: boolean;
  filterByRole?: boolean;
}

/**
 * Hook for getting related pages based on current location
 */
export const useRelatedPages = (
  currentPath: string,
  options: UseRelatedPagesOptions = {}
): UseRelatedPagesResult => {
  try {
    // Validate inputs
    validateNavigationPath(currentPath);
    validateUseRelatedPagesOptions(options);

    const { user } = useAuth();
    const { userRole, preferences } = useUnifiedNavigation();

    const { maxResults = 5, includeBreadcrumbs = false, filterByRole = true } = options;

    // Use the userRole directly since it's already a UserRole enum
    // Get relationships for current path
    let relatedPages = getPageRelationships(currentPath, userRole, user, preferences);

    // Filter by role access if requested
    if (filterByRole) {
      relatedPages = relatedPages.filter(_page => {
        // For now, assume all pages in relationships are accessible
        // In a full implementation, this would check against navigation items
        return true;
      });
    }

    // Sort by relevance score (already done in getPageRelationships)
    // relatedPages.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit results
    const limitedPages = relatedPages.slice(0, maxResults);

    // Add breadcrumb relationships if requested
    if (includeBreadcrumbs) {
      const breadcrumbPages = generateBreadcrumbRelationships(currentPath, navUserRole, user);
      limitedPages.push(...breadcrumbPages);
    }

    return {
      relatedPages: limitedPages,
      totalCount: relatedPages.length,
      hasMore: relatedPages.length > maxResults,
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof NavigationValidationError) {
      const suggestions = getRecoverySuggestions(error);
      return {
        relatedPages: [],
        totalCount: 0,
        hasMore: false,
        error,
        recoverySuggestions: suggestions,
      };
    }

    // Handle other errors
    console.error('Error in useRelatedPages:', error);
    return {
      relatedPages: [],
      totalCount: 0,
      hasMore: false,
      error: error instanceof NavigationValidationError ? error : undefined,
    };
  }
};
