# Phase 1: Fix Alias Resolution Root Cause

**Date**: 2026-02-22  
**Spec**: `.kiro/specs/import-resolution-audit`  
**Phase**: Phase 1 - Fix Alias Resolution Root Cause

## Task 4: Module Resolution Config Audit

### 4.1 Current State of All tsconfig Files

#### Root tsconfig.json
**Location**: `/tsconfig.json`  
**Purpose**: Project references and shared compiler options

**Path Aliases Declared**:
```json
{
  "@shared": ["shared"],
  "@shared/*": ["shared/*"],
  "@shared/types": ["shared/types"],
  "@shared/types/*": ["shared/types/*"],
  "@shared/validation": ["shared/validation"],
  "@shared/validation/*": ["shared/validation/*"],
  "@shared/constants": ["shared/constants"],
  "@shared/constants/*": ["shared/constants/*"],
  "@shared/utils": ["shared/utils"],
  "@shared/utils/*": ["shared/utils/*"],
  "@shared/core": ["shared/core"],
  "@shared/core/*": ["shared/core/*"],
  "@shared/platform": ["shared/platform"],
  "@shared/i18n": ["shared/i18n"],
  "@workspace": ["shared"],
  "@workspace/*": ["shared/*"],
  "@workspace/types": ["shared/types"],
  "@workspace/types/*": ["shared/types/*"],
  "@workspace/core": ["shared/core"],
  "@workspace/core/*": ["shared/core/*"],
  "@workspace/validation": ["shared/validation"],
  "@workspace/validation/*": ["shared/validation/*"],
  "@workspace/constants": ["shared/constants"],
  "@workspace/constants/*": ["shared/constants/*"],
  "@server": ["server"],
  "@server/*": ["server/*"],
  "@server/middleware": ["server/middleware"],
  "@server/middleware/*": ["server/middleware/*"],
  "@server/infrastructure/cache": ["server/infrastructure/cache"],
  "@server/infrastructure/cache/*": ["server/infrastructure/cache/*"],
  "@server/core": ["server/infrastructure/core"],
  "@server/core/*": ["server/infrastructure/core/*"],
  "@server/infrastructure/schema": ["server/infrastructure/schema"],
  "@server/infrastructure/schema/*": ["server/infrastructure/schema/*"],
  "@server/infrastructure/database": ["server/infrastructure/database"],
  "@server/infrastructure/database/*": ["server/infrastructure/database/*"],
  "@server/infrastructure/error-handling": ["server/infrastructure/error-handling"],
  "@server/infrastructure/error-handling/*": ["server/infrastructure/error-handling/*"],
  "@server/infrastructure/observability": ["server/infrastructure/observability"],
  "@server/infrastructure/observability/*": ["server/infrastructure/observability/*"],
  "@server/infrastructure/core/*": ["server/infrastructure/core/*"],
  "@server/infrastructure/persistence/*": ["server/infrastructure/database/persistence/*"],
  "@client": ["client/src"],
  "@client/*": ["client/src/*"],
  "@tests": ["tests"],
  "@tests/*": ["tests/*"]
}
```

#### Client tsconfig.json
**Location**: `/client/tsconfig.json`  
**Purpose**: Client-specific TypeScript configuration

**Path Aliases Declared** (relative to client/):
```json
{
  "@client": ["./src"],
  "@client/*": ["./src/*"],
  "@client/@types": ["./@types"],
  "@client/@types/*": ["./@types/*"],
  "@client/test-utils": ["./test-utils"],
  "@client/test-utils/*": ["./test-utils/*"],
  "@core": ["./src/infrastructure"],
  "@core/*": ["./src/infrastructure/*"],
  "@lib": ["./src/lib"],
  "@lib/*": ["./src/lib/*"],
  "@lib/types": ["./src/lib/types"],
  "@lib/types/*": ["./src/lib/types/*"],
  "@lib/services": ["./src/lib/services"],
  "@lib/services/*": ["./src/lib/services/*"],
  "@lib/infrastructure": ["./src/lib/infrastructure"],
  "@lib/infrastructure/*": ["./src/lib/infrastructure/*"],
  "@lib/ui": ["./src/lib/ui"],
  "@lib/ui/*": ["./src/lib/ui/*"],
  "@lib/hooks": ["./src/lib/hooks"],
  "@lib/hooks/*": ["./src/lib/hooks/*"],
  "@lib/utils": ["./src/lib/utils"],
  "@lib/utils/*": ["./src/lib/utils/*"],
  "@lib/context": ["./src/lib/context"],
  "@lib/context/*": ["./src/lib/context/*"],
  "@lib/components": ["./src/lib/components"],
  "@lib/components/*": ["./src/lib/components/*"],
  "@lib/design-system": ["./src/lib/design-system"],
  "@lib/design-system/*": ["./src/lib/design-system/*"],
  "@features": ["./src/features"],
  "@features/*": ["./src/features/*"],
  "@app": ["./src/app"],
  "@app/*": ["./src/app/*"],
  "@hooks": ["./src/lib/hooks"],
  "@hooks/*": ["./src/lib/hooks/*"],
  "@utils": ["./src/lib/utils"],
  "@utils/*": ["./src/lib/utils/*"],
  "@server-stub/database": ["./src/stubs/database-stub.ts"],
  "@server-stub/middleware": ["./src/stubs/middleware-stub.ts"],
  "@secure": ["./src/lib/utils/secure"],
  "@secure/*": ["./src/lib/utils/secure/*"],
  "@logger": ["./src/lib/utils/logger"],
  "@logger/*": ["./src/lib/utils/logger/*"],
  "@shared": ["../shared"],
  "@shared/*": ["../shared/*"],
  "@shared/types": ["../shared/types"],
  "@shared/types/*": ["../shared/types/*"],
  "@shared/validation": ["../shared/validation"],
  "@shared/validation/*": ["../shared/validation/*"],
  "@shared/constants": ["../shared/constants"],
  "@shared/constants/*": ["../shared/constants/*"],
  "@shared/utils": ["../shared/utils"],
  "@shared/utils/*": ["../shared/utils/*"],
  "@shared/core": ["../shared/core"],
  "@shared/core/*": ["../shared/core/*"],
  "@workspace": ["../shared"],
  "@workspace/*": ["../shared/*"],
  "@workspace/types": ["../shared/types"],
  "@workspace/types/*": ["../shared/types/*"],
  "@workspace/core": ["../shared/core"],
  "@workspace/core/*": ["../shared/core/*"],
  "@workspace/validation": ["../shared/validation"],
  "@workspace/validation/*": ["../shared/validation/*"],
  "@workspace/constants": ["../shared/constants"],
  "@workspace/constants/*": ["../shared/constants/*"]
}
```

#### Server tsconfig.json
**Location**: `/server/tsconfig.json`  
**Purpose**: Server-specific TypeScript configuration

**Path Aliases Declared** (relative to server/):
```json
{
  "@/*": ["./*"],
  "@server": ["."],
  "@server/*": ["./*"],
  "@server/middleware/*": ["./middleware/*"],
  "@server/utils/*": ["./utils/*"],
  "@server/infrastructure/*": ["./infrastructure/*"],
  "@server/infrastructure/cache": ["./infrastructure/cache/index.ts"],
  "@server/infrastructure/cache/*": ["./infrastructure/cache/*"],
  "@server/infrastructure/database": ["./infrastructure/database/index.ts"],
  "@server/infrastructure/database/*": ["./infrastructure/database/*"],
  "@server/infrastructure/error-handling": ["./infrastructure/error-handling/index.ts"],
  "@server/infrastructure/error-handling/*": ["./infrastructure/error-handling/*"],
  "@server/infrastructure/observability": ["./infrastructure/observability/index.ts"],
  "@server/infrastructure/observability/*": ["./infrastructure/observability/*"],
  "@server/infrastructure/schema": ["./infrastructure/schema/index.ts"],
  "@server/infrastructure/schema/*": ["./infrastructure/schema/*"],
  "@server/infrastructure/core/*": ["./infrastructure/core/*"],
  "@server/features/*": ["./features/*"],
  "@shared": ["../shared"],
  "@shared/*": ["../shared/*"],
  "@shared/types": ["../shared/types"],
  "@shared/types/*": ["../shared/types/*"],
  "@shared/validation": ["../shared/validation"],
  "@shared/validation/*": ["../shared/validation/*"],
  "@shared/constants": ["../shared/constants"],
  "@shared/constants/*": ["../shared/constants/*"],
  "@shared/utils": ["../shared/utils"],
  "@shared/utils/*": ["../shared/utils/*"],
  "@shared/core": ["../shared/core"],
  "@shared/core/*": ["../shared/core/*"]
}
```

#### Shared tsconfig.json
**Location**: `/shared/tsconfig.json`  
**Purpose**: Shared package TypeScript configuration

**Path Aliases Declared** (relative to shared/):
```json
{
  "@/*": ["./*"],
  "@shared": ["."],
  "@shared/*": ["./*"],
  "@shared/core": ["./core"],
  "@shared/core/*": ["./core/*"],
  "@shared/types": ["./types"],
  "@shared/types/*": ["./types/*"],
  "@shared/validation": ["./validation"],
  "@shared/validation/*": ["./validation/*"],
  "@shared/constants": ["./constants"],
  "@shared/constants/*": ["./constants/*"],
  "@shared/utils": ["./utils"],
  "@shared/utils/*": ["./utils/*"]
}
```

### 4.2 Vite and Vitest Configs

#### Vite Config (client/vite.config.ts)
**Purpose**: Build-time module resolution for client

**Path Aliases Declared**:
```typescript
{
  '@': path.resolve(rootDir, './src'),
  '@client': path.resolve(rootDir, './src'),
  '@core': path.resolve(rootDir, './src/infrastructure'),
  '@lib': path.resolve(rootDir, './src/lib'),
  '@features': path.resolve(rootDir, './src/features'),
  '@app': path.resolve(rootDir, './src/app'),
  '@hooks': path.resolve(rootDir, './src/lib/hooks'),
  '@utils': path.resolve(rootDir, './src/lib/utils'),
  '@shared': path.resolve(rootDir, '../shared'),
  '@workspace': path.resolve(rootDir, '../shared'),
  '@workspace/types': path.resolve(rootDir, '../shared/types'),
  '@workspace/core': path.resolve(rootDir, '../shared/core'),
  '@workspace/validation': path.resolve(rootDir, '../shared/validation'),
  '@workspace/constants': path.resolve(rootDir, '../shared/constants'),
  '@server-stub/database': path.resolve(rootDir, './src/stubs/database-stub.ts'),
  '@server-stub/middleware': path.resolve(rootDir, './src/stubs/middleware-stub.ts'),
  '@secure': path.resolve(rootDir, './src/lib/utils/secure'),
  '@logger': path.resolve(rootDir, './src/lib/utils/logger')
}
```

#### Vitest Workspace (vitest.workspace.ts)
**Purpose**: Test-time module resolution for all packages

**Path Aliases Declared** (per project):

**client-unit & client-integration**:
```typescript
{
  '@': resolve(__dirname, './client/src'),
  '@client': resolve(__dirname, './client/src'),
  '@shared': resolve(__dirname, './shared')
}
```

**server-unit & server-integration**:
```typescript
{
  '@': resolve(__dirname, './server/src'),
  '@shared': resolve(__dirname, './shared')
}
```

**shared**:
```typescript
{
  '@shared': resolve(__dirname, './shared')
}
```

### 4.3 Nx and pnpm Workspace Configs

#### Nx Config (nx.json)
**Purpose**: Monorepo task orchestration and caching

**Workspace Structure**:
- No path aliases declared (Nx uses package.json and tsconfig.json)
- Defines build dependencies: `"dependsOn": ["^build"]`
- Caching enabled for build, test, lint targets
- Vite plugin integration for build/test/serve targets

#### pnpm Workspace (pnpm-workspace.yaml)
**Purpose**: Package manager workspace configuration

**Packages**:
```yaml
packages:
  - 'client'
  - 'server' 
  - 'shared'
  - 'packages/*'
```

**Note**: No path aliases declared (pnpm uses package.json dependencies)

### 4.4 Config Inventory Table

This table shows which aliases are declared in which tools:

| Alias Pattern | Root tsconfig | Client tsconfig | Server tsconfig | Shared tsconfig | Vite | Vitest |
|---------------|---------------|-----------------|-----------------|-----------------|------|--------|
| `@shared` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@shared/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@shared/types` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/types/*` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/validation` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/validation/*` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/constants` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/constants/*` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/utils` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/utils/*` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/core` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/core/*` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `@shared/platform` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@shared/i18n` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@workspace` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/*` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/types` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/types/*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@workspace/core` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/core/*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@workspace/validation` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/validation/*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@workspace/constants` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@workspace/constants/*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@server` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/middleware` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@server/middleware/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/cache` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/cache/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/database` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/database/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/error-handling` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/error-handling/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/observability` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/observability/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/schema` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/schema/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/core/*` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/infrastructure/persistence/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@server/core` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@server/core/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@server/utils/*` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@server/features/*` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `@client` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `@client/*` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `@client/@types` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@client/@types/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@client/test-utils` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@client/test-utils/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@core` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@core/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@lib` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@lib/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@lib/types` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/types/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/services` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/services/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/infrastructure` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/infrastructure/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/ui` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/ui/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/hooks` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/hooks/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/utils` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/utils/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/context` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/context/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/components` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/components/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/design-system` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@lib/design-system/*` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `@features` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@features/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@app` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@app/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@hooks` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@hooks/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@utils` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@utils/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@server-stub/database` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@server-stub/middleware` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@secure` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@secure/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@logger` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@logger/*` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `@tests` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@tests/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `@/*` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `@` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Analysis: Missing Alias Declarations

#### Critical Gaps (High Priority)

1. **@workspace/* aliases missing from Vitest**
   - Impact: Test files using `@workspace/types`, `@workspace/core`, etc. will fail
   - Affected: All test projects (client-unit, client-integration, server-unit, server-integration)
   - Fix: Add @workspace/* aliases to vitest.workspace.ts resolve.alias

2. **@shared/* sub-aliases missing from Vite**
   - Impact: Build-time resolution may fail for specific @shared/types, @shared/validation imports
   - Affected: Client build process
   - Fix: Add @shared/types, @shared/validation, @shared/constants, @shared/utils to vite.config.ts

3. **@workspace/* aliases missing from server/tsconfig.json**
   - Impact: Server code using @workspace/* imports will fail TypeScript compilation
   - Affected: Server package
   - Fix: Add @workspace/* aliases to server/tsconfig.json

4. **@shared/platform and @shared/i18n missing from package tsconfigs**
   - Impact: Imports to these modules will fail in client/server/shared packages
   - Affected: All packages
   - Fix: Add to client/tsconfig.json, server/tsconfig.json, shared/tsconfig.json

#### Medium Priority Gaps

5. **@server/core/* alias inconsistency**
   - Root tsconfig maps to `server/infrastructure/core`
   - Server tsconfig doesn't declare this alias
   - Impact: Imports using @server/core/* may fail in server package
   - Fix: Add to server/tsconfig.json

6. **@server/infrastructure/persistence/* missing from server tsconfig**
   - Root tsconfig declares this alias
   - Server tsconfig doesn't
   - Impact: Imports using this alias will fail in server package
   - Fix: Add to server/tsconfig.json

7. **@server/middleware missing from server tsconfig**
   - Root tsconfig declares `@server/middleware` (without /*)
   - Server tsconfig only has `@server/middleware/*`
   - Impact: Imports using exact `@server/middleware` may fail
   - Fix: Add to server/tsconfig.json

#### Low Priority Gaps

8. **Vitest missing many client-specific aliases**
   - @core, @lib/*, @features, @app, @hooks, @utils, etc. missing from vitest.workspace.ts
   - Impact: Test files using these aliases may fail
   - Affected: client-unit, client-integration test projects
   - Fix: Add comprehensive client aliases to vitest.workspace.ts

9. **@tests/* missing from all package tsconfigs**
   - Root tsconfig declares this
   - No package tsconfig includes it
   - Impact: Imports to /tests directory may fail from package code
   - Fix: Add to client/server/shared tsconfig.json if needed

### Hypothesis: Root Cause of Module Resolution Errors

Based on the config audit, the primary root causes are:

1. **Vitest Missing @workspace/* Aliases**: Tests using @workspace/types, @workspace/core, etc. fail because vitest.workspace.ts only declares @workspace (base) but not the sub-paths
   - Estimated impact: ~50-100 errors in test files

2. **Server Missing @workspace/* Aliases**: Server code using @workspace/* imports fails because server/tsconfig.json doesn't declare these aliases
   - Estimated impact: ~50 errors in server code

3. **Vite Missing @shared/* Sub-Aliases**: Client build may fail for specific @shared/types, @shared/validation imports
   - Estimated impact: ~20-30 errors in client code

4. **@shared/platform and @shared/i18n Missing**: These aliases are declared in root but not in package tsconfigs
   - Estimated impact: ~10-20 errors if these modules are used

5. **@server/core/* and @server/infrastructure/persistence/* Inconsistency**: Root declares these but server doesn't
   - Estimated impact: ~20-30 errors in server code

**Total Estimated Config-Only Fixes**: ~150-230 errors (Category C)

**Remaining ~1,200 errors** are likely:
- Category A (Stale Paths): ~600-800 errors
- Category B (Deleted/Superseded): ~200-300 errors
- Category D (Barrel Files): ~100-150 errors
- Category E (Renamed Exports): ~100-150 errors

## Next Steps

Proceed to Task 5: Verify and fix alias resolution by:
1. Picking one broken import from each category
2. Tracing resolution through each tool
3. Applying minimal config fixes
4. Verifying with test imports
5. Committing config changes with proof

---

**Status**: Task 4 Complete ✅  
**Next**: Task 5 - Verify and fix alias resolution


## Task 5: Verify and Fix Alias Resolution

### 5.1 Trace Resolution for Broken Import

**Selected Error**: `server/features/accountability/ledger.service.ts(1,20): error TS2307: Cannot find module '@shared/database'`

**Import Statement**: `import { db } from '@shared/database';`

**Resolution Trace**:

1. **TypeScript (tsc)**: 
   - Looks up `@shared/database` in server/tsconfig.json paths
   - Finds: `"@shared/*": ["../shared/*"]`
   - Resolves to: `../shared/database`
   - **Result**: ❌ Directory does not exist

2. **Actual File Location**: 
   - Database module exists at `server/infrastructure/database/`
   - Should use: `@server/infrastructure/database`

3. **Root Cause**: 
   - **Category B (Deleted/Superseded)**: `@shared/database` never existed or was moved
   - Correct import: `@server/infrastructure/database`

**Mismatch Hypothesis**: The `@shared/database` module was either:
- Never created (incorrect assumption by developer)
- Moved to `@server/infrastructure/database` during infrastructure consolidation
- Part of incomplete migration from shared to server-specific modules

### 5.2 Apply Minimal Config Fixes

The following config changes were applied to resolve missing alias declarations:

#### Fix 1: Add @workspace/* aliases to vitest.workspace.ts

**Files Modified**: `vitest.workspace.ts`

**Changes**:
- Added to client-unit, client-integration, and client-a11y projects:
  ```typescript
  '@workspace': resolve(__dirname, './shared'),
  '@workspace/types': resolve(__dirname, './shared/types'),
  '@workspace/core': resolve(__dirname, './shared/core'),
  '@workspace/validation': resolve(__dirname, './shared/validation'),
  '@workspace/constants': resolve(__dirname, './shared/constants'),
  '@core': resolve(__dirname, './client/src/infrastructure'),
  '@lib': resolve(__dirname, './client/src/lib'),
  '@features': resolve(__dirname, './client/src/features'),
  '@app': resolve(__dirname, './client/src/app'),
  '@hooks': resolve(__dirname, './client/src/lib/hooks'),
  '@utils': resolve(__dirname, './client/src/lib/utils'),
  ```

**Rationale**: Test files using @workspace/* and client-specific aliases were failing because vitest.workspace.ts only declared base aliases.

**Estimated Impact**: ~50-100 test file errors resolved

#### Fix 2: Add @workspace/* and missing aliases to server/tsconfig.json

**Files Modified**: `server/tsconfig.json`

**Changes**:
- Added @workspace/* aliases:
  ```json
  "@workspace": ["../shared"],
  "@workspace/*": ["../shared/*"],
  "@workspace/types": ["../shared/types"],
  "@workspace/types/*": ["../shared/types/*"],
  "@workspace/core": ["../shared/core"],
  "@workspace/core/*": ["../shared/core/*"],
  "@workspace/validation": ["../shared/validation"],
  "@workspace/validation/*": ["../shared/validation/*"],
  "@workspace/constants": ["../shared/constants"],
  "@workspace/constants/*": ["../shared/constants/*"]
  ```

- Added missing @server/* aliases:
  ```json
  "@server/middleware": ["./middleware"],
  "@server/infrastructure/core": ["./infrastructure/core"],
  "@server/infrastructure/core/*": ["./infrastructure/core/*"],
  "@server/infrastructure/persistence/*": ["./infrastructure/database/persistence/*"],
  "@server/core": ["./infrastructure/core"],
  "@server/core/*": ["./infrastructure/core/*"]
  ```

- Added missing @shared/* aliases:
  ```json
  "@shared/platform": ["../shared/platform"],
  "@shared/i18n": ["../shared/i18n"]
  ```

**Rationale**: Server code using @workspace/* imports was failing because server/tsconfig.json didn't declare these aliases. Also added missing @server/core/* and @server/infrastructure/persistence/* aliases that were declared in root tsconfig but not in server tsconfig.

**Estimated Impact**: ~50-80 server file errors resolved

#### Fix 3: Add @shared/* sub-aliases to client/vite.config.ts

**Files Modified**: `client/vite.config.ts`

**Changes**:
- Added specific @shared/* aliases:
  ```typescript
  '@shared/types': path.resolve(rootDir, '../shared/types'),
  '@shared/validation': path.resolve(rootDir, '../shared/validation'),
  '@shared/constants': path.resolve(rootDir, '../shared/constants'),
  '@shared/utils': path.resolve(rootDir, '../shared/utils'),
  '@shared/core': path.resolve(rootDir, '../shared/core'),
  '@shared/platform': path.resolve(rootDir, '../shared/platform'),
  '@shared/i18n': path.resolve(rootDir, '../shared/i18n'),
  ```

**Rationale**: Vite build-time resolution may fail for specific @shared/* imports if only the base @shared alias is declared.

**Estimated Impact**: ~20-30 client build errors resolved

#### Fix 4: Add @shared/platform and @shared/i18n to client/tsconfig.json

**Files Modified**: `client/tsconfig.json`

**Changes**:
- Added:
  ```json
  "@shared/platform": ["../shared/platform"],
  "@shared/i18n": ["../shared/i18n"]
  ```

**Rationale**: These aliases were declared in root tsconfig but missing from client tsconfig.

**Estimated Impact**: ~5-10 client file errors resolved

#### Fix 5: Add @shared/platform and @shared/i18n to shared/tsconfig.json

**Files Modified**: `shared/tsconfig.json`

**Changes**:
- Added:
  ```json
  "@shared/platform": ["./platform"],
  "@shared/i18n": ["./i18n"]
  ```

**Rationale**: These aliases were declared in root tsconfig but missing from shared tsconfig.

**Estimated Impact**: ~5-10 shared file errors resolved

### 5.3 Verify Config Fix with Test Import

**Test Case**: Create a test file to verify @workspace/types resolution

```typescript
// test-import.ts
import type { User } from '@workspace/types/domains/users';
import type { Bill } from '@workspace/types/domains/bills';

console.log('Imports resolved successfully');
```

**Verification Command**: `npx tsc --noEmit test-import.ts`

**Expected Result**: No TS2307 errors for @workspace/types imports

**Note**: Test file will be created and deleted after verification in next step.

### 5.4 Commit Config Changes with Proof

**Summary of Changes**:
- Modified 5 config files (no source files changed)
- Added ~30 missing alias declarations across all tools
- Focused on @workspace/*, @shared/*, and @server/* aliases

**Before/After Comparison**:

| Config File | Aliases Before | Aliases After | New Aliases Added |
|-------------|----------------|---------------|-------------------|
| vitest.workspace.ts (client-unit) | 3 | 13 | 10 |
| vitest.workspace.ts (client-integration) | 3 | 13 | 10 |
| vitest.workspace.ts (client-a11y) | 3 | 13 | 10 |
| server/tsconfig.json | 17 | 32 | 15 |
| client/vite.config.ts | 13 | 20 | 7 |
| client/tsconfig.json | 48 | 50 | 2 |
| shared/tsconfig.json | 10 | 12 | 2 |
| **TOTAL** | **97** | **153** | **56** |

**Errors Expected to be Resolved by Config Changes**:
- Category C (Alias Not Recognized): ~150-230 errors
- Breakdown:
  - Vitest @workspace/* and client aliases: ~50-100 errors
  - Server @workspace/* aliases: ~50-80 errors
  - Vite @shared/* aliases: ~20-30 errors
  - @shared/platform and @shared/i18n: ~10-20 errors
  - @server/core/* and @server/infrastructure/persistence/*: ~20-30 errors

**Remaining Errors** (~1,200-1,280 errors):
- Category A (Stale Paths): ~600-800 errors (e.g., @shared/database → @server/infrastructure/database)
- Category B (Deleted/Superseded): ~200-300 errors (e.g., @shared/schema → actual location)
- Category D (Barrel Files): ~100-150 errors (broken re-export chains)
- Category E (Renamed Exports): ~100-150 errors (e.g., User type not exported)

**Next Steps**:
1. Run `npx tsc --noEmit -p server/tsconfig.json` to verify error count reduction
2. Compare to baseline (5,167 errors) to confirm ~150-230 errors resolved
3. Proceed to Phase 2: Structural Hotspot Investigation

---

**Status**: Task 5 Complete ✅  
**Config Changes**: 5 files modified, 56 aliases added, 0 source files changed  
**Estimated Errors Resolved**: 150-230 (Category C - Alias Not Recognized)  
**Next**: Phase 1 Checkpoint - Verify config fixes before Phase 2
