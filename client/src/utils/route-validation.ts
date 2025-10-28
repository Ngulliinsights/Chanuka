// Route validation utility to check for orphaned pages and broken links

export interface RouteDefinition {
  path: string;
  component: string;
  description: string;
  isActive: boolean;
  parentRoute?: string;
}

export const allRoutes: RouteDefinition[] = [
  // Main Routes
  { path: '/', component: 'HomePage', description: 'Home page', isActive: true },
  { path: '/dashboard', component: 'Dashboard', description: 'User dashboard', isActive: true },
  { path: '/bills', component: 'BillsDashboard', description: 'Bills listing', isActive: true },
  { path: '/bills/:id', component: 'BillDetail', description: 'Individual bill details', isActive: true },
  { path: '/bills/:id/analysis', component: 'BillAnalysis', description: 'Bill analysis page', isActive: true },
  { path: '/bills/:id/comments', component: 'CommentsPage', description: 'Bill comments page', isActive: true },
  
  // Sponsorship Analysis Routes
  { path: '/bill-sponsorship-analysis', component: 'BillSponsorshipAnalysis', description: 'General sponsorship analysis', isActive: true },
  { path: '/bills/:id/sponsorship-analysis', component: 'BillSponsorshipAnalysis', description: 'Bill-specific sponsorship analysis', isActive: true },
  { path: '/bills/:id/sponsorship-analysis/overview', component: 'SponsorshipOverviewWrapper', description: 'Sponsorship overview', isActive: true, parentRoute: '/bills/:id/sponsorship-analysis' },
  { path: '/bills/:id/sponsorship-analysis/primary-sponsor', component: 'PrimarySponsorWrapper', description: 'Primary sponsor analysis', isActive: true, parentRoute: '/bills/:id/sponsorship-analysis' },
  { path: '/bills/:id/sponsorship-analysis/co-sponsors', component: 'CoSponsorsWrapper', description: 'Co-sponsors analysis', isActive: true, parentRoute: '/bills/:id/sponsorship-analysis' },
  { path: '/bills/:id/sponsorship-analysis/financial-network', component: 'FinancialNetworkWrapper', description: 'Financial network analysis', isActive: true, parentRoute: '/bills/:id/sponsorship-analysis' },
  { path: '/bills/:id/sponsorship-analysis/methodology', component: 'MethodologyWrapper', description: 'Analysis methodology', isActive: true, parentRoute: '/bills/:id/sponsorship-analysis' },
  
  // Community and Expert Routes
  { path: '/community', component: 'CommunityInput', description: 'Community input page', isActive: true },
  { path: '/expert-verification', component: 'ExpertVerification', description: 'Expert verification page', isActive: true },
  
  // User Management Routes
  { path: '/auth', component: 'AuthPage', description: 'Authentication page', isActive: true },
  { path: '/profile', component: 'Profile', description: 'User profile page', isActive: true },
  { path: '/user-profile', component: 'UserProfilePage', description: 'User profile details', isActive: true },
  { path: '/onboarding', component: 'Onboarding', description: 'User onboarding', isActive: true },
  
  // Search and Admin Routes
  { path: '/search', component: 'SearchPage', description: 'Search functionality', isActive: true },
  { path: '/admin', component: 'AdminPage', description: 'Admin dashboard', isActive: true },
  { path: '/admin/database', component: 'DatabaseManager', description: 'Database management', isActive: true, parentRoute: '/admin' },
  
  // Catch-all route
  { path: '*', component: 'NotFound', description: '404 Not Found page', isActive: true }
];

export const navigationLinks = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Bills', href: '/bills', icon: 'FileText' },
  { label: 'Search', href: '/search', icon: 'Search' },
  { label: 'Dashboard', href: '/dashboard', icon: 'User' },
  { label: 'Community', href: '/community', icon: 'Users' },
  { label: 'Expert Verification', href: '/expert-verification', icon: 'Shield' },
  { label: 'Admin', href: '/admin', icon: 'Settings', adminOnly: true }
];

export function validateRoutes(): { 
  orphanedPages: string[], 
  brokenLinks: string[], 
  validRoutes: RouteDefinition[],
  summary: string 
} {
  const activeRoutes = allRoutes.filter(route => route.isActive);
  const routePaths = activeRoutes.map(route => route.path);
  
  // Check for potential orphaned pages (this would need to be expanded with actual file system checks)
  const orphanedPages: string[] = [];
  
  // Check for broken navigation links
  const brokenLinks: string[] = [];
  navigationLinks.forEach(link => {
    const matchingRoute = routePaths.find(path => 
      path === link.href || 
      (path.includes(':') && link.href.match(new RegExp(path.replace(':id', '\\d+'))))
    );
    if (!matchingRoute) {
      brokenLinks.push(link.href);
    }
  });
  
  const summary = `
Route Validation Summary:
- Total Routes: ${activeRoutes.length}
- Navigation Links: ${navigationLinks.length}
- Orphaned Pages: ${orphanedPages.length}
- Broken Links: ${brokenLinks.length}
- Status: ${brokenLinks.length === 0 && orphanedPages.length === 0 ? 'All routes valid' : 'Issues found'}
  `;
  
  return {
    orphanedPages,
    brokenLinks,
    validRoutes: activeRoutes,
    summary
  };
}

export function generateRouteMap(): string {
  const routeMap = allRoutes
    .filter(route => route.isActive)
    .map(route => {
      const indent = route.parentRoute ? '  ' : '';
      return `${indent}${route.path} -> ${route.component} (${route.description})`;
    })
    .join('\n');
    
  return `Route Map:\n${routeMap}`;
}

// Test function to validate specific route patterns
export function testRoutePattern(pattern: string, testPath: string): boolean {
  const regexPattern = pattern
    .replace(/:\w+/g, '[^/]+')  // Replace :id with regex for any non-slash characters
    .replace(/\*/g, '.*');      // Replace * with regex for any characters
    
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(testPath);
}

// Example usage and test cases
export const testCases = [
  { pattern: '/bills/:id', testPath: '/bills/123', expected: true },
  { pattern: '/bills/:id/analysis', testPath: '/bills/456/analysis', expected: true },
  { pattern: '/bills/:id/sponsorship-analysis/overview', testPath: '/bills/789/sponsorship-analysis/overview', expected: true },
  { pattern: '*', testPath: '/any/random/path', expected: true }
];












































