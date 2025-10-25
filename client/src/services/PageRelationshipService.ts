import { RelatedPage, PageRelationship, UserRole } from '../types/navigation';
import { logger } from '@shared/core';

/**
 * Configuration for page relationships
 * Extracted for easier testing and maintenance
 */
interface PageConfig {
  relationships: Record<string, PageRelationship>;
  metadata: Record<string, PageMetadata>;
}

interface PageMetadata {
  title: string;
  description: string;
  category: 'legislative' | 'community' | 'user' | 'admin' | 'tools';
}

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
}

interface RelationshipStats {
  totalPages: number;
  totalRelationships: number;
  averageRelationshipsPerPage: number;
  categoryCounts: Record<string, number>;
}

/**
 * Service for managing page relationships and calculating contextual navigation suggestions
 * Optimized for performance and maintainability
 */
export class PageRelationshipService {
  private static instance: PageRelationshipService;
  
  // Core data structures optimized for lookup performance
  private relationships: Map<string, PageRelationship>;
  private pageMetadata: Map<string, PageMetadata>;
  
  // User behavior tracking with decay mechanism
  private userBehaviorWeights: Map<string, number>;
  private behaviorWeightDecay = 0.95; // Decay factor for older patterns
  private maxBehaviorWeight = 1.0; // Cap on behavior weight contribution
  
  // Cache for frequently accessed computations
  private breadcrumbCache: Map<string, BreadcrumbItem[]>;
  private parentChainCache: Map<string, string[]>;
  
  // Configuration constants
  private readonly DEFAULT_MAX_SUGGESTIONS = 5;
  private readonly DEFAULT_MAX_PATH_DEPTH = 3;
  private readonly RECENT_PAGE_BOOST = 1.1;
  private readonly VISIT_HISTORY_BOOST = 1.2;
  private readonly BIDIRECTIONAL_BONUS = 1.2;
  private readonly MAX_RELATIONSHIP_STRENGTH = 2.0;

  private constructor() {
    this.relationships = new Map();
    this.pageMetadata = new Map();
    this.userBehaviorWeights = new Map();
    this.breadcrumbCache = new Map();
    this.parentChainCache = new Map();
    
    this.initializeFromConfig(this.getDefaultConfig());
  }

  public static getInstance(): PageRelationshipService {
    if (!PageRelationshipService.instance) {
      PageRelationshipService.instance = new PageRelationshipService();
    }
    return PageRelationshipService.instance;
  }

  /**
   * Initialize service from configuration object
   * This allows for easier testing and external configuration
   */
  private initializeFromConfig(config: PageConfig): void {
    // Store relationships
    Object.entries(config.relationships).forEach(([pageId, relationship]) => {
      this.relationships.set(pageId, relationship);
    });

    // Store metadata
    Object.entries(config.metadata).forEach(([pageId, meta]) => {
      this.pageMetadata.set(pageId, meta);
    });
  }

  /**
   * Get default configuration
   * Separated for easier modification and testing
   */
  private getDefaultConfig(): PageConfig {
    return {
      relationships: {
        '/': {
          pageId: '/',
          relatedPages: {
            '/bills': { type: 'child', weight: 1.0, context: 'legislative-data' },
            '/community': { type: 'child', weight: 0.9, context: 'community-engagement' },
            '/expert-verification': { type: 'child', weight: 0.8, context: 'expert-analysis' },
            '/search': { type: 'child', weight: 0.7, context: 'discovery' },
          },
        },
        '/bills': {
          pageId: '/bills',
          relatedPages: {
            '/': { type: 'parent', weight: 0.8, context: 'navigation' },
            '/bill-sponsorship-analysis': { type: 'sibling', weight: 0.9, context: 'analysis' },
            '/community': { type: 'related', weight: 0.7, context: 'discussion' },
            '/search': { type: 'related', weight: 0.6, context: 'discovery' },
          },
        },
        '/bills/:id': {
          pageId: '/bills/:id',
          relatedPages: {
            '/bills': { type: 'parent', weight: 0.8, context: 'listing' },
            '/bills/:id/analysis': { type: 'child', weight: 1.0, context: 'analysis' },
            '/bills/:id/comments': { type: 'child', weight: 0.9, context: 'discussion' },
            '/bills/:id/sponsorship-analysis': { type: 'child', weight: 0.9, context: 'sponsorship' },
            '/community': { type: 'related', weight: 0.6, context: 'community-input' },
            '/expert-verification': { type: 'related', weight: 0.5, context: 'verification' },
          },
        },
        '/bills/:id/analysis': {
          pageId: '/bills/:id/analysis',
          relatedPages: {
            '/bills/:id': { type: 'parent', weight: 0.8, context: 'bill-details' },
            '/bills/:id/sponsorship-analysis': { type: 'sibling', weight: 0.9, context: 'sponsorship' },
            '/bills/:id/comments': { type: 'sibling', weight: 0.7, context: 'discussion' },
            '/expert-verification': { type: 'related', weight: 0.6, context: 'expert-input' },
          },
        },
        '/bills/:id/sponsorship-analysis': {
          pageId: '/bills/:id/sponsorship-analysis',
          relatedPages: {
            '/bills/:id': { type: 'parent', weight: 0.8, context: 'bill-details' },
            '/bills/:id/sponsorship-analysis/overview': { type: 'child', weight: 1.0, context: 'overview' },
            '/bills/:id/sponsorship-analysis/primary-sponsor': { type: 'child', weight: 0.9, context: 'primary-sponsor' },
            '/bills/:id/sponsorship-analysis/co-sponsors': { type: 'child', weight: 0.9, context: 'co-sponsors' },
            '/bills/:id/sponsorship-analysis/financial-network': { type: 'child', weight: 0.8, context: 'financial-analysis' },
            '/bills/:id/analysis': { type: 'sibling', weight: 0.7, context: 'bill-analysis' },
          },
        },
        '/community': {
          pageId: '/community',
          relatedPages: {
            '/': { type: 'parent', weight: 0.8, context: 'navigation' },
            '/expert-verification': { type: 'sibling', weight: 0.9, context: 'verification' },
            '/bills': { type: 'related', weight: 0.7, context: 'legislative-data' },
            '/search': { type: 'related', weight: 0.6, context: 'discovery' },
          },
        },
        '/expert-verification': {
          pageId: '/expert-verification',
          relatedPages: {
            '/': { type: 'parent', weight: 0.8, context: 'navigation' },
            '/community': { type: 'sibling', weight: 0.9, context: 'community-input' },
            '/bills': { type: 'related', weight: 0.7, context: 'legislative-data' },
          },
        },
        '/dashboard': {
          pageId: '/dashboard',
          relatedPages: {
            '/profile': { type: 'child', weight: 0.9, context: 'user-management' },
            '/user-profile': { type: 'child', weight: 0.8, context: 'profile-settings' },
            '/bills': { type: 'related', weight: 0.7, context: 'bill-tracking' },
            '/': { type: 'related', weight: 0.6, context: 'navigation' },
          },
        },
        '/admin': {
          pageId: '/admin',
          relatedPages: {
            '/admin/database': { type: 'child', weight: 1.0, context: 'database' },
            '/': { type: 'related', weight: 0.4, context: 'navigation' },
          },
        },
      },
      metadata: {
        '/': { title: 'Home', description: 'Legislative Transparency Platform', category: 'tools' },
        '/bills': { title: 'Bills Dashboard', description: 'Browse and track legislative bills', category: 'legislative' },
        '/bills/:id': { title: 'Bill Details', description: 'Detailed bill information', category: 'legislative' },
        '/bills/:id/analysis': { title: 'Bill Analysis', description: 'In-depth bill analysis', category: 'tools' },
        '/bills/:id/sponsorship-analysis': { title: 'Sponsorship Analysis', description: 'Bill sponsorship analysis', category: 'tools' },
        '/community': { title: 'Community Input', description: 'Community engagement and feedback', category: 'community' },
        '/expert-verification': { title: 'Expert Verification', description: 'Expert analysis and verification', category: 'tools' },
        '/dashboard': { title: 'Dashboard', description: 'User dashboard and tracking', category: 'user' },
        '/admin': { title: 'Admin Panel', description: 'Administrative functions', category: 'admin' },
        '/admin/database': { title: 'Database Manager', description: 'Database administration', category: 'admin' },
      },
    };
  }

  /**
   * Get related pages with role-based filtering
   * Optimized to avoid unnecessary object creation
   */
  public getRelatedPages(pageId: string, userRole?: UserRole): RelatedPage[] {
    const relationship = this.relationships.get(pageId);
    if (!relationship) {
      return [];
    }

    const relatedPages: RelatedPage[] = [];
    
    // Pre-filter and map in a single pass
    for (const [relatedPageId, relation] of Object.entries(relationship.relatedPages)) {
      // Skip inaccessible pages early
      if (!this.isPageAccessible(relatedPageId, userRole)) {
        continue;
      }

      const metadata = this.pageMetadata.get(relatedPageId);
      if (metadata) {
        relatedPages.push({
          pageId: relatedPageId,
          path: relatedPageId,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          type: relation.type,
          weight: relation.weight,
          relevanceScore: relation.weight,
          context: relation.context,
        });
      }
    }

    // Sort by weight descending
    relatedPages.sort((a, b) => b.weight - a.weight);
    
    return relatedPages;
  }

  /**
   * Check page accessibility with optimized admin check
   */
  private isPageAccessible(pageId: string, userRole?: UserRole): boolean {
    // Fast path: admin pages require admin role
    return !pageId.startsWith('/admin') || userRole === 'admin';
  }

  /**
   * Get page metadata with null safety
   */
  public getPageMetadata(pageId: string): PageMetadata | undefined {
    return this.pageMetadata.get(pageId);
  }

  /**
   * Add or update page relationship
   * Invalidates relevant caches
   */
  public updateRelationship(pageId: string, relationship: PageRelationship): void {
    this.relationships.set(pageId, relationship);
    
    // Invalidate caches that depend on this relationship
    this.invalidateCachesForPage(pageId);
  }

  /**
   * Update page metadata
   * Allows for dynamic metadata updates
   */
  public updatePageMetadata(pageId: string, metadata: PageMetadata): void {
    this.pageMetadata.set(pageId, metadata);
    
    // Invalidate breadcrumb cache as titles may have changed
    this.breadcrumbCache.clear();
  }

  /**
   * Invalidate caches related to a specific page
   */
  private invalidateCachesForPage(pageId: string): void {
    this.breadcrumbCache.delete(pageId);
    this.parentChainCache.delete(pageId);
    
    // Also invalidate caches for pages that might reference this page
    for (const cachedPageId of this.parentChainCache.keys()) {
      const chain = this.parentChainCache.get(cachedPageId);
      if (chain?.includes(pageId)) {
        this.parentChainCache.delete(cachedPageId);
        this.breadcrumbCache.delete(cachedPageId);
      }
    }
  }

  /**
   * Get contextual suggestions with optimized weight calculations
   */
  public getContextualSuggestions(
    currentPage: string,
    visitHistory: string[],
    userRole?: UserRole,
    maxSuggestions: number = this.DEFAULT_MAX_SUGGESTIONS
  ): RelatedPage[] {
    const relatedPages = this.getRelatedPages(currentPage, userRole);
    
    // Convert visit history to Set for O(1) lookup
    const visitSet = new Set(visitHistory);
    
    // Apply boosts in a single pass
    const boostedPages = relatedPages.map(page => ({
      ...page,
      weight: visitSet.has(page.pageId)
        ? page.weight * this.VISIT_HISTORY_BOOST
        : page.weight,
    }));

    // Sort and slice in one operation
    return boostedPages
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxSuggestions);
  }

  /**
   * Calculate bidirectional relationship strength
   * Optimized with early returns
   */
  public calculateRelationshipStrength(pageA: string, pageB: string): number {
    const relationshipA = this.relationships.get(pageA);
    const relationshipB = this.relationships.get(pageB);
    
    const weightAtoB = relationshipA?.relatedPages[pageB]?.weight ?? 0;
    const weightBtoA = relationshipB?.relatedPages[pageA]?.weight ?? 0;
    
    // Early return if no relationship exists
    if (weightAtoB === 0 && weightBtoA === 0) {
      return 0;
    }
    
    let strength = weightAtoB + weightBtoA;
    
    // Apply bidirectional bonus only if both directions exist
    if (weightAtoB > 0 && weightBtoA > 0) {
      strength *= this.BIDIRECTIONAL_BONUS;
    }
    
    return Math.min(strength, this.MAX_RELATIONSHIP_STRENGTH);
  }

  /**
   * Find shortest path using BFS
   * Optimized with early termination and visited set
   */
  public findShortestPath(
    startPage: string,
    targetPage: string,
    maxDepth: number = this.DEFAULT_MAX_PATH_DEPTH
  ): string[] {
    if (startPage === targetPage) {
      return [startPage];
    }
    
    const visited = new Set<string>([startPage]);
    const queue: Array<{ page: string; path: string[] }> = [
      { page: startPage, path: [startPage] }
    ];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Depth limit check
      if (current.path.length > maxDepth) {
        continue;
      }
      
      const relationship = this.relationships.get(current.page);
      if (!relationship) {
        continue;
      }
      
      // Check all related pages
      for (const relatedPageId of Object.keys(relationship.relatedPages)) {
        // Found target - return immediately
        if (relatedPageId === targetPage) {
          return [...current.path, relatedPageId];
        }
        
        // Add unvisited pages to queue
        if (!visited.has(relatedPageId)) {
          visited.add(relatedPageId);
          queue.push({
            page: relatedPageId,
            path: [...current.path, relatedPageId],
          });
        }
      }
    }
    
    return []; // No path found within depth limit
  }

  /**
   * Get pages by category with efficient filtering
   */
  public getPagesByCategory(
    category: RelatedPage['category'],
    userRole?: UserRole
  ): RelatedPage[] {
    const pages: RelatedPage[] = [];
    
    for (const [pageId, metadata] of this.pageMetadata.entries()) {
      if (metadata.category === category && this.isPageAccessible(pageId, userRole)) {
        pages.push({
          pageId,
          path: pageId,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          type: 'related',
          weight: 1.0,
          relevanceScore: 1.0,
          context: 'category-browse',
        });
      }
    }
    
    // Sort alphabetically by title
    pages.sort((a, b) => a.title.localeCompare(b.title));
    
    return pages;
  }

  /**
   * Update user behavior weights with decay mechanism
   * This prevents old patterns from dominating
   */
  public updateUserBehaviorWeights(navigationPath: string[]): void {
    // Apply decay to existing weights
    this.applyBehaviorWeightDecay();
    
    // Update weights for new navigation pattern
    for (let i = 0; i < navigationPath.length - 1; i++) {
      const key = `${navigationPath[i]}->${navigationPath[i + 1]}`;
      const currentWeight = this.userBehaviorWeights.get(key) ?? 0;
      
      // Cap the weight to prevent infinite growth
      const newWeight = Math.min(
        currentWeight + 0.1,
        this.maxBehaviorWeight
      );
      
      this.userBehaviorWeights.set(key, newWeight);
    }
  }

  /**
   * Apply decay to behavior weights to prioritize recent patterns
   */
  private applyBehaviorWeightDecay(): void {
    for (const [key, weight] of this.userBehaviorWeights.entries()) {
      const decayedWeight = weight * this.behaviorWeightDecay;
      
      // Remove weights that have decayed below threshold
      if (decayedWeight < 0.01) {
        this.userBehaviorWeights.delete(key);
      } else {
        this.userBehaviorWeights.set(key, decayedWeight);
      }
    }
  }

  /**
   * Get personalized suggestions with combined scoring
   * Optimized to reduce redundant calculations
   */
  public getPersonalizedSuggestions(
    currentPage: string,
    userRole?: UserRole,
    recentPages: string[] = [],
    maxSuggestions: number = this.DEFAULT_MAX_SUGGESTIONS
  ): RelatedPage[] {
    const basePages = this.getRelatedPages(currentPage, userRole);
    const recentSet = new Set(recentPages);
    
    // Calculate final weights in single pass
    const scoredPages = basePages.map(page => {
      const behaviorKey = `${currentPage}->${page.pageId}`;
      const behaviorWeight = this.userBehaviorWeights.get(behaviorKey) ?? 0;
      const recentBoost = recentSet.has(page.pageId) ? this.RECENT_PAGE_BOOST : 1.0;

      return {
        ...page,
        weight: (page.weight + behaviorWeight) * recentBoost,
      };
    });
    
    // Sort and limit results
    return scoredPages
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxSuggestions);
  }

  /**
   * Generate breadcrumbs with caching
   */
  public generateBreadcrumbs(pageId: string): BreadcrumbItem[] {
    // Check cache first
    const cached = this.breadcrumbCache.get(pageId);
    if (cached) {
      return cached;
    }
    
    // Generate breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [];
    const parentChain = this.findParentChain(pageId);
    
    // Build breadcrumb items
    parentChain.forEach((parentPageId, index) => {
      const metadata = this.pageMetadata.get(parentPageId);
      if (metadata) {
        breadcrumbs.push({
          label: metadata.title,
          path: parentPageId,
          isActive: index === parentChain.length - 1,
        });
      }
    });
    
    // Cache the result
    this.breadcrumbCache.set(pageId, breadcrumbs);
    
    return breadcrumbs;
  }

  /**
   * Find parent chain with cycle detection and caching
   */
  private findParentChain(pageId: string): string[] {
    // Check cache first
    const cached = this.parentChainCache.get(pageId);
    if (cached) {
      return cached;
    }
    
    const chain: string[] = [];
    const visited = new Set<string>();
    let currentPage = pageId;
    
    // Traverse up the parent chain
    while (currentPage && !visited.has(currentPage)) {
      visited.add(currentPage);
      chain.unshift(currentPage);
      
      const relationship = this.relationships.get(currentPage);
      if (!relationship) {
        break;
      }
      
      // Find parent relationship
      const parentEntry = Object.entries(relationship.relatedPages)
        .find(([, relation]) => relation.type === 'parent');
      
      currentPage = parentEntry ? parentEntry[0] : '';
    }
    
    // Cache the result
    this.parentChainCache.set(pageId, chain);
    
    return chain;
  }

  /**
   * Get child pages efficiently
   */
  public getChildPages(parentPageId: string, userRole?: UserRole): RelatedPage[] {
    const childPages: RelatedPage[] = [];
    
    // Iterate through all relationships to find children
    for (const [pageId, relationship] of this.relationships.entries()) {
      // Check if this page has the target as a parent
      const parentRelation = relationship.relatedPages[parentPageId];
      
      if (parentRelation?.type === 'parent') {
        const metadata = this.pageMetadata.get(pageId);
        
        if (metadata && this.isPageAccessible(pageId, userRole)) {
          childPages.push({
            pageId,
            path: pageId,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            type: 'child',
            weight: parentRelation.weight,
            relevanceScore: parentRelation.weight,
            context: parentRelation.context,
          });
        }
      }
    }
    
    // Sort by weight descending
    childPages.sort((a, b) => b.weight - a.weight);
    
    return childPages;
  }

  /**
   * Clear all caches and behavior weights
   */
  public clearAllData(): void {
    this.userBehaviorWeights.clear();
    this.breadcrumbCache.clear();
    this.parentChainCache.clear();
  }

  /**
   * Clear only user behavior weights
   */
  public clearUserBehaviorWeights(): void {
    this.userBehaviorWeights.clear();
  }

  /**
   * Clear only cache data
   */
  public clearCaches(): void {
    this.breadcrumbCache.clear();
    this.parentChainCache.clear();
  }

  /**
   * Get comprehensive relationship statistics
   */
  public getRelationshipStats(): RelationshipStats {
    const totalPages = this.pageMetadata.size;
    let totalRelationships = 0;
    const categoryCounts: Record<string, number> = {};
    
    // Count relationships
    for (const relationship of this.relationships.values()) {
      totalRelationships += Object.keys(relationship.relatedPages).length;
    }
    
    // Count categories
    for (const metadata of this.pageMetadata.values()) {
      categoryCounts[metadata.category] = (categoryCounts[metadata.category] ?? 0) + 1;
    }
    
    return {
      totalPages,
      totalRelationships,
      averageRelationshipsPerPage: totalPages > 0 ? totalRelationships / totalPages : 0,
      categoryCounts,
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    breadcrumbCacheSize: number;
    parentChainCacheSize: number;
    behaviorWeightCount: number;
  } {
    return {
      breadcrumbCacheSize: this.breadcrumbCache.size,
      parentChainCacheSize: this.parentChainCache.size,
      behaviorWeightCount: this.userBehaviorWeights.size,
    };
  }

  /**
   * Export configuration for persistence or testing
   */
  public exportConfig(): PageConfig {
    const relationships: Record<string, PageRelationship> = {};
    const metadata: Record<string, PageMetadata> = {};
    
    this.relationships.forEach((rel, key) => {
      relationships[key] = rel;
    });
    
    this.pageMetadata.forEach((meta, key) => {
      metadata[key] = meta;
    });
    
    return { relationships, metadata };
  }

  /**
   * Import configuration (useful for testing or loading saved state)
   */
  public importConfig(config: PageConfig): void {
    this.clearAllData();
    this.relationships.clear();
    this.pageMetadata.clear();
    this.initializeFromConfig(config);
  }
}











































