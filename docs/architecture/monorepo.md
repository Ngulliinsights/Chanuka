# Chanuka Platform — Monorepo Guide

**Last Updated:** March 6, 2026  
**Monorepo Tool:** PNPM Workspaces + Nx

## Overview

Chanuka uses a monorepo structure to manage multiple related packages in a single repository. This approach provides:

- **Shared dependencies** — Single `node_modules` for the entire project
- **Atomic commits** — Changes across multiple packages in one commit
- **Simplified tooling** — One build, test, and lint configuration
- **Code sharing** — Easy to share code between client and server

## Repository Structure

```
chanuka-platform/
├── client/              # React frontend (@chanuka/client)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── server/              # Express backend (@chanuka/server)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/              # Shared utilities and types
│   ├── core/           # Shared infrastructure (mostly server-only)
│   ├── types/          # TypeScript type definitions
│   ├── db/             # Database utilities
│   └── package.json
│
├── scripts/            # Build and utility scripts
├── tests/              # Integration and E2E tests
├── docs/               # Documentation
├── package.json        # Root package.json (workspace config)
├── pnpm-workspace.yaml # PNPM workspace configuration
└── nx.json             # Nx configuration
```

## Package Organization

### @chanuka/client
**Location:** `client/`  
**Purpose:** React frontend application  
**Dependencies:** React, Vite, Tailwind CSS, React Query  
**Exports:** None (application, not library)

### @chanuka/server
**Location:** `server/`  
**Purpose:** Express backend API  
**Dependencies:** Express, Drizzle ORM, PostgreSQL  
**Exports:** None (application, not library)

### @shared/core
**Location:** `shared/core/`  
**Purpose:** Shared infrastructure utilities  
**Dependencies:** Minimal  
**Exports:** Observability, caching, validation, middleware, config

**⚠️ Note:** Despite the name "shared", this package contains mostly server-only infrastructure. See [ARCHITECTURE.md](../ARCHITECTURE.md) for details.

### @shared/types
**Location:** `shared/types/`  
**Purpose:** Shared TypeScript type definitions  
**Dependencies:** None  
**Exports:** Domain types, API types, utility types

### @shared/db
**Location:** `shared/db/`  
**Purpose:** Database utilities and migrations  
**Dependencies:** Drizzle ORM, PostgreSQL  
**Exports:** Database client, migration utilities

## Working with the Monorepo

### Installing Dependencies

```bash
# Install all dependencies for all packages
pnpm install

# Install a dependency in a specific package
pnpm --filter @chanuka/client add react-query
pnpm --filter @chanuka/server add express

# Install a dependency in the root (for tooling)
pnpm add -w -D typescript
```

### Running Commands

```bash
# Run a command in all packages
pnpm -r build        # Build all packages
pnpm -r test         # Test all packages
pnpm -r lint         # Lint all packages

# Run a command in a specific package
pnpm --filter @chanuka/client dev
pnpm --filter @chanuka/server dev

# Run multiple packages in parallel
pnpm dev             # Runs client and server in parallel (configured in root package.json)
```

### Using Nx for Task Orchestration

Nx provides intelligent task orchestration with caching:

```bash
# Build with caching
nx build @chanuka/client
nx build @chanuka/server

# Run affected tasks (only changed packages)
nx affected:build
nx affected:test
nx affected:lint

# Clear Nx cache
nx reset
```

### Import Patterns

**From client to shared:**
```typescript
// ✅ Good — Import from shared types
import type { Bill, User } from '@shared/types';

// ❌ Bad — Don't import from shared/core (server-only)
import { observability } from '@shared/core';
```

**From server to shared:**
```typescript
// ✅ Good — Import from shared types
import type { Bill, User } from '@shared/types';

// ✅ Good — Import from shared core (server infrastructure)
import { observability } from '@shared/core';

// ✅ Good — Import from shared db
import { db } from '@shared/db';
```

**Within a package:**
```typescript
// ✅ Good — Use path aliases
import { Button } from '@/components/ui/Button';
import { api } from '@/services/apiService';

// ❌ Bad — Don't use relative paths for distant files
import { Button } from '../../../components/ui/Button';
```

See [PATH_ALIAS_RESOLUTION.md](./PATH_ALIAS_RESOLUTION.md) for complete import patterns.

## Adding a New Package

1. **Create the package directory:**
   ```bash
   mkdir -p packages/my-package/src
   ```

2. **Create package.json:**
   ```json
   {
     "name": "@chanuka/my-package",
     "version": "1.0.0",
     "main": "./src/index.ts",
     "types": "./src/index.ts"
   }
   ```

3. **Add to pnpm-workspace.yaml:**
   ```yaml
   packages:
     - 'client'
     - 'server'
     - 'shared/*'
     - 'packages/*'  # Add this line
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   ```

5. **Import from other packages:**
   ```typescript
   import { something } from '@chanuka/my-package';
   ```

## Dependency Management

### Adding Dependencies

**Production dependency:**
```bash
pnpm --filter @chanuka/client add react-query
```

**Development dependency:**
```bash
pnpm --filter @chanuka/client add -D @types/react
```

**Workspace dependency (internal package):**
```json
{
  "dependencies": {
    "@shared/types": "workspace:*"
  }
}
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update -r

# Update a specific dependency
pnpm --filter @chanuka/client update react

# Check for outdated dependencies
pnpm outdated -r
```

### Removing Dependencies

```bash
pnpm --filter @chanuka/client remove react-query
```

## Build Process

### Development Build

```bash
# Start all services in development mode
pnpm dev

# Start specific service
pnpm --filter @chanuka/client dev
pnpm --filter @chanuka/server dev
```

### Production Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @chanuka/client build
pnpm --filter @chanuka/server build
```

### Build Order

Nx automatically determines the correct build order based on dependencies:

1. `@shared/types` (no dependencies)
2. `@shared/db` (depends on types)
3. `@shared/core` (depends on types)
4. `@chanuka/server` (depends on shared packages)
5. `@chanuka/client` (depends on shared/types only)

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @chanuka/client test
pnpm --filter @chanuka/server test

# Run tests in watch mode
pnpm --filter @chanuka/client test:watch

# Run E2E tests
pnpm test:e2e
```

### Test Organization

- **Unit tests:** `*.test.ts` files next to source code
- **Integration tests:** `tests/integration/`
- **E2E tests:** `tests/e2e/`
- **Property tests:** `tests/properties/`

See [tests/README.md](../tests/README.md) for complete testing guide.

## Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter @chanuka/client lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## Common Issues

### "Cannot find module '@shared/types'"

**Cause:** Package not installed or workspace link broken

**Fix:**
```bash
pnpm install
```

### "Circular dependency detected"

**Cause:** Two packages depend on each other

**Fix:** Refactor to remove circular dependency. See [CIRCULAR_DEPENDENCY_PREVENTION.md](./development/CIRCULAR_DEPENDENCY_PREVENTION.md)

### "Nx cache is stale"

**Cause:** Nx cache contains outdated build artifacts

**Fix:**
```bash
nx reset
pnpm build
```

### "PNPM workspace not found"

**Cause:** Running command from wrong directory

**Fix:** Always run commands from repository root

## Best Practices

### Do's ✅

- **Use workspace protocol** for internal dependencies: `"@shared/types": "workspace:*"`
- **Run commands from root** to ensure workspace context
- **Use Nx caching** for faster builds: `nx build` instead of `pnpm build`
- **Keep shared packages minimal** — only truly shared code
- **Use path aliases** for imports within a package

### Don'ts ❌

- **Don't import server code in client** — breaks browser builds
- **Don't create circular dependencies** between packages
- **Don't duplicate code** — extract to shared package instead
- **Don't run `npm install`** — always use `pnpm install`
- **Don't commit node_modules** — already in .gitignore

## Monorepo Tools

### PNPM Workspaces
- **Purpose:** Dependency management and workspace linking
- **Config:** `pnpm-workspace.yaml`
- **Docs:** https://pnpm.io/workspaces

### Nx
- **Purpose:** Task orchestration and caching
- **Config:** `nx.json`
- **Docs:** https://nx.dev

### TypeScript Project References
- **Purpose:** Type checking across packages
- **Config:** `tsconfig.json` in each package
- **Docs:** https://www.typescriptlang.org/docs/handbook/project-references.html

## Migration from Non-Monorepo

If you're migrating from a non-monorepo structure:

1. **Create workspace structure** (already done for Chanuka)
2. **Move packages** into workspace directories
3. **Update imports** to use workspace packages
4. **Configure build tools** (Nx, TypeScript)
5. **Update CI/CD** to use monorepo commands

See [docs/migrations/](./migrations/) for specific migration guides.

## Further Reading

- [ARCHITECTURE.md](../ARCHITECTURE.md) — System architecture
- [PATH_ALIAS_RESOLUTION.md](./PATH_ALIAS_RESOLUTION.md) — Import patterns
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) — Development workflow
- [scripts/README.md](../scripts/README.md) — Available scripts

---

**Questions?** See [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) or contact the platform team.
