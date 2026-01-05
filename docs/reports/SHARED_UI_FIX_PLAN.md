# Shared UI Fix Plan - Actionable Steps

## Phase 1: Critical Fixes (Days 1-5)

### Day 1: Import Path Standardization

**Goal**: Fix all import path inconsistencies

**Actions**:
1. **Choose Standard**: Use `@client/` as the primary alias
2. **Create Script**: Automated find/replace for import paths
3. **Fix Files**: Update all files with mixed imports

**Files to Fix**:
```bash
# Files with @/ imports that should use @client/
client/src/shared/ui/navigation/hooks/useRouteAccess.ts
client/src/shared/ui/navigation/hooks/useRelatedPages.ts  
client/src/shared/ui/navigation/hooks/useNav.ts
client/src/shared/ui/navigation/utils/navigation-utils.ts
client/src/shared/ui/mobile/interaction/InfiniteScroll.tsx
client/src/shared/ui/mobile/interaction/MobileBottomSheet.tsx
client/src/shared/ui/mobile/data-display/MobileTabSelector.tsx
client/src/shared/ui/mobile/data-display/MobileDataVisualization.tsx
client/src/shared/ui/integration/IntegrationProvider.tsx
client/src/shared/ui/mobile/data-display/MobileChartCarousel.tsx
client/src/shared/ui/dashboard/hooks/useDashboard.ts
client/src/shared/ui/connection-status.tsx
```

**Script**:
```bash
# Find and replace @/ with @client/ in shared UI
find client/src/shared/ui -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from '\''@/|from '\''@client/|g'
find client/src/shared/ui -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|import '\''@/|import '\''@client/|g'
```

### Day 2: Add Missing React Imports

**Goal**: Fix all TSX files missing React imports

**Files to Fix**:
```typescript
// Add to each file:
import React from 'react';
```

**Files**:
- `client/src/shared/ui/realtime/RealTimeNotifications.tsx`
- `client/src/shared/ui/realtime/RealTimeDashboard.tsx`
- `client/src/shared/ui/privacy/PrivacyManager.tsx`
- `client/src/shared/ui/privacy/ModalInterface.tsx`
- `client/src/shared/ui/privacy/controls/DataUsageControls.tsx`
- `client/src/shared/ui/privacy/controls/ConsentControls.tsx`
- `client/src/shared/ui/privacy/CompactInterface.tsx`
- `client/src/shared/ui/performance/PerformanceDashboard.tsx`
- `client/src/shared/ui/offline/offline-manager.tsx`
- `client/src/shared/ui/notifications/NotificationPreferences.tsx`
- `client/src/shared/ui/notifications/NotificationItem.tsx`
- `client/src/shared/ui/notifications/NotificationCenter.tsx`
- All mobile component TSX files

### Day 3: Fix Button Type Attributes

**Goal**: Add missing type attributes to buttons

**Pattern**:
```typescript
// Before
<button onClick={handleClick}>

// After  
<button type="button" onClick={handleClick}>
```

**Files**:
- `client/src/shared/ui/connection-status.tsx` (2 buttons)

### Day 4: Create Shared Types Library

**Goal**: Consolidate common types and remove duplicates

**Create**: `client/src/shared/ui/types/index.ts`
```typescript
// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// Loading types (simplified)
export type LoadingSize = 'sm' | 'md' | 'lg';
export type LoadingState = 'loading' | 'success' | 'error';

export interface LoadingProps extends BaseComponentProps {
  size?: LoadingSize;
  state?: LoadingState;
  message?: string;
}

// Widget types (simplified)
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

// Error types (simplified)
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

### Day 5: Simplify Loading System

**Goal**: Reduce loading system complexity

**Actions**:
1. **Keep Core Hooks**: `useLoading`, `useLoadingState`
2. **Remove Complex Hooks**: `useProgressiveLoading`, `useTimeoutAwareLoading`, `useUnifiedLoading`
3. **Simplify Error Classes**: Keep only `LoadingError` and `LoadingTimeoutError`
4. **Remove Validation**: Remove complex validation system

**Files to Modify**:
- `client/src/shared/ui/loading/hooks/index.ts` - Remove complex exports
- `client/src/shared/ui/loading/errors.ts` - Keep only 2 error classes
- `client/src/shared/ui/loading/index.ts` - Simplify exports

## Phase 2: Structural Improvements (Days 6-15)

### Days 6-8: Dashboard Type Consolidation

**Goal**: Simplify dashboard type system

**Actions**:
1. **Create Core Types**: `client/src/shared/ui/dashboard/types/core.ts`
2. **Create Widget Types**: `client/src/shared/ui/dashboard/types/widgets.ts`
3. **Create Component Types**: `client/src/shared/ui/dashboard/types/components.ts`
4. **Update Imports**: Fix all dashboard imports

**Core Types**:
```typescript
// core.ts
export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
}

export interface DashboardState {
  config: DashboardConfig | null;
  loading: boolean;
  error: Error | null;
}
```

### Days 9-11: Standardize Error Handling

**Goal**: Create consistent error handling patterns

**Create**: `client/src/shared/ui/utils/error-handling.ts`
```typescript
export interface ErrorHandler {
  handleError: (error: Error, context?: string) => void;
  logError: (error: Error, context?: string) => void;
  displayError: (error: Error) => void;
}

export const createErrorHandler = (): ErrorHandler => ({
  handleError: (error, context) => {
    console.error(`[${context}]`, error);
    // Standard error handling logic
  },
  logError: (error, context) => {
    // Standard logging logic
  },
  displayError: (error) => {
    // Standard error display logic
  }
});
```

### Days 12-15: Component Pattern Standardization

**Goal**: Create consistent component patterns

**Create**: `client/src/shared/ui/templates/`
- `component-template.tsx` - Standard component template
- `hook-template.ts` - Standard hook template
- `types-template.ts` - Standard types template

**Template Example**:
```typescript
// component-template.tsx
import React from 'react';
import { BaseComponentProps } from '../types';

export interface ComponentNameProps extends BaseComponentProps {
  // Component-specific props
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  className,
  children,
  testId,
  ...props
}) => {
  return (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  );
};

export default ComponentName;
```

## Phase 3: Long-term Architecture (Days 16-30)

### Days 16-20: Create Architectural Guidelines

**Create**: `docs/SHARED_UI_GUIDELINES.md`

**Content**:
1. **Component Structure Standards**
2. **Import Path Rules**
3. **Error Handling Patterns**
4. **Type Definition Guidelines**
5. **Testing Requirements**

### Days 21-25: Implement Linting Rules

**Goal**: Prevent regression of fixed issues

**Create**: `.eslintrc.shared-ui.js`
```javascript
module.exports = {
  rules: {
    // Require React import in TSX files
    'react/react-in-jsx-scope': 'error',
    
    // Standardize import paths
    'import/no-restricted-paths': ['error', {
      patterns: [{
        group: ['@/*'],
        from: 'client/src/shared/ui/**',
        message: 'Use @client/ imports in shared UI components'
      }]
    }],
    
    // Require button type attributes
    'react/button-has-type': 'error',
    
    // Limit component complexity
    'complexity': ['error', 10]
  }
};
```

### Days 26-30: Documentation and Training

**Goal**: Ensure team adoption of new patterns

**Actions**:
1. **Create Documentation**: Component usage guides
2. **Code Review Checklist**: Standards enforcement
3. **Team Training**: Architecture overview
4. **Migration Guide**: How to update existing components

## Implementation Scripts

### Import Path Fix Script
```bash
#!/bin/bash
# fix-imports.sh

echo "Fixing import paths in shared UI..."

# Fix @/ to @client/ imports
find client/src/shared/ui -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i 's|from '\''@/|from '\''@client/|g' "$file"
  sed -i 's|import '\''@/|import '\''@client/|g' "$file"
  echo "Fixed imports in $file"
done

echo "Import path fixes complete!"
```

### React Import Fix Script
```bash
#!/bin/bash
# fix-react-imports.sh

echo "Adding missing React imports..."

# List of TSX files missing React imports
files=(
  "client/src/shared/ui/realtime/RealTimeNotifications.tsx"
  "client/src/shared/ui/realtime/RealTimeDashboard.tsx"
  "client/src/shared/ui/privacy/PrivacyManager.tsx"
  # ... add all files from analysis
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if React import already exists
    if ! grep -q "import React" "$file"; then
      # Add React import at the top
      sed -i '1i import React from '\''react'\'';' "$file"
      echo "Added React import to $file"
    fi
  fi
done

echo "React import fixes complete!"
```

### Button Type Fix Script
```bash
#!/bin/bash
# fix-button-types.sh

echo "Adding type attributes to buttons..."

find client/src/shared/ui -name "*.tsx" | while read file; do
  # Add type="button" to buttons without type attribute
  sed -i 's|<button \([^>]*\)onClick|<button type="button" \1onClick|g' "$file"
  echo "Fixed button types in $file"
done

echo "Button type fixes complete!"
```

## Success Metrics

### Phase 1 Success Criteria
- [ ] All import paths use consistent `@client/` alias
- [ ] All TSX files have React imports
- [ ] All buttons have type attributes
- [ ] Loading system reduced to core functionality
- [ ] Build passes without import errors

### Phase 2 Success Criteria  
- [ ] Dashboard types reduced by 50%
- [ ] Consistent error handling across all components
- [ ] Standard component patterns established
- [ ] No duplicate type definitions

### Phase 3 Success Criteria
- [ ] Architectural guidelines documented
- [ ] Linting rules prevent regressions
- [ ] Team trained on new patterns
- [ ] Code complexity metrics improved

## Risk Mitigation

### Backup Strategy
- Create git branch before each phase
- Test changes in isolated environment
- Gradual rollout with monitoring

### Rollback Plan
- Keep original files backed up
- Document all changes made
- Prepare rollback scripts for each phase

### Testing Strategy
- Run full test suite after each day's changes
- Manual testing of affected components
- Integration testing with dependent systems

This plan provides a systematic approach to fixing the shared UI bug sprawl while minimizing risk and ensuring long-term maintainability.