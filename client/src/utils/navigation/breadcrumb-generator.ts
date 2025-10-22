import { BreadcrumbItem } from '@/types/navigation';
import { logger } from '@/utils/browser-logger';

// Route configuration for breadcrumb generation
const routeConfig: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'Home' },
  '/dashboard': { label: 'Dashboard', parent: '/' },
  '/bills': { label: 'Bills', parent: '/' },
  '/bills/:id': { label: 'Bill Details', parent: '/bills' },
  '/bills/:id/analysis': { label: 'Analysis', parent: '/bills/:id' },
  '/bills/:id/comments': { label: 'Comments', parent: '/bills/:id' },
  '/bills/:id/sponsorship-analysis': { label: 'Sponsorship Analysis', parent: '/bills/:id' },
  '/bills/:id/sponsorship-analysis/overview': { label: 'Overview', parent: '/bills/:id/sponsorship-analysis' },
  '/bills/:id/sponsorship-analysis/primary-sponsor': { label: 'Primary Sponsor', parent: '/bills/:id/sponsorship-analysis' },
  '/bills/:id/sponsorship-analysis/co-sponsors': { label: 'Co-Sponsors', parent: '/bills/:id/sponsorship-analysis' },
  '/bills/:id/sponsorship-analysis/financial-network': { label: 'Financial Network', parent: '/bills/:id/sponsorship-analysis' },
  '/bills/:id/sponsorship-analysis/methodology': { label: 'Methodology', parent: '/bills/:id/sponsorship-analysis' },
  '/bill-sponsorship-analysis': { label: 'Bill Sponsorship Analysis', parent: '/' },
  '/community': { label: 'Community Input', parent: '/' },
  '/expert-verification': { label: 'Expert Verification', parent: '/' },
  '/auth': { label: 'Authentication', parent: '/' },
  '/profile': { label: 'Profile', parent: '/dashboard' },
  '/user-profile': { label: 'User Profile', parent: '/dashboard' },
  '/onboarding': { label: 'Onboarding', parent: '/' },
  '/search': { label: 'Search', parent: '/' },
  '/admin': { label: 'Admin Panel', parent: '/' },
  '/admin/database': { label: 'Database Management', parent: '/admin' },
};

/**
 * Normalizes a path by replacing dynamic segments with placeholders
 */
function normalizePath(path: string): string {
  // Replace bill IDs with :id placeholder
  const billIdPattern = /\/bills\/[^\/]+/g;
  let normalizedPath = path.replace(billIdPattern, '/bills/:id');
  
  // Handle nested bill routes
  if (normalizedPath.includes('/bills/:id/') && !normalizedPath.includes('/sponsorship-analysis/')) {
    // For routes like /bills/123/analysis -> /bills/:id/analysis
    normalizedPath = normalizedPath.replace(/\/bills\/[^\/]+\//, '/bills/:id/');
  }
  
  return normalizedPath;
}

/**
 * Extracts dynamic values from the actual path
 */
function extractDynamicValues(actualPath: string, normalizedPath: string): Record<string, string> {
  const values: Record<string, string> = {};
  
  // Extract bill ID
  const billIdMatch = actualPath.match(/\/bills\/([^\/]+)/);
  if (billIdMatch && normalizedPath.includes(':id')) {
    values.id = billIdMatch[1];
  }
  
  return values;
}

/**
 * Generates breadcrumb items for a given path
 */
export function generateBreadcrumbs(currentPath: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  const normalizedPath = normalizePath(currentPath);
  const dynamicValues = extractDynamicValues(currentPath, normalizedPath);
  
  // Build breadcrumb chain by following parent relationships
  function buildBreadcrumbChain(path: string, actualPath: string): void {
    const config = routeConfig[path];
    if (!config) return;
    
    // Add parent breadcrumbs first (recursive)
    if (config.parent) {
      const parentActualPath = getActualParentPath(config.parent, actualPath, dynamicValues);
      buildBreadcrumbChain(config.parent, parentActualPath);
    }
    
    // Add current breadcrumb
    let label = config.label;
    
    // Replace placeholders in label with actual values
    if (path.includes(':id') && dynamicValues.id) {
      label = label.replace(':id', `Bill ${dynamicValues.id}`);
    }
    
    breadcrumbs.push({
      label,
      path: actualPath,
      isActive: actualPath === currentPath,
    });
  }
  
  buildBreadcrumbChain(normalizedPath, currentPath);
  
  return breadcrumbs;
}

/**
 * Gets the actual parent path by replacing placeholders with dynamic values
 */
function getActualParentPath(parentPath: string, currentActualPath: string, dynamicValues: Record<string, string>): string {
  let actualParentPath = parentPath;
  
  // Replace :id with actual bill ID if present
  if (parentPath.includes(':id') && dynamicValues.id) {
    actualParentPath = parentPath.replace(':id', dynamicValues.id);
  }
  
  return actualParentPath;
}

/**
 * Gets a human-readable title for a path (useful for page titles)
 */
export function getPageTitle(path: string): string {
  const normalizedPath = normalizePath(path);
  const config = routeConfig[normalizedPath];
  
  if (!config) {
    // Fallback: convert path to title
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      ? lastSegment.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      : 'Home';
  }
  
  let title = config.label;
  
  // Replace placeholders with actual values
  const dynamicValues = extractDynamicValues(path, normalizedPath);
  if (normalizedPath.includes(':id') && dynamicValues.id) {
    title = title.replace(':id', `Bill ${dynamicValues.id}`);
  }
  
  return title;
}











































