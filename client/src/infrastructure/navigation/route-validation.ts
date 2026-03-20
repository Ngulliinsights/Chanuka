/**
 * Route Validation System - Core Navigation
 *
 * Validates route definitions and checks for orphaned pages and broken links
 */

export interface RouteDefinition {
  path: string;
  component: string;
  description: string;
  is_active: boolean;
  parentRoute?: string;
}

export const allRoutes: RouteDefinition[] = [
  // Main Routes
  { path: '/', component: 'HomePage', description: 'Home page', is_active: true },
  { path: '/dashboard', component: 'Dashboard', description: 'User dashboard', is_active: true },
  { path: '/bills', component: 'BillsDashboard', description: 'Bills listing', is_active: true },
  {
    path: '/bills/:id',
    component: 'BillDetail',
    description: 'Individual bill details',
    is_active: true,
  },
  {
    path: '/bills/:id/analysis',
    component: 'BillAnalysis',
    description: 'Bill analysis page',
    is_active: true,
  },
  {
    path: '/bills/:id/comments',
    component: 'CommentsPage',
    description: 'Bill comments page',
    is_active: true,
  },

  // Sponsorship Analysis Routes
  {
    path: '/bill-sponsorship-analysis',
    component: 'BillSponsorshipAnalysis',
    description: 'General sponsorship analysis',
    is_active: true,
  },
  {
    path: '/bills/:id/sponsorship-analysis',
    component: 'BillSponsorshipAnalysis',
    description: 'Bill-specific sponsorship analysis',
    is_active: true,
  },
  {
    path: '/bills/:id/sponsorship-analysis/overview',
    component: 'SponsorshipOverviewWrapper',
    description: 'Sponsorship overview',
    is_active: true,
    parentRoute: '/bills/:id/sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis/primary-sponsor',
    component: 'PrimarySponsorWrapper',
    description: 'Primary sponsor analysis',
    is_active: true,
    parentRoute: '/bills/:id/sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis/co-sponsors',
    component: 'CoSponsorsWrapper',
    description: 'Co-sponsors analysis',
    is_active: true,
    parentRoute: '/bills/:id/sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis/financial-network',
    component: 'FinancialNetworkWrapper',
    description: 'Financial network analysis',
    is_active: true,
    parentRoute: '/bills/:id/sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis/methodology',
    component: 'MethodologyWrapper',
    description: 'Analysis methodology',
    is_active: true,
    parentRoute: '/bills/:id/sponsorship-analysis',
  },

  // Community and Expert Routes
  {
    path: '/community',
    component: 'CommunityInput',
    description: 'Community input page',
    is_active: true,
  },
  {
    path: '/expert-verification',
    component: 'ExpertVerification',
    description: 'Expert verification page',
    is_active: true,
  },

  // User Management Routes
  { path: '/auth', component: 'AuthPage', description: 'Authentication page', is_active: true },
  { path: '/profile', component: 'Profile', description: 'User profile page', is_active: true },
  {
    path: '/user-profile',
    component: 'UserProfilePage',
    description: 'User profile details',
    is_active: true,
  },
  { path: '/onboarding', component: 'Onboarding', description: 'User onboarding', is_active: true },

  // Search and Admin Routes
  {
    path: '/search',
    component: 'SearchPage',
    description: 'Search functionality',
    is_active: true,
  },
  { path: '/admin', component: 'AdminPage', description: 'Admin dashboard', is_active: true },
  {
    path: '/admin/database',
    component: 'DatabaseManager',
    description: 'Database management',
    is_active: true,
    parentRoute: '/admin',
  },

  // Catch-all route
  { path: '*', component: 'NotFound', description: '404 Not Found page', is_active: true },
];

export const navigationLinks = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Bills', href: '/bills', icon: 'FileText' },
  { label: 'Dashboard', href: '/dashboard', icon: 'BarChart3' },
  { label: 'Community', href: '/community', icon: 'Users' },
  { label: 'Expert Verification', href: '/expert-verification', icon: 'Shield' },
];

/**
 * Validate route definitions for consistency and completeness
 */
export function validateRoutes(routes: RouteDefinition[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate paths
  const pathCounts = new Map<string, number>();
  routes.forEach(route => {
    const count = pathCounts.get(route.path) || 0;
    pathCounts.set(route.path, count + 1);
  });

  pathCounts.forEach((count, path) => {
    if (count > 1) {
      errors.push(`Duplicate route path: ${path}`);
    }
  });

  // Check for orphaned child routes
  routes.forEach(route => {
    if (route.parentRoute) {
      const parentExists = routes.some(r => r.path === route.parentRoute);
      if (!parentExists) {
        errors.push(
          `Orphaned child route: ${route.path} references non-existent parent ${route.parentRoute}`
        );
      }
    }
  });

  // Check for inactive routes
  const inactiveRoutes = routes.filter(route => !route.is_active);
  if (inactiveRoutes.length > 0) {
    warnings.push(`${inactiveRoutes.length} inactive routes found`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find broken navigation links
 */
export function findBrokenLinks(
  routes: RouteDefinition[],
  links: typeof navigationLinks
): string[] {
  const validPaths = new Set(routes.filter(r => r.is_active).map(r => r.path));
  const brokenLinks: string[] = [];

  links.forEach(link => {
    // Convert dynamic routes to check if pattern exists
    const matchesRoute = routes.some(route => {
      if (route.path.includes(':')) {
        // Simple pattern matching for dynamic routes
        const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(link.href);
      }
      return route.path === link.href && route.is_active;
    });

    if (!matchesRoute) {
      brokenLinks.push(`Navigation link "${link.label}" points to invalid route: ${link.href}`);
    }
  });

  return brokenLinks;
}

/**
 * Get route hierarchy for breadcrumb generation
 */
export function getRouteHierarchy(path: string, routes: RouteDefinition[]): RouteDefinition[] {
  const hierarchy: RouteDefinition[] = [];
  let currentRoute = routes.find(r => r.path === path);

  while (currentRoute) {
    hierarchy.unshift(currentRoute);
    if (currentRoute.parentRoute) {
      currentRoute = routes.find(r => r.path === currentRoute!.parentRoute);
    } else {
      break;
    }
  }

  return hierarchy;
}
