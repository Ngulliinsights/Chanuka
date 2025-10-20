# Unified Navigation Configuration

## Overview

This document defines the unified navigation configuration that serves as the single source of truth for all navigation-related data and logic in the application.

## Core Types

### User Roles
```typescript
export type UserRole = 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
```

### Navigation Sections
```typescript
export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin';
```

### Navigation Item Interface
```typescript
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
```

## Section Configuration

### Section Titles
```typescript
export const SECTION_TITLES: Record<NavigationSection, string> = {
  legislative: 'Legislative Data',
  community: 'Community',
  tools: 'Tools',
  user: 'User Account',
  admin: 'Administration',
};
```

### Section Ordering
```typescript
export const SECTION_ORDER: NavigationSection[] = ['legislative', 'community', 'tools', 'user', 'admin'];
```

## Navigation Items

### Default Navigation Map
```typescript
export const DEFAULT_NAVIGATION_MAP: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
    section: 'legislative',
    priority: 1
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: FileText,
    section: 'legislative',
    priority: 2
  },
  {
    id: 'analysis',
    label: 'Bill Analysis',
    href: '/bill-sponsorship-analysis',
    icon: BarChart3,
    section: 'legislative',
    allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'],
    priority: 3
  },
  {
    id: 'community',
    label: 'Community Input',
    href: '/community',
    icon: Users,
    section: 'community',
    priority: 1
  },
  {
    id: 'expert',
    label: 'Expert Verification',
    href: '/expert-verification',
    icon: Shield,
    section: 'community',
    allowedRoles: ['expert', 'admin'],
    priority: 2
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: Search,
    section: 'tools',
    priority: 1
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: User,
    section: 'user',
    requiresAuth: true,
    priority: 1
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: Settings,
    section: 'user',
    requiresAuth: true,
    priority: 2
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    href: '/admin',
    icon: Settings,
    section: 'admin',
    adminOnly: true,
    priority: 1
  },
];
```

## Route Access Control

### Access Control Logic
```typescript
export const canViewItem = (item: NavigationItem, role: UserRole, user: any | null): boolean => {
  if (item.adminOnly && role !== 'admin') return false;
  if (item.requiresAuth && !user) return false;
  if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
  if (item.condition && !item.condition(role, user)) return false;
  return true;
};
```

### Access Denial Reasons
```typescript
export type AccessDenialReason = 'unauthenticated' | 'insufficient_role' | 'admin_required' | 'custom_condition';
```

## Page Relationships

### Page Relationship Types
```typescript
export interface PageRelationship {
  pageId: string;
  relatedPages: {
    [key: string]: {
      type: 'parent' | 'child' | 'sibling' | 'related';
      weight: number;
      context: string;
    };
  };
}
```

### Related Page Interface
```typescript
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
```

## Navigation Flow Logic

### Route Access Hook
```typescript
export const useRouteAccess = (path: string) => {
  const { userRole, user } = useUnifiedNavigation();
  const navigationItem = findNavigationItemByPath(path);

  const canAccess = navigationItem ? canViewItem(navigationItem, userRole, user) : true;
  const denialReason = getAccessDenialReason(navigationItem, userRole, user);

  return { canAccess, denialReason, requiredRole: navigationItem?.allowedRoles };
};
```

### Related Pages Hook
```typescript
export const useRelatedPages = (currentPath: string) => {
  const relatedPages = PAGE_RELATIONSHIPS[currentPath] || [];
  const sortedPages = relatedPages.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return { relatedPages: sortedPages };
};
```

## Configuration Schema

### Validation Schema
```typescript
import { z } from 'zod';

export const NavigationItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string().url(),
  icon: z.any(), // React component
  section: z.enum(['legislative', 'community', 'tools', 'user', 'admin']),
  description: z.string().optional(),
  badge: z.number().optional(),
  allowedRoles: z.array(z.enum(['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'])).optional(),
  requiresAuth: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  condition: z.function().optional(),
  priority: z.number().optional(),
});

export const NavigationConfigSchema = z.object({
  sections: z.record(z.string()),
  sectionOrder: z.array(z.enum(['legislative', 'community', 'tools', 'user', 'admin'])),
  navigationItems: z.array(NavigationItemSchema),
  pageRelationships: z.record(z.any()).optional(),
});
```

## Usage Examples

### Using Navigation Hooks
```typescript
import { useNav, useRouteAccess, useRelatedPages } from '@/components/navigation';

// Get filtered navigation items for current user
const { items, userRole } = useNav();

// Check if user can access a specific route
const { canAccess, denialReason } = useRouteAccess('/admin');

// Get related pages for current location
const { relatedPages } = useRelatedPages('/bills');
```

### Extending Configuration
```typescript
import { DEFAULT_NAVIGATION_MAP, NavigationItem } from '@/components/navigation/config';

// Add custom navigation items
const customItems: NavigationItem[] = [
  {
    id: 'custom-page',
    label: 'Custom Page',
    href: '/custom',
    icon: Star,
    section: 'tools',
    allowedRoles: ['expert', 'admin'],
    priority: 2
  }
];

const extendedNavigation = [...DEFAULT_NAVIGATION_MAP, ...customItems];
```

## Migration Guide

### From Component-Specific Types
- Replace local `NavigationItem` interfaces with the unified type
- Update role checking logic to use `canViewItem` utility
- Migrate section constants to use `SECTION_TITLES` and `SECTION_ORDER`

### From Global Navigation Types
- Update imports to use the unified navigation types
- Ensure consistency between component and global type definitions
- Use the unified configuration for all navigation-related logic

## Future Enhancements

1. **Dynamic Configuration**: Support for runtime configuration updates
2. **Permission Groups**: More granular permission system
3. **Navigation Analytics**: Track navigation patterns and user behavior
4. **A/B Testing**: Support for navigation experiments
5. **Internationalization**: Multi-language navigation labels
6. **Accessibility**: Enhanced screen reader support and keyboard navigation