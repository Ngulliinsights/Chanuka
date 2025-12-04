# Naming Conventions Analysis for Chanuka Client

## Current State

### Directory Structure
- **Primary pattern**: kebab-case (e.g., `src/`, `components/`, `services/`, `utils/`, `types/`)
- **Inconsistencies**:
  - `contexts/` exists alongside `context/` (plural vs singular)
  - Most directories follow kebab-case consistently

### Source Files (.ts, .tsx, .js, .jsx)
- **Services**: Mixed conventions
  - kebab-case: `analysis.ts`, `api.ts`, `navigation.ts`, `index.ts`
  - camelCase: `apiInterceptors.ts`, `billsDataCache.ts`, `mockDataService.ts`, `errorAnalyticsBridge.ts`
  - PascalCase: `AuthService.ts`, `PageRelationshipService.ts`
- **Utils**: Primarily kebab-case with some camelCase
  - kebab-case: `asset-loader.ts`, `asset-manager.ts`, `bundle-analyzer.ts`
  - camelCase: `backgroundSyncManager.ts`, `browserCompatibilityManager.ts`
- **Types**: Consistently kebab-case (e.g., `api.ts`, `auth.ts`, `navigation.ts`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-performance-monitor.ts`)
- **Components**: Mixed
  - PascalCase: `ErrorBoundary.tsx`, `LazyPageWrapper.tsx`, `OfflineIndicator.tsx`
  - kebab-case: `feature-flags-panel.tsx`, `project-overview.tsx`, `error-message.tsx`
- **Store slices**: camelCase (e.g., `authSlice.ts`, `userDashboardSlice.ts`)

### Test Files
- **Organization**: `__tests__/` directories with subdirectories for categories (e.g., `unit/`, `integration/`, `e2e/`, `performance/`)
- **Naming**: Primarily kebab-case for file names
  - Examples: `api-flow.e2e.test.ts`, `browser-compatibility.test.ts`, `lazy-loading.test.tsx`
- **Inconsistencies**: Some PascalCase (e.g., `NavigationCore.test.tsx`, `NavigationFlow.integration.test.tsx`)

### Configuration Files
- **Pattern**: kebab-case for base names
  - `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `vitest.config.ts`
- **Extensions**: Standard (`.json`, `.ts`, `.js`)

### CSS and Style Files
- **Pattern**: kebab-case
  - `chanuka-design-system.css`, `design-tokens.css`, `globals.css`
  - Subdirectories: `components/buttons.css`, `themes/dark.css`
- **Existing pattern**: `chanuka-` prefix used in CSS classes (e.g., `.chanuka-button`)

### Build Artifacts and Temporary Files
- **Scripts**: kebab-case (e.g., `build-analyzer.ts`, `performance-budget-check.js`)
- **Reports**: kebab-case (e.g., `design-system-audit-report.json`)

## Identified Inconsistencies

1. **Service files**: Mix of kebab-case, camelCase, and PascalCase
2. **Component files**: Mix of PascalCase and kebab-case (should be PascalCase for React components)
3. **Test files**: Mostly kebab-case but some PascalCase
4. **Directory naming**: `context/` vs `contexts/` (should standardize)
5. **Utils**: Some camelCase in otherwise kebab-case directory

## Recommended Naming Convention Strategy

### General Principles
- Align with React/TypeScript best practices
- Use kebab-case for file and directory names (except where convention dictates otherwise)
- Maintain consistency with existing `chanuka-` prefix pattern

### Specific Recommendations

#### Directories
- kebab-case: `components/`, `services/`, `utils/`, `types/`, `hooks/`
- Consolidate `context/` and `contexts/` → use `contexts/` for consistency

#### Source Files
- **Components**: PascalCase (e.g., `ErrorBoundary.tsx`, `UserDashboard.tsx`)
- **Services**: kebab-case (e.g., `auth-service.ts`, `api-client.ts`)
- **Utils**: kebab-case (e.g., `asset-loader.ts`, `date-formatter.ts`)
- **Types**: kebab-case (e.g., `user-types.ts`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-auth.ts`)
- **Store slices**: camelCase (e.g., `authSlice.ts`)

#### Test Files
- kebab-case for file names (e.g., `auth-service.test.ts`, `user-dashboard.test.tsx`)
- Maintain category subdirectories (`unit/`, `integration/`, etc.)

#### Configuration Files
- kebab-case for base names (current pattern is good)

#### CSS Files
- kebab-case (current pattern is good)
- Continue `chanuka-` prefix for project-specific classes

### Migration Strategy
1. **Audit phase**: Identify all files needing rename
2. **Gradual migration**: Rename files in batches, updating imports
3. **Tools**: Use automated refactoring tools in IDE
4. **Testing**: Ensure all imports and references are updated

### Benefits
- Improved code readability and maintainability
- Consistency with React/TypeScript ecosystem standards
- Easier navigation and file discovery
- Alignment with existing project patterns (chanuka- prefix)