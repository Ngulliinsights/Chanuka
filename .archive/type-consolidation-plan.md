# Legacy Types Directory Consolidation Plan

## Current State Analysis

### Legacy Directory Structure (`client/src/types/`)
- **27 type files** with mixed consolidation status
- **Index file** marked as deprecated but still actively used
- **Re-export pattern** - most files re-export from newer locations
- **Active usage** - 50+ files still importing from legacy location

### Current Type Organization
1. **`client/src/core/api/types/`** - API-related types (well organized)
2. **`client/src/lib/types/`** - Shared types (minimal, mostly re-exports)
3. **`client/src/types/`** - Legacy location (deprecated but active)

## Migration Strategy: REPLACE with Gradual Migration

### Phase 1: Update Active Imports (Immediate)
**Files with active legacy imports (50+ files):**

#### High Priority - Dashboard Types
- `@client/types/user-dashboard` → `@client/core/api/types/preferences` + new dashboard types
- Used in: UserDashboard.tsx, useDashboardData.ts, dashboard sections, modals

#### High Priority - Auth Types  
- `@client/types/auth` → `@client/core/auth/types`
- Used in: Privacy components, auth forms

#### Medium Priority - Navigation Types
- `@client/types/navigation` → `@client/lib/types/navigation` (new)
- Used in: Navigation components, routing

#### Medium Priority - Mobile Types
- `@client/types/mobile` → `@client/lib/types/mobile` (new)
- Used in: Mobile UI components

#### Low Priority - Core Types
- `@client/types/core` → `@client/core/api/types/common`
- Used in: Bill components, community features

### Phase 2: Create Missing Type Locations

#### Create `client/src/lib/types/navigation.ts`
```typescript
// Navigation-specific types that don't belong in API layer
export type NavigationItem = { ... }
export type NavigationSection = { ... }
export type UserRole = { ... }
```

#### Create `client/src/lib/types/mobile.ts`
```typescript
// Mobile UI-specific types
export type MobileTab = { ... }
export type SwipeGestureData = { ... }
export type BottomSheetConfig = { ... }
```

#### Extend `client/src/core/api/types/preferences.ts`
```typescript
// Add dashboard-specific preference types
export type DashboardPreferences = { ... }
export type DataExportRequest = { ... }
```

### Phase 3: Systematic Import Updates

#### Batch 1: Dashboard Components (8 files)
- UserDashboard.tsx
- useDashboardData.ts  
- Dashboard sections (5 files)

#### Batch 2: Privacy Components (6 files)
- Privacy interfaces and controls

#### Batch 3: Navigation Components (4 files)
- Navigation utilities and hooks

#### Batch 4: Mobile Components (6 files)
- Mobile UI components

#### Batch 5: Feature Components (20+ files)
- Bills, community, user features

### Phase 4: Remove Legacy Directory

After all imports are updated:
1. Delete `client/src/types/` directory
2. Update tsconfig.json paths
3. Update documentation

## Implementation Commands

### Step 1: Create Missing Type Files
```bash
# Create navigation types
mkdir -p client/src/lib/types
# Copy navigation types from legacy location
# Update exports in client/src/lib/types/index.ts
```

### Step 2: Update Imports (Automated)
```bash
# Dashboard types
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/types\/user-dashboard/@client\/core\/api\/types\/preferences/g'

# Auth types  
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/types\/auth/@client\/core\/auth\/types/g'

# Navigation types
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/types\/navigation/@client\/shared\/types\/navigation/g'

# Mobile types
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/types\/mobile/@client\/shared\/types\/mobile/g'

# Core types
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/types\/core/@client\/core\/api\/types\/common/g'
```

## Risk Assessment

### Low Risk
- **API types** - Already consolidated in `core/api/types`
- **Auth types** - Already consolidated in `core/auth/types`

### Medium Risk  
- **Dashboard types** - Need to extend preferences types
- **Navigation types** - Need new shared location

### High Risk
- **Mobile types** - Heavy usage, need careful migration
- **Core types** - Widely used, potential conflicts

## Success Criteria

1. ✅ Zero imports from `@client/types/`
2. ✅ All types available in appropriate new locations
3. ✅ No TypeScript compilation errors
4. ✅ No runtime errors in components
5. ✅ Legacy directory successfully deleted

## Timeline

- **Week 1**: Create missing type files, update dashboard imports
- **Week 2**: Update auth, navigation, mobile imports  
- **Week 3**: Update remaining imports, test thoroughly
- **Week 4**: Remove legacy directory, update documentation