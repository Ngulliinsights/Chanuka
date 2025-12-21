import type { NavigationItem, NavigationSection } from '@client/types';

export const SECTION_TITLES: Record<NavigationSection, string> = {
  legislative: 'Legislative Data',
  community: 'Community',
  tools: 'Tools',
  user: 'User Account',
  admin: 'Administration',
  system: 'System',
};
export const SECTION_ORDER: NavigationSection[] = ['legislative', 'community', 'tools', 'user', 'admin', 'system'];

export const DEFAULT_NAVIGATION_MAP: NavigationItem[] = [
  { id: 'home', label: 'Home', path: '/', href: '/', icon: 'Building', section: 'legislative' },
  { id: 'bills', label: 'Bills', path: '/bills', href: '/bills', icon: 'FileText', section: 'legislative' },
  { id: 'analysis', label: 'Bill Analysis', path: '/bill-sponsorship-analysis', href: '/bill-sponsorship-analysis', icon: 'BarChart3', section: 'legislative', allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'] },
  { id: 'community', label: 'Community Input', path: '/community', href: '/community', icon: 'Users', section: 'community' },
  { id: 'expert', label: 'Expert Verification', path: '/expert-verification', href: '/expert-verification', icon: 'Shield', section: 'community', allowedRoles: ['expert', 'admin'] },
  { id: 'search', label: 'Search', path: '/search', href: '/search', icon: 'Search', section: 'tools' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', href: '/dashboard', icon: 'User', section: 'user', requiresAuth: true },
  { id: 'profile', label: 'Profile', path: '/account', href: '/account', icon: 'Settings', section: 'user', requiresAuth: true },
  { id: 'admin', label: 'Admin Panel', path: '/admin', href: '/admin', icon: 'Settings', section: 'admin', adminOnly: true },
];

// All exports are already available as ES modules above

