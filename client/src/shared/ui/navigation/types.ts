export type UserRole = 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin';
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section: NavigationSection;
  description?: string;
  badge?: number;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
  adminOnly?: boolean;
  condition?: (role: UserRole, user: any) => boolean;
  priority?: number;
}
export type AccessDenialReason = 'unauthenticated' | 'insufficient_role' | 'admin_required' | 'custom_condition';

export interface RelatedPage {
  pageId: string;
  title: string;
  path: string;
  description: string;
  category: NavigationSection;
  type?: 'parent' | 'child' | 'sibling' | 'related';
  weight: number;
  context?: string;
  relevanceScore: number;
}

