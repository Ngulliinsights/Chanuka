# TypeScript Types Consolidation

## Overview

This document outlines the consolidation of TypeScript types across the navigation system to resolve current inconsistencies between component and global types.

## Current Type Inconsistencies

### Identified Issues

1. **NavigationItem Interface Duplication**
   - Component-specific types in `client/src/components/navigation/types.ts`
   - Global types in `client/src/types/navigation.ts`
   - Mobile navigation types in `client/src/components/layout/mobile-navigation.tsx`

2. **UserRole Type Variations**
   - `'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate'` (component types)
   - `'public' | 'citizen' | 'user' | 'expert' | 'admin' | 'journalist' | 'advocate'` (global types)
   - `'user' | 'admin'` (mobile navigation)

3. **NavigationSection Type Conflicts**
   - `'legislative' | 'community' | 'tools' | 'user' | 'admin'` (component types)
   - `'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system'` (global types)

## Consolidated Type Definitions

### Core Navigation Types

```typescript
// Unified UserRole type
export type UserRole = 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';

// Unified NavigationSection type
export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin';

// Unified NavigationItem interface
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

// Access control types
export type AccessDenialReason = 'unauthenticated' | 'insufficient_role' | 'admin_required' | 'custom_condition';

export interface AccessCheckResult {
  canAccess: boolean;
  denialReason: AccessDenialReason | null;
  requiredRole?: UserRole[];
}
```

### Page Relationship Types

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

### Navigation State Types

```typescript
export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
}

export interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: string[];
  recentlyVisited: RecentPage[];
  compactMode: boolean;
}

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: Date;
  visitCount: number;
}

export interface NavigationState {
  currentPath: string;
  previousPath: string;
  breadcrumbs: BreadcrumbItem[];
  relatedPages: RelatedPage[];
  currentSection: NavigationSection;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  userRole: UserRole;
  preferences: NavigationPreferences;
}
```

### Hook Return Types

```typescript
export interface UseNavResult {
  items: NavigationItem[];
  userRole: UserRole;
  isAuthenticated: boolean;
}

export interface UseRouteAccessResult {
  canAccess: boolean;
  denialReason: AccessDenialReason | null;
  requiredRole?: UserRole[];
}

export interface UseRelatedPagesResult {
  relatedPages: RelatedPage[];
  totalCount: number;
  hasMore: boolean;
}
```

## Migration Strategy

### Phase 1: Type Consolidation

1. **Create Unified Types File**
   ```typescript
   // client/src/components/navigation/types/unified.ts
   export type UserRole = 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
   export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin';
   // ... all unified types
   ```

2. **Update Component Types**
   ```typescript
   // client/src/components/navigation/types.ts
   export type {
     UserRole,
     NavigationSection,
     NavigationItem,
     AccessDenialReason
   } from './types/unified';
   ```

3. **Update Global Types**
   ```typescript
   // client/src/types/navigation.ts
   export type {
     UserRole,
     NavigationSection,
     BreadcrumbItem,
     RelatedPage,
     NavigationState,
     NavigationContextValue
   } from '../components/navigation/types/unified';
   ```

### Phase 2: Import Updates

1. **Update Component Imports**
   ```typescript
   // Before
   import type { NavigationItem } from './types';

   // After
   import type { NavigationItem } from './types/unified';
   ```

2. **Update Global Imports**
   ```typescript
   // Before
   import type { NavigationSection } from '@/types/navigation';

   // After
   import type { NavigationSection } from '@/components/navigation/types/unified';
   ```

3. **Update Mobile Navigation**
   ```typescript
   // client/src/components/layout/mobile-navigation.tsx
   import type { NavigationItem } from '@/components/navigation/types/unified';

   interface NavigationItem {
     label: string;
     href: string;
     icon: ReactNode;
     badge?: number;
   }
   // Remove duplicate interface, use unified type
   ```

### Phase 3: Validation and Testing

1. **Type Checking**
   ```bash
   npx tsc --noEmit --project tsconfig.json
   ```

2. **Update Tests**
   ```typescript
   // Update test imports
   import type { NavigationItem, UserRole } from '@/components/navigation/types/unified';
   ```

3. **Runtime Validation**
   ```typescript
   // Add runtime type validation
   import { NavigationItemSchema } from './validation';

   const validateNavigationItem = (item: any): item is NavigationItem => {
     return NavigationItemSchema.safeParse(item).success;
   };
   ```

## Breaking Changes

### UserRole Changes
- `'user'` role removed (use `'citizen'` for regular authenticated users)
- All references to `'user'` role must be updated to `'citizen'`

### NavigationSection Changes
- `'system'` section removed (use `'admin'` for system administration)
- Section order standardized to: `['legislative', 'community', 'tools', 'user', 'admin']`

### NavigationItem Interface Changes
- `icon` property now strictly typed as `React.ComponentType<{ className?: string }>`
- `condition` function signature updated to include `user` parameter
- `priority` property added for ordering

## Compatibility Layer

### Legacy Type Support
```typescript
// Temporary compatibility exports
export type LegacyUserRole = 'public' | 'citizen' | 'user' | 'expert' | 'admin' | 'journalist' | 'advocate';
export type LegacyNavigationSection = 'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system';

// Conversion utilities
export const convertLegacyUserRole = (role: LegacyUserRole): UserRole => {
  return role === 'user' ? 'citizen' : role;
};

export const convertLegacyNavigationSection = (section: LegacyNavigationSection): NavigationSection => {
  return section === 'system' ? 'admin' : section;
};
```

### Migration Utilities
```typescript
// Migration helper functions
export const migrateNavigationItem = (legacyItem: any): NavigationItem => {
  return {
    ...legacyItem,
    section: convertLegacyNavigationSection(legacyItem.section),
    allowedRoles: legacyItem.allowedRoles?.map(convertLegacyUserRole),
  };
};

export const migrateNavigationState = (legacyState: any): NavigationState => {
  return {
    ...legacyState,
    userRole: convertLegacyUserRole(legacyState.userRole),
    currentSection: convertLegacyNavigationSection(legacyState.currentSection),
  };
};
```

## Implementation Plan

### Week 1: Type Definition
- [ ] Create unified types file
- [ ] Define all consolidated interfaces
- [ ] Add validation schemas

### Week 2: Component Updates
- [ ] Update navigation component types
- [ ] Update mobile navigation types
- [ ] Update layout component types

### Week 3: Global Updates
- [ ] Update global navigation types
- [ ] Update context types
- [ ] Update hook return types

### Week 4: Testing and Validation
- [ ] Run type checking
- [ ] Update unit tests
- [ ] Add integration tests
- [ ] Performance testing

## Validation Rules

### NavigationItem Validation
```typescript
import { z } from 'zod';

export const NavigationItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().url(),
  icon: z.any(), // React component validation would be complex
  section: z.enum(['legislative', 'community', 'tools', 'user', 'admin']),
  description: z.string().optional(),
  badge: z.number().int().min(0).optional(),
  allowedRoles: z.array(z.enum(['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'])).optional(),
  requiresAuth: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  condition: z.function().optional(),
  priority: z.number().int().min(0).max(100).optional(),
}).strict();
```

### Runtime Type Guards
```typescript
export const isNavigationItem = (value: unknown): value is NavigationItem => {
  return NavigationItemSchema.safeParse(value).success;
};

export const isUserRole = (value: unknown): value is UserRole => {
  return ['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'].includes(value as string);
};

export const isNavigationSection = (value: unknown): value is NavigationSection => {
  return ['legislative', 'community', 'tools', 'user', 'admin'].includes(value as string);
};
```

## Documentation Updates

### API Documentation
- Update all type references in documentation
- Update code examples to use unified types
- Add migration guide for developers

### Component Documentation
- Update component prop types documentation
- Update hook documentation with new return types
- Add type validation examples

## Future Considerations

### Type Extensions
```typescript
// Future extension points
export interface ExtendedNavigationItem extends NavigationItem {
  metadata?: Record<string, any>;
  analytics?: {
    clickCount: number;
    lastAccessed: Date;
  };
}

export type NavigationFeatureFlag = 'beta' | 'experimental' | 'deprecated';
```

### Generic Type Support
```typescript
// Generic navigation item for different contexts
export interface GenericNavigationItem<T = any> extends NavigationItem {
  data?: T;
  render?: (props: { item: NavigationItem; context: T }) => React.ReactNode;
}
```

This type consolidation plan ensures type safety, consistency, and maintainability across the entire navigation system while providing a clear migration path for existing code.