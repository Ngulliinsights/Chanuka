# Shared UI Architectural Guidelines

## Overview

This document establishes the architectural standards for the `client/src/shared/ui` directory. These guidelines ensure consistency, maintainability, and developer productivity across all shared UI components.

## Core Principles

### 1. **Simplicity Over Complexity**
- Prefer simple, understandable solutions over complex abstractions
- Avoid over-engineering for hypothetical future needs
- Keep type definitions minimal and focused

### 2. **Consistency Over Flexibility**
- Use standardized patterns across all components
- Follow established naming conventions
- Maintain consistent error handling approaches

### 3. **Maintainability Over Performance**
- Write code that is easy to understand and modify
- Prioritize clear code over micro-optimizations
- Document complex logic and architectural decisions

## Directory Structure

```
client/src/shared/ui/
├── components/          # Reusable UI components
├── hooks/              # Shared hooks
├── types/              # Shared type definitions
├── utils/              # Utility functions
├── templates/          # Component and hook templates
└── index.ts            # Main barrel export
```

### Subdirectory Organization

Each major feature area should follow this structure:
```
feature-name/
├── components/         # Feature-specific components
├── hooks/             # Feature-specific hooks
├── types/             # Feature-specific types
├── utils/             # Feature-specific utilities
└── index.ts           # Feature barrel export
```

## Import Path Standards

### **Rule**: Use `@client/` prefix for all imports

```typescript
// ✅ Correct
import { Button } from '@client/shared/design-system';
import { useAuth } from '@client/core/auth';
import { logger } from '@client/utils/logger';

// ❌ Incorrect
import { Button } from '@/shared/design-system';
import { useAuth } from '../../../core/auth';
```

### Import Organization

Organize imports in this order:
1. React imports
2. Third-party library imports
3. Internal imports (grouped by domain)
4. Relative imports

```typescript
// ✅ Correct import order
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@client/shared/design-system';
import { useAuth } from '@client/core/auth';
import { logger } from '@client/utils/logger';

import { ComponentSpecificType } from './types';
```

## Component Standards

### Component Structure

Use the provided template (`templates/component-template.tsx`) for all new components:

```typescript
import React from 'react';
import { useErrorHandler } from '../utils/error-handling';

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
  // Component-specific props
}

export const Component: React.FC<ComponentProps> = ({
  className = '',
  children,
  testId,
}) => {
  const { error, errorMessage, handleError } = useErrorHandler('Component');
  
  // Component logic
  
  return (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  );
};

export default Component;
```

### Required Props

All components must include:
- `className?: string` - For styling flexibility
- `testId?: string` - For testing support
- `children?: React.ReactNode` - When applicable

### Error Handling

All components must use the standardized error handling:

```typescript
import { useErrorHandler } from '../utils/error-handling';

const { error, errorMessage, handleError, clearError } = useErrorHandler('ComponentName');
```

## Hook Standards

### Hook Structure

Use the provided template (`templates/hook-template.ts`) for all new hooks:

```typescript
import { useState, useCallback } from 'react';
import { useErrorHandler } from '../utils/error-handling';

export interface UseHookOptions {
  enabled?: boolean;
}

export interface UseHookResult {
  data: any | null;
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
  };
}

export const useHook = (options: UseHookOptions = {}): UseHookResult => {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { error, handleError, clearError } = useErrorHandler('useHook');
  
  const refresh = useCallback(async () => {
    // Implementation
  }, []);
  
  return { data, loading, error, actions: { refresh } };
};
```

### Hook Naming

- Use `use` prefix for all hooks
- Use descriptive names: `useUserProfile`, `useDashboardData`
- Avoid generic names: `useData`, `useState`

## Type Definition Standards

### Type Organization

Keep types close to their usage:
- Component-specific types: Same file as component
- Feature-specific types: `feature/types/index.ts`
- Shared types: `shared/ui/types/index.ts`

### Type Naming

```typescript
// ✅ Correct naming
export interface UserProfileProps { }
export interface UseUserProfileResult { }
export type UserRole = 'admin' | 'user';

// ❌ Incorrect naming
export interface Props { }
export interface Result { }
export type Role = string;
```

### Type Complexity

Keep types simple and focused:

```typescript
// ✅ Simple, focused types
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
}

// ❌ Complex, unfocused types
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  settings: Record<string, any>;
  dataSource?: DataSource;
  refreshInterval?: number;
  permissions?: Permission[];
  visible: boolean;
  collapsible: boolean;
  removable: boolean;
  resizable: boolean;
  metadata: WidgetMetadata;
  // ... 20+ more properties
}
```

## Error Handling Standards

### Use Standardized Error Handler

All components and hooks must use the standardized error handler:

```typescript
import { useErrorHandler } from '@client/shared/ui/utils/error-handling';

const { error, errorMessage, handleError, clearError, retry } = useErrorHandler('ComponentName');
```

### Error Display

Use consistent error display patterns:

```typescript
// Error state rendering
if (error) {
  return (
    <div className="p-4 border border-red-200 rounded-md bg-red-50">
      <p className="text-red-600 text-sm">{errorMessage}</p>
      <button type="button" onClick={clearError}>
        Dismiss
      </button>
    </div>
  );
}
```

### Error Logging

Use the centralized logger:

```typescript
import { logger } from '@client/utils/logger';

// Log errors with context
logger.error('Operation failed', { component: 'ComponentName', operation: 'fetchData' }, error);
```

## Testing Standards

### Test File Organization

```
component/
├── Component.tsx
├── Component.test.tsx
├── Component.stories.tsx (if using Storybook)
└── index.ts
```

### Required Tests

All components must have:
- Rendering tests
- Props validation tests
- Error state tests
- User interaction tests (when applicable)

### Test Naming

```typescript
describe('ComponentName', () => {
  it('renders without crashing', () => { });
  it('displays error state correctly', () => { });
  it('handles user interactions', () => { });
});
```

## Performance Standards

### Memoization

Use React.memo for components that receive complex props:

```typescript
export const ExpensiveComponent = React.memo<ExpensiveComponentProps>(
  function ExpensiveComponent({ data, onUpdate }) {
    // Component implementation
  }
);
```

### Callback Optimization

Use useCallback for functions passed as props:

```typescript
const handleUpdate = useCallback((newData: Data) => {
  // Handle update
}, [dependency]);
```

## Documentation Standards

### Component Documentation

```typescript
/**
 * UserProfile displays user information and allows editing
 * 
 * @example
 * ```tsx
 * <UserProfile 
 *   user={user} 
 *   onUpdate={handleUpdate}
 *   className="my-4" 
 * />
 * ```
 */
export const UserProfile: React.FC<UserProfileProps> = ({ ... }) => {
  // Implementation
};
```

### Hook Documentation

```typescript
/**
 * Hook for managing user profile data
 * 
 * @param userId - The user ID to fetch profile for
 * @param options - Configuration options
 * @returns User profile data and actions
 * 
 * @example
 * ```tsx
 * const { data, loading, actions } = useUserProfile(userId, {
 *   enabled: true
 * });
 * ```
 */
export const useUserProfile = (userId: string, options?: UseUserProfileOptions) => {
  // Implementation
};
```

## Code Review Checklist

### Before Submitting

- [ ] Follows component/hook template structure
- [ ] Uses standardized error handling
- [ ] Includes proper TypeScript types
- [ ] Has consistent import organization
- [ ] Includes test coverage
- [ ] Follows naming conventions
- [ ] Uses `@client/` import paths
- [ ] Includes JSDoc documentation

### Reviewer Checklist

- [ ] Code follows architectural guidelines
- [ ] Error handling is consistent
- [ ] Types are simple and focused
- [ ] No over-engineering or unnecessary complexity
- [ ] Tests cover main functionality
- [ ] Documentation is clear and helpful

## Migration Guide

### Updating Existing Components

1. **Add Error Handling**
   ```typescript
   // Add to existing components
   import { useErrorHandler } from '@client/shared/ui/utils/error-handling';
   const { error, handleError } = useErrorHandler('ComponentName');
   ```

2. **Simplify Types**
   ```typescript
   // Before: Complex type with 20+ properties
   interface ComplexType { /* ... */ }
   
   // After: Simple, focused type
   interface SimpleType {
     id: string;
     name: string;
     // Only essential properties
   }
   ```

3. **Standardize Imports**
   ```bash
   # Use find/replace to update import paths
   find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from '\''@/|from '\''@client/|g'
   ```

### Gradual Migration Strategy

1. **Phase 1**: Update critical components first
2. **Phase 2**: Migrate feature-specific components
3. **Phase 3**: Update utility functions and types
4. **Phase 4**: Clean up deprecated patterns

## Enforcement

### Linting Rules

Configure ESLint to enforce these guidelines:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'react/react-in-jsx-scope': 'error',
    'react/button-has-type': 'error',
    'complexity': ['error', 10],
    'import/no-restricted-paths': ['error', {
      patterns: [{
        group: ['@/*'],
        from: 'client/src/shared/ui/**',
        message: 'Use @client/ imports in shared UI'
      }]
    }]
  }
};
```

### Pre-commit Hooks

Set up pre-commit hooks to validate:
- Import path consistency
- Type complexity limits
- Test coverage requirements
- Documentation completeness

## Conclusion

These guidelines ensure that the shared UI system remains maintainable, consistent, and developer-friendly. All team members should follow these standards when creating or modifying shared UI components.

For questions or suggestions about these guidelines, please create an issue or discuss in team meetings.