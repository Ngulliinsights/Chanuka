# Monorepo Guide

## 🏗️ Architecture

This project uses a **PNPM + Nx** monorepo structure for professional development workflow.

### Structure
```
chanuka-platform/
├── .eslintrc.js           # Root ESLint (tool detection)
├── tailwind.config.js     # Root Tailwind (tool detection)  
├── vitest.config.ts       # Root Vitest (tool detection)
├── nx.json                # Nx configuration
├── pnpm-workspace.yaml    # PNPM workspace definition
├── package.json           # Root package with packageManager
├── tsconfig.json          # TypeScript project references
│
├── client/                # Frontend Application
│   ├── .eslintrc.js      # Client-specific ESLint
│   ├── project.json      # Nx project configuration
│   ├── vitest.config.ts  # Client test configuration
│   ├── vite.config.ts    # Client build configuration
│   └── tailwind.config.ts # Client styling (actual config)
│
├── server/                # Backend Application  
│   ├── .eslintrc.js      # Server-specific ESLint
│   ├── project.json      # Nx project configuration
│   └── vitest.config.ts  # Server test configuration
│
└── shared/                # Shared Library
    ├── .eslintrc.js      # Shared-specific ESLint
    ├── project.json      # Nx project configuration
    └── vitest.config.ts  # Shared test configuration
```

## 🚀 Commands

### Package Management (PNPM)
```bash
# Install all dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter client add react-query
pnpm --filter server add express

# Add dev dependency to root
pnpm add -D -w typescript
```

### Development (Nx)
```bash
# Start all applications in parallel
pnpm dev

# Start specific application
pnpm dev:client
pnpm dev:server

# Or use Nx directly
nx serve client
nx serve server
```

### Building (Nx with Caching)
```bash
# Build all projects (with dependency order)
pnpm build

# Build specific project
pnpm build:client
pnpm build:server
pnpm build:shared

# Or use Nx directly
nx build client
nx run-many --target=build --all
```

### Testing (Nx with Caching)
```bash
# Test all projects
pnpm test

# Test specific project
pnpm test:client
pnpm test:server
pnpm test:shared

# Or use Nx directly
nx test client
nx run-many --target=test --all
```

### Linting (Nx with Caching)
```bash
# Lint all projects
pnpm lint

# Lint specific project
pnpm lint:client
pnpm lint:server

# Or use Nx directly
nx lint client
nx run-many --target=lint --all
```

## 📦 Workspace Dependencies

### Root (`package.json`)
- **Monorepo Tools**: Nx, PNPM
- **Shared Dev Tools**: TypeScript, ESLint, Playwright
- **Server Dependencies**: Express, Database, Auth
- **Build Tools**: tsx, vitest

### Client (`@chanuka/client`)
- **React Ecosystem**: React, React-DOM, React-Router
- **UI Components**: Radix UI, Lucide React
- **Build Tools**: Vite, Tailwind CSS
- **Testing**: Vitest, Testing Library

### Server (`@chanuka/server`)
- **Workspace Reference**: `@chanuka/shared`
- **Server-specific utilities**

### Shared (`@chanuka/shared`)
- **Database Schemas**: Drizzle ORM schemas
- **Shared Types**: TypeScript definitions
- **Utilities**: Validation, helpers

## 🔧 Tool Detection & IDE Support

### Why Root Configs Exist:
- **ESLint**: IDEs look for `.eslintrc.js` in root for project-wide linting
- **Tailwind**: IntelliSense needs `tailwind.config.js` in root for autocomplete
- **Vitest**: Test runners need root config for workspace test discovery
- **TypeScript**: Project references enable cross-workspace type checking

### Workspace-Specific Configs:
- **Actual functionality**: Real configurations used by build tools
- **Inheritance**: Extend root configs with workspace-specific rules
- **Isolation**: Each workspace can have different tooling needs

## ✅ Benefits

1. **PNPM**: Faster installs, better disk usage, strict dependency resolution
2. **Nx**: Smart caching, parallel execution, dependency graph analysis
3. **Tool Detection**: IDEs and tools work seamlessly across the monorepo
4. **Incremental Builds**: Only rebuild what changed
5. **Task Dependencies**: Shared builds before apps that depend on them
6. **Parallel Execution**: Multiple tasks run simultaneously
7. **Consistent Tooling**: Same commands work across all workspaces