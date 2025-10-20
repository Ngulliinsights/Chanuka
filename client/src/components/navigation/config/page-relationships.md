# Page Relationships Configuration

## Overview

This document defines the relationships between pages in the application, enabling intelligent navigation suggestions and breadcrumbs.

## Relationship Types

### Parent-Child Relationships
- **parent**: The page that contains or is conceptually above the current page
- **child**: Pages that are contained within or conceptually below the current page

### Sibling Relationships
- **sibling**: Pages at the same hierarchical level that are related

### Related Relationships
- **related**: Pages that are thematically connected but not hierarchically related

## Page Relationship Mapping

### Legislative Section Relationships

```typescript
const LEGISLATIVE_RELATIONSHIPS = {
  '/': {
    '/bills': { type: 'child', weight: 10, context: 'View all bills' },
    '/bill-sponsorship-analysis': { type: 'related', weight: 8, context: 'Analyze bill sponsorship patterns' },
    '/search': { type: 'related', weight: 6, context: 'Search legislative content' }
  },
  '/bills': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/bill-sponsorship-analysis': { type: 'sibling', weight: 9, context: 'Analyze bill data' },
    '/search': { type: 'related', weight: 7, context: 'Search bills' }
  },
  '/bill-sponsorship-analysis': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/bills': { type: 'sibling', weight: 9, context: 'View bill details' },
    '/search': { type: 'related', weight: 6, context: 'Search analysis data' }
  }
};
```

### Community Section Relationships

```typescript
const COMMUNITY_RELATIONSHIPS = {
  '/community': {
    '/expert-verification': { type: 'sibling', weight: 8, context: 'Expert verification process' },
    '/': { type: 'parent', weight: 6, context: 'Return to home' }
  },
  '/expert-verification': {
    '/community': { type: 'sibling', weight: 9, context: 'Community input' },
    '/': { type: 'parent', weight: 7, context: 'Return to home' }
  }
};
```

### User Account Relationships

```typescript
const USER_RELATIONSHIPS = {
  '/dashboard': {
    '/profile': { type: 'sibling', weight: 9, context: 'Manage profile settings' },
    '/': { type: 'parent', weight: 8, context: 'Return to home' }
  },
  '/profile': {
    '/dashboard': { type: 'sibling', weight: 9, context: 'View dashboard' },
    '/': { type: 'parent', weight: 8, context: 'Return to home' }
  }
};
```

### Admin Relationships

```typescript
const ADMIN_RELATIONSHIPS = {
  '/admin': {
    '/': { type: 'parent', weight: 10, context: 'Return to home' },
    '/dashboard': { type: 'related', weight: 5, context: 'User dashboard' }
  }
};
```

## Relationship Weight System

### Weight Scale
- **10**: Primary relationship (parent/child, main navigation)
- **8-9**: Strong relationship (siblings, key related pages)
- **6-7**: Moderate relationship (useful related pages)
- **4-5**: Weak relationship (occasional relevance)
- **1-3**: Minimal relationship (rarely relevant)

### Context Descriptions
Context strings should be:
- Action-oriented ("View bill details", "Manage profile")
- Clear and concise
- User-friendly language

## Relevance Score Calculation

### Base Calculation
```typescript
const calculateRelevanceScore = (relationship: PageRelationship, userRole: UserRole, userPreferences: any) => {
  let score = relationship.weight;

  // Role-based adjustments
  if (relationship.allowedRoles && !relationship.allowedRoles.includes(userRole)) {
    score *= 0.3; // Reduce score for inaccessible pages
  }

  // User preference adjustments
  if (userPreferences?.favoritePages?.includes(relationship.pageId)) {
    score *= 1.5; // Boost favorite pages
  }

  // Recency adjustments
  const daysSinceVisited = getDaysSinceLastVisit(relationship.pageId);
  if (daysSinceVisited < 7) {
    score *= 1.2; // Boost recently visited pages
  }

  return Math.min(score, 10); // Cap at 10
};
```

### Dynamic Factors
- **User Role**: Pages requiring higher permissions get reduced scores for lower-role users
- **User Preferences**: Favorite pages get boosted scores
- **Visit History**: Recently visited pages get slight boosts
- **Context Relevance**: Current page context affects relationship strength

## Navigation Flow Patterns

### Legislative Workflow
```
Home → Bills → Bill Details → Analysis
   ↓      ↓         ↓         ↓
Search  Search   Search   Search
```

### User Account Workflow
```
Dashboard ↔ Profile
     ↓
   Logout
```

### Admin Workflow
```
Admin → User Management → System Settings
   ↓           ↓               ↓
Dashboard   Dashboard      Dashboard
```

## Implementation

### Page Relationship Interface
```typescript
export interface PageRelationship {
  pageId: string;
  title: string;
  path: string;
  description: string;
  category: NavigationSection;
  type: 'parent' | 'child' | 'sibling' | 'related';
  weight: number;
  context: string;
  relevanceScore: number;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
}
```

### Relationship Lookup Utility
```typescript
export const getPageRelationships = (currentPath: string): PageRelationship[] => {
  const relationships = PAGE_RELATIONSHIPS[currentPath] || [];
  return relationships.map(rel => ({
    ...rel,
    relevanceScore: calculateRelevanceScore(rel, userRole, userPreferences)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
};
```

### Breadcrumb Generation
```typescript
export const generateBreadcrumbs = (currentPath: string): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [];
  let path = currentPath;

  while (path !== '/') {
    const parentRelationship = getParentRelationship(path);
    if (parentRelationship) {
      breadcrumbs.unshift({
        label: parentRelationship.title,
        path: parentRelationship.path,
        isActive: false
      });
      path = parentRelationship.path;
    } else {
      break;
    }
  }

  // Add home if not already present
  if (breadcrumbs.length === 0 || breadcrumbs[0].path !== '/') {
    breadcrumbs.unshift({
      label: 'Home',
      path: '/',
      isActive: false
    });
  }

  // Mark current page as active
  breadcrumbs.push({
    label: getCurrentPageTitle(currentPath),
    path: currentPath,
    isActive: true
  });

  return breadcrumbs;
};
```

## Configuration Management

### Centralized Relationship Configuration
```typescript
export const PAGE_RELATIONSHIPS: Record<string, PageRelationship[]> = {
  ...LEGISLATIVE_RELATIONSHIPS,
  ...COMMUNITY_RELATIONSHIPS,
  ...USER_RELATIONSHIPS,
  ...ADMIN_RELATIONSHIPS,
  // Add more sections as needed
};
```

### Validation
```typescript
export const validatePageRelationships = (relationships: Record<string, PageRelationship[]>) => {
  const errors: string[] = [];

  for (const [path, rels] of Object.entries(relationships)) {
    // Validate path exists in navigation
    if (!findNavigationItemByPath(path)) {
      errors.push(`Invalid path: ${path}`);
    }

    // Validate relationship weights
    rels.forEach(rel => {
      if (rel.weight < 1 || rel.weight > 10) {
        errors.push(`Invalid weight for ${rel.pageId}: ${rel.weight}`);
      }
    });
  }

  return errors;
};
```

## Usage Examples

### Getting Related Pages
```typescript
import { useRelatedPages } from '@/components/navigation';

const MyComponent = () => {
  const { relatedPages } = useRelatedPages('/bills');

  return (
    <div>
      <h2>Related Pages</h2>
      {relatedPages.slice(0, 3).map(page => (
        <Link key={page.pageId} to={page.path}>
          {page.title}
        </Link>
      ))}
    </div>
  );
};
```

### Generating Breadcrumbs
```typescript
import { useBreadcrumbs } from '@/components/navigation';

const PageHeader = () => {
  const breadcrumbs = useBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb">
      <ol>
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path}>
            {index > 0 && <span> / </span>}
            {crumb.isActive ? (
              <span>{crumb.label}</span>
            ) : (
              <Link to={crumb.path}>{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
```

## Maintenance Guidelines

### Adding New Relationships
1. Identify the source page and related pages
2. Determine the relationship type and weight
3. Add appropriate context descriptions
4. Test the relationship in context
5. Update documentation

### Updating Weights
- Monitor user navigation patterns
- Adjust weights based on usage analytics
- Consider A/B testing for weight changes
- Document reasoning for weight adjustments

### Relationship Cleanup
- Remove relationships for deleted pages
- Update paths when routes change
- Review and update context descriptions periodically
- Validate relationships after navigation updates