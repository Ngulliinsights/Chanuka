# Navigation Module

## Overview

The Navigation module provides comprehensive navigation functionality for the Chanuka platform including validation, access control, breadcrumbs, search, analytics, preferences, and route management.

## Purpose and Responsibilities

- **Route Validation**: Validate navigation paths and items
- **Access Control**: Permission-based navigation filtering
- **Breadcrumbs**: Automatic breadcrumb generation
- **Search**: Fuzzy search across navigation items
- **Analytics**: Track navigation events and patterns
- **Preferences**: User navigation preferences and favorites
- **Route Preloading**: Optimize navigation performance
- **Path Lookup**: Utilities for finding and resolving paths

## Public Exports

### Validation
- `validateNavigationItem()` - Validate navigation item structure
- `validateNavigationItems()` - Validate multiple items
- `isValidNavigationPath()` - Check path validity

### Access Control
- `hasRouteAccess()` - Check user access to route
- `filterNavigationByAccess()` - Filter items by permissions
- `requiresAuthentication()` - Check if route requires auth
- `requiresRole()` - Check role requirements
- `getNavigationMenuItems()` - Get accessible menu items

### Breadcrumbs
- `generateBreadcrumbs()` - Generate breadcrumb trail
- `findRelatedPages()` - Find related navigation items
- `calculateRelatedPages()` - Calculate page relationships

### Search
- `searchNavigationItems()` - Search navigation with fuzzy matching
- `fuzzyMatchScore()` - Calculate fuzzy match score

### Analytics
- `trackNavigationEvent()` - Track navigation events
- `getNavigationAnalytics()` - Get navigation metrics
- `clearNavigationAnalytics()` - Clear analytics data

### Preferences
- `getNavigationPreferences()` - Get user preferences
- `saveNavigationPreferences()` - Save preferences
- `addToRecentPages()` - Add to recent pages
- `addToFavorites()` - Add page to favorites
- `removeFromFavorites()` - Remove from favorites
- `isPageFavorite()` - Check if page is favorited

### Lookup
- `findNavigationItemByPath()` - Find item by path
- `findNavigationItemById()` - Find item by ID
- `getNavigationItemsBySection()` - Get items by section
- `determineCurrentSection()` - Determine active section
- `getPageTitle()` - Get page title
- `isNavigationPathActive()` - Check if path is active
- `normalizePath()` - Normalize navigation path

## Usage Examples

### Basic Navigation with Access Control

```typescript
import { filterNavigationByAccess, hasRouteAccess } from '@/infrastructure/navigation';

function NavigationMenu({ items, user }) {
  const accessibleItems = filterNavigationByAccess(items, user);

  return (
    <nav>
      {accessibleItems.map(item => (
        <NavItem key={item.id} item={item} />
      ))}
    </nav>
  );
}
```

### Breadcrumb Generation

```typescript
import { generateBreadcrumbs } from '@/infrastructure/navigation';

function Breadcrumbs({ currentPath }) {
  const breadcrumbs = generateBreadcrumbs(currentPath);

  return (
    <div className="breadcrumbs">
      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          <Link to={crumb.path}>{crumb.label}</Link>
          {index < breadcrumbs.length - 1 && ' / '}
        </span>
      ))}
    </div>
  );
}
```

### Navigation Search

```typescript
import { searchNavigationItems } from '@/infrastructure/navigation';

function NavigationSearch({ items }) {
  const [query, setQuery] = useState('');
  const results = searchNavigationItems(items, query);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {results.map(item => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Access Control**: Always filter navigation by user permissions
2. **Analytics**: Track navigation events for insights
3. **Preloading**: Preload routes for better performance
4. **Validation**: Validate navigation configuration at startup
5. **Favorites**: Provide quick access to frequently used pages

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Auth Module](../auth/README.md) - Access control integration
- [Store Module](../store/README.md) - Navigation state
- [Observability Module](../observability/README.md) - Navigation analytics
