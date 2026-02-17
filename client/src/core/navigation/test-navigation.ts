/**
 * Simple test to verify navigation system functionality
 */

import {
  validateNavigationItem,
  hasRouteAccess,
  generateBreadcrumbs,
  searchNavigationItems,
  NavigationItem,
} from './index';

// Test data
const testNavItem: NavigationItem = {
  id: 'test-bill',
  label: 'Test Bill',
  path: '/bills/test-bill',
  href: '/bills/test-bill',
  icon: 'document' as unknown, // Simplified for testing
  section: 'legislative',
  description: 'A test bill for navigation',
  requiresAuth: false,
};

const testNavItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    href: '/',
    icon: 'home' as unknown,
    section: 'legislative',
  },
  testNavItem,
  {
    id: 'community',
    label: 'Community',
    path: '/community',
    href: '/community',
    icon: 'users' as unknown,
    section: 'community',
    requiresAuth: true,
  },
];

// Test validation
console.log('Testing validation...');
console.log('Valid item:', validateNavigationItem(testNavItem));

// Test access control
console.log('Testing access control...');
console.log('Public access to home:', hasRouteAccess(testNavItems[0], 'public', false));
console.log('Public access to community:', hasRouteAccess(testNavItems[2], 'public', false));
console.log('User access to community:', hasRouteAccess(testNavItems[2], 'user', true));

// Test breadcrumbs
console.log('Testing breadcrumbs...');
const breadcrumbs = generateBreadcrumbs('/bills/test-bill', testNavItems);
console.log('Breadcrumbs:', breadcrumbs);

// Test search
console.log('Testing search...');
const searchResults = searchNavigationItems('bill', testNavItems);
console.log('Search results for "bill":', searchResults);

console.log('Navigation system test completed successfully!');
