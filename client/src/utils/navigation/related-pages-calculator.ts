import { RelatedPage, UserRole, PageRelationship } from '@/types/navigation';

// Page relationship mapping
const pageRelationships: Record<string, PageRelationship> = {
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
      '/admin/database': { type: 'child', weight: 1.0, context: 'database-management' },
      '/dashboard': { type: 'related', weight: 0.6, context: 'user-dashboard' },
    },
  },
};

// Page metadata for generating related page information
const pageMetadata: Record<string, { title: string; description: string; category: RelatedPage['category'] }> = {
  '/': {
    title: 'Home',
    description: 'Main dashboard and platform overview',
    category: 'legislative',
  },
  '/bills': {
    title: 'Bills Dashboard',
    description: 'Browse and search legislative bills',
    category: 'legislative',
  },
  '/bills/:id': {
    title: 'Bill Details',
    description: 'Detailed information about a specific bill',
    category: 'legislative',
  },
  '/bills/:id/analysis': {
    title: 'Bill Analysis',
    description: 'In-depth analysis and impact assessment',
    category: 'legislative',
  },
  '/bills/:id/comments': {
    title: 'Bill Comments',
    description: 'Community discussion and comments',
    category: 'community',
  },
  '/bills/:id/sponsorship-analysis': {
    title: 'Sponsorship Analysis',
    description: 'Analysis of bill sponsors and financial connections',
    category: 'legislative',
  },
  '/bills/:id/sponsorship-analysis/overview': {
    title: 'Sponsorship Overview',
    description: 'Overview of sponsorship patterns and relationships',
    category: 'legislative',
  },
  '/bills/:id/sponsorship-analysis/primary-sponsor': {
    title: 'Primary Sponsor Analysis',
    description: 'Detailed analysis of the primary bill sponsor',
    category: 'legislative',
  },
  '/bills/:id/sponsorship-analysis/co-sponsors': {
    title: 'Co-Sponsors Analysis',
    description: 'Analysis of co-sponsors and their relationships',
    category: 'legislative',
  },
  '/bills/:id/sponsorship-analysis/financial-network': {
    title: 'Financial Network Analysis',
    description: 'Financial connections and influence mapping',
    category: 'legislative',
  },
  '/bill-sponsorship-analysis': {
    title: 'Bill Sponsorship Analysis',
    description: 'Comprehensive sponsorship analysis tools',
    category: 'legislative',
  },
  '/community': {
    title: 'Community Input',
    description: 'Community feedback and engagement platform',
    category: 'community',
  },
  '/expert-verification': {
    title: 'Expert Verification',
    description: 'Expert analysis and verification of legislative content',
    category: 'community',
  },
  '/dashboard': {
    title: 'User Dashboard',
    description: 'Personal dashboard and account management',
    category: 'user',
  },
  '/profile': {
    title: 'Profile',
    description: 'User profile and settings',
    category: 'user',
  },
  '/user-profile': {
    title: 'User Profile',
    description: 'Detailed user profile management',
    category: 'user',
  },
  '/search': {
    title: 'Search',
    description: 'Search bills, sponsors, and legislative content',
    category: 'tools',
  },
  '/admin': {
    title: 'Admin Panel',
    description: 'Administrative tools and system management',
    category: 'admin',
  },
  '/admin/database': {
    title: 'Database Management',
    description: 'Database administration and monitoring',
    category: 'admin',
  },
};

/**
 * Normalizes a path by replacing dynamic segments with placeholders
 */
function normalizePath(path: string): string {
  return path.replace(/\/bills\/[^\/]+/g, '/bills/:id');
}

/**
 * Converts a normalized path back to actual path with dynamic values
 */
function denormalizePath(normalizedPath: string, currentPath: string): string {
  const billIdMatch = currentPath.match(/\/bills\/([^\/]+)/);
  if (billIdMatch && normalizedPath.includes(':id')) {
    return normalizedPath.replace(':id', billIdMatch[1]);
  }
  return normalizedPath;
}

/**
 * Filters related pages based on user role
 */
function filterPagesByRole(pages: RelatedPage[], userRole: UserRole): RelatedPage[] {
  return pages.filter(page => {
    // Admin pages only for admin users
    if (page.category === 'admin' && userRole !== 'admin') {
      return false;
    }
    
    // User pages only for authenticated users
    if (page.category === 'user' && userRole === 'public') {
      return false;
    }
    
    return true;
  });
}

/**
 * Calculates related pages for a given path and user role
 */
export function calculateRelatedPages(currentPath: string, userRole: UserRole): RelatedPage[] {
  const normalizedPath = normalizePath(currentPath);
  const relationship = pageRelationships[normalizedPath];
  
  if (!relationship) {
    return [];
  }
  
  const relatedPages: RelatedPage[] = [];
  
  // Convert relationship data to RelatedPage objects
  Object.entries(relationship.relatedPages).forEach(([path, relation]) => {
    const actualPath = denormalizePath(path, currentPath);
    const metadata = pageMetadata[path];
    
    if (metadata) {
      let title = metadata.title;
      let description = metadata.description;
      
      // Replace placeholders in title and description
      const billIdMatch = currentPath.match(/\/bills\/([^\/]+)/);
      if (billIdMatch && path.includes(':id')) {
        const billId = billIdMatch[1];
        title = title.replace(':id', `Bill ${billId}`);
        description = description.replace(':id', `Bill ${billId}`);
      }
      
      relatedPages.push({
        title,
        path: actualPath,
        description,
        relevanceScore: relation.weight,
        category: metadata.category,
      });
    }
  });
  
  // Sort by relevance score (highest first)
  relatedPages.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Filter by user role
  const filteredPages = filterPagesByRole(relatedPages, userRole);
  
  // Return top 5 most relevant pages
  return filteredPages.slice(0, 5);
}

/**
 * Gets contextual suggestions based on current page and user behavior
 */
export function getContextualSuggestions(
  currentPath: string, 
  userRole: UserRole, 
  recentPages: string[] = []
): RelatedPage[] {
  const baseRelated = calculateRelatedPages(currentPath, userRole);
  
  // Add boost for recently visited pages
  const boostedPages = baseRelated.map(page => {
    const recentBoost = recentPages.includes(page.path) ? 0.1 : 0;
    return {
      ...page,
      relevanceScore: Math.min(1.0, page.relevanceScore + recentBoost),
    };
  });
  
  // Re-sort after boosting
  boostedPages.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return boostedPages;
}