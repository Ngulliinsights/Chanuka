import type { NavigationItem, NavigationSection } from '@client/types';
import { Building, FileText, Users, Shield, Search, User, Settings, BarChart3 } from 'lucide-react';

export const SECTION_TITLES: Record<NavigationSection, string> = {
  legislative: 'Legislative Data',
  community: 'Community',
  tools: 'Tools',
  user: 'User Account',
  admin: 'Administration',
};
export const SECTION_ORDER: NavigationSection[] = ['legislative', 'community', 'tools', 'user', 'admin'];

export const DEFAULT_NAVIGATION_MAP: NavigationItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: Building, section: 'legislative', priority: 1 },
  { id: 'bills', label: 'Bills', href: '/bills', icon: FileText, section: 'legislative', priority: 2 },
  { id: 'analysis', label: 'Bill Analysis', href: '/bill-sponsorship-analysis', icon: BarChart3, section: 'legislative', allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'], priority: 3 },
  { id: 'community', label: 'Community Input', href: '/community', icon: Users, section: 'community', priority: 1 },
  { id: 'expert', label: 'Expert Verification', href: '/expert-verification', icon: Shield, section: 'community', allowedRoles: ['expert', 'admin'], priority: 2 },
  { id: 'search', label: 'Search', href: '/search', icon: Search, section: 'tools', priority: 1 },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: User, section: 'user', requiresAuth: true, priority: 1 },
  { id: 'profile', label: 'Profile', href: '/account', icon: Settings, section: 'user', requiresAuth: true, priority: 2 },
  { id: 'admin', label: 'Admin Panel', href: '/admin', icon: Settings, section: 'admin', adminOnly: true, priority: 1 },
];

// All exports are already available as ES modules above

