# Server Startup Module Resolution Audit

## Executive Summary

The server fails to start due to TypeScript path alias resolution issues in an ESM (ECMAScript Module) environment. The root cause is that `tsx` (TypeScript Execute) doesn't properly resolve `@server/*` path aliases when running in ESM mode (`"type": "module"`).

---

## Problem Scope

### Primary Issue
**Module Resolution Failure**: `ERR_MODULE_NOT_FOUND: Cannot find package '@server/infrastructure'`

### Affected Files
- `server/index.ts` - 40+ imports using `@server/*` aliases
- All server infrastructure, features, middleware, and utility modules

### Environment Context
- **Package Type**: ESM (`"type": "module"` in package.json)
- **Runtime**: Node.js v22.12.0
- **TypeScript Executor**: tsx v4.20.6
- **Module System**: ES2022 with bundler resolution
- **Path Aliases**: `@server`, `@server/*`, `@shared`, `@shared/*`

### Working vs Broken
- ✅ **WORKS**: `simple-server.ts` (uses only relative imports and npm packages)
- ❌ **FAILS**: `index.ts` (uses `@server/*` path aliases extensively)

---

## Root Cause Analysis

### The Core Problem

TypeScript path aliases (`paths` in tsconfig.json) are a **compile-time feature**. They tell the TypeScript compiler how to resolve imports during type-checking, but they don't affect runtime module resolution in Node.js.

When running TypeScript directly with `tsx`:
1. `tsx` transpiles TypeScript to JavaScript on-the-fly
2. Node.js ESM loader tries to resolve the imports
3. Node.js doesn't understand `@server/*` - it's not a real package
4. Resolution fails with `ERR_MODULE_NOT_FOUND`

### Why ESM Makes This Harder

In CommonJS (CJS), tools like `ts-node` with `tsconfig-paths/register` could hook into `require()` and rewrite paths. In ESM:
- Module resolution happens in Node's native ESM loader
- The `-r` flag (require) doesn't work with ESM
- Custom loaders need to use Node's `--loader` API
- `tsx` has its own internal loader that may conflict

---

## Attempted Fixes & Why They Failed

### Attempt 1: Add `tsconfig-paths/register`
```json
"dev": "tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts"
```

**Why it failed**: 
- The `-r` flag is for CommonJS `require()` hooks
- Doesn't work with ESM modules
- `tsconfig-paths/register` is designed for `ts-node` in CJS mode

### Attempt 2: Use Node.js Custom Loader
```json
"dev": "node --loader ./loader.mjs --no-warnings node_modules/.bin/tsx --tsconfig tsconfig.json index.ts"
```

**Why it failed**:
- Initial failure: JSON parsing error in loader (tsconfig.json has comments)
- After fixing JSON parsing: Path to `tsx` binary was incorrect
- Loader conflicts with `tsx`'s internal module resolution
- Overly complex chain: Node → Custom Loader → tsx → TypeScript → JavaScript

### Attempt 3: Improved Loader (hardcoded paths)
```javascript
const pathMap = {
  '@server': baseUrl,
  '@shared': resolvePath(baseUrl, '../shared')
};
```

**Why it failed**:
- Still had the tsx binary path issue
- Loader API complexity with multiple resolution layers
- `tsx` already has its own loader that may not cooperate

---

## Forward Path Options

### Option 1: Use Relative Imports (Quick Fix) ⚡
**Complexity**: Low | **Reliability**: High | **Maintenance**: Medium

Replace all `@server/*` imports with relative paths:
```typescript
// Before
import { config } from '@server/config/index';
import { logger } from '@server/infrastructure/observability';

// After
import { config } from './config/index.js';
import { logger } from './infrastructure/observability/index.js';
```

**Pros**:
- Works immediately with zero configuration
- No runtime overhead
- Standard JavaScript/Node.js behavior
- Most reliable long-term

**Cons**:
- Requires updating 40+ import statements in index.ts
- Longer import paths
- Need to add `.js` extensions for ESM
- May need updates in other files too

**Implementation**:
```bash
# Could be automated with a script
find server -name "*.ts" -exec sed -i "s/@server\//.\//g" {} \;
```

---

### Option 2: Use `tsc-alias` (Build-Time Transformation) 🔧
**Complexity**: Medium | **Reliability**: High | **Maintenance**: Low

Add a build step that transforms path aliases to relative imports:

```json
{
  "scripts": {
    "dev": "tsc-alias -p tsconfig.json && tsx dist/index.js",
    "build": "tsc && tsc-alias -p tsconfig.json"
  },
  "devDependencies": {
    "tsc-alias": "^1.8.8"
  }
}
```

**Pros**:
- Keep clean `@server/*` imports in source
- Works with any runtime (Node, tsx, etc.)
- Standard TypeScript workflow
- Good for production builds

**Cons**:
- Adds build step (slower dev experience)
- Need to compile before running
- Loses hot-reload benefits of `tsx`
- Extra dependency

---

### Option 3: Use `tsx` with Subpath Imports (Modern Node.js) 🚀
**Complexity**: Medium | **Reliability**: High | **Maintenance**: Low

Use Node.js native subpath imports feature (package.json `imports` field):

```json
// server/package.json
{
  "type": "module",
  "imports": {
    "#server/*": "./*/index.js",
    "#server/config": "./config/index.js",
    "#server/infrastructure/*": "./infrastructure/*/index.js",
    "#server/features/*": "./features/*/index.js",
    "#server/middleware/*": "./middleware/*/index.js",
    "#server/utils/*": "./utils/*/index.js"
  }
}
```

Then update imports:
```typescript
// Before
import { config } from '@server/config/index';

// After  
import { config } from '#server/config';
```

**Pros**:
- Native Node.js feature (no tools needed)
- Works with tsx, node, and all runtimes
- Better than relative imports (shorter paths)
- Future-proof (official Node.js feature)

**Cons**:
- Still requires updating all imports
- Uses `#` prefix (different convention)
- Less common than `@` prefix
- Need to map each path pattern

---

### Option 4: Switch to CommonJS 🔄
**Complexity**: High | **Reliability**: High | **Maintenance**: High

Change `"type": "module"` to `"type": "commonjs"` and use `ts-node`:

```json
// server/package.json
{
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node -r tsconfig-paths/register index.ts"
  }
}
```

**Pros**:
- `tsconfig-paths/register` works perfectly
- Path aliases work as expected
- Simpler tooling

**Cons**:
- Requires changing all imports to CommonJS (`require()`)
- Loses ESM benefits (tree-shaking, top-level await)
- Going backwards (ESM is the future)
- May break other parts of the codebase
- Client is already ESM

---

### Option 5: Custom ESM Loader (Robust Implementation) 🛠️
**Complexity**: High | **Reliability**: Medium | **Maintenance**: High

Create a production-ready ESM loader that properly handles tsx:

```javascript
// server/esm-loader.mjs
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';

const baseUrl = new URL('.', import.meta.url).pathname;

const aliases = {
  '@server': baseUrl,
  '@shared': resolvePath(baseUrl, '../shared')
};

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, target] of Object.entries(aliases)) {
    if (specifier === alias || specifier.startsWith(alias + '/')) {
      const subpath = specifier.slice(alias.length);
      const resolved = target + subpath;
      
      // Try different extensions
      for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
        const fullPath = resolved + ext;
        if (existsSync(fullPath)) {
          return nextResolve(pathToFileURL(fullPath).href, context);
        }
      }
    }
  }
  
  return nextResolve(specifier, context);
}
```

Then use:
```json
"dev": "node --import ./esm-loader.mjs --no-warnings=ExperimentalWarning node_modules/tsx/dist/cli.mjs index.ts"
```

**Pros**:
- Keep `@server/*` imports
- No source code changes needed
- Works with ESM

**Cons**:
- Complex to maintain
- Experimental Node.js API
- May break with Node.js updates
- Hard to debug when it fails
- Conflicts with tsx's internal loader

---

## Recommended Solution

### 🎯 **Primary Recommendation: Option 1 (Relative Imports)**

**Why**: Most reliable, standard, and maintainable long-term solution.

**Implementation Plan**:

1. **Create a migration script** to automate the conversion:
```typescript
// scripts/convert-to-relative-imports.ts
import { Project } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'server/tsconfig.json' });
const sourceFile = project.getSourceFile('server/index.ts');

sourceFile?.getImportDeclarations().forEach(importDecl => {
  const moduleSpecifier = importDecl.getModuleSpecifierValue();
  if (moduleSpecifier.startsWith('@server/')) {
    const relativePath = './' + moduleSpecifier.replace('@server/', '');
    importDecl.setModuleSpecifier(relativePath);
  }
});

await project.save();
```

2. **Run the conversion**:
```bash
tsx scripts/convert-to-relative-imports.ts
```

3. **Test the server**:
```bash
npm run dev
```

4. **Update other files** if needed (check for `@server/*` usage):
```bash
grep -r "@server/" server/ --include="*.ts"
```

### 🥈 **Secondary Recommendation: Option 3 (Subpath Imports)**

**Why**: Modern, native Node.js feature that's a good middle ground.

**When to use**: If you want to keep shorter import paths and are okay with using `#` prefix.

---

## Impact Assessment

### Files Requiring Changes (Option 1)
- `server/index.ts` - ~40 imports
- Potentially other server files using `@server/*`

### Testing Requirements
- ✅ Server starts without errors
- ✅ All API endpoints respond correctly
- ✅ Database connections work
- ✅ WebSocket service initializes
- ✅ All middleware loads properly

### Rollback Plan
- Keep the current code in a branch
- Git revert if issues arise
- `simple-server.ts` remains as fallback

---

## Next Steps

1. **Decide on approach** (recommend Option 1)
2. **Create backup branch**: `git checkout -b backup-before-import-fix`
3. **Implement chosen solution**
4. **Test thoroughly**
5. **Update documentation**
6. **Consider applying to other server files**

---

## Additional Notes

### Why `simple-server.ts` Works
- Uses only npm packages (`express`, `cors`)
- Uses relative imports (`./` and `../`)
- No path aliases
- Minimal dependencies

### TypeScript vs Runtime
- TypeScript `paths` = compile-time only
- Node.js module resolution = runtime
- These are separate systems that need bridging

### ESM vs CJS
- ESM is stricter about module resolution
- CJS allowed more "magic" with require hooks
- ESM is the future but requires more explicit paths

