# Backward Compatibility Plan

## Overview

This document outlines the strategy for maintaining backward compatibility during the hooks architecture migration. The goal is to ensure that existing code continues to work while gradually transitioning to the new standardized patterns.

## Compatibility Strategy

### Phase 1: Parallel Implementation (Week 1-2)
- Maintain existing exports in `client/src/hooks/index.ts`
- Create new standardized hooks alongside existing ones
- Add deprecation warnings for old patterns
- Provide migration utilities

### Phase 2: Gradual Migration (Week 3-6)
- Update internal usage to new patterns
- Provide compatibility shims
- Monitor for breaking changes
- Update documentation

### Phase 3: Cleanup (Week 7-8)
- Remove deprecated exports
- Clean up compatibility code
- Final validation
- Complete migration

## Compatibility Matrix

### Current vs. New Patterns

| Current Hook | New Hook | Compatibility | Migration Required |
|--------------|----------|---------------|-------------------|
| `use-toast.ts` | `use-toast.ts` | ✅ Compatible | No |
| `use-mobile.tsx` | `use-mobile.ts` | ⚠️ Extension change | Yes |
| `useOfflineDetection.tsx` | `use-offline-detection.ts` | ⚠️ Extension change | Yes |
| `useSystem.tsx` | `use-system.ts` | ⚠️ Extension change | Yes |
| `useCleanup.tsx` | `use-cleanup.ts` | ⚠️ Extension change | Yes |
| `useErrorRecovery.ts` | `use-error-recovery.ts` | ✅ Compatible | No |
| `use-safe-query.ts` | `use-safe-query.ts` | ✅ Compatible | No |

## Implementation Plan

### 1. Compatibility Layer

Create `client/src/hooks/compatibility/index.ts`:

```typescript
/**
 * Compatibility layer for hooks migration
 * Provides backward compatibility during transition period
 */

// Re-export existing hooks with deprecation warnings
export { useToast } from './use-toast';
export { useErrorRecovery } from './use-error-recovery';
export { useOfflineCapabilities } from './use-offline-capabilities';
export { useSafeQuery } from './use-safe-query';
export { useDebounce } from './use-debounce';
export { useMediaQuery } from './use-media-query';
export { useKeyboardFocus } from './use-keyboard-focus';
export { usePerformanceMonitor } from './use-performance-monitor';
export { useArchitecturePerformance } from './use-architecture-performance';

// Deprecated hooks with warnings
let deprecationWarnings = new Set<string>();

function warnDeprecated(hookName: string, newLocation?: string) {
  if (!deprecationWarnings.has(hookName)) {
    deprecationWarnings.add(hookName);
    console.warn(
      `[Hooks Migration] ${hookName} is deprecated and will be removed in future versions. ${
        newLocation ? `Use ${newLocation} instead.` : 'Check migration guide for details.'
      }`
    );
  }
}

// Deprecated exports with warnings
export function useMobile() {
  warnDeprecated('useMobile', 'use-mobile.ts');
  return require('./use-mobile').useMobile();
}

export function useOfflineDetection() {
  warnDeprecated('useOfflineDetection', 'use-offline-detection.ts');
  return require('./use-offline-detection').useOfflineDetection();
}

export function useSystem() {
  warnDeprecated('useSystem', 'use-system.ts');
  return require('./use-system').useSystem();
}

export function useCleanup() {
  warnDeprecated('useCleanup', 'use-cleanup.ts');
  return require('./use-cleanup').useCleanup();
}

// Mobile hooks compatibility
export { useBottomSheet } from './mobile/use-bottom-sheet';
export { useDeviceInfo } from './mobile/use-device-info';
export { useInfiniteScroll } from './mobile/use-infinite-scroll';
export { useMobileNavigation } from './mobile/use-mobile-navigation';
export { useMobileTabs } from './mobile/use-mobile-tabs';
export { usePullToRefresh } from './mobile/use-pull-to-refresh';
export { useScrollManager } from './mobile/use-scroll-manager';
export { useSwipeGesture } from './mobile/use-swipe-gesture';
```

### 2. Migration Utilities

Create `client/src/hooks/utils/migration.ts`:

```typescript
/**
 * Migration utilities for hooks architecture
 */

export interface MigrationInfo {
  oldHook: string;
  newHook: string;
  breakingChanges: string[];
  migrationSteps: string[];
}

export const MIGRATION_MAP: Record<string, MigrationInfo> = {
  'use-mobile': {
    oldHook: 'use-mobile.tsx',
    newHook: 'use-mobile.ts',
    breakingChanges: ['File extension change from .tsx to .ts'],
    migrationSteps: [
      'Update import path: import { useMobile } from "@/hooks/use-mobile"',
      'No code changes required - same API',
    ],
  },
  'use-offline-detection': {
    oldHook: 'useOfflineDetection.tsx',
    newHook: 'use-offline-detection.ts',
    breakingChanges: ['File extension change from .tsx to .ts'],
    migrationSteps: [
      'Update import path: import { useOfflineDetection } from "@/hooks/use-offline-detection"',
      'No code changes required - same API',
    ],
  },
  'use-system': {
    oldHook: 'useSystem.tsx',
    newHook: 'use-system.ts',
    breakingChanges: ['File extension change from .tsx to .ts'],
    migrationSteps: [
      'Update import path: import { useSystem } from "@/hooks/use-system"',
      'No code changes required - same API',
    ],
  },
  'use-cleanup': {
    oldHook: 'useCleanup.tsx',
    newHook: 'use-cleanup.ts',
    breakingChanges: ['File extension change from .tsx to .ts'],
    migrationSteps: [
      'Update import path: import { useCleanup } from "@/hooks/use-cleanup"',
      'No code changes required - same API',
    ],
  },
};

export function getMigrationInfo(hookName: string): MigrationInfo | null {
  return MIGRATION_MAP[hookName] || null;
}

export function validateMigration(hookName: string, currentCode: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for old import patterns
  if (currentCode.includes(`from '@/hooks/${hookName}.tsx'`)) {
    issues.push(`Using deprecated .tsx extension for ${hookName}`);
    suggestions.push(`Change import to: from '@/hooks/${hookName}.ts'`);
  }
  
  // Check for deprecated hook usage
  if (hookName in MIGRATION_MAP) {
    const migration = MIGRATION_MAP[hookName];
    issues.push(`${hookName} has been migrated to new patterns`);
    suggestions.push(`Review migration guide: ${migration.newHook}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

export function generateMigrationReport(): string {
  const report = ['Hooks Migration Report', '====================', ''];
  
  Object.entries(MIGRATION_MAP).forEach(([hook, info]) => {
    report.push(`## ${hook}`, '');
    report.push(`**Old Location:** ${info.oldHook}`);
    report.push(`**New Location:** ${info.newHook}`);
    report.push('');
    report.push('**Breaking Changes:**');
    info.breakingChanges.forEach(change => {
      report.push(`- ${change}`);
    });
    report.push('');
    report.push('**Migration Steps:**');
    info.migrationSteps.forEach(step => {
      report.push(`1. ${step}`);
    });
    report.push('');
  });
  
  return report.join('\n');
}
```

### 3. Import Path Resolution

Update `client/src/hooks/index.ts` with compatibility:

```typescript
/**
 * Hooks Index with Backward Compatibility
 * 
 * This file provides backward compatibility during the migration period.
 * All hooks are available through this index, with deprecation warnings
 * for hooks that have been migrated.
 */

// Core hooks (already compatible)
export { useToast } from './use-toast';
export { useErrorRecovery } from './use-error-recovery';
export { useOfflineCapabilities } from './use-offline-capabilities';
export { useSafeQuery } from './use-safe-query';
export { useDebounce } from './use-debounce';
export { useMediaQuery } from './use-media-query';
export { useKeyboardFocus } from './use-keyboard-focus';
export { usePerformanceMonitor } from './use-performance-monitor';
export { useArchitecturePerformance } from './use-architecture-performance';

// Deprecated hooks with compatibility layer
export { useMobile } from './compatibility';
export { useOfflineDetection } from './compatibility';
export { useSystem } from './compatibility';
export { useCleanup } from './compatibility';

// Mobile hooks
export {
  useBottomSheet,
  useDeviceInfo,
  useInfiniteScroll,
  useMobileNavigation,
  useMobileTabs,
  usePullToRefresh,
  useScrollManager,
  useSwipeGesture,
} from './mobile';

// FSD migration exports (for future use)
// These will be updated as FSD migration progresses
export { useAuth } from '../features/users/hooks';
export { useApiConnection } from '../core/api/hooks';
export { useUnifiedNavigation } from '../core/navigation/hooks';
export { useTimeoutAwareLoading } from '../core/loading/hooks';

// Migration utilities
export { getMigrationInfo, validateMigration, generateMigrationReport } from './utils/migration';
```

### 4. Automated Migration Scripts

Create `client/scripts/migrate-hooks.js`:

```javascript
/**
 * Automated migration script for hooks
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const MIGRATION_RULES = [
  {
    pattern: /from ['"]@\/hooks\/(use-mobile|use-offline-detection|use-system|use-cleanup)\.tsx['"]/g,
    replacement: (match, hook) => match.replace('.tsx', '.ts'),
    description: 'Update file extensions from .tsx to .ts'
  },
  {
    pattern: /import.*\{.*useMobile.*\}.*from.*['"]@\/hooks['"]/g,
    replacement: 'import { useMobile } from "@/hooks/use-mobile"',
    description: 'Update useMobile import path'
  },
  {
    pattern: /import.*\{.*useOfflineDetection.*\}.*from.*['"]@\/hooks['"]/g,
    replacement: 'import { useOfflineDetection } from "@/hooks/use-offline-detection"',
    description: 'Update useOfflineDetection import path'
  },
  {
    pattern: /import.*\{.*useSystem.*\}.*from.*['"]@\/hooks['"]/g,
    replacement: 'import { useSystem } from "@/hooks/use-system"',
    description: 'Update useSystem import path'
  },
  {
    pattern: /import.*\{.*useCleanup.*\}.*from.*['"]@\/hooks['"]/g,
    replacement: 'import { useCleanup } from "@/hooks/use-cleanup"',
    description: 'Update useCleanup import path'
  }
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  MIGRATION_RULES.forEach(rule => {
    const originalContent = content;
    content = content.replace(rule.pattern, rule.replacement);
    
    if (content !== originalContent) {
      hasChanges = true;
      console.log(`Applied rule: ${rule.description} to ${filePath}`);
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function migrateProject() {
  const files = glob.sync('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  });
  
  console.log(`Found ${files.length} files to check...`);
  
  files.forEach(file => {
    migrateFile(file);
  });
  
  console.log('Migration complete!');
}

if (require.main === module) {
  migrateProject();
}

module.exports = { migrateProject, MIGRATION_RULES };
```

## Migration Timeline

### Week 1-2: Setup Compatibility Layer
- [ ] Create compatibility layer
- [ ] Add deprecation warnings
- [ ] Set up migration utilities
- [ ] Update documentation

### Week 3-4: Internal Migration
- [ ] Migrate internal usage to new patterns
- [ ] Update test files
- [ ] Validate compatibility
- [ ] Monitor for issues

### Week 5-6: External Migration
- [ ] Migrate external dependencies
- [ ] Update documentation
- [ ] Provide migration guides
- [ ] Monitor adoption

### Week 7-8: Cleanup
- [ ] Remove deprecated exports
- [ ] Clean up compatibility code
- [ ] Final validation
- [ ] Complete migration

## Breaking Changes Management

### Deprecation Warnings
```typescript
// Add to deprecated hooks
console.warn(
  `[Deprecation] useMobile is deprecated. Use use-mobile.ts instead.`
);
```

### Version Compatibility
```typescript
// Check Node.js version compatibility
const currentNodeVersion = process.versions.node;
const majorNodeVersion = parseInt(currentNodeVersion.split('.')[0], 10);

if (majorNodeVersion < 16) {
  console.warn('[Compatibility] Hooks migration requires Node.js 16+');
}
```

### Feature Flags
```typescript
// Optional feature flags for gradual rollout
const ENABLE_NEW_HOOKS = process.env.ENABLE_NEW_HOOKS !== 'false';

if (ENABLE_NEW_HOOKS) {
  // Use new patterns
} else {
  // Use old patterns
}
```

## Testing Compatibility

### Compatibility Tests
```typescript
// __tests__/compatibility.test.ts
describe('Backward Compatibility', () => {
  it('should provide deprecated hooks through compatibility layer', () => {
    const { useMobile } = require('../compatibility');
    
    expect(typeof useMobile).toBe('function');
  });
  
  it('should show deprecation warnings', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    require('../compatibility').useMobile();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated')
    );
    
    consoleSpy.mockRestore();
  });
  
  it('should maintain API compatibility', () => {
    const { useToast } = require('../use-toast');
    const { useToast: useToastNew } = require('../use-toast');
    
    // Both should have same API
    expect(typeof useToast).toBe(typeof useToastNew);
  });
});
```

### Migration Validation Tests
```typescript
// __tests__/migration-validation.test.ts
describe('Migration Validation', () => {
  it('should validate migration paths', () => {
    const { validateMigration } = require('../utils/migration');
    
    const result = validateMigration('use-mobile', `
      import { useMobile } from '@/hooks/use-mobile.tsx'
    `);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Using deprecated .tsx extension');
  });
  
  it('should generate migration report', () => {
    const { generateMigrationReport } = require('../utils/migration');
    
    const report = generateMigrationReport();
    
    expect(report).toContain('Hooks Migration Report');
    expect(report).toContain('use-mobile');
  });
});
```

## Rollback Plan

### Emergency Rollback
```typescript
// Emergency rollback mechanism
const ENABLE_MIGRATION = process.env.ENABLE_HOOKS_MIGRATION !== 'false';

if (!ENABLE_MIGRATION) {
  // Use old patterns
  module.exports = require('./hooks-old');
} else {
  // Use new patterns
  module.exports = require('./hooks-new');
}
```

### Feature Toggle
```typescript
// Feature toggle for gradual rollout
export function useHookWithFallback(hookName: string) {
  if (process.env.NODE_ENV === 'production' && !isMigrationEnabled()) {
    return require(`./${hookName}-old`);
  }
  
  return require(`./${hookName}-new`);
}
```

## Success Criteria

### Functional Requirements
- [ ] All existing code continues to work
- [ ] Deprecation warnings are shown appropriately
- [ ] Migration utilities work correctly
- [ ] Rollback mechanisms are in place

### Non-Functional Requirements
- [ ] Migration completes within 8 weeks
- [ ] No breaking changes for end users
- [ ] Performance impact < 1%
- [ ] Developer experience improved

## Monitoring and Validation

### Metrics to Track
- Deprecation warning frequency
- Migration adoption rate
- Error rates during migration
- Performance impact

### Validation Checklist
- [ ] All tests pass with new patterns
- [ ] No breaking changes in public API
- [ ] Performance benchmarks maintained
- [ ] Developer feedback is positive

This backward compatibility plan ensures a smooth transition to the new hooks architecture while maintaining system stability and developer productivity.
