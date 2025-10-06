# Navigation State Persistence and Consistency

This document describes the navigation state persistence and consistency features implemented in the Chanuka application.

## Overview

The navigation system maintains consistent state across page navigations, browser sessions, and authentication changes. It includes:

1. **State Persistence**: Sidebar preferences, user preferences, and recent pages are saved to localStorage
2. **Authentication Synchronization**: Navigation state adapts to user authentication changes
3. **Context Synchronization**: Multiple navigation contexts remain consistent
4. **Error Handling**: Graceful handling of storage errors and corrupted data

## Architecture

### Core Components

#### NavigationContext
- Main navigation state management
- Handles breadcrumbs, related pages, user preferences
- Syncs with authentication state
- Persists state to localStorage

#### ResponsiveNavigationContext
- Mobile-specific navigation state
- Sidebar collapse/expand state
- Media query handling
- Synchronized with main NavigationContext

#### NavigationStatePersistence
- Utility class for localStorage operations
- State validation and sanitization
- Version management for future migrations
- Error handling and recovery

### State Structure

```typescript
interface NavigationState {
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

interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: string[];
  recentlyVisited: RecentPage[];
  compactMode: boolean;
}
```

## Features

### 1. State Persistence

#### Sidebar State
- Sidebar open/collapsed state persists across sessions
- Separate storage for responsive and main navigation contexts
- Automatic synchronization between contexts

```typescript
// Automatically saved when sidebar state changes
NavigationStatePersistence.saveSidebarState(collapsed);

// Loaded on application startup
const savedState = NavigationStatePersistence.loadSidebarState();
```

#### User Preferences
- Favorite pages list
- Recently visited pages (limited to 10 most recent)
- Default landing page
- Compact mode preference

#### Data Validation
- All persisted data is validated on load
- Corrupted data is automatically cleared
- Type safety ensures data integrity

### 2. Authentication Synchronization

#### User Role Sync
```typescript
// Automatically syncs user role with authentication state
useEffect(() => {
  dispatch({ 
    type: 'SYNC_AUTH_STATE', 
    payload: { user, isAuthenticated } 
  });
}, [user, isAuthenticated]);
```

#### Logout Handling
- User-specific state is cleared on logout
- Sidebar preferences are preserved
- Navigation resets to public user state

```typescript
// Clear user-specific data on logout
if (!isAuthenticated && state.userRole !== 'public') {
  dispatch({ type: 'RESET_USER_SPECIFIC_STATE' });
  NavigationStatePersistence.clearUserSpecificState();
}
```

### 3. Context Synchronization

#### Unified State Management
The `useNavigationSync` hook ensures consistency between contexts:

```typescript
export function useNavigationSync() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();

  // Sync sidebar state between contexts
  useEffect(() => {
    const shouldBeCollapsed = !navigation.sidebarOpen;
    if (responsiveNavigation.sidebarCollapsed !== shouldBeCollapsed) {
      responsiveNavigation.setSidebarCollapsed(shouldBeCollapsed);
    }
  }, [navigation.sidebarOpen, responsiveNavigation.sidebarCollapsed]);

  return {
    toggleSidebar: () => {
      navigation.toggleSidebar();
      responsiveNavigation.toggleSidebar();
    },
    // ... other unified methods
  };
}
```

### 4. Error Handling

#### Storage Errors
- Graceful handling of localStorage quota exceeded
- Recovery from corrupted data
- Fallback to default state when needed

#### Version Management
- State versioning for future migrations
- Automatic clearing of incompatible versions
- Backward compatibility considerations

## Usage

### Basic Usage

```typescript
// In a component
function MyComponent() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();

  // State is automatically persisted
  const handleToggleSidebar = () => {
    navigation.toggleSidebar();
  };

  // Preferences are automatically saved
  const handleAddFavorite = (path: string) => {
    navigation.updatePreferences({
      favoritePages: [...navigation.preferences.favoritePages, path]
    });
  };

  return (
    <div>
      <button onClick={handleToggleSidebar}>
        {navigation.sidebarOpen ? 'Close' : 'Open'} Sidebar
      </button>
    </div>
  );
}
```

### Advanced Usage with Sync Hook

```typescript
function NavigationComponent() {
  const {
    toggleSidebar,
    isActive,
    isMobile,
    sidebarCollapsed,
    currentPath,
    userRole
  } = useNavigationSync();

  return (
    <nav>
      <button onClick={toggleSidebar}>
        Toggle Sidebar
      </button>
      {/* Navigation items */}
    </nav>
  );
}
```

## Storage Keys

The following localStorage keys are used:

- `chanuka-navigation-state`: Main navigation state and preferences
- `chanuka-sidebar-collapsed`: Responsive sidebar state
- `chanuka-user-preferences`: User-specific preferences (cleared on logout)

## Performance Considerations

### Debounced Saves
State changes are debounced to prevent excessive localStorage writes:

```typescript
// 500ms debounce for navigation state saves
NavigationStatePersistence.saveNavigationState(state);
```

### Selective Persistence
Only necessary state is persisted:
- User preferences and sidebar state: ✅ Persisted
- Current path and breadcrumbs: ❌ Not persisted (dynamic)
- User role: ❌ Not persisted (derived from auth)

### Memory Management
- Recent pages limited to 10 entries
- Automatic cleanup of old/invalid data
- Efficient state updates using React reducers

## Testing

Comprehensive tests cover:

- State persistence across sessions
- Authentication state synchronization
- Context consistency
- Error handling and recovery
- Data validation and sanitization

Run tests with:
```bash
npm test navigation-persistence
npm test state-persistence
```

## Migration and Versioning

The system includes version management for future state migrations:

```typescript
// Current version
private static readonly VERSION = '1.0.0';

// Future migration support
static migrateState(): void {
  // Migration logic for future versions
}
```

## Troubleshooting

### Common Issues

1. **State not persisting**: Check browser localStorage quota and permissions
2. **Inconsistent sidebar state**: Verify both contexts are properly synchronized
3. **User preferences lost**: Check authentication state and logout handling

### Debug Information

Enable debug logging by setting:
```typescript
localStorage.setItem('chanuka-debug-navigation', 'true');
```

This will log navigation state changes and persistence operations to the console.