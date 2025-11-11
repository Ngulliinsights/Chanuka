import { PageRelationshipService } from '../../services/PageRelationshipService';
import { RelatedPage, UserRole } from '../../core/navigation/types';
import { logger } from '../logger';

/**
 * Utility functions for working with page relationships
 */
export class PageRelationshipUtils {
  private static service = PageRelationshipService.getInstance();

  /**
   * Get smart navigation suggestions for a page
   */
  static getSmartSuggestions(
    currentPage: string,
    user_role?: UserRole,
    visitHistory: string[] = [],
    recentPages: string[] = []
  ): RelatedPage[] {
    // Update user behavior based on visit history
    if (visitHistory.length > 1) {
      this.service.updateUserBehaviorWeights(visitHistory);
    }

    // Get personalized suggestions
    return this.service.getPersonalizedSuggestions(currentPage, user_role, recentPages);
  }

  /**
   * Calculate navigation efficiency between pages
   */
  static calculateNavigationEfficiency(fromPage: string, toPage: string): {
    strength: number;
    path: string[];
    efficiency: 'direct' | 'indirect' | 'poor';
  } {
    const strength = this.service.calculateRelationshipStrength(fromPage, toPage);
    const path = this.service.findShortestPath(fromPage, toPage);
    
    let efficiency: 'direct' | 'indirect' | 'poor';
    if (path.length <= 2) {
      efficiency = 'direct';
    } else if (path.length <= 4) {
      efficiency = 'indirect';
    } else {
      efficiency = 'poor';
    }

    return { strength, path, efficiency };
  }

  /**
   * Get contextual breadcrumbs with relationship context
   */
  static getContextualBreadcrumbs(pageId: string): Array<{
    label: string;
    path: string;
    is_active: boolean;
    relationshipContext?: string;
  }> {
    const breadcrumbs = this.service.generateBreadcrumbs(pageId);
    
    return breadcrumbs.map((breadcrumb, index) => {
      if (index === 0) return breadcrumb;
      
      const previousPage = breadcrumbs[index - 1]?.path;
      const currentPage = breadcrumb.path;
      
      if (previousPage && currentPage) {
        const relatedPages = this.service.getRelatedPages(previousPage);
        const relationship = relatedPages.find(page => page.pageId === currentPage);
        
        return {
          ...breadcrumb,
          relationshipContext: relationship?.context,
        };
      }
      
      return breadcrumb;
    });
  }

  /**
   * Analyze page relationship network
   */
  static analyzePageNetwork(): {
    stats: ReturnType<typeof PageRelationshipService.prototype.getRelationshipStats>;
    recommendations: string[];
  } {
    const stats = this.service.getRelationshipStats();
    const recommendations: string[] = [];

    // Analyze and provide recommendations
    if (stats.averageRelationshipsPerPage < 3) {
      recommendations.push('Consider adding more page relationships to improve navigation');
    }

    if (stats.categoryCounts.admin && stats.categoryCounts.admin > stats.totalPages * 0.3) {
      recommendations.push('High proportion of admin pages - consider role-based filtering');
    }

    if (stats.totalRelationships < stats.totalPages * 2) {
      recommendations.push('Low relationship density - pages may be isolated');
    }

    return { stats, recommendations };
  }

  /**
   * Get category-based navigation menu
   */
  static getCategoryNavigation(user_role?: UserRole): Record<string, RelatedPage[]> {
    const categories = ['legislative', 'community', 'tools', 'user', 'admin'] as const;
    const navigation: Record<string, RelatedPage[]> = {};

    categories.forEach(category => {
      const pages = this.service.getPagesByCategory(category, user_role);
      if (pages.length > 0) {
        navigation[category] = pages;
      }
    });

    return navigation;
  }

  /**
   * Find alternative navigation paths
   */
  static findAlternativePaths(
    startPage: string,
    targetPage: string,
    maxPaths: number = 3
  ): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    
    const findPaths = (current: string, target: string, currentPath: string[], depth: number) => {
      if (depth > 4 || paths.length >= maxPaths) return;
      if (current === target) {
        paths.push([...currentPath, current]);
        return;
      }
      
      if (visited.has(current)) return;
      visited.add(current);
      
      const relatedPages = this.service.getRelatedPages(current);
      relatedPages.forEach(page => {
        if (!currentPath.includes(page.pageId)) {
          findPaths(page.pageId, target, [...currentPath, current], depth + 1);
        }
      });
      
      visited.delete(current);
    };

    findPaths(startPage, targetPage, [], 0);
    return paths;
  }

  /**
   * Get page relationship insights
   */
  static getPageInsights(pageId: string): {
    metadata: ReturnType<typeof PageRelationshipService.prototype.getPageMetadata>;
    relatedPages: RelatedPage[];
    childPages: RelatedPage[];
    parentChain: string[];
    accessibility: {
      requiresAuth: boolean;
      restrictedRoles: UserRole[];
    };
  } {
    const metadata = this.service.getPageMetadata(pageId);
    const relatedPages = this.service.getRelatedPages(pageId);
    const childPages = this.service.getChildPages(pageId);
    const breadcrumbs = this.service.generateBreadcrumbs(pageId);
    const parentChain = breadcrumbs.map(b => b.path);

    // Determine accessibility requirements
    const requiresAuth = pageId.startsWith('/dashboard') || pageId.startsWith('/profile');
    const restrictedRoles: UserRole[] = pageId.startsWith('/admin') ? ['admin'] : [];

    return {
      metadata,
      relatedPages,
      childPages,
      parentChain,
      accessibility: {
        requiresAuth,
        restrictedRoles,
      },
    };
  }

  /**
   * Reset user behavior tracking
   */
  static resetUserBehavior(): void {
    this.service.clearUserBehaviorWeights();
  }
}












































